// Task 5: find the two applications whose postings were taken down, and decide what to do.
const { run } = require('./h');
const pal = (page) => page.evaluate(() => [...document.querySelectorAll('.palette-list > *')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).join(' | '));
run(async (t) => {
  const { page } = t;
  await t.go('today');
  // Can the palette find them?
  for (const q of ['taken down', 'removed', 'closed', 'posting']) { await t.key('Control+k'); await t.keyType(q, { wait: 250 }); console.log(`Q[${q}]`, (await pal(page)).slice(0, 300)); await t.key('Escape', { wait: 150 }); }
  // Pipeline filter
  await t.go('pipeline');
  await page.fill('#pl-filter', 'taken down'); await page.waitForTimeout(300);
  console.log('pipeline filter "taken down" cards:', await page.locator('[data-card]').count());
  await page.fill('#pl-filter', '');
  // Today: where in the list?
  await t.go('today');
  await t.click(page.getByRole('button', { name: /Show \d+ more/ }));
  const pos = await page.evaluate(() => [...document.querySelectorAll('.td-task')].map((e, i) => /took down/.test(e.innerText) ? i + 1 : 0).filter(Boolean));
  console.log('took-down positions in Needs you:', pos, 'of', await page.locator('.td-task').count());
  // Review Figma
  const row = page.locator('.td-task', { hasText: 'Figma took down' }).first();
  await row.scrollIntoViewIfNeeded();
  await t.shot('today-takedown-row');
  await t.click(row.locator('.td-act'), { wait: 700 });
  await t.shot('figma-review');
  await t.text('.drawer', 1500);
  await t.buttons('.drawer');
  // listing block?
  const listing = await page.locator('.drawer').getByText(/Listing|taken down|no longer/i).allInnerTexts();
  console.log('LISTING TEXT', listing);
  await page.setViewportSize({ width: 1440, height: 1500 }); await page.waitForTimeout(300);
  await t.shot('figma-review-tall');
  await page.setViewportSize({ width: 1440, height: 900 });
  await t.key('Escape');
  // Ramp (screen stage)
  const row2 = page.locator('.td-task', { hasText: 'Ramp took down' }).first();
  await t.click(row2.locator('.td-act'), { wait: 700 });
  await t.text('.drawer', 900);
  await t.shot('ramp-review');
  // Decision: follow up Figma (Draft follow-up from drawer?), keep Ramp (they passed OA -> waiting) -> snooze the takedown task
  await t.key('Escape');
  const nTasks = await page.locator('.td-task').count();
  await t.click(page.locator('.td-task', { hasText: 'Ramp took down' }).first().locator('.td-more'));
  await t.buttons('.td-menu');
  await t.click(page.getByRole('menuitem', { name: 'Dismiss' }));
  console.log('tasks', nTasks, '->', await page.locator('.td-task').count());
  // does a "listing removed" app show in Find / Company page?
  await t.go('companies');
  await t.key('Control+k'); await t.keyType('figma'); console.log('palette figma:', (await pal(page)).slice(0, 300)); await t.key('Escape');
});
