require('./ux').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(1200);
  const rows = p.locator('.find-row');
  t.log('row count rendered:', await rows.count());
  const flagged = p.locator('.find-row', { hasText: /ghost signals/i });
  t.log('flagged rows:', await flagged.count());
  const first = flagged.first(); await first.scrollIntoViewIfNeeded();
  t.log('flagged row text:', (await first.innerText()).replace(/\n/g, ' | '));
  await first.locator('[class*=dot]').first().hover().catch(() => {}); await p.waitForTimeout(600);
  await t.shot('flagged-row-hover');
  await t.click(first);
  await t.shot('flagged-drawer'); await t.text('.drawer, [role=dialog]', 1800);
  await t.tryClick(p.locator('.drawer, [role=dialog]').getByText('How we score listings').first());
  await t.shot('how-we-score'); await t.text('[role=dialog]:visible', 2500);
});
