require('./h').run(async (t) => {
  const p = t.page; await t.go('prep'); await p.waitForTimeout(800);
  await t.tryTap(p.getByRole('button', { name: 'Practice anyway' }), { timeout: 1500 });
  await t.tap(p.getByRole('button', { name: 'Technical', exact: true }).locator('visible=true'));
  t.log('role select value', await p.locator('main select').nth(1).inputValue().catch(() => '?'));
  await t.shot('tech-data'); await t.text('main', 2000);
  await t.tap(p.getByRole('button', { name: /^1 / }).locator('visible=true'));
  await t.shot('q1-open'); await t.text('main', 1200);
  await t.tap(p.getByRole('button', { name: 'Practice', exact: true }).locator('visible=true'));
  await t.shot('practice'); await t.text('main, [role=dialog]:visible', 1500); await t.buttons('[role=dialog]:visible, main'); await t.targets('practice');
});
