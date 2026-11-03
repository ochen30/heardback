// Performance probe at real volume: load, palette typing, route switches, Find J/K, long tasks.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch {} });
  const t0 = Date.now();
  await page.goto('http://localhost:47493/#today');
  await page.waitForSelector('.td-task'); const tTasks = Date.now() - t0;
  await page.waitForSelector('.td-job', { timeout: 15000 }); const tJobs = Date.now() - t0;
  console.log(`today: tasks visible ${tTasks}ms, "New for you" visible ${tJobs}ms`);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const r = performance.getEntriesByType('resource').filter((x) => /jobs\.json|companies\.json/.test(x.name)).map((x) => `${x.name.split('/').pop()} ${Math.round(x.duration)}ms ${Math.round((x.transferSize || x.encodedBodySize) / 1024)}KB`); return { dcl: n ? Math.round(n.domContentLoadedEventEnd) : null, r }; });
  console.log('nav', JSON.stringify(nav));
  await page.waitForTimeout(800);
  // palette per-keystroke latency
  await page.keyboard.press('Control+k'); await page.waitForSelector('#palette-q');
  const lat = [];
  for (const ch of 'software engineer') {
    const s = await page.evaluate(() => performance.now());
    await page.keyboard.type(ch);
    const d = await page.evaluate((s) => new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(performance.now() - s), 0))), s);
    lat.push(Math.round(d));
  }
  console.log('palette keystroke->paint ms', lat.join(','), 'max', Math.max(...lat));
  await page.keyboard.press('Escape');
  // route switches
  for (const r of ['pipeline', 'find', 'stats', 'today', 'prep']) {
    const s = Date.now(); await page.evaluate((r) => { location.hash = r; }, r);
    await page.waitForFunction((r) => document.querySelector('.page h1') && location.hash === '#' + r, r);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
    console.log(`route ${r}: ${Date.now() - s}ms`);
  }
  // Find J latency
  await page.evaluate(() => { location.hash = 'find'; }); await page.waitForTimeout(800);
  const jl = [];
  for (let i = 0; i < 10; i++) { const s = await page.evaluate(() => performance.now()); await page.keyboard.press('j'); jl.push(Math.round(await page.evaluate((s) => new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(performance.now() - s), 0))), s))); }
  console.log('find J ms', jl.join(','));
  // Today: Mark as ghosted -> re-render time
  await page.evaluate(() => { location.hash = 'today'; }); await page.waitForTimeout(600);
  const lt = await page.evaluate(() => window.__lt);
  console.log('long tasks (start,dur)', JSON.stringify(lt.slice(0, 30)), 'n=', lt.length, 'total', lt.reduce((a, b) => a + b[1], 0));
  const mem = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : 'n/a'));
  console.log('heap', mem, 'localStorage bytes', await page.evaluate(() => (localStorage.getItem('heardback:v1') || '').length));
});
