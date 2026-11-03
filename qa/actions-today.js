// Interactions for the Today and Insights views. Run e.g.:
//   ACTIONS=qa/actions-today.js node qa/shot.js today:openSnooze today:snoozeFirst today:dismissFirst today:editGoal stats:hoverChart stats:hideExamples
const log = (...a) => console.log('[today]', ...a);
const assert = (c, msg) => { if (!c) { console.log('[today] FAIL', msg); process.exitCode = 1; } else log('ok', msg); };
const taskKeys = (page) => page.$$eval('.td-task', (els) => els.map((e) => e.dataset.key));

module.exports = {
  async openSnooze(page) {
    await page.hover('.td-task');
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.waitForSelector('.td-menu [role="menuitem"]', { timeout: 2000 }).catch(() => null);
    const items = await page.$$eval('.td-menu [role="menuitem"]', (els) => els.map((e) => e.textContent.trim()));
    assert(items.some((t) => /Snooze 1 day/.test(t)), 'snooze menu opens');
    assert(items.some((t) => /Dismiss/.test(t)), 'menu offers Dismiss');
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('role'));
    assert(focused === 'menuitem', 'first menu item takes focus');
  },
  async menuEsc(page) {
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert(!(await page.$('.td-menu')), 'Escape closes the menu');
  },
  async primaryCount(page) {
    const n = await page.$$eval('.td-task .btn.primary', (els) => els.length);
    assert(n === 1, `one primary button in Needs you (got ${n})`);
    const rights = await page.$$eval('.td-task .td-act', (els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
    const wide = page.viewportSize().width > 640;
    if (wide) assert(new Set(rights).size === 1, `action buttons share a right edge (${rights.join(',')})`);
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
    await page.click('.td-task button[aria-haspopup="menu"]');
    await page.waitForTimeout(150);
    await page.click('.td-menu .td-dismiss');
    await page.waitForTimeout(250);
    const after = await taskKeys(page);
    assert(after.length === before.length - 1 && !after.includes(before[0]), 'dismiss removes the task');
  },
  async dismissAll(page) {
    for (let i = 0; i < 20; i++) {
      const b = await page.$('.td-task button[aria-haspopup="menu"]'); if (!b) break;
      await b.click(); await page.waitForTimeout(80); await page.click('.td-menu .td-dismiss'); await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    assert(await page.$('.td-caught'), 'caught-up state shows when no tasks');
  },
  async editGoal(page) {
    await page.click('#td-week-h ~ a:has-text("Edit goal")');
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => location.hash)) === '#prefs', 'Edit goal goes to Settings');
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
  async openMethod(page) {
    await page.click('.st-method summary');
    await page.waitForTimeout(150);
    assert(await page.$eval('.st-method', (d) => d.open), '"How we calculate this" expands');
    await page.evaluate(() => { const w = document.getElementById('workspace'); w.style.scrollBehavior = 'auto'; w.scrollTop = w.scrollHeight; });
    await page.waitForTimeout(200);
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
