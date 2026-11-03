require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.click(p.getByText('Interview prep', { exact: true }).first());
  await p.waitForTimeout(800);
  await t.shot('prep-landing'); await t.text('main', 2500); await t.buttons('main');
});
