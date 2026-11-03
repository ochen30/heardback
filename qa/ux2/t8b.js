require('./h').run(async (t) => {
  const p = t.page; await t.go('stats'); await p.waitForTimeout(800);
  await t.tap(p.getByRole('button', { name: /Share/ }).locator('visible=true'));
  const d = () => p.locator('[role=dialog]:visible');
  await t.tap(d().getByRole('button', { name: 'All time' }));
  await t.shot('alltime');
  await t.tap(d().getByRole('button', { name: 'Save image' }));
  await p.waitForTimeout(1500); await t.shot('after-save'); await t.text('[role=dialog]:visible', 1200); await t.text('.toasts', 500); await t.buttons('[role=dialog]:visible');
  await t.tryTap(d().getByRole('button', { name: 'Copy caption' }));
  await p.waitForTimeout(500); await t.shot('after-copy'); await t.text('.toasts', 500);
  t.log('clipboard:', await p.evaluate(() => navigator.clipboard.readText()).catch((e) => 'ERR ' + e.message));
});
