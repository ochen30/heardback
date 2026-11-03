require('./ux').run(async (t) => {
  const p = t.page; await t.go('today');
  await t.click(p.getByRole('link', { name: 'Find jobs' }).or(p.getByRole('button', { name: 'Find jobs' })).first());
  await p.waitForTimeout(1500);
  await t.shot('find-landing'); await t.text('main', 3500); await t.buttons('main');
});
