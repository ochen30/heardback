// Mobile 375x812: onboarding
require('./ux').run(async (t) => {
  const p = t.page; await t.go('');
  await t.shot('m-first');
  await t.click(p.getByRole('button', { name: /New grad/ }));
  await t.click(p.getByRole('button', { name: 'Software', exact: true }));
  await t.click(p.getByRole('button', { name: 'Data & AI' }));
  await t.click(p.getByText('SF Bay Area', { exact: true }));
  await t.click(p.getByText('New York', { exact: true }));
  await t.shot('m-step1-filled');
  await t.type(p.getByRole('textbox').first(), 'Jordan');
  await t.shot('m-step1-name');
  await t.click(p.getByRole('button', { name: /Continue/ }));
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), t.click(p.getByText('Upload PDF'))]);
  await fc.setFiles('qa/fixtures/sample-resume.pdf'); await p.waitForTimeout(3000);
  await t.shot('m-resume');
  await t.click(p.getByRole('button', { name: /Continue/ }));
  await t.shot('m-step3');
  await t.click(p.getByRole('button', { name: /Start using Heardback/ })); await p.waitForTimeout(1000);
  await t.shot('m-today'); await t.buttons();
});
