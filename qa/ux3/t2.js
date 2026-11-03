// Task 2: keyboard only. Palette -> jump to an app -> move to Interviews -> add a round -> back to Find -> save 3 fresh roles with J/K/S.
const { run } = require('./h');
const pal = (page) => page.evaluate(() => [...document.querySelectorAll('.palette-list > *')].map((e) => (e.classList.contains('palette-group') ? '## ' : '  ') + e.innerText.replace(/\s+/g, ' ').trim()).join('\n'));
run(async (t) => {
  const { page } = t;
  await t.go('today');
  let s = Date.now();
  await t.key('Control+k');
  console.log('PALETTE (empty)\n' + await pal(page));
  await t.keyType('hex');
  console.log('PALETTE hex\n' + await pal(page));
  await t.shot('palette-hex');
  await t.key('Enter', { wait: 600 });
  await t.focused();
  await t.shot('hex-drawer');
  // Move to Interviews: try palette context action
  await t.key('Control+k');
  console.log('PALETTE ctx (empty)\n' + await pal(page));
  await t.keyType('interv');
  console.log('PALETTE ctx interv\n' + await pal(page));
  await t.shot('palette-ctx');
  // pick "Move to Interviews"
  const items = await page.locator('.palette-item').allInnerTexts();
  const idx = items.findIndex((x) => /Move to Interviews/.test(x));
  for (let i = 0; i < idx; i++) await t.key('ArrowDown', { wait: 80 });
  await t.key('Enter', { wait: 700 });
  await t.focused();
  await t.text('.drawer', 400);
  await t.shot('moved');
  // add a round via palette
  await t.key('Control+k'); await t.keyType('round');
  console.log('PALETTE round\n' + await pal(page));
  await t.key('Enter', { wait: 700 });
  await t.focused();
  await t.shot('after-add-round-cmd');
  // Now try to reach "Add round" with Tab
  let found = false;
  for (let i = 0; i < 25; i++) { await t.key('Tab', { wait: 60 }); const f = await t.focused(); if (/Add round/.test(f)) { found = i + 1; break; } }
  console.log('tabs to Add round:', found);
  if (found) { await t.key('Enter', { wait: 600 }); await t.focused(); await t.shot('round-form'); await t.text('.drawer', 900); }
  // fill: type a date? Tab through the new round form
  for (let i = 0; i < 6; i++) { await t.key('Tab', { wait: 60 }); await t.focused(); }
  await t.shot('round-form-tabbed');
  console.log('time to round (ms)', Date.now() - s);
  // back to Find: Escape then g f
  s = Date.now();
  await t.key('Escape'); await t.focused();
  await t.key('g', { wait: 50 }); await t.key('f', { wait: 900 });
  console.log('route', await page.evaluate(() => location.hash));
  await t.focused();
  await t.shot('find');
  // J/K/S
  await t.key('j'); await t.focused(); await t.key('j'); await t.focused();
  await t.shot('find-j2');
  await t.key('s'); await t.focused(); await t.shot('find-s1');
  await t.key('j'); await t.key('s'); await t.key('j'); await t.key('k'); await t.key('j'); await t.key('j'); await t.key('s');
  await t.focused();
  await t.shot('find-saved3');
  const saved = await page.evaluate(() => Apps.list().filter((a) => a.stage === 'saved').map((a) => `${a.company} · ${a.title} · created ${new Date(a.createdAt).toLocaleString()}`));
  console.log('SAVED NOW', saved.join('\n'));
  // Enter to open + Esc returns?
  await t.key('Enter', { wait: 700 }); await t.shot('find-enter-drawer'); await t.focused();
  await t.key('s'); console.log('after S in drawer, saved=', await page.evaluate(() => Apps.list().filter((a) => a.stage === 'saved').length));
  await t.key('Escape'); await t.focused();
  console.log('find ms', Date.now() - s);
  // Does J/K work on Pipeline or Today?
  await t.key('g', { wait: 50 }); await t.key('p', { wait: 900 });
  await t.key('j'); await t.focused(); await t.key('j'); await t.focused();
  await t.shot('pipeline-jk');
  await t.key('g', { wait: 50 }); await t.key('t', { wait: 900 });
  await t.key('j'); await t.focused();
  // Palette: search for commands a power user would type
  for (const q of ['ghost', 'follow', 'today', 'snooze', 'thank', 'export', 'table', 'select', 'note', 'outcome']) {
    await t.key('Control+k'); await t.keyType(q, { wait: 250 });
    const p = (await pal(page)).split('\n').slice(0, 7).join(' | ');
    console.log(`Q[${q}] -> ${p}`);
    await t.key('Escape', { wait: 150 });
  }
});
