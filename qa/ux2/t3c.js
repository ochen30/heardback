require('./h').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(800);
  t.log('filters persisted?', await t.role('button', /Filters/).innerText());
  await t.type(p.getByPlaceholder('Search jobs').locator('visible=true'), 'data scientist');
  await p.waitForTimeout(600); await t.shot('search-ds'); await t.text('main', 1500);
  await p.getByPlaceholder('Search jobs').locator('visible=true').fill(''); await p.waitForTimeout(500);
  await t.tap(t.vis('Junior Data Engineer'));
  await t.shot('job1'); await t.text('[role=dialog]:visible', 3000); await t.buttons('[role=dialog]:visible'); await t.targets('jobdrawer');
  await p.locator('[role=dialog]:visible').evaluate((d) => { const s = [...d.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (s) s.scrollTop = 99999; });
  await p.waitForTimeout(300); await t.shot('job1-bottom');
  const save = p.locator('[role=dialog]:visible').getByRole('button', { name: /^Save/ });
  await t.tap(save); await t.shot('job1-saved'); await t.text('.toasts', 300);
  await p.keyboard.press('Escape').catch(() => {}); await t.tryTap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Close' }));
  await t.tap(t.vis('Business Data Analyst'));
  await t.shot('job2'); await t.text('[role=dialog]:visible', 2000);
  await t.tap(p.locator('[role=dialog]:visible').getByRole('button', { name: /^Save/ })); await t.shot('job2-saved');
  await t.tryTap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Close' }));
  await t.shot('list-after');
});
