require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  const card = p.locator('main').getByText('Figma', { exact: true }).first();
  await card.hover(); await p.waitForTimeout(300); await t.shot('hover-card');
  const cbs = await p.locator('main input[type=checkbox]:visible, main [role=checkbox]:visible').count(); t.log('visible checkboxes on hover:', cbs);
  // Linear habit: shift/cmd-click to multi-select
  await card.click({ modifiers: ['Shift'] }); await p.waitForTimeout(400);
  await t.shot('shift-click'); t.log('dialog open after shift-click?', await p.locator('[role=dialog]:visible').count());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await t.click(p.getByRole('button', { name: /Table/ }));
  await t.shot('table'); await t.text('main', 1500); await t.buttons('main');
});
