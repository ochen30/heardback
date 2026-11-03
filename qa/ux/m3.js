const { EMAIL } = require('./t4a');
require('./ux').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(1200);
  await t.click(p.locator('.find-row', { hasText: 'Software Engineer Intern – AI Engineering' }).first());
  await t.click(p.locator('[role=dialog]:visible').getByRole('button', { name: /Mark as applied/ }));
  await t.shot('m-marked-applied'); await t.text('[role=dialog]:visible', 500); await t.text('.toasts', 300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // log the recruiter email from the + button
  await t.click(p.locator('header, .topbar, .m-top').getByRole('button').last());
  await t.shot('m-plus-menu'); await t.buttons('[role=dialog]:visible, [role=menu]:visible');
  const le = p.getByRole('button', { name: /Log an email|email/i }).or(p.getByRole('menuitem', { name: /email/i })).first();
  if (await le.count()) { await t.click(le);
    await t.type(p.locator('[role=dialog]:visible textarea').first(), EMAIL);
    await t.click(p.getByRole('button', { name: 'Read email' }));
    await t.shot('m-email-read');
    await p.mouse.wheel(0, 800); await p.waitForTimeout(300); await t.shot('m-email-read-bottom');
    await t.click(p.getByRole('button', { name: /Update application/ }));
    await t.shot('m-email-done'); await t.text('.toasts', 300);
  }
});
