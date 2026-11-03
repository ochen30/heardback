const { EMAIL } = require('./t4a');
require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  // realistic variant first: copy just the body from Gmail (no headers) -- don't save
  const body = EMAIL.split('\n\n').slice(1).join('\n\n');
  await t.click(p.getByRole('button', { name: /Log an email/ }).first());
  await t.type(p.locator('[role=dialog]:visible textarea').first(), body);
  await t.click(p.getByRole('button', { name: 'Read email' }));
  await t.shot('body-only-parse'); await t.text('[role=dialog]:visible', 600);
  await t.click(p.getByRole('button', { name: 'Cancel' }));
  // the real one, with headers
  await t.click(p.getByRole('button', { name: /Log an email/ }).first());
  await t.type(p.locator('[role=dialog]:visible textarea').first(), EMAIL);
  await t.click(p.getByRole('button', { name: 'Read email' }));
  await t.click(p.getByRole('button', { name: 'Update application' }));
  await p.waitForTimeout(800);
  await t.shot('after-update'); await t.text('.toasts', 400); await t.text('main', 1800);
});
