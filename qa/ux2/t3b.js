require('./h').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(800);
  await t.tap(t.role('button', /Filters/));
  await t.tap(p.locator('[role=dialog]:visible').getByText('Seattle', { exact: true }));
  const posted = p.locator('[role=dialog]:visible').getByRole('button', { name: '7d' }).or(p.locator('[role=dialog]:visible').getByRole('radio', { name: '7d' }));
  await t.tap(posted);
  await t.shot('filters-set');
  await t.tap(p.locator('[role=dialog]:visible').getByRole('button', { name: /^Show \d+ match/ }));
  await t.shot('results'); await t.text('main', 2500);
  // sort by most likely real
  const sel = p.getByRole('combobox', { name: /Sort/ }).locator('visible=true');
  t.log('sort options', await sel.locator('option').allInnerTexts().catch(() => []));
  await sel.selectOption({ label: 'Most likely real' }).catch((e) => t.log('select fail', e.message.slice(0, 80)));
  await p.waitForTimeout(500);
  await t.shot('sorted-real'); await t.text('main', 2500);
  // what does a signal look like in list? compare with ghost toggle off
  const rows = await p.locator('main').locator('text=/signal|ghost|Reposted|Closed|repost/i').allInnerTexts();
  t.log('signal mentions in list:', rows.slice(0, 20));
});
