// Task 4: open a saved job from the pipeline and decide if it's worth applying
require('./h').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  await t.shot('pipeline'); await t.text('main', 800);
  await t.tap(t.vis('Junior Data Engineer'));
  await t.shot('saved-app'); await t.text('[role=dialog]:visible', 2500); await t.buttons('[role=dialog]:visible');
  await p.locator('[role=dialog]:visible').evaluate((d) => { const s = [...d.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (s) s.scrollTop = 99999; });
  await p.waitForTimeout(300); await t.shot('saved-app-bottom');
  // look for listing / fit info; try the posting/company
  if (await t.tryTap(p.locator('[role=dialog]:visible').getByText(/View (listing|job|company)|Listing check|See listing/i))) { await t.shot('from-app-link'); await t.text('[role=dialog]:visible, main', 2000); }
});
