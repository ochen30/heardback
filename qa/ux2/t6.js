// Task 6: what should I do today?
require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.shot('today');
  await t.tap(p.getByRole('button', { name: 'Draft follow-up' }).locator('visible=true').first());
  await t.shot('draft'); await t.text('[role=dialog]:visible', 1800); await t.buttons('[role=dialog]:visible');
  await t.tryTap(p.locator('[role=dialog]:visible').getByRole('button', { name: /Close|Cancel|Done/ }));
  await t.tap(p.getByRole('button', { name: /More options: No reply from Zillow/ }));
  await t.shot('zillow-menu'); await t.buttons('[role=menu]:visible, [role=dialog]:visible');
});
