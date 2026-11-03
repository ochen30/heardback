require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(1000);
  await t.shot('today-day-before'); await t.text('main', 900);
});
