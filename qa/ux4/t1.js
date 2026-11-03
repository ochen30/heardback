// Tasks 1+2: From Today, reach tomorrow's Stripe prep; read likely questions, talking points, questions to ask; tailor (MOCK); write notes.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  const s0 = Date.now();
  const row = page.locator('.task, [class*=task]').filter({ hasText: 'Stripe' }).first();
  await t.click(row.getByRole('button', { name: 'Prep' }), { wait: 900 });
  console.log('route after Prep:', await page.evaluate(() => location.hash), 'ms', Date.now() - s0);
  await t.shot('prep-stripe');
  await t.shot('prep-stripe-full', true);
  await t.text('main', 6000);
  await t.buttons('main');
  // headings in order
  console.log('HEADINGS', await page.evaluate(() => [...document.querySelectorAll('main h1,main h2,main h3,main h4')].map((h) => h.tagName + ':' + h.innerText.trim()).join(' | ')));
  // Tailor questions (MOCK only)
  const tailor = page.locator('#prep-tailor');
  if (await tailor.count()) {
    await t.click(tailor, { wait: 1500 });
    await t.shot('tailored');
    await t.text('main', 6000);
  } else t.log('no tailor button (no Claude)');
  // Talking points card
  const talk = page.locator('.card').filter({ has: page.locator('h3', { hasText: /talking/i }) }).first();
  await t.text('.card:has(h3:text-matches("talking","i"))', 2000);
  // questions to ask
  await t.text('.card:has(h3:text-matches("ask","i"))', 2000);
  // notes
  const notes = page.locator('textarea[aria-label="Prep notes"]');
  console.log('notes prefilled value:', JSON.stringify(await notes.inputValue()));
  await notes.scrollIntoViewIfNeeded();
  await notes.click();
  await page.keyboard.type('- Lead with SplitSmart ledger story (immutable entries -> derivable balances).\n- Brex webhook retry: idempotency keys, 30/wk -> 0.\n- Ask Daniel: how Payments handles idempotency across retries.\n- Bring: laptop charged, IDE set up, Zoom link from Hannah email.', { delay: 2 });
  await page.waitForTimeout(800);
  await t.text('.card:has(textarea[aria-label="Prep notes"])', 600);
  await t.shot('notes-typed');
  // Does the note persist + show in app drawer?
  await t.go('today');
  await t.go('prep');
  console.log('prep default selection after reload:', await page.locator('#prep-select').evaluate((e) => e.options[e.selectedIndex].text));
  console.log('notes after reload:', JSON.stringify((await page.locator('textarea[aria-label="Prep notes"]').inputValue()).slice(0, 80)));
  // Is the Stripe recruiter's tip (app notes) visible in Prep?
  console.log('app notes visible on prep?', await page.getByText('pair-programming', { exact: false }).count());
  await t.shot('prep-after-reload');
});
