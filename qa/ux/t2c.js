require('./ux').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(1200);
  t.log('filters persisted? 3d pressed =', await p.getByRole('button', { name: '3d', exact: true }).getAttribute('aria-pressed'));
  await t.shot('list-full', true);
  // hover the green dot of first row to see if it explains itself
  const dot = p.locator('main .find-row').first().locator('[class*=dot], [title]').first();
  t.log('dot title:', await dot.getAttribute('title').catch(() => null), await dot.getAttribute('aria-label').catch(() => null));
  await t.click(p.getByText('Software Engineer Intern – AI Engineering'));
  await p.waitForTimeout(600);
  await t.shot('job-drawer'); await t.text('[role=dialog], .drawer', 3000); await t.buttons('[role=dialog], .drawer');
});
