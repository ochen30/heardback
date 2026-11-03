// Task 5: a rejection email arrives — log it from the phone
const EMAIL = `From: Spotify Recruiting <no-reply@spotify.com>
Subject: Your application to Spotify

Hi Priya,

Thank you for your interest in the Data Scientist I, New Grad position at Spotify and for the time you invested in applying.

After careful review, we have decided to move forward with other candidates whose experience more closely matches our current needs. We will keep your resume on file and encourage you to apply for future openings.

We wish you the best in your search.

Spotify Talent Acquisition`;
module.exports = { EMAIL };
if (require.main === module) require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  // First instinct: the big + in the top bar
  await t.tap(p.getByRole('button', { name: 'Add application' }).locator('visible=true').first());
  await t.shot('plus'); await t.text('[role=dialog]:visible, [role=menu]:visible', 800); await t.buttons('[role=dialog]:visible, [role=menu]:visible');
  const log = p.locator('[role=dialog]:visible').getByText('Log an email');
  if (await log.count()) { await t.tap(log); } else {
    await p.keyboard.press('Escape'); await t.tryTap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Close' }));
    await t.tap(t.vis('More')); await t.tap(p.locator('[role=dialog]:visible').getByText('Log an email'));
  }
  await t.shot('log-dialog'); await t.text('[role=dialog]:visible', 1200); await t.targets('log');
  const ta = p.locator('[role=dialog]:visible textarea');
  await ta.tap(); await t.shot('ta-focused');
  await ta.fill(EMAIL); await p.waitForTimeout(800);
  await t.shot('parsed'); await t.text('[role=dialog]:visible', 2000); await t.buttons('[role=dialog]:visible');
  const box = await ta.boundingBox(); t.log('textarea box', JSON.stringify(box));
  const btns = await p.locator('[role=dialog]:visible button').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return `${(b.getAttribute('aria-label') || b.innerText).trim().slice(0, 30)}@${Math.round(r.top)}`; }));
  t.log('dialog buttons y', btns);
});
