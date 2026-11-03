// UX study harness (modeled on qa/shot.js). Persistent browser profile so a "participant" session
// carries over between task scripts. Usage from a task script: const ux = require('./ux'); ux.run(async (t) => {...})
// Env: OUT (default qa/out-ux), W/H (default 1440x900), PROFILE (profile dir name), FRESH=1 wipes profile, MOCK=1 injects mock Claude.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..', '..'); const dist = path.join(root, 'dist'); const nm = path.join(root, 'tools', 'node_modules');
const OUT = path.resolve(root, process.env.OUT || 'qa/out-ux'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
const W = +(process.env.W || 1440), H = +(process.env.H || (W < 600 ? 812 : 900));
const PROF = path.join(OUT, 'profile-' + (process.env.PROFILE || W));
const PORT = W < 600 ? 47391 : 47390; // fixed so localStorage origin persists between runs

async function run(fn) {
  if (process.env.FRESH) fs.rmSync(PROF, { recursive: true, force: true });
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(dist, p);
    if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, r));
  const ctx = await chromium.launchPersistentContext(PROF, { viewport: { width: W, height: H }, colorScheme: 'light', timezoneId: 'America/Los_Angeles', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/(preact@10\.19\.3|htm@3\.1\.1|pdfjs-dist@3\.11\.174)\/(.*)/, (route) => {
    const m = route.request().url().match(/npm\/(preact|htm|pdfjs-dist)@[\d.]+\/(.*)$/);
    route.fulfill({ path: path.join(nm, m[1], m[2]), contentType: 'text/javascript' });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    const u = route.request().url(); const fd = path.join(root, 'qa', 'fonts');
    const m = u.match(/__fonts\/([a-f0-9]+\.woff2)/);
    if (m && fs.existsSync(path.join(fd, m[1]))) return route.fulfill({ path: path.join(fd, m[1]), contentType: 'font/woff2' });
    if (/css2/.test(u) && fs.existsSync(path.join(fd, 'fonts.css'))) return route.fulfill({ path: path.join(fd, 'fonts.css'), contentType: 'text/css' });
    return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  if (process.env.CLOCK) await page.clock.install({ time: new Date(process.env.CLOCK) });
  if (process.env.MOCK) await page.addInitScript({ path: path.join(root, 'qa', 'mock-claude.js') });
  let clicks = 0, n = 0; const t0 = Date.now(); const tag = process.env.TAG || 'run';
  const t = {
    page, errors,
    async go(hash) { await page.goto(`http://localhost:${PORT}/${hash ? '#' + hash : ''}`); await page.waitForTimeout(900); },
    async click(target, opts = {}) { clicks++; const loc = typeof target === 'string' ? page.getByText(target, { exact: !!opts.exact }).first() : target; await loc.click({ timeout: opts.timeout || 5000 }); await page.waitForTimeout(opts.wait ?? 400); },
    async tryClick(target, opts = {}) { try { await t.click(target, opts); return true; } catch (e) { clicks--; console.log('  (could not click', String(target).slice(0, 80), ')'); return false; } },
    async type(loc, text) { await loc.click(); await loc.fill(text); await page.waitForTimeout(250); },
    async shot(name, full) { n++; const f = path.join(OUT, `${tag}-${String(n).padStart(2, '0')}-${name}-${W}.png`); await page.screenshot({ path: f, fullPage: !!full }); console.log('shot', path.relative(root, f)); return f; },
    async text(sel = 'body', max = 2500) { const s = await page.locator(sel).first().innerText().catch(() => ''); console.log(`--- text(${sel}) ---\n` + s.replace(/\n{2,}/g, '\n').slice(0, max)); return s; },
    async buttons(sel = 'body') { const b = await page.locator(sel).first().locator('button:visible, a:visible, [role=tab]:visible').allInnerTexts(); console.log('buttons:', b.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ').slice(0, 2500)); },
    log: (...a) => console.log('NOTE', ...a),
  };
  try { await fn(t); } catch (e) { console.log('STEP FAILED:', e.message.split('\n')[0]); await t.shot('error').catch(() => {}); }
  const ow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })).catch(() => ({}));
  if (ow.sw > ow.cw + 1) errors.push(`OVERFLOW scrollWidth ${ow.sw} > ${ow.cw}`);
  console.log(`clicks=${clicks} wall=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await ctx.close(); server.close();
}
module.exports = { run, OUT, W, H };
