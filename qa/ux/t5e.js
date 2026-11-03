require('./ux').run(async (t) => {
  const p = t.page; await t.go('today'); await p.waitForTimeout(1000);
  await t.click(p.getByRole('button', { name: 'Draft note' }));
  await p.waitForTimeout(1500);
  await t.shot('thankyou'); await t.text('[role=dialog]:visible', 2500); await t.buttons('[role=dialog]:visible');
});
