require('./ux').run(async (t) => {
  const p = t.page; await t.go('find'); await p.waitForTimeout(1200);
  await t.click(p.getByRole('button', { name: '3d', exact: true }));
  await t.click(p.getByRole('button', { name: 'Most likely real' }));
  await t.shot('3d-mostreal');
  await p.mouse.move(370, 700); await p.mouse.wheel(0, 900); await p.waitForTimeout(400);
  await t.shot('sidebar-scrolled');
  await t.text('.find-aside, aside', 1500);
  const rows = await p.locator('main').innerText(); 
  // look for any visible ghost flags in the list
  const flagged = rows.split('\n').filter((l) => /ghost|repost|stale|risk|caution|likely/i.test(l)).slice(0, 15); t.log('flag lines:', flagged);
});
