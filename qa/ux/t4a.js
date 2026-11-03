const EMAIL = `From: Megan Torres <mtorres@roku.com>
To: jordan@example.com
Subject: Roku Software Engineer Intern - Phone Screen
Date: Tue, 3 Nov 2026 09:12:00 -0800

Hi Jordan,

Thanks for applying to the Software Engineer Intern - AI Engineering role at Roku! Our team was impressed with your background and we'd love to set up a 30-minute phone screen with you.

Would next Tuesday, November 10 at 2:00 PM PT work for you? You'll be speaking with Daniel Park, an engineer on the AI Engineering team. The call will cover your experience and a light technical discussion.

Please reply to confirm, or let me know a few other times that work.

Best,
Megan Torres
University Recruiting, Roku`;
module.exports = { EMAIL };
if (require.main === module) require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  // sanity: does the drawer header reflect the edited applied date?
  await t.click(p.locator('main').getByText('Roku', { exact: true }).first());
  t.log('header after reopen:', await p.getByText(/Applied since/).first().innerText());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await t.click(p.getByRole('button', { name: /Log an email/ }));
  await t.shot('log-email-open'); await t.text('[role=dialog]:visible', 1500); await t.buttons('[role=dialog]:visible');
  const ta = p.locator('[role=dialog]:visible textarea').first();
  await t.type(ta, EMAIL); await p.waitForTimeout(800);
  await t.shot('email-pasted'); await t.text('[role=dialog]:visible', 2500); await t.buttons('[role=dialog]:visible');
});
