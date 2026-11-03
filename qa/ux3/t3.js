// Task 3: clean up the board, bulk-mark 4 stale apps ghosted.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('pipeline');
  await page.evaluate(() => store.set((s) => ({ ...s, ui: { ...s.ui, pipelineView: 'board' } })));
  await page.waitForTimeout(300);
  await t.shot('board');
  // what does the Applied column show for stale cards?
  const applied = await page.evaluate(() => { const col = [...document.querySelectorAll('[data-card]')]; return col.map((c) => c.innerText.replace(/\s+/g, ' ').trim()).slice(0, 40); });
  console.log('CARDS\n' + applied.join('\n'));
  await page.setViewportSize({ width: 1440, height: 2400 }); await page.waitForTimeout(300);
  await t.shot('board-tall');
  await page.setViewportSize({ width: 1440, height: 900 });
  // Board route: select stale cards with X on focused card
  const s0 = Date.now();
  const card = (c) => page.locator('[data-card]', { hasText: c }).first();
  await card('Tanium').focus(); await t.key('x');
  await card('Talos').focus(); await t.key('x');
  await card('American Express').focus(); await t.key('x');
  await card('CACI').focus(); await t.key('x');
  await t.shot('board-4-selected');
  await t.text('.pl-bulk', 300);
  // undo-able bulk ghost
  await t.click(page.locator('.pl-bulk').getByRole('button', { name: 'Mark as ghosted' }));
  await t.shot('board-after-bulk');
  await t.text('.toasts', 300);
  console.log('bulk ms', Date.now() - s0);
  const st = await page.evaluate(() => ['Tanium', 'Talos', 'American Express', 'CACI', 'Plaid'].map((c) => `${c}:${Apps.list().find((a) => a.company === c)?.stage}`).join(' '));
  console.log('STAGES', st);
  // Table: is "Days silent" sortable and does it make the stale ones obvious?
  await t.click(page.getByRole('radio', { name: 'Table' }).or(page.getByRole('button', { name: 'Table' })));
  await t.click(page.locator('th button', { hasText: 'Days silent' }));
  await t.shot('table-silent');
  const rows = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].slice(0, 12).map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
  console.log('TABLE\n' + rows.join('\n'));
  // Esc clears selection? select-all checkbox semantics
  await t.text('.pl-head', 200);
});
