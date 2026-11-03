// Task 4: Insights with real volume. Do the numbers say something actionable?
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  const s = Date.now();
  await t.go('stats');
  console.log('stats load ms', Date.now() - s);
  await page.setViewportSize({ width: 1440, height: 2600 }); await page.waitForTimeout(500);
  await t.shot('insights-tall');
  await t.text('.page', 6000);
  await t.buttons('.page');
  // computeStats for cross-check
  const st = await page.evaluate(() => { const x = computeStats(); delete x.weeks; return x; });
  console.log('STATS', JSON.stringify(st));
});
