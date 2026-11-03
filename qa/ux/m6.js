require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  for (const [co, role, d] of [['Stripe', 'Software Engineering Intern', '2026-10-01'], ['Figma', 'Software Engineer Intern', '2026-10-05']]) {
    await t.click(p.locator('header, .topbar').getByRole('button').last());
    const dlg = p.locator('[role=dialog]:visible');
    await t.type(dlg.getByPlaceholder('e.g. Northwind Labs'), co);
    await t.type(dlg.getByPlaceholder('e.g. Software Engineer Intern'), role);
    await dlg.locator('input[type=date]').fill(d);
    await t.click(dlg.getByRole('button', { name: /Add application/ }).last());
  }
  await t.click(p.getByRole('button', { name: 'Pipeline' }).last()); await p.waitForTimeout(600);
  await t.shot('m-pipeline'); await t.buttons('main');
  const tb = p.getByRole('button', { name: /Table|List/ }).first();
  if (await tb.count()) { await t.click(tb); await t.shot('m-pipeline-list'); }
  // long-press like a phone user to select
  const card = p.locator('main').getByText('Stripe', { exact: true }).first();
  const b = await card.boundingBox(); await p.mouse.move(b.x + 5, b.y + 5); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up(); await p.waitForTimeout(400);
  await t.shot('m-longpress'); t.log('dialog after long-press:', await p.locator('[role=dialog]:visible').count());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const cbs = p.locator('main input[type=checkbox]'); t.log('checkboxes:', await cbs.count(), 'visible:', await cbs.first().isVisible().catch(() => false));
});
