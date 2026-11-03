const { EMAIL } = require('./t4a');
require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  t.log('Log an email visible on Today?', await p.getByText('Log an email').count(), await p.getByText('Log an email').first().isVisible().catch(() => false));
  await t.click(p.getByRole('button', { name: 'More' }).or(p.getByRole('link', { name: 'More' })).last());
  await t.shot('m-more'); await t.buttons('[role=dialog]:visible, [role=menu]:visible, body');
});
