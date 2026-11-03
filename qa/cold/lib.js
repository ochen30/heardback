// Shared harness for cold-launch tests (mirrors qa/shot.js serving + routing, SETUP=fresh)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..', '..'); const dist = path.join(root, 'dist'); const nm = path.join(root, 'tools', 'node_modules');
const out = path.resolve(root, process.env.OUT || 'qa/out-cold'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(dist, p);
    if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    // emulate the artifact host's skeleton (doctype + viewport) unless RAW=1, as qa/ux2/h.js does
    if (p === '/index.html' && !process.env.RAW) return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + fs.readFileSync(f, 'utf8'));
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}
async function open(browser, port, { mobile, persona }) {
  const vp = mobile ? { width: 375, height: 812 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: !!mobile, hasTouch: !!mobile, colorScheme: 'light' });
  const page = await ctx.newPage();
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
  const t0 = Date.now(); let n = 0; const log = [];
  const tag = `${persona}-${mobile ? 375 : 1440}`;
  const shot = async (label, full = false) => {
    const f = path.join(out, `${tag}-${String(n++).padStart(2, '0')}-${label}.png`);
    await page.screenshot({ path: f, fullPage: full });
    log.push({ t: ((Date.now() - t0) / 1000).toFixed(1), label, file: path.basename(f) });
  };
  const note = (s) => log.push({ t: ((Date.now() - t0) / 1000).toFixed(1), note: s });
  const text = () => page.evaluate(() => document.body.innerText);
  const tap = async (loc) => { if (mobile) await loc.tap(); else await loc.click(); await page.waitForTimeout(500); };
  return { ctx, page, errors, shot, note, text, tap, log, t0, tag, url: `http://localhost:${port}/` };
}
module.exports = { serve, open, chromium, out };
