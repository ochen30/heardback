require('./ux').run(async (t) => {
  const p = t.page; await t.go('today');
  await t.click(p.getByText('Pipeline', { exact: true }).first());
  await p.waitForTimeout(800);
  await t.shot('pipeline'); await t.text('main', 2500); await t.buttons('main');
});
