// Task 7: practice for the Zillow interview with Prep, no Claude available
require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.tap(t.vis('Prep'));
  await p.waitForTimeout(800);
  await t.shot('prep'); await t.text('main', 3000); await t.buttons('main'); await t.targets('prep');
});
