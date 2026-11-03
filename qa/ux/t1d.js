require('./ux').run(async (t) => {
  const p = t.page; await t.go('');
  t.log('step:', await p.getByText(/Step \d of 3/).first().innerText().catch(() => 'none'));
  // still in onboarding? try clicking a listing row on step 3 like I'd expect
  if (await p.getByText('Start using Heardback').count()) {
    const ok = await t.tryClick(p.getByText('Math Libraries Intern'));
    await t.shot('click-row-in-step3');
    await t.click(p.getByRole('button', { name: /Start using Heardback/ }));
  }
  await p.waitForTimeout(800);
  await t.shot('today-after-onboarding'); await t.text('main', 2500);
});
