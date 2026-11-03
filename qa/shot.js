// Usage: node qa/shot.js [route ...]  -> screenshots in qa/out, console errors printed
// Env: W=1440 H=900 THEME=light|dark DPR=1 SETUP=examples|fresh|onboarded ACTIONS=js-file
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const root = path.resolve(__dirname, '..'); const dist = path.join(root, 'dist'); const nm = path.join(root, 'tools', 'node_modules');
const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(dist, p);
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), theme = process.env.THEME || 'light', dpr = +(process.env.DPR || 1);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/(preact@10\.19\.3|htm@3\.1\.1)\/(.*)/, (route) => {
    const m = route.request().url().match(/npm\/(preact|htm)@[\d.]+\/(.*)$/);
    route.fulfill({ path: path.join(nm, m[1], m[2]), contentType: 'text/javascript' });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const setup = process.env.SETUP || 'examples';
  if (setup !== 'fresh') {
    await page.addInitScript((setup) => {
      if (localStorage.getItem('qa-init')) return;
      localStorage.setItem('qa-init', '1');
      const st = { v: 1, profile: { roles: ['Software', 'Data & AI'], levels: ['intern', 'newgrad'], locations: ['sf bay area', 'new york', 'remote'], remote: true, needsSponsor: false, resume: '', skills: ['Python', 'Java', 'React', 'SQL', 'Machine Learning', 'AWS', 'Algorithms', 'Git'], onboarded: true, name: 'Alex Kim', weeklyGoal: 10 }, apps: {}, settings: { theme: 'system', followUpDays: 7, ghostDays: 21, shareAnon: false, showExamples: true }, dismissed: {}, ui: { pipelineView: 'board' } };
      localStorage.setItem('heardback:v1', JSON.stringify(st));
      if (setup === 'examples') localStorage.setItem('qa-examples', '1');
    }, setup);
  }
  const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['today'];
  await page.goto(`http://localhost:${port}/#${routes[0]}`);
  await page.waitForTimeout(600);
  if (setup === 'examples') await page.evaluate(() => { if (localStorage.getItem('qa-examples') === '1') { localStorage.setItem('qa-examples', '2'); loadExamples(); } });
  for (const r of routes) {
    const [route, action] = r.split(':');
    await page.evaluate((rt) => { location.hash = rt; }, route);
    await page.waitForTimeout(700);
    if (action && process.env.ACTIONS) { const mod = require(path.resolve(process.env.ACTIONS)); if (mod[action]) await mod[action](page); await page.waitForTimeout(500); }
    const ow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (ow.sw > ow.cw + 1) errors.push(`OVERFLOW on ${r}: scrollWidth ${ow.sw} > ${ow.cw}`);
    const file = path.join(out, `${r.replace(/[:]/g, '-')}-${W}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log('shot', file);
  }
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); } else console.log('no console errors');
  await browser.close(); server.close();
})();
