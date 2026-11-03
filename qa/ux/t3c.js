require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  await t.click(p.locator('main').getByText('Roku', { exact: true }).first());
  const d = p.locator('.drawer, [role=dialog]').first();
  await t.click(d.getByRole('button', { name: /Nov 3, 2026/ }));
  await t.shot('date-edit');
  const inp = d.locator('input:focus, input[type=date]').first();
  t.log('input type:', await inp.getAttribute('type'), 'value:', await inp.inputValue().catch(() => '?'));
  await inp.fill('2026-11-02'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  await t.shot('date-set'); await t.text('.drawer, [role=dialog]', 1200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await t.text('main', 600); await t.text('.app-side, nav, aside', 300);
});
