require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(800);
  await t.click(p.getByText('Insights', { exact: true }).first()); await p.waitForTimeout(1000);
  await t.shot('insights'); await t.text('main', 3000); await t.buttons('main');
  await p.mouse.move(800, 600); await p.mouse.wheel(0, 900); await p.waitForTimeout(400); await t.shot('insights-2');
  await p.mouse.wheel(0, 900); await p.waitForTimeout(400); await t.shot('insights-3');
});
