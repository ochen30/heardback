// Task 4: add both interviews (Stripe, Datadog) to calendar. No connector in test.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  // Is there a calendar action on Today (task row menu or Upcoming row)?
  const row = page.locator('.task, [class*=task]').filter({ hasText: 'Datadog' }).first();
  const more = row.getByRole('button', { name: /more|options|⋯/i });
  if (await more.count()) { await t.click(more); await t.shot('today-row-menu'); await t.buttons('[role=menu], .menu'); await t.key('Escape'); }
  console.log('calendar buttons on Today:', await page.getByRole('button', { name: /calendar/i }).count());
  console.log('palette "calendar":');
  await t.key('Control+k'); await t.keyType('calendar', { wait: 400 });
  console.log(await page.evaluate(() => [...document.querySelectorAll('.palette-list > *')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 8).join(' | ')));
  await t.key('Escape');
  // Stripe via Prep header
  await t.go('prep');
  await t.click(page.locator('.prep-item').filter({ hasText: 'Stripe' }));
  const calBtn = page.locator('.prep-cal button');
  console.log('cal button title:', await calBtn.getAttribute('title'));
  await calBtn.hover(); await page.waitForTimeout(600);
  await t.click(calBtn, { wait: 700 });
  await t.text('.toasts', 400);
  await t.shot('stripe-cal');
  console.log('cal button now:', await calBtn.innerText(), '| round.calendar =', await page.evaluate(() => Apps.list().find((a) => a.company === 'Stripe').rounds.find((r) => r.type === 'technical').calendar));
  try { console.log('clipboard:', (await page.evaluate(() => navigator.clipboard.readText())).slice(0, 160).replace(/\r?\n/g, ' / ')); } catch (e) { console.log('clipboard n/a'); }
  // Datadog via Pipeline drawer rounds tab
  await t.go('pipeline');
  await t.click(page.locator('[data-card]').filter({ hasText: 'Datadog' }), { wait: 700 });
  const tab = page.getByRole('tab', { name: /rounds|interviews/i });
  if (await tab.count()) await t.click(tab.first(), { wait: 500 });
  await t.shot('datadog-drawer');
  const dcal = page.locator('.drawer').getByRole('button', { name: /calendar/i });
  console.log('drawer cal buttons:', await dcal.count());
  if (await dcal.count()) { await t.click(dcal.first(), { wait: 700 }); await t.text('.toasts', 400); await t.shot('datadog-cal'); console.log('after:', await dcal.first().innerText().catch(() => '?')); }
  await t.text('.drawer', 1800);
});
