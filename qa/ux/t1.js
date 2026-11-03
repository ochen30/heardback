// Task 1: onboarding from scratch
require('./ux').run(async (t) => {
  const p = t.page; await t.go('');
  await t.click(p.getByRole('button', { name: /New grad/ }));
  await t.click(p.getByRole('button', { name: 'Software', exact: true }));
  await t.click(p.getByRole('button', { name: 'Data & AI' }));
  await t.click(p.getByText('SF Bay Area', { exact: true }));
  await t.click(p.getByText('New York', { exact: true }));
  await p.mouse.wheel(0, 400); await p.waitForTimeout(300);
  await t.shot('step1-scrolled');
  await t.type(p.getByRole('textbox').first(), 'Jordan');
  await t.click(p.getByRole('button', { name: /Continue/ }));
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), t.click(p.getByText('Upload PDF'))]);
  await fc.setFiles('qa/fixtures/sample-resume.pdf');
  await t.shot('resume-reading');
  await p.waitForTimeout(3000);
  await t.shot('resume-uploaded'); await t.text('body', 3000);
  await t.click(p.getByRole('button', { name: /Continue/ }));
  await t.shot('step3');
  await t.tryClick(p.getByText('Math Libraries Intern')); await t.shot('click-row-in-step3');
  await t.click(p.getByRole('button', { name: /Start using Heardback/ })); await p.waitForTimeout(1000);
  await t.shot('today-after-onboarding'); await t.text('main', 2500); await t.buttons('main');
});
