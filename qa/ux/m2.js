// Mobile: find + filter + save + flagged
require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  await t.click(p.getByRole('button', { name: 'Find' }).or(p.getByRole('link', { name: 'Find' })).last());
  await p.waitForTimeout(1200);
  await t.shot('m-find'); await t.buttons('main');
  const f = p.getByRole('button', { name: /Filters?/ }).first();
  if (await f.count()) { await t.click(f); await t.shot('m-filters'); await t.buttons('[role=dialog]:visible'); 
    await t.tryClick(p.locator('[role=dialog]:visible').getByRole('button', { name: '3d', exact: true }));
    await t.shot('m-filters-3d');
    await t.tryClick(p.locator('[role=dialog]:visible').getByRole('button', { name: /Show|Done|Apply|results/ }).last());
  }
  await t.shot('m-find-filtered');
  const row = p.locator('.find-row', { hasText: 'Software Engineer Intern – AI Engineering' }).first();
  await t.click(row); await t.shot('m-drawer'); 
  await p.mouse.wheel(0, 600); await p.waitForTimeout(300); await t.shot('m-drawer-scrolled');
  await t.buttons('[role=dialog]:visible');
  await t.click(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Save', exact: true }));
  await t.shot('m-saved');
});
