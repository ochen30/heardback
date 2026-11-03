require('./h').run(async (t) => {
  const p = t.page; await t.go('pipeline');
  await t.tap(t.role('button', 'Table').or(t.role('tab', 'Table')));
  await t.shot('table'); await t.text('main', 1500); await t.targets('table');
  
  await t.tap(t.vis('Associate Data Scientist'));
  await t.shot('zillow-drawer'); await t.text('[role=dialog]:visible', 2000); await t.buttons('[role=dialog]:visible'); await t.targets('drawer');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await t.tap(t.vis('Today'));
  await t.shot('today'); await t.text('main', 2500);
});
