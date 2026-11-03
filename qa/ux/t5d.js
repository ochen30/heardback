require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(1000);
  await t.shot('today-after-call'); await t.text('main', 1500); await t.buttons('main');
});
