require('./h').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(800);
  await t.tap(t.vis('Junior Data Engineer'));
  await t.tap(p.locator('[role=dialog]:visible').getByText('View company'));
  await t.shot('company'); await t.text('[role=dialog]:visible, main', 2000);
  // footer trash in app drawer
  await t.go('pipeline'); await t.tap(t.vis('Junior Data Engineer'));
  const r = await p.locator('[role=dialog]:visible button').evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().top > 690).map((b) => { const r = b.getBoundingClientRect(); return `${(b.getAttribute('aria-label') || b.innerText).trim()} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
  t.log('footer buttons', r);
});
