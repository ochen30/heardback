require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  // from Today's Upcoming row, is there a prep entry?
  await t.tap(t.vis('Zillow · Technical'));
  await p.waitForTimeout(600); await t.shot('from-upcoming'); console.log('URL', p.url()); await t.text('[role=dialog]:visible, main', 600);
  await t.go('prep'); await p.waitForTimeout(600);
  const opts = await p.locator('#prep-select option').allInnerTexts(); t.log('options', opts);
  await p.locator('#prep-select').selectOption({ index: 0 }); await p.waitForTimeout(600);
  await t.shot('zillow-prep'); await t.text('main', 3500); await t.buttons('main');
  await t.shot('zillow-prep-2', false);
});
