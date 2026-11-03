require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  // first instinct: command palette
  await p.keyboard.press('Control+k'); await p.waitForTimeout(300);
  await p.keyboard.type('backup'); await p.waitForTimeout(500);
  await t.shot('palette-backup'); await t.text('[role=dialog]:visible', 800);
  await p.keyboard.press('Escape');
  await t.click(p.getByText('Settings', { exact: true }).first()); await p.waitForTimeout(800);
  await t.shot('settings'); await t.text('main', 3500); await t.buttons('main');
});
