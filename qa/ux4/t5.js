// Task 5: after yesterday's Figma round: send a thank-you (draft, copy, mark sent) and log the outcome.
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  const tasks = () => page.evaluate(() => computeTasks().map((x) => `${x.kind}:${x.title}`).join(' | '));
  console.log('TASKS before:', await tasks());
  const row = page.locator('.task, [class*=task]').filter({ hasText: 'Figma' }).first();
  await t.click(row.getByRole('button', { name: /Draft note/ }), { wait: 1500 });
  await t.shot('thanks-modal');
  await t.text('.modal, [role=dialog]', 3000);
  await t.buttons('.modal, [role=dialog]');
  // MOCK: is there an AI rewrite? Try anything with "Claude"/"Rewrite"/"Personalize"
  const ai = page.locator('[role=dialog]').getByRole('button', { name: /claude|rewrite|personal|polish|improve/i });
  console.log('AI buttons in modal:', await ai.count(), await ai.allInnerTexts().catch(() => []));
  if (await ai.count()) { await t.click(ai.first(), { wait: 1500 }); await t.shot('thanks-ai'); await t.text('[role=dialog]', 1500); }
  // edit draft: add a specific detail
  const ta = page.locator('[role=dialog] textarea').first();
  if (await ta.count()) {
    const v = await ta.inputValue();
    console.log('DRAFT FIELDS:', await page.locator('[role=dialog] input, [role=dialog] textarea').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') || e.id || e.name}=${(e.value || '').slice(0, 60)}`).join(' || ')));
    await ta.fill(v.replace(/\n\n/, '\n\nI especially enjoyed working through the multiplayer cursor-sync problem with you.\n\n'));
  }
  const copy = page.locator('[role=dialog]').getByRole('button', { name: /copy/i }).first();
  await t.click(copy, { wait: 600 });
  await t.text('.toasts', 300);
  try { console.log('CLIPBOARD:\n' + (await page.evaluate(() => navigator.clipboard.readText())).slice(0, 900)); } catch (e) { console.log('clipboard n/a', e.message); }
  await t.shot('thanks-copied');
  await t.buttons('[role=dialog]');
  const mark = page.locator('[role=dialog]').getByRole('button', { name: /sent|mark/i }).first();
  if (await mark.count()) { await t.click(mark, { wait: 700 }); } else t.log('no Mark sent in modal');
  await t.text('.toasts', 400);
  await t.shot('after-mark-sent');
  console.log('dialog still open?', await page.locator('[role=dialog]').count());
  console.log('thanked =', await page.evaluate(() => Apps.list().find((a) => a.company === 'Figma').rounds.find((r) => r.type === 'technical').thanked));
  console.log('TASKS after thanks:', await tasks());
  await t.text('main', 1200);
  // Log outcome: is it on Today now?
  const orow = page.locator('.task, [class*=task]').filter({ hasText: 'Figma' }).first();
  console.log('Figma row now:', await orow.innerText().catch(() => 'none'));
  const waiting = orow.getByRole('button', { name: /Still waiting|Passed|Log outcome/ });
  console.log('outcome buttons on Today:', await waiting.allInnerTexts().catch(() => []));
  // Realistic: no news yet -> "Still waiting"? Try the snooze menu or the button.
  const sw = page.getByRole('button', { name: 'Still waiting' }).first();
  if (await sw.count()) { await t.click(sw, { wait: 600 }); await t.text('.toasts', 300); console.log('TASKS after still waiting:', await tasks()); }
  else {
    // go through Prep -> "Waiting on outcome"
    await t.go('prep');
    await t.click(page.locator('.prep-item').filter({ hasText: 'Figma' }), { wait: 600 });
    await t.shot('prep-figma');
    await t.text('.prep-work', 1500);
    await t.buttons('.prep-work');
    console.log('outcome control on prep page?', await page.locator('.prep-work').getByText(/outcome|passed/i).count());
    // drawer path
    await t.click(page.locator('.prep-head').getByRole('button', { name: 'Open application' }).first(), { wait: 700 });
    await t.shot('figma-drawer');
    const sel = page.locator('.drawer select').filter({ has: page.locator('option', { hasText: 'Passed' }) });
    console.log('outcome selects:', await sel.count());
    // second round is the technical one
    await sel.last().selectOption({ label: 'Pending' });
    await t.shot('figma-drawer-outcome');
  }
  await t.go('today');
  console.log('TASKS end:', await tasks());
  await t.shot('today-end');
});
