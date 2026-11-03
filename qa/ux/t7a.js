require('./ux').run(async (t) => {
  const p = t.page; await t.go('pipeline'); await p.waitForTimeout(800);
  await t.click(p.locator('header, .topbar').getByRole('button', { name: /Add/ }).last());
  await t.shot('add-open'); await t.text('[role=dialog]:visible', 2000); await t.buttons('[role=dialog]:visible');
  const ins = await p.locator('[role=dialog]:visible input, [role=dialog]:visible select, [role=dialog]:visible textarea').evaluateAll((els) => els.map((e) => `${e.tagName}:${e.type}:${e.getAttribute('aria-label') || e.placeholder || e.id}:${e.value}`));
  t.log(ins.join('\n'));
});
