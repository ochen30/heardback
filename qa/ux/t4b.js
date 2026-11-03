const { EMAIL } = require('./t4a');
require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.click(p.getByRole('button', { name: /Log an email/ }).first());
  await t.type(p.locator('[role=dialog]:visible textarea').first(), EMAIL);
  await t.click(p.getByRole('button', { name: 'Read email' }));
  await p.waitForTimeout(800);
  await t.shot('email-read'); await t.text('[role=dialog]:visible', 3000); await t.buttons('[role=dialog]:visible');
});
