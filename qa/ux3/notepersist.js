// Persistence check: add a quick note on the phone, then close after WAIT ms; peek.js shows whether it stuck.
const { run } = require('./h');
run(async (t) => {
  const { page } = t; await t.go('today');
  await t.tap(page.locator('.td-up-row', { hasText: 'Notion' }));
  await t.tap(page.getByRole('tab', { name: /Timeline/ }));
  await t.type(page.locator('#pl-tl-note'), 'persist-test ' + process.env.WAIT);
  await t.tap(page.getByRole('button', { name: 'Add note' }), { wait: +process.env.WAIT });
});
