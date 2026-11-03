require('./ux').run(async (t) => {
  const p = t.page; await t.go('');
  await t.shot('after-reload'); await t.text('body h1, body h2', 300);
  const step = await p.getByText(/Step \d of 3/).first().innerText().catch(() => 'none'); t.log('step after reload:', step);
  if (/Step 1/.test(step)) { await t.click(p.getByRole('button', { name: /Continue/ })); }
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: /Upload PDF/ }).click()]);
  await fc.setFiles('qa/fixtures/sample-resume.pdf');
  await p.waitForTimeout(2500);
  await t.shot('resume-uploaded'); await t.text('body', 3000);
  await t.click(p.getByRole('button', { name: /Continue/ }));
  await t.shot('step3'); await t.text('body', 2500); await t.buttons();
});
