require('./h').run(async (t) => {
  const p = t.page; await t.go('prep'); await p.waitForTimeout(800);
  await t.tap(p.getByRole('button', { name: 'Practice anyway' }));
  await t.shot('practice-anyway'); await t.text('main, [role=dialog]:visible', 3000); await t.buttons('main');
});
