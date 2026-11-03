require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  await t.click(p.getByText('Settings', { exact: true }).first()); await p.waitForTimeout(600);
  await t.click(p.getByRole('button', { name: 'Export JSON backup' }), { wait: 1200 });
  await t.text('.toasts, [role=status], [aria-live]', 400);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message));
  t.log('clipboard starts:', clip.slice(0, 120), 'len', clip.length);
  await t.shot('export-feedback');
});
