require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  for (const q of []) { await p.keyboard.press('Control+k'); await p.waitForTimeout(300); await p.keyboard.type(q); await p.waitForTimeout(400); const s = await p.locator('[role=dialog]:visible').innerText(); console.log(`palette "${q}":`, s.replace(/\n+/g, ' | ').slice(0, 300)); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  await t.click(p.getByText('Settings', { exact: true }).first()); await p.waitForTimeout(800); t.log('settings hash:', await p.evaluate(() => location.hash));
  const btn = p.getByRole('button', { name: 'Export JSON backup' });
  await btn.scrollIntoViewIfNeeded(); await t.shot('your-data');
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await t.click(btn); const d = await dl;
  if (d) { const f = require('path').join(require('./ux').OUT, 'backup-' + d.suggestedFilename()); await d.saveAs(f); t.log('downloaded', d.suggestedFilename(), require('fs').statSync(f).size, 'bytes'); }
  else t.log('no download event');
  await t.shot('after-export'); await t.text('.toasts', 300);
});
