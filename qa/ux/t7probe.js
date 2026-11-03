require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  const h = await p.locator('main').evaluate((m) => m.querySelector('table, [role=grid], [role=table]') ? (m.querySelector('table, [role=grid], [role=table]').outerHTML.slice(0, 2500)) : 'no table; view=' + m.innerText.slice(0, 200));
  console.log(h);
});
