// Task 1: onboarding on phone — New grad, Data & AI, Remote + Seattle, skip resume
require('./h').run(async (t) => {
  const p = t.page; await t.go('');
  await t.shot('first');
  await t.tap(p.getByRole('button', { name: 'New grad' }));
  await t.tap(p.getByRole('button', { name: 'Data & AI' }));
  await t.tap(p.getByText('Seattle', { exact: true }));
  await t.shot('picked');
  const remote = p.getByText('Open to remote'); await remote.scrollIntoViewIfNeeded(); await t.shot('remote-toggle');
  t.log('remote checked?', await p.getByRole('switch').first().getAttribute('aria-checked').catch(() => '?'), await p.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => (e.closest('label')?.innerText || '').slice(0, 25) + '=' + e.checked).join('; ')));
  const name = p.getByPlaceholder('e.g. Sam Lee'); await t.type(name, 'Priya');
  await t.shot('name-focused');
  await t.tap(p.getByRole('button', { name: /Continue/ }));
  await t.shot('step2'); await t.text('[role=dialog], .onb, body', 1500); await t.buttons(); await t.targets('step2');
  // skip resume
  const skip = p.getByRole('button', { name: /Skip|without|later/i });
  t.log('skip-ish buttons:', await skip.allInnerTexts());
  if (!(await t.tryTap(p.getByRole('button', { name: /Skip for now|Skip this|Skip resume|later/i })))) await t.tap(p.getByRole('button', { name: /Continue/ }));
  await t.shot('step3'); await t.text('body', 2000); await t.buttons();
  await t.tryTap(p.getByRole('button', { name: /Start using|Finish|Done|Go to/i }));
  await p.waitForTimeout(1200);
  await t.shot('today'); await t.text('main, body', 2500); await t.buttons(); await t.targets('today');
  await t.shot('today-full', true);
});
