// Task 6: day-of on the phone (375). What's next, when, with whom, one tap to notes.
// Prep: PROFILE=day FRESH=1 TAG=seed node qa/ux4/seed.js && PROFILE=day TAG=t6n node qa/ux4/t6.js notes
// Run:  PROFILE=day W=375 CLOCK=2026-11-04T09:00:00-08:00 TAG=t6 node qa/ux4/t6.js
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  if (process.argv[2] === 'notes') {
    await page.evaluate(() => { const a = Apps.list().find((x) => x.company === 'Stripe'); const r = a.rounds.find((x) => x.type === 'technical'); Apps.updateRound(a.id, r.id, { prep: '- Lead with SplitSmart ledger story.\n- Brex webhook retry: idempotency keys, 30/wk -> 0.\n- Ask Daniel: how Payments handles idempotency.\n- Zoom link is in Hannah\'s email (Oct 27).' }); const f = Apps.list().find((x) => x.company === 'Figma'); const fr = f.rounds.find((x) => x.type === 'technical'); Apps.updateRound(f.id, fr.id, { thanked: true }); store.save && store.save(); });
    await page.waitForTimeout(500); console.log('notes seeded'); return;
  }
  console.log('NOW', await page.evaluate(() => new Date(now()).toString().slice(0, 24)));
  await t.shot('today');
  await t.text('main', 1400);
  await t.targets('today first screen');
  // what is above the fold?
  console.log('ABOVE FOLD:', await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const b = e.getBoundingClientRect(); return e.children.length === 0 && b.top >= 0 && b.bottom <= innerHeight && e.innerText?.trim(); }).map((e) => e.innerText.trim()).join(' | ').slice(0, 700)));
  const s0 = Date.now();
  // Fastest route to notes: tap the Stripe row in Upcoming / Today
  const up = page.locator('main').getByText('Stripe', { exact: false });
  console.log('Stripe mentions:', await up.count());
  const prepBtn = page.locator('.task, [class*=task]').filter({ hasText: 'Stripe' }).getByRole('button', { name: 'Prep' });
  if (await prepBtn.count()) { await t.tap(prepBtn.first(), { wait: 900 }); }
  else { await t.tap(page.locator('main').getByText(/Stripe/).first(), { wait: 900 }); }
  console.log('route:', await page.evaluate(() => location.hash));
  await t.shot('after-tap');
  // how far down are the notes?
  const notes = page.locator('textarea[aria-label="Prep notes"]');
  if (await notes.count()) {
    const y = await notes.evaluate((e) => e.getBoundingClientRect().top + (document.getElementById('workspace')?.scrollTop || window.scrollY));
    console.log('Prep notes textarea at y =', Math.round(y), 'px (viewport 812) — screens down:', (y / 812).toFixed(1));
    await notes.scrollIntoViewIfNeeded();
    await t.shot('prep-notes');
    console.log('NOTES:', JSON.stringify(await notes.inputValue()));
  } else {
    await t.text('main', 1500);
  }
  console.log('time to notes ms', Date.now() - s0);
  await t.shot('prep-top-full', true);
  // Alternative: Upcoming row -> drawer?
  await t.go('today');
  const urow = page.locator('main').locator('button, a, [role=button]').filter({ hasText: /Stripe/ });
  console.log('Upcoming/Today Stripe controls:', (await urow.allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).join(' || '));
  const uprow = page.locator('main').locator('button, a, [role=button]').filter({ hasText: /Stripe · Technical/ });
  if (await uprow.count()) { await t.tap(uprow.first(), { wait: 900 }); await t.shot('upcoming-tap'); await t.text('.drawer', 900); console.log('route:', await page.evaluate(() => location.hash)); }
  await t.targets('drawer');
});
