// Task 1: morning routine on Today. Clear nudges, thank-yous, outcomes as fast as possible.
const { run } = require('./h');
const tasks = (page) => page.evaluate(() => [...document.querySelectorAll('.td-task')].map((e) => e.querySelector('.td-task-title').innerText + ' -> ' + e.querySelector('.td-act').innerText));
run(async (t) => {
  const { page } = t;
  const t0 = Date.now();
  await t.go('today');
  console.log('first paint->today ms', Date.now() - t0);
  await t.shot('today-fold');
  await t.click(page.getByRole('button', { name: /Show \d+ more/ }));
  await page.setViewportSize({ width: 1440, height: 2600 }); await page.waitForTimeout(300);
  await t.shot('today-all-tasks');
  await page.setViewportSize({ width: 1440, height: 900 });
  const list = await tasks(page); console.log('TASKS', list.length + '\n' + list.join('\n'));
  // Keyboard: does J/K or Tab get you through tasks? Tab from body
  await page.locator('body').click({ position: { x: 700, y: 120 } });
  for (let i = 0; i < 8; i++) { await t.key('Tab', { wait: 60 }); }
  await t.focused();
  await t.key('j'); await t.focused();
  // --- thank-you (Hex) via Draft note
  const row = (txt) => page.locator('.td-task', { hasText: txt }).first();
  let s = Date.now();
  await t.click(row('thank-you note to Hex').locator('.td-act'));
  await t.shot('thanks-modal');
  await t.text('.modal', 900);
  await t.click(page.getByRole('button', { name: 'Mark as sent' }));
  console.log('thank-you Hex ms', Date.now() - s); await t.focused();
  // --- thank-you Databricks (pressing Enter on focused?)
  await t.click(row('thank-you note to Databricks').locator('.td-act'));
  await t.click(page.getByRole('button', { name: 'Mark as sent' }));
  // --- outcome Coinbase
  s = Date.now();
  await t.click(row('Coinbase recruiter call go').locator('.td-act'));
  await t.shot('outcome-drawer');
  await t.text('.drawer', 1500);
  await t.buttons('.drawer');
  // ghost tasks one by one
  await t.key('Escape');
  const before = (await tasks(page)).length;
  for (const c of ['Tanium', 'Talos', 'American Express']) {
    s = Date.now();
    const ok = await t.tryClick ? 0 : 0;
    await t.click(row(`No reply from ${c}`).locator('.td-act'), { wait: 500 });
    console.log('ghost', c, Date.now() - s, 'ms'); await t.focused();
  }
  await t.shot('after-3-ghosts');
  const after = await tasks(page); console.log('tasks', before, '->', after.length);
  // follow-ups: draft + mark sent x2
  for (const c of ['Niantic Spatial', 'Rhoda AI']) {
    await t.click(row(`Follow up with ${c}`).locator('.td-act'));
    if (c === 'Niantic Spatial') { await t.shot('followup-modal'); await t.buttons('.modal'); }
    await t.click(page.getByRole('button', { name: 'Mark as sent' }));
  }
  // Snooze menu
  await t.click(row('Follow up with Intercontinental').locator('.td-more'));
  await t.shot('snooze-menu');
  await t.key('Escape');
  const fin = await tasks(page); console.log('REMAINING', fin.length + '\n' + fin.join('\n'));
  await t.text('.td-head', 300);
  await t.shot('today-after-routine');
});
