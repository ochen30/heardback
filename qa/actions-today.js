// Interactions for the Today and Insights views. Run e.g.:
//   ACTIONS=qa/actions-today.js node qa/shot.js today:openSnooze today:snoozeFirst today:dismissFirst today:goalUp stats:hoverChart stats:hideExamples
const log = (...a) => console.log('[today]', ...a);
const assert = (c, msg) => { if (!c) { console.log('[today] FAIL', msg); process.exitCode = 1; } else log('ok', msg); };
const taskKeys = (page) => page.$$eval('.td-task', (els) => els.map((e) => e.dataset.key));

module.exports = {
  async openSnooze(page) {
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.waitForTimeout(200);
    assert(await page.$('.td-menu [role="menuitem"]'), 'snooze menu opens');
  },
  async snoozeFirst(page) {
    const before = await taskKeys(page);
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.waitForTimeout(150);
    await page.click('.td-menu [role="menuitem"]:has-text("3 days")');
    await page.waitForTimeout(250);
    const after = await taskKeys(page);
    const until = await page.evaluate((k) => store.get().dismissed[k], before[0]);
    assert(!after.includes(before[0]), `snoozed task ${before[0]} hidden`);
    assert(until && Math.abs(until - Date.now() - 3 * 86400000) < 60000, 'snooze stored for 3 days');
  },
  async snoozeUndo(page) {
    const before = await taskKeys(page);
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.click('.td-menu [role="menuitem"]:has-text("1 day")');
    await page.waitForTimeout(200);
    await page.locator('.toast button:has-text("Undo")').last().click();
    await page.waitForTimeout(200);
    const after = await taskKeys(page);
    assert(after.includes(before[0]), 'undo restores snoozed task');
  },
  async dismissFirst(page) {
    const before = await taskKeys(page);
    await page.click('.td-task .td-dismiss');
    await page.waitForTimeout(250);
    const after = await taskKeys(page);
    assert(after.length === before.length - 1 && !after.includes(before[0]), 'dismiss removes the task');
  },
  async dismissAll(page) {
    for (let i = 0; i < 20; i++) { const b = await page.$('.td-task .td-dismiss'); if (!b) break; await b.click(); await page.waitForTimeout(80); }
    await page.waitForTimeout(300);
    assert(await page.$('.td-caught'), 'caught-up state shows when no tasks');
  },
  async goalUp(page) {
    const g0 = await page.evaluate(() => store.get().profile.weeklyGoal);
    await page.click('button[aria-label="Raise weekly goal"]');
    await page.click('button[aria-label="Raise weekly goal"]');
    await page.waitForTimeout(150);
    const g1 = await page.evaluate(() => store.get().profile.weeklyGoal);
    assert(g1 === g0 + 2, `goal ${g0} -> ${g1}`);
    await page.fill('#today-goal', '4');
    await page.press('#today-goal', 'Enter');
    await page.locator('#today-goal').blur();
    await page.waitForTimeout(150);
    const g2 = await page.evaluate(() => store.get().profile.weeklyGoal);
    assert(g2 === 4, `typed goal -> ${g2}`);
    await page.click('button[aria-label="Lower weekly goal"]');
    await page.waitForTimeout(100);
    assert((await page.evaluate(() => store.get().profile.weeklyGoal)) === 3, 'lower goal');
  },
  async scrollSide(page) {
    await page.evaluate(() => { const a = document.querySelector('.td-page aside'); a && a.scrollIntoView(); });
    await page.waitForTimeout(200);
  },
  async scrollBottom(page) {
    await page.evaluate(() => { const w = document.getElementById('workspace'); w.style.scrollBehavior = 'auto'; w.scrollTop = w.scrollHeight; });
    await page.waitForTimeout(200);
  },
  async scrollMid(page) {
    await page.evaluate(() => { const w = document.getElementById('workspace'); w.style.scrollBehavior = 'auto'; w.scrollTop = w.scrollHeight * 0.45; });
    await page.waitForTimeout(200);
  },
  async hoverChart(page) {
    const hits = await page.$$('.st-hit');
    await hits[hits.length - 2].hover();
    await page.waitForTimeout(150);
    assert(await page.$('.st-tip'), 'chart tooltip appears on hover');
  },
  async hideExamples(page) {
    await page.click('label[for="stats-show-examples"]');
    await page.waitForTimeout(250);
    const show = await page.evaluate(() => store.get().settings.showExamples);
    assert(show === false, 'examples hidden via toggle');
  },
  async scrollChart(page) {
    await page.evaluate(() => { const w = document.getElementById('workspace'); w.style.scrollBehavior = 'auto'; const el = document.querySelector('.st-chart'); w.scrollTop = el.getBoundingClientRect().top + w.scrollTop - 120; });
    await page.waitForTimeout(200);
    const hits = await page.$$('.st-hit'); if (hits.length) { await hits[5].hover(); await page.waitForTimeout(150); }
  },
  async fewApps(page) {
    // 3 real applications: below the 5-application insight threshold
    await page.evaluate(() => { clearExamples(); const d = (n) => Date.now() - n * 86400000; [['Acme', 4], ['Globex', 9], ['Initech', 2]].forEach(([c, n]) => Apps.create({ company: c, title: 'Software Engineer Intern', stage: 'applied', appliedAt: d(n), createdAt: d(n) })); });
    await page.waitForTimeout(300);
  },
};
