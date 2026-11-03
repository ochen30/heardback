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
    // Needs you is grouped (Today / Quick wins / When you have time), each group showing up to TODAY_GROUP_MAX
    const grp = await page.evaluate(() => { const by = {}; for (const t of computeTasks()) { const g = t.group || 'later'; by[g] = (by[g] || 0) + 1; } return { by, max: TODAY_GROUP_MAX }; });
    const expShown = Object.values(grp.by).reduce((n, c) => n + Math.min(c, grp.max), 0);
    const shownTitles = await page.locator('.td-task').count();
    T.check('Needs you shows up to TODAY_GROUP_MAX tasks per group', shownTitles === expShown, `${shownTitles} of ${tasks.length} (groups ${JSON.stringify(grp.by)})`);
    const domGroups = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.td-group')].map((g) => [g.querySelector('h3').id.replace('td-g-', ''), +g.querySelector('.td-group-h .td-count').textContent])));
    T.check('Needs you group counts match computeTasks groups', JSON.stringify(Object.keys(domGroups).sort().map((k) => [k, domGroups[k]])) === JSON.stringify(Object.keys(grp.by).sort().map((k) => [k, grp.by[k]])), JSON.stringify(domGroups));
    for (const b of await page.locator('.td-group-more button').all()) { await b.click(); await page.waitForTimeout(100); }
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
    const wk = await page.locator('.td-week .td-week-n').innerText().catch(() => '');
    T.check('This week "N / goal applied" = computeStats.thisWeek', wk.trim() === `${tw} / ${goal} applied`, `${wk} vs ${tw} / ${goal}`);
    await page.click('.td-goal-edit'); await page.waitForTimeout(400);
    T.check('Edit goal -> Settings', (await page.evaluate(() => location.hash)) === '#prefs');
    await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(400);
    // response card median n
    const resp = await page.evaluate(() => { const st = computeStats(); return st; });
    const sub = await page.locator('.td-resp .stat-sub').nth(1).innerText().catch(() => '');
    T.note('Response card median subtext', `${sub} | replied=${resp.replied}`);
    // Silence counts from appliedAt (not from later non-reply activity like notes)
    const sil = await page.evaluate(() => {
      const d = (n) => Date.now() - n * 864e5;
      const a = Apps.create({ company: 'Quiet Notes Co', title: 'SWE Intern', stage: 'applied', appliedAt: d(25), createdAt: d(26), lastActivityAt: d(1) });
      ui.set({ toasts: [] });
      const t = computeTasks().find((x) => x.app.id === a.id);
      return { days: Apps.daysSilent(Apps.get(a.id)), kind: t && t.kind, title: t && t.title };
    });
    T.check('silence counts from appliedAt (25 days despite recent activity)', sil.days === 25 && sil.kind === 'ghost' && sil.title === 'No reply from Quiet Notes Co in 25 days', JSON.stringify(sil));
    // Screen/Interviews with nothing scheduled: "What's next with X?" (nextround) until 2x ghost threshold, then ghost
    const nr = await page.evaluate(() => {
      const d = (n) => Date.now() - n * 864e5, st = store.get().settings;
      const mid = Math.max(st.followUpDays, st.ghostDays) + 1, late = st.ghostDays * 2 + 1;
      const a1 = Apps.create({ company: 'Midway Screen Co', title: 'SWE Intern', stage: 'screen', appliedAt: d(mid), createdAt: d(mid), lastActivityAt: d(mid), lastReplyAt: d(mid) });
      const a2 = Apps.create({ company: 'Long Quiet Co', title: 'SWE Intern', stage: 'interview', appliedAt: d(late), createdAt: d(late), lastActivityAt: d(late), lastReplyAt: d(late) });
      ui.set({ toasts: [] });
      const ts = computeTasks(); const k = (id) => ts.filter((t) => t.app.id === id).map((t) => `${t.kind}:${t.title}`);
      return { mid: k(a1.id), late: k(a2.id), lateDays: late };
    });
    T.check('screen app silent past ghostDays -> only "What’s next with X?" (no ghost/follow)', nr.mid.length === 1 && /^nextround:What.s next with Midway Screen Co\?$/.test(nr.mid[0]), nr.mid.join(' | '));
    T.check('interview app silent past 2x ghostDays -> ghost task', nr.late.length === 1 && nr.late[0] === `ghost:No reply from Long Quiet Co in ${nr.lateDays} days`, nr.late.join(' | '));
    // Upcoming lists the next rounds whatever the date, including beyond 7 days
    await page.evaluate(() => {
      const H = 36e5, D = 864e5, base = Math.ceil(Date.now() / D) * D;
      const a = Apps.create({ company: 'Far Future Co', title: 'Data Intern', stage: 'interview', appliedAt: Date.now() - 5 * D });
      Apps.addRound(a.id, { type: 'technical', at: base + 9 * D + 15 * H });
      Apps.addRound(a.id, { type: 'behavioral', at: base + 20 * D + 16 * H });
      ui.set({ toasts: [] });
    });
    await page.waitForTimeout(300);
    const upExp = await page.evaluate(() => {
      const t = Date.now(); const it = [];
      for (const a of Apps.list()) for (const r of a.rounds || []) if (r.at && r.at >= t - 36e5 && r.outcome !== 'cancelled' && !['rejected', 'ghosted'].includes(a.stage)) it.push({ co: a.company, type: ROUND[r.type]?.label || 'Interview', at: r.at });
      it.sort((x, y) => x.at - y.at);
      return { total: it.length, rows: it.slice(0, 5).map((x) => `${x.co} · ${x.type}`), beyond7: it.slice(0, 5).filter((x) => x.at > t + 7 * 864e5).length };
    });
    const upRows = (await page.locator('.td-up-row .td-up-title').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
    T.check('Upcoming lists the next rounds (sorted, up to 5)', JSON.stringify(upRows) === JSON.stringify(upExp.rows), `${upRows.join(' | ')} vs ${upExp.rows.join(' | ')}`);
    T.check('Upcoming includes rounds beyond 7 days', upExp.beyond7 > 0 && upRows.some((r) => r.startsWith('Far Future Co')), `${upExp.beyond7} beyond 7d`);
    const upN = await page.locator('.card-head:has(#td-up-h) .td-count').innerText().catch(() => '');
    T.check('Upcoming count = all upcoming rounds', upN === String(upExp.total), `${upN} vs ${upExp.total}`);
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `today-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-today-${W}${MOCK ? '-mock' : ''}.json`);
})();
