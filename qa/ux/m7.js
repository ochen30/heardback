require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  await t.click(p.getByRole('button', { name: 'Pipeline' }).last()); await p.waitForTimeout(600);
  for (const co of ['Figma', 'Stripe']) { const cb = p.locator('tbody tr, .pl-row, li', { hasText: co }).locator('input[type=checkbox]').first(); const b = await cb.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(300); }
  await t.shot('m-selected'); await t.buttons('main');
  await t.click(p.getByRole('button', { name: /Mark as ghosted/ }).first());
  await t.shot('m-ghosted'); await t.text('.toasts', 300);
  // backup on mobile
  await t.click(p.getByRole('button', { name: 'More' }).last());
  await t.click(p.locator('[role=dialog]:visible').getByText('Settings'));
  await p.waitForTimeout(500);
  const btn = p.getByRole('button', { name: 'Export JSON backup' }); await btn.scrollIntoViewIfNeeded();
  await t.click(btn, { wait: 900 }); await t.shot('m-backup'); await t.text('.toasts', 300);
});
