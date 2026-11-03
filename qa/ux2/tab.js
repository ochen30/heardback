// 768x1024 tablet spot checks (same data profile)
require('./h').run(async (t) => {
  const p = t.page;
  for (const r of ['today', 'find', 'pipeline', 'prep', 'stats']) { await t.go(r); await p.waitForTimeout(600); await t.shot(r); await t.targets(r); }
  await t.go('pipeline'); await t.tryTap(t.role('button', 'Board')); await p.waitForTimeout(400); await t.shot('board');
  await t.tap(t.vis('Junior Data Engineer')); await t.shot('drawer');
  await t.go('find'); await t.tryTap(t.role('button', /Filters/), { timeout: 1500 }); await t.shot('find-filters');
});
