require('./ux').run(async (t) => {
  const p = t.page; await t.go('');
  await t.click(p.getByRole('button', { name: /New grad/ }));   // I only want internships
  await t.click(p.getByRole('button', { name: 'Software', exact: true }));
  await t.click(p.getByRole('button', { name: 'Data & AI' }));
  await t.click(p.getByText('SF Bay Area', { exact: true }));
  await t.click(p.getByText('New York', { exact: true }));
  await t.shot('step1-filled');
  const name = p.getByRole('textbox').first(); await t.type(name, 'Jordan');
  await t.click(p.getByRole('button', { name: /Continue/ }));
  await t.shot('step2'); await t.text('main, body', 1500); await t.buttons();
});
