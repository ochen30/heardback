// Task 8: share progress (Insights -> Share) without Claude / downloads capability
require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.tap(t.vis('More')); await t.tap(p.locator('[role=dialog]:visible').getByText('Insights'));
  await p.waitForTimeout(800); await t.shot('insights'); await t.text('main', 2500); await t.buttons('main'); await t.targets('insights');
  await t.tap(p.getByRole('button', { name: /Share/ }).locator('visible=true'));
  await p.waitForTimeout(800); await t.shot('share'); await t.text('[role=dialog]:visible, main', 2500); await t.buttons('[role=dialog]:visible'); await t.targets('share');
});
