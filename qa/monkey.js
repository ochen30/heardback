// Chaos test: random clicks/keys across the app, reporting any page error. Usage: STEPS=400 SEED=1 W=1440 node qa/monkey.js
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..'); const dist = path.join(root, 'dist'); const nm = path.join(root, 'tools', 'node_modules');
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(dist, p); if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let seed = +(process.env.SEED || 1); const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
(async () => {
  await new Promise((r) => server.listen(0, r)); const port = server.address().port;
  const W = +(process.env.W || 1440), H = W < 500 ? 812 : 900; const STEPS = +(process.env.STEPS || 400);
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 500 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/(preact|htm|pdfjs-dist)@[\d.]+\/(.*)/, (route) => { const m = route.request().url().match(/npm\/(preact|htm|pdfjs-dist)@[\d.]+\/(.*)$/); route.fulfill({ path: path.join(nm, m[1], m[2]), contentType: 'text/javascript' }); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  if (process.env.MOCK) await page.addInitScript({ path: path.join(__dirname, 'mock-claude.js') });
  await page.goto(`http://localhost:${port}/#today`); await page.waitForTimeout(800);
  if (process.env.EXAMPLES) await page.evaluate(() => { store.set((s) => ({ ...s, profile: { ...s.profile, onboarded: true, skills: ['Python', 'SQL'] } })); loadExamples(); });
  const keys = ['j', 'k', 'Enter', 'Escape', 'n', 'e', '?', 's', 'x', 'd', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'Tab', '1', '3', 'g'];
  const routes = ['today', 'find', 'pipeline', 'companies', 'prep', 'stats', 'prefs'];
  for (let i = 0; i < STEPS; i++) {
    const r = rnd();
    try {
      if (r < 0.06) { await page.evaluate((h) => { location.hash = h; }, routes[Math.floor(rnd() * routes.length)]); }
      else if (r < 0.25) { await page.keyboard.press(keys[Math.floor(rnd() * keys.length)]); }
      else if (r < 0.3) { await page.keyboard.press('Control+k'); await page.keyboard.type('a'); }
      else {
        const els = await page.$$('button:not([disabled]), [role="button"], input[type="checkbox"], .chip, .job-row, .app-card, select, .nav-item');
        const vis = []; for (const e of els) { if (await e.isVisible().catch(() => false)) vis.push(e); }
        if (vis.length) {
          const el = vis[Math.floor(rnd() * vis.length)];
          const txt = ((await el.innerText().catch(() => '')) || '').toLowerCase();
          if (/delete all|delete everything|clear all data/.test(txt)) continue; // keep state around
          if ((await el.evaluate((n) => n.tagName)) === 'SELECT') { const opts = await el.$$eval('option', (o) => o.map((x) => x.value)); if (opts.length) await el.selectOption(opts[Math.floor(rnd() * opts.length)]).catch(() => {}); }
          else await el.click({ timeout: 1500, trial: false }).catch(() => {});
        }
      }
      await page.waitForTimeout(40);
    } catch (e) { /* navigation/detached elements are expected in chaos */ }
  }
  const blank = await page.evaluate(() => document.querySelector('#app')?.innerText.trim().length || 0);
  console.log(JSON.stringify({ W, steps: STEPS, seed: +(process.env.SEED || 1), errors: [...new Set(errors)].slice(0, 10), appTextLength: blank }));
  await browser.close(); server.close();
})();
