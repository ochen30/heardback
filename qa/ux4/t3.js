// Task 3: 3-question mock interview (MOCK) or practice mode (no Claude) for Stripe, then save takeaways.
// PATCH=1 swaps in a valid scorecard JSON (the stock mock answers the scorecard prompt with a question array).
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('prep');
  // make sure Stripe is selected
  await t.click(page.locator('.prep-item').filter({ hasText: 'Stripe' }));
  if (process.env.PATCH) await page.evaluate(() => {
    const orig = caps.sample; const f = async (input, opts) => { const p = typeof input === 'string' ? input : input.map((m) => m.content).join('\n'); if (/scorecard/.test(p)) { const text = JSON.stringify({ overall: 3, strengths: ['Concrete numbers from the Brex retry work', 'Clear structure on the ledger design'], improve: ['State the trade-off before the solution', 'Name a test you would write'], betterAnswer: { question: 'How would you design an idempotent payments API?', outline: 'Clarify retries and failure modes\nIdempotency key per request, stored with the result\nReturn the stored result on replay\nTest: same key twice -> one charge' } }); opts?.onText?.({ text, delta: text }); return { text, truncated: false }; } return orig(input, opts); }; f.json = async (i, o) => JSON.parse((await f(i, o)).text); f.limits = orig.limits; caps.sample = f; });
  const mock = page.locator('#prep-mock-start');
  if (await mock.count()) {
    const s0 = Date.now();
    await t.click(page.getByRole('radio', { name: '3 questions' }).or(page.getByRole('button', { name: '3 questions' })));
    await t.click(mock, { wait: 1200 });
    await t.shot('mock-q1');
    await t.text('.prep-mock', 1500);
    const answers = [
      'At Brex I built an idempotent retry layer for card-auth webhooks. Each event carried a key, we stored the result in Postgres, and replays returned the stored result. Duplicates went from about 30 a week to zero.',
      'I would start by asking about failure modes, then use an idempotency key per request and a unique constraint, and test by replaying the same request twice.',
      'Trade-off: I chose eventual consistency for the SplitSmart balance view so writes stayed simple; balances are derived from immutable ledger entries.',
    ];
    for (let i = 0; i < 3; i++) {
      const box = page.locator('#prep-mock-answer');
      await box.click(); await box.fill(answers[i]);
      await t.key('Control+Enter', { wait: 1500 });
      await t.text('.prep-mock-head', 200);
    }
    await page.waitForTimeout(1500);
    await t.shot('mock-end');
    await t.text('.prep-mock', 2500);
    await t.buttons('.prep-mock');
    console.log('mock ms', Date.now() - s0);
    const save = page.locator('#prep-mock-save');
    if (await save.count()) {
      await t.click(save, { wait: 800 });
      await t.text('.toasts', 300);
      await t.shot('mock-saved');
      console.log('NOTES NOW:\n' + await page.locator('textarea[aria-label="Prep notes"]').inputValue());
    } else t.log('no Save button after mock (scorecard failed?)');
    // Can I still see the Likely questions while a mock is running / after?
    console.log('likely questions card visible after mock?', await page.locator('h3', { hasText: 'Likely questions' }).count());
  } else {
    t.log('No mock interview card (no Claude). Using Practice.');
    const s0 = Date.now();
    await t.click(page.getByRole('button', { name: 'Practice', exact: true }), { wait: 600 });
    await t.shot('practice-q1');
    await t.text('.prep-practice', 1500);
    const outs = ['Hash map of seen values; one pass; O(n). Mention sorted two-pointer alt.', 'Iterative reverse with prev/cur; groups of k with a dummy head. Edge: tail < k.', 'BFS from start; visited set; return steps. Walls = skip.'];
    for (let i = 0; i < 3; i++) {
      await page.locator('#prep-outline').fill(outs[i]);
      await page.waitForTimeout(200);
      if (i < 2) await t.click(page.locator('#prep-next'), { wait: 300 });
    }
    await t.shot('practice-q3');
    await t.buttons('.prep-practice');
    // Is there a way to save takeaways into the round's notes from practice?
    console.log('save-to-notes in practice?', await page.getByRole('button', { name: /save|notes/i }).count());
    await t.click(page.locator('#prep-exit'));
    await t.shot('practice-exit');
    console.log('NOTES (round) after practice:', JSON.stringify(await page.locator('textarea[aria-label="Prep notes"]').inputValue()));
    console.log('practice outlines stored where:', await page.evaluate(() => JSON.stringify(store.get().ui.prepPractice).slice(0, 300)));
    // Do the outlines show up for another company's technical round? (keyed by question text)
    console.log('practice ms', Date.now() - s0);
  }
});
