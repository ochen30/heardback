require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  const card = p.locator('main').getByText('Roku', { exact: true }).first();
  const col = p.locator('main').getByText('Nothing here yet').first();
  await card.dragTo(col); await p.waitForTimeout(700);
  await t.shot('after-drag'); await t.text('.toasts', 400);
  await t.text('main', 900);
  // open the Roku card to set the applied date to yesterday
  await t.click(p.locator('main').getByText('Roku', { exact: true }).first());
  await p.waitForTimeout(600);
  await t.shot('app-drawer'); await t.text('.drawer, [role=dialog]', 3000); await t.buttons('.drawer, [role=dialog]');
});
