require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  for (const [co, role, d] of [['Stripe', 'Software Engineering Intern', '2026-10-01'], ['Figma', 'Software Engineer Intern', '2026-10-05']]) {
    await t.click(p.locator('header, .topbar').getByRole('button', { name: /Add/ }).last());
    const dlg = p.locator('[role=dialog]:visible');
    await t.type(dlg.getByPlaceholder('e.g. Northwind Labs'), co);
    await t.type(dlg.getByPlaceholder('e.g. Software Engineer Intern'), role);
    await dlg.locator('input[type=date]').fill(d);
    await t.click(dlg.getByRole('button', { name: /Add application/ }).last());
  }
  await p.waitForTimeout(500);
  await t.shot('board-with-stale'); await t.text('main', 1500);
});
