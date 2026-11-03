const { EMAIL } = require('./t5');
require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.tap(p.getByRole('button', { name: 'Add application' }).locator('visible=true').first());
  await t.tap(p.locator('[role=dialog]:visible').getByText('Log an email'));
  const ta = p.locator('[role=dialog]:visible textarea'); await ta.tap(); await ta.fill(EMAIL);
  await t.tap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Read email' }));
  await t.tap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Update application' }));
  await p.waitForTimeout(500);
  await t.shot('after-log'); await t.text('.toasts', 400);
  await t.text('main', 1500);
});
