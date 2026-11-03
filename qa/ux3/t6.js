// Task 6 (phone 375x812): check what's next today, log a quick note on an application.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  const s = Date.now();
  await t.go('today');
  console.log('today ready ms', Date.now() - s);
  await t.shot('today');
  await t.text('.workspace', 900);
  await t.targets('today fold');
  // scroll to upcoming
  const up = page.locator('#td-up-h');
  const upY = await up.evaluate((e) => e.getBoundingClientRect().top + document.getElementById('workspace').scrollTop).catch(() => -1);
  console.log('Upcoming heading y (scroll offset):', upY);
  await up.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await t.shot('upcoming');
  // tap Notion row -> drawer
  await t.tap(page.locator('.td-up-row', { hasText: 'Notion' }));
  await t.shot('notion-drawer');
  await t.buttons('.drawer');
  // log a quick note: try Notes tab first (what a user taps)
  await t.tap(page.getByRole('tab', { name: /Notes/ }));
  await t.shot('notes-tab');
  await t.type(page.locator('#pl-notes'), 'Chris W. is on the infra team — ask about on-call + intern projects');
  await page.waitForTimeout(900);
  await t.shot('notes-typed');
  await t.text('.drawer', 600);
  // Timeline quick note
  await t.tap(page.getByRole('tab', { name: /Timeline/ }));
  await t.type(page.locator('#pl-tl-note'), 'Recruiter said decisions by Friday');
  await t.shot('timeline-note-kbd');
  await t.tap(page.getByRole('button', { name: 'Add note' }));
  await t.shot('timeline-note-added');
  // close drawer
  await t.tryTap(page.getByRole('button', { name: 'Close' }));
  // palette on phone? search entry
  await t.shot('after-close');
  await t.buttons('.topbar, header');
  const saved = await page.evaluate(() => { const a = Apps.list().find((x) => x.company === 'Notion'); return { notes: a.notes, lastEvent: a.events[a.events.length - 1] }; });
  console.log('SAVED', JSON.stringify(saved));
});
