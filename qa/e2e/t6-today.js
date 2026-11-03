// Flow 6: Today tasks + weekly goal. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`today-${W}${MOCK ? '-mock' : ''}`);
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'today' });
  try {
    // make sure every task kind exists: add an old applied app (ghost) and an applied 8d (follow)
    await page.evaluate(() => {
      const d = (n) => Date.now() - n * 864e5;
      Apps.create({ company: 'Ghosty Inc', title: 'SWE Intern', stage: 'applied', appliedAt: d(30), createdAt: d(30), lastActivityAt: d(30) });
      Apps.create({ company: 'Followup Co', title: 'Data Intern', stage: 'applied', appliedAt: d(9), createdAt: d(9), lastActivityAt: d(9) });
      ui.set({ toasts: [] });
    });
    await page.waitForTimeout(300);
    T.check('no overflow today', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `today-${W}${MOCK ? '-mock' : ''}`);
    const tasks = await page.evaluate(() => computeTasks().map((t) => ({ key: t.key, kind: t.kind, co: t.app.company })));
    const kinds = [...new Set(tasks.map((t) => t.kind))];
    T.note('task kinds', kinds.join(','));
    const shownTitles = await page.locator('.td-task').count();
    T.check('Needs you shows up to 5 tasks', shownTitles === Math.min(5, tasks.length), `${shownTitles} of ${tasks.length}`);
    if (tasks.length > 5) { await page.click('#td-needs-h >> xpath=../.. >> button:has-text("more")'); await page.waitForTimeout(150); }
    T.check('all tasks visible after Show more', (await page.locator('.td-task').count()) === tasks.length);
    const rail = await page.locator('.rail .nav-item[href="#today"] .nav-count').innerText().catch(() => '');
    T.check('rail Today count = tasks', W < 700 || rail === String(tasks.length), `${rail} vs ${tasks.length}`);
    // thanks task -> draft modal with thank you template
    const thanks = tasks.find((t) => t.kind === 'thanks');
    if (thanks) {
      await page.locator(`.td-task[data-key="${thanks.key}"] .td-act`).click(); await page.waitForTimeout(300);
      const txt = await page.inputValue('#pl-draft').catch(() => '');
      T.check('thanks: draft modal with thank-you template', /Thank you/.test(txt) && txt.includes(thanks.co), txt.slice(0, 80));
      await page.click('.modal-foot button:has-text("Mark as sent")'); await page.waitForTimeout(300);
      const after = await page.evaluate((k) => computeTasks().some((t) => t.key === k), thanks.key);
      T.check('thanks: Mark as sent removes task', !after);
      const r = await page.evaluate((k) => { const [, aid, rid] = k.split(':'); return Apps.get(aid).rounds.find((r) => r.id === rid).thanked; }, thanks.key);
      T.check('thanks: round.thanked=true', r === true);
      await clearToasts(page);
    } else T.note('no thanks task', '');
    // follow task
    const fol = await page.evaluate(() => computeTasks().find((t) => t.kind === 'follow')?.key);
    if (fol) {
      await page.locator(`.td-task[data-key="${fol}"] .td-act`).click(); await page.waitForTimeout(300);
      const txt = await page.inputValue('#pl-draft').catch(() => '');
      T.check('follow: draft modal with follow-up template', /Following up/.test(txt), txt.slice(0, 60));
      if (MOCK) {
        await page.click('.modal button:has-text("Improve with Claude")'); await page.waitForTimeout(700);
        T.check('mock: Improve with Claude shows ai label', await page.locator('.modal .ai-label').isVisible());
        await page.click('.modal button:has-text("Undo rewrite")'); await page.waitForTimeout(100);
        T.check('mock: Undo rewrite restores template', /Following up/.test(await page.inputValue('#pl-draft')));
      }
      await page.click('.modal-foot button:has-text("Mark as sent")'); await page.waitForTimeout(300);
      const a = await page.evaluate((k) => Apps.get(k.split(':')[1]), fol);
      T.check('follow: followedUpAt set', !!a.followedUpAt);
      T.check('follow: task gone', !(await page.evaluate((k) => computeTasks().some((t) => t.key === k), fol)));
      T.check('follow: event logged', a.events.some((e) => e.kind === 'followup'));
      await clearToasts(page);
    }
    // ghost task
    const gh = await page.evaluate(() => computeTasks().find((t) => t.kind === 'ghost')?.key);
    if (gh) {
      await page.locator(`.td-task[data-key="${gh}"] .td-act`).click(); await page.waitForTimeout(300);
      const a = await page.evaluate((k) => Apps.get(k.split(':')[1]), gh);
      T.check('ghost: Mark ghosted moves stage', a.stage === 'ghosted', a.stage);
      await clearToasts(page);
    } else T.check('ghost task exists for 30d-silent app', false);
    // outcome task -> opens drawer rounds tab
    const oc = await page.evaluate(() => computeTasks().find((t) => t.kind === 'outcome')?.key);
    if (oc) {
      await page.locator(`.td-task[data-key="${oc}"] .td-act`).click(); await page.waitForTimeout(300);
      T.check('outcome: opens drawer on rounds tab', await page.locator('.drawer .pl-round').count() > 0);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    } else T.note('no outcome task', '');
    // prep task -> prep view focus
    const pr = await page.evaluate(() => computeTasks().find((t) => t.kind === 'prep'));
    if (pr) {
      await page.locator(`.td-task[data-key="${pr.key}"] .td-act`).click(); await page.waitForTimeout(400);
      T.check('prep: navigates to prep', (await page.evaluate(() => location.hash)) === '#prep');
      T.check('prep: focuses that round', (await page.locator('.prep-h2').first().innerText()).includes(pr.app.company));
      await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(400);
    }
    // snooze + dismiss persist
    const list = await page.evaluate(() => computeTasks().map((t) => t.key));
    const k1 = list[0], k2 = list[1];
    if (k1) {
      await page.locator(`.td-task[data-key="${k1}"] .td-more`).click(); await page.waitForTimeout(150);
      T.check('task menu opens with role=menu', await page.locator('.td-menu[role=menu]').isVisible());
      const mb = await page.locator('.td-menu').boundingBox();
      T.check('task menu inside viewport', mb && mb.x >= 0 && mb.x + mb.width <= W + 1, JSON.stringify(mb));
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      T.check('Escape closes task menu', !(await page.locator('.td-menu').count()));
      await page.locator(`.td-task[data-key="${k1}"] .td-more`).click(); await page.waitForTimeout(150);
      await page.click('.td-menu button:has-text("Snooze 3 days")'); await page.waitForTimeout(200);
      T.check('snooze hides task', !(await page.locator(`.td-task[data-key="${k1}"]`).count()));
      const until = await page.evaluate((k) => store.get().dismissed[k], k1);
      T.check('snooze stores ~3 days', Math.abs(until - Date.now() - 3 * 864e5) < 60000);
      await clearToasts(page);
    }
    if (k2) {
      await page.locator(`.td-task[data-key="${k2}"] .td-more`).click(); await page.locator('.td-menu .td-dismiss').click(); await page.waitForTimeout(200);
      T.check('dismiss hides task', !(await page.locator(`.td-task[data-key="${k2}"]`).count()));
      await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(200);
      T.check('dismiss undo restores', await page.locator(`.td-task[data-key="${k2}"]`).count() === 1);
      await page.locator(`.td-task[data-key="${k2}"] .td-more`).click(); await page.locator('.td-menu .td-dismiss').click(); await page.waitForTimeout(400);
      await clearToasts(page);
    }
    await page.reload(); await page.waitForTimeout(800);
    T.check('snooze persists after reload', !(await page.locator(`.td-task[data-key="${k1}"]`).count()));
    T.check('dismiss persists after reload', !(await page.locator(`.td-task[data-key="${k2}"]`).count()));
    // weekly goal (v4+: one widget on Today, edited in Settings)
    const tw = await page.evaluate(() => computeStats().thisWeek);
    const goal = await page.evaluate(() => store.get().profile.weeklyGoal);
    const wk = await page.locator('.td-week .td-count').innerText().catch(() => '');
    T.check('This week "N of goal" = computeStats.thisWeek', tw === 0 ? wk === '' : wk === `${tw} of ${goal}`, `${wk} vs ${tw} of ${goal}`);
    await page.click('.td-goal-edit'); await page.waitForTimeout(400);
    T.check('Edit goal -> Settings', (await page.evaluate(() => location.hash)) === '#prefs');
    await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(400);
    // response card median n
    const resp = await page.evaluate(() => { const st = computeStats(); return st; });
    const sub = await page.locator('.td-resp .stat-sub').nth(1).innerText().catch(() => '');
    T.note('Response card median subtext', `${sub} | replied=${resp.replied}`);
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `today-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-today-${W}${MOCK ? '-mock' : ''}.json`);
})();
