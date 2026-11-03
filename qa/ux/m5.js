const { EMAIL } = require('./t4a');
require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  await t.click(p.getByRole('button', { name: 'More' }).last());
  await t.click(p.locator('[role=dialog]:visible').getByText('Log an email'));
  await t.type(p.locator('[role=dialog]:visible textarea').first(), EMAIL);
  await t.shot('m-email-pasted');
  await t.click(p.getByRole('button', { name: 'Read email' }));
  await t.shot('m-email-read');
  await t.click(p.getByRole('button', { name: /Update application/ }));
  await t.shot('m-email-done'); await t.text('.toasts', 300);
  await t.click(p.getByRole('button', { name: 'Today' }).last()); await p.waitForTimeout(500);
  await t.shot('m-today-after'); await t.text('main', 800);
});
