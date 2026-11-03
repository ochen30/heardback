require('./h').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(600);
  await t.tap(t.vis('Associate Data Scientist'));
  const d = () => p.locator('[role=dialog]:visible');
  await t.tap(d().getByRole('tab', { name: 'Rounds' }).or(d().getByRole('button', { name: /^Rounds/ })));
  await t.shot('rounds');
  await t.tap(d().getByRole('button', { name: /Edit/ }));
  await d().getByRole('combobox', { name: 'Round type' }).selectOption({ label: 'Technical' });
  await d().locator('input[type=datetime-local]').fill('2026-11-06T10:00'); await d().locator('input[type=datetime-local]').blur();
  await p.waitForTimeout(400); await t.shot('round-filled'); 
  await t.tryTap(d().getByRole('button', { name: 'Done' }));
  await t.tryTap(d().getByRole('button', { name: 'Close' }));
  await t.tap(t.vis('Today')); await p.waitForTimeout(500);
  await t.shot('today'); await t.text('main', 1400);
  await t.tap(t.vis('Prep')); await p.waitForTimeout(800);
  await t.shot('prep'); await t.text('main', 3000); await t.buttons('main');
});
