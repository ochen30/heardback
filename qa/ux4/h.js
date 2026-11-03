// UX4 harness (modeled on qa/shot.js + qa/ux2/h.js). Desktop (keyboard) by default; W<600 => phone (isMobile, touch).
// Env: OUT (default qa/out-ux4), W/H (375x812), FRESH=1 wipes profile, TAG, CLOCK.
const { chromium, devices } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..', '..'); const dist = path.join(root, 'dist'); const nm = path.join(root, 'tools', 'node_modules');
const OUT = path.resolve(root, process.env.OUT || 'qa/out-ux4'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
const W = +(process.env.W || 1440), H = +(process.env.H || (W < 600 ? 812 : 900)); const PHONE = W < 600;
const PROF = path.join(OUT, 'profile-' + (process.env.PROFILE || (process.env.MOCK ? 'mock' : 'nomock')));
const PORT = +(process.env.PORT || 47494);
async function run(fn) {
  if (process.env.FRESH) fs.rmSync(PROF, { recursive: true, force: true });
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(dist, p);
    if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    // emulate the artifact host's document skeleton (doctype + charset + viewport) around the page fragment
    if (p === '/index.html') return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + fs.readFileSync(f, 'utf8'));
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, r));
  const ctx = await chromium.launchPersistentContext(PROF, { viewport: { width: W, height: H }, isMobile: PHONE, hasTouch: PHONE, deviceScaleFactor: 1,
    ...(PHONE ? { userAgent: devices['iPhone 13'].userAgent } : {}), colorScheme: 'light', timezoneId: 'America/Los_Angeles', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('download', (d) => console.log('DOWNLOAD', d.suggestedFilename()));
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
  if (process.env.MOCK) await page.addInitScript({ path: path.join(root, 'qa', 'mock-claude.js') });
  await page.clock.install({ time: new Date(process.env.CLOCK || '2026-11-03T10:00:00-08:00') });
  let taps = 0, keys = 0, n = 0; const t0 = Date.now(); const tag = process.env.TAG || 'run';
  const t = {
    page, errors,
    async go(hash) { await page.goto(`http://localhost:${PORT}/${hash ? '#' + hash : ''}`); await page.waitForTimeout(1000); },
    async tap(target, opts = {}) { if (!PHONE) return t.click(target, opts); taps++; const loc = typeof target === 'string' ? page.getByText(target, { exact: !!opts.exact }).first() : target.first(); await loc.scrollIntoViewIfNeeded({ timeout: opts.timeout || 5000 }); await loc.tap({ timeout: opts.timeout || 5000 }); await page.waitForTimeout(opts.wait ?? 450); },
    async tryTap(target, opts = {}) { try { await t.tap(target, opts); return true; } catch (e) { taps--; console.log('  (could not tap', String(target).slice(0, 90), e.message.split('\n')[0].slice(0, 120), ')'); return false; } },
    async key(k, opts = {}) { keys++; await page.keyboard.press(k); await page.waitForTimeout(opts.wait ?? 300); },
    async keyType(text, opts = {}) { keys += text.length; await page.keyboard.type(text, { delay: 20 }); await page.waitForTimeout(opts.wait ?? 300); },
    async click(target, opts = {}) { taps++; const loc = typeof target === 'string' ? page.getByText(target, { exact: !!opts.exact }).first() : target.first(); await loc.scrollIntoViewIfNeeded({ timeout: opts.timeout || 5000 }); await loc.click({ timeout: opts.timeout || 5000, modifiers: opts.modifiers }); await page.waitForTimeout(opts.wait ?? 400); },
    async focused() { const f = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : ''} "${(e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 60)}"` : 'none'; }); console.log('FOCUS', f); return f; },
    async type(loc, text) { await loc.first().tap(); await loc.first().fill(text); await page.waitForTimeout(250); },
    async shot(name, full) { n++; const f = path.join(OUT, `${process.env.MOCK ? 'm' : 'n'}-${tag}-${String(n).padStart(2, '0')}-${name}-${W}.png`); await page.screenshot({ path: f, fullPage: !!full }); console.log('shot', path.relative(root, f)); return f; },
    async text(sel = 'body', max = 2500) { const s = await page.locator(sel).first().innerText().catch(() => ''); console.log(`--- text(${sel}) ---\n` + s.replace(/\n{2,}/g, '\n').slice(0, max)); return s; },
    async buttons(sel = 'body') { const b = await page.locator(sel).first().locator('button:visible, a:visible, [role=tab]:visible').allInnerTexts(); console.log('buttons:', b.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ').slice(0, 2500)); },
    // tap-target audit: visible interactive elements smaller than 44x44 (or 24 min per WCAG 2.2)
    async targets(label) { const r = await page.evaluate(() => { const out = []; document.querySelectorAll('button, a[href], input:not([type=hidden]), select, [role=button], [role=tab], label.btn, summary').forEach((el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); if (!b.width || !b.height || s.visibility === 'hidden' || b.bottom < 0 || b.top > innerHeight) return; if (el.classList.contains('sr')) return; if (b.width < 44 || b.height < 44) out.push(`${Math.round(b.width)}x${Math.round(b.height)} ${(el.getAttribute('aria-label') || el.innerText || el.placeholder || el.type || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30)}`); }); return out; }); console.log(`TARGETS<44 (${label}) n=${r.length}:`, r.slice(0, 40).join(' | ')); return r; },
    vis(text, exact = true) { return page.getByText(text, { exact }).locator('visible=true'); },
    role(r, name) { return page.getByRole(r, { name }).locator('visible=true'); },
    log: (...a) => console.log('NOTE', ...a),
  };
  try { await fn(t); } catch (e) { console.log('STEP FAILED:', e.message.split('\n')[0]); await t.shot('error').catch(() => {}); }
  const ow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })).catch(() => ({}));
  if (ow.sw > ow.cw + 1) errors.push(`OVERFLOW scrollWidth ${ow.sw} > ${ow.cw}`);
  console.log(`taps/clicks=${taps} keys=${keys} wall=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await ctx.close(); server.close();
}
module.exports = { run, OUT, W, H, root };
