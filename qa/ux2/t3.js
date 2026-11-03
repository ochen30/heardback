// Task 3: find 2 remote new-grad data roles posted this week with no ghost signals; save them
require('./h').run(async (t) => {
  const p = t.page; await t.go('today');
  await t.tap(t.vis('Find'));
  await p.waitForTimeout(800);
  await t.shot('find'); await t.text('main', 2200); await t.buttons('main'); await t.targets('find');
  await t.tap(t.role('button', /Filters/));
  await t.shot('filters'); await t.text('[role=dialog]:visible', 2500); await t.buttons('[role=dialog]:visible'); await t.targets('filters');
});
