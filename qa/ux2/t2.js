// Task 2: import 6 applications from my Google Sheet CSV via Settings (phone)
require('./h').run(async (t) => {
  const p = t.page; await t.go('today');
  await t.tap(p.getByRole('button', { name: 'More' }).or(p.getByRole('link', { name: 'More' })));
  await t.shot('more-sheet'); await t.buttons('[role=dialog]:visible, body'); await t.targets('more');
  await t.tap(t.vis('Settings'));
  await t.shot('settings'); await t.text('main', 1800);
  const imp = t.vis('Choose file to import'); await imp.scrollIntoViewIfNeeded(); await t.shot('import-row');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), imp.tap()]);
  await fc.setFiles(require('path').join(__dirname, 'my-applications.csv'));
  await p.waitForTimeout(600); await t.shot('after-import'); await t.text('.toasts, [role=status]', 600);
  await t.tap(t.vis('Pipeline'));
  await p.waitForTimeout(800); await t.shot('pipeline'); await t.text('main', 2500); await t.buttons('main');
});
