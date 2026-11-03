require('./h').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(600);
  await t.tap(t.vis('Associate Data Scientist'));
  const d = () => p.locator('[role=dialog]:visible');
  await t.tap(d().getByRole('tab', { name: 'Rounds' }).or(d().getByRole('button', { name: 'Rounds' })));
  await t.tap(d().getByRole('button', { name: 'Add round' }));
  await t.shot('add-round'); await t.text('[role=dialog]:visible', 1500); await t.buttons('[role=dialog]:visible'); await t.targets('addround');
  const inputs = await d().locator('input, select, textarea').evaluateAll((els) => els.map((e) => `${e.tagName}/${e.type}/${e.getAttribute('aria-label') || e.name || e.placeholder}@${Math.round(e.getBoundingClientRect().top)}`));
  t.log('inputs', inputs);
});
