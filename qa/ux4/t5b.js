// Task 5b: log the Figma outcome from the drawer footer "Log outcome" (recruiter emailed: moving to onsite).
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('pipeline');
  await t.click(page.locator('[data-card]').filter({ hasText: 'Figma' }), { wait: 700 });
  await t.text('.drawer', 900);
  const lo = page.locator('.drawer').getByRole('button', { name: /Log outcome/ });
  console.log('Log outcome in footer:', await lo.count());
  if (await lo.count()) {
    await t.click(lo.first(), { wait: 700 });
    await t.shot('log-outcome-click');
    await t.focused();
    await t.text('.drawer', 1500);
    await t.buttons('.drawer');
    console.log('dialog?', await page.locator('[role=dialog]').count(), await page.locator('[role=dialog]').first().innerText().catch(() => ''));
  }
  const li = page.locator('.drawer').getByText('Log the outcome instead');
  if (await li.count()) { await t.click(li.first(), { wait: 600 }); await t.focused(); await t.shot('log-instead'); }
  await t.click(page.locator('.drawer').getByRole('tab', { name: /Rounds/ }), { wait: 500 });
  // pick Passed in the outcome select of the technical round
  const sel = page.locator('.drawer select').filter({ has: page.locator('option', { hasText: 'Passed' }) }).last();
  await sel.selectOption({ label: 'Passed' });
  await page.waitForTimeout(700);
  await t.text('.toasts', 400);
  await t.shot('passed');
  await t.text('.drawer', 1500);
  console.log('stage now:', await page.evaluate(() => Apps.list().find((a) => a.company === 'Figma').stage));
});
