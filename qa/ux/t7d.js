require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  if (!(await p.locator('table.pl-table').count())) await t.click(p.getByRole('button', { name: /Table/ }));
  for (const co of ['Figma', 'Stripe']) { const cb = p.locator('tbody tr', { hasText: co }).locator('input[type=checkbox]').first(); t.log(co, 'cb visible:', await cb.isVisible(), 'count', await cb.count()); const b = await cb.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(300); }
  await t.shot('two-selected'); await t.buttons('main');
  await t.click(p.getByRole('button', { name: /Mark as ghosted/ }).first());
  await p.waitForTimeout(500);
  await t.shot('after-bulk'); await t.text('.toasts', 300); await t.text('main', 1200);
});
