require('./ux').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(1200);
  await t.click(p.getByText('Software Engineer Intern – AI Engineering'));
  await t.click(p.getByRole('button', { name: 'Save', exact: true }));
  await t.shot('saved-in-drawer');
  await t.text('.toasts, [role=status]', 400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // save two more using the bookmark icon on the row
  for (const title of ['AI/ML Engineer Intern', 'Machine Learning Researcher Intern – Machine Learning']) {
    const row = p.locator('.find-row', { hasText: title }).first();
    await row.hover(); const bm = row.locator('button').last();
    t.log('bookmark label:', await bm.getAttribute('aria-label'), await bm.getAttribute('title'));
    await t.click(bm);
  }
  await t.shot('after-bookmarks');
  await t.text('.toasts, [role=status]', 400);
  // now widen to see flagged listings
  await t.click(p.getByRole('button', { name: 'Any', exact: true }));
  await t.click(p.getByRole('button', { name: 'Newest' }));
  await p.locator('.find-results').first().evaluate((e) => e.scrollIntoView());
  await t.shot('any-newest');
  const txt = await p.locator('main').innerText();
  t.log('rows mentioning signals:', txt.split('\n').filter((l) => /signal|ghost|repost|old|open \d/i.test(l)).slice(0, 12));
});
