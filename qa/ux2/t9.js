require('./h').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(600);
  await t.tryTap(t.role('button', 'Board'));
  const hint = p.getByText(/Press the left and right arrow keys/);
  t.log('kbd hint visible on phone board?', await hint.isVisible().catch(() => 'n/a'), await hint.evaluate((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }).catch(() => ''));
  await t.go('prep'); await p.waitForTimeout(600);
  await t.tap(p.getByRole('button', { name: 'Add to calendar' }).locator('visible=true'));
  await p.waitForTimeout(800); await t.shot('add-cal'); await t.text('[role=dialog]:visible', 800); await t.text('.toasts', 400); await t.buttons('[role=dialog]:visible');
});
