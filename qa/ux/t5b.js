require('./ux').run(async (t) => {
  const p = t.page; await t.go('prep'); await p.waitForTimeout(800);
  await t.click(p.getByText('Walk me through your background.'));
  await t.shot('q-expanded'); await t.text('main', 1200);
  await t.click(p.getByRole('button', { name: /Tailor questions to this role/ })); await p.waitForTimeout(1200);
  await t.shot('tailored'); 
  await t.click(p.getByRole('button', { name: 'Start' })); await p.waitForTimeout(1200);
  await t.shot('mock-start'); await t.text('[role=dialog]:visible, main', 1500); await t.buttons('[role=dialog]:visible');
});
