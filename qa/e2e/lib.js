// Shared E2E harness (modeled on qa/shot.js). Serves a dist dir, routes CDN + fonts, optional MOCK and SETUP.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..', '..'); const nm = path.join(root, 'tools', 'node_modules');
const qa = path.join(root, 'qa');
const OUTD = process.env.E2E_OUT ? path.resolve(process.env.E2E_OUT) : path.join(__dirname, 'out2'); fs.mkdirSync(OUTD, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };

function serve(dist) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(dist, p);
    if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

const PROFILE = { roles: ['Software', 'Data & AI'], levels: ['intern', 'newgrad'], locations: ['sf bay area', 'new york', 'remote'], remote: true, needsSponsor: false, resume: '', skills: ['Python', 'Java', 'React', 'SQL', 'Machine Learning', 'AWS', 'Algorithms', 'Git'], onboarded: true, name: 'Alex Kim', weeklyGoal: 10 };

async function open(o = {}) {
  const dist = o.dist || process.env.DIST || (fs.existsSync(path.join(OUTD, 'dist', 'index.html')) ? path.join(OUTD, 'dist') : path.join(root, 'dist'));
  const server = await serve(dist);
  const port = server.address().port;
  const W = o.W || 1440, H = o.H || (W < 600 ? 812 : 900);
  const browser = o.browser || await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: o.theme || 'light', timezoneId: o.tz || process.env.TZID || 'UTC', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/(preact@10\.19\.3|htm@3\.1\.1|pdfjs-dist@3\.11\.174)\/(.*)|cdnjs\.cloudflare\.com\/ajax\/libs\/(preact|htm)\/[\d.]+\/(.*)|unpkg\.com\/(preact|htm)@[\d.]+\/(.*)/, (route) => {
    const u = route.request().url();
    let m = u.match(/npm\/(preact|htm|pdfjs-dist)@[\d.]+\/(.*)$/) || u.match(/unpkg\.com\/(preact|htm)@[\d.]+\/(.*)$/);
    if (m) return route.fulfill({ path: path.join(nm, m[1], m[2]), contentType: 'text/javascript' });
    m = u.match(/libs\/(preact|htm)\/[\d.]+\/(.*)$/);
    return route.fulfill({ path: path.join(nm, m[1], 'dist', m[2]), contentType: 'text/javascript' });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    const u = route.request().url(); const fd = path.join(qa, 'fonts');
    const m = u.match(/__fonts\/([a-f0-9]+\.woff2)/);
    if (m && fs.existsSync(path.join(fd, m[1]))) return route.fulfill({ path: path.join(fd, m[1]), contentType: 'font/woff2' });
    if (/css2/.test(u) && fs.existsSync(path.join(fd, 'fonts.css'))) return route.fulfill({ path: path.join(fd, 'fonts.css'), contentType: 'text/css' });
    return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  if (o.mock) await page.addInitScript({ path: path.join(qa, 'mock-claude.js') });
  const setup = o.setup || 'examples';
  if (o.rawStorage != null) {
    await page.addInitScript((raw) => { if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('heardback:v1', raw); } }, o.rawStorage);
  } else if (setup !== 'fresh') {
    await page.addInitScript(({ setup, profile }) => {
      if (sessionStorage.getItem('qa-init')) return;
      sessionStorage.setItem('qa-init', '1');
      const st = { v: 1, profile, apps: {}, settings: { theme: 'system', followUpDays: 7, ghostDays: 21, shareAnon: false, showExamples: true }, dismissed: {}, ui: { pipelineView: 'board' } };
      localStorage.setItem('heardback:v1', JSON.stringify(st));
      if (setup === 'examples') sessionStorage.setItem('qa-examples', '1');
    }, { setup, profile: PROFILE });
  }
  await page.goto(`http://localhost:${port}/#${o.route || 'today'}`);
  await page.waitForTimeout(500);
  if (setup === 'examples' && o.rawStorage == null) await page.evaluate(() => { if (sessionStorage.getItem('qa-examples') === '1') { sessionStorage.setItem('qa-examples', '2'); loadExamples(); ui.set({ toasts: [] }); } });
  if (o.waitJobs !== false) await page.waitForFunction(() => jobsStore.status === 'ready' || jobsStore.status === 'error', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(200);
  const close = async () => { await ctx.close(); if (!o.browser) await browser.close(); server.close(); };
  return { page, errors, close, port, browser, ctx };
}

// Result recorder
const results = [];
function mk(area) {
  const log = (ok, name, detail) => { results.push({ area, ok, name, detail: detail == null ? '' : String(detail) }); console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail != null && detail !== '' ? ' :: ' + detail : ''}`); return ok; };
  return { check: (name, cond, detail) => log(!!cond, name, detail), note: (name, detail) => { results.push({ area, ok: null, name, detail: String(detail ?? '') }); console.log(`NOTE [${area}] ${name} :: ${detail ?? ''}`); } };
}
function dump(file) { file = path.join(OUTD, path.basename(file)); fs.writeFileSync(file, JSON.stringify(results, null, 2)); }
async function overflow(page) { return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 })); }
async function clearToasts(page) { await page.evaluate(() => ui.set({ toasts: [] })); }
async function flush(page) { await page.waitForTimeout(250); }
async function shot(page, name) { const d = OUTD; fs.mkdirSync(d, { recursive: true }); await page.screenshot({ path: path.join(d, name + '.png') }); }
function resFile(name) { return path.join(OUTD, name); }
module.exports = { OUTD, resFile, open, mk, dump, results, overflow, clearToasts, flush, shot, root, PROFILE };
