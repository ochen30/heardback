require('./ux').run(async (t) => {
  const p = t.page; await t.go(process.env.START || 'prep');
  for (const ms of [500, 1500, 4000]) { await p.waitForTimeout(ms); t.log(`after +${ms}ms: mock card=`, await p.getByText('Mock interview', { exact: true }).count(), 'roleType=', await p.locator('dt:has-text("Role type") + dd').innerText().catch(() => '?')); }
  if (process.env.START === 'today') { await t.click(p.getByText('Interview prep', { exact: true }).first()); await p.waitForTimeout(800); t.log('via nav: mock card=', await p.getByText('Mock interview', { exact: true }).count(), 'roleType=', await p.locator('dt:has-text("Role type") + dd').innerText().catch(() => '?')); }
});
