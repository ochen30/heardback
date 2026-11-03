const { EMAIL } = require('./t5');
require('./h').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(600);
  await t.tap(p.getByRole('button', { name: 'Add application' }).locator('visible=true').first());
  await t.tap(p.locator('[role=dialog]:visible').getByText('Log an email'));
  const ta = p.locator('[role=dialog]:visible textarea');
  await ta.tap();
  // simulate on-screen keyboard (Android resize behaviour): visible height 812 -> 476
  await p.setViewportSize({ width: 375, height: 476 }); await p.waitForTimeout(400);
  await t.shot('kbd-empty');
  await ta.fill(EMAIL); await p.waitForTimeout(300); await t.shot('kbd-filled');
  const vis = await p.locator('[role=dialog]:visible').getByRole('button', { name: 'Read email' }).evaluate((b) => { const r = b.getBoundingClientRect(); return `${Math.round(r.top)}-${Math.round(r.bottom)} vs innerHeight ${innerHeight}`; });
  t.log('Read email btn with keyboard:', vis);
  await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300);
  await t.tap(p.locator('[role=dialog]:visible').getByRole('button', { name: 'Read email' }));
  await p.waitForTimeout(800);
  await t.shot('read'); await t.text('[role=dialog]:visible', 2000); await t.buttons('[role=dialog]:visible');
});
