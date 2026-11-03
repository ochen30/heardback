require('./h').run(async (t) => {
  const p = t.page; await t.go('prep'); await p.waitForTimeout(800);
  await t.tryTap(p.getByRole('button', { name: 'Practice', exact: true }).locator('visible=true'), { timeout: 1500 });
  const ta = p.locator('main textarea').first();
  await ta.scrollIntoViewIfNeeded(); await ta.tap();
  await p.setViewportSize({ width: 375, height: 476 }); await p.waitForTimeout(400);
  await ta.fill('- bias: underfit, e.g. linear model on nonlinear data\n- variance: overfit; detect w/ train vs val gap\n- fixes: regularization, more data, CV');
  await t.shot('outline-kbd');
  const y = await p.getByRole('button', { name: 'Next question' }).locator('visible=true').evaluate((b) => Math.round(b.getBoundingClientRect().top));
  const ty = await p.getByText(/^\d:\d\d$/).locator('visible=true').first().evaluate((b) => Math.round(b.getBoundingClientRect().top)).catch(() => 'n/a');
  t.log('with keyboard: Next question top', y, 'timer top', ty, 'innerHeight 476');
  await p.setViewportSize({ width: 375, height: 812 });
  // Now add the Zillow interview round so Prep knows about it
  await t.tap(t.vis('Pipeline'));
  await t.tap(t.vis('Associate Data Scientist'));
  await t.tap(p.locator('[role=dialog]:visible').getByRole('tab', { name: 'Rounds' }).or(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Rounds' })));
  await t.shot('rounds-tab'); await t.text('[role=dialog]:visible', 1200); await t.buttons('[role=dialog]:visible');
});
