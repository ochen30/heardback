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
  async weekSome(page) {
    await page.evaluate(() => { const t = Date.now(); ['Acme', 'Globex', 'Initech'].forEach((c, i) => Apps.create({ company: c, title: 'Software Engineer Intern', stage: 'applied', appliedAt: t - i * 3600000, createdAt: t - i * 3600000 })); });
    await page.waitForTimeout(300);
    assert(await page.$('.td-week .td-bars'), 'This week shows bars once something is sent');
  },
  // Core task kinds: a taken-down posting ("removed") and an intern season that is closing ("apply", urgent).
  async newTaskKinds(page) {
    await page.waitForFunction(() => jobsStore.status === 'ready', null, { timeout: 15000 });
    await page.evaluate(() => {
      Apps.create({ company: 'Gone Corp', title: 'Data Engineer Intern', jobId: 'deadbeef00', stage: 'saved', source: 'find' });
      Apps.create({ company: 'Vanished Ltd', title: 'Software Engineer, New Grad 2027', jobId: 'deadbeef01', stage: 'applied', appliedAt: Date.now() - 6 * 86400000 });
      const j = jobsStore.jobs.find((x) => x.lvl === 'intern' && jobsStore.cstats[x.co]);
      jobsStore.cstats[j.co].season = { posted: 24, open: 2, term: 'Summer 2027', lastNew: Math.floor((Date.now() - 40 * 86400000) / 1000) };
      Apps.create({ company: j.co, title: j.t, jobId: j.id, url: j.url, stage: 'saved', source: 'find' });
    });
    await page.waitForTimeout(400);
    const more = await page.$('.td-card-foot button'); if (more) { await more.click(); await page.waitForTimeout(200); }
    const kinds = await page.$$eval('.td-task', (els) => els.map((e) => e.dataset.key.split(':')[0]));
    assert(kinds.filter((k) => k === 'removed').length === 2, `two removed tasks render (${kinds.join(',')})`);
    assert(await page.$('.td-task[data-key^="apply:"] .task-ico.wait'), 'closing-season apply task is urgent');
  },
  async editGoal(page) {
    await page.click('.td-goal-edit');
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
  // REVIEW5 #1: no visible "·" may start (or end) a visual line, and Outcomes must sum to 100%.
  async dotCheck(page) {
    const bad = await page.evaluate(() => {
      const out = [];
      const vis = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        const t = n.nodeValue; if (!t.includes('·') || !vis(n.parentElement)) continue;
        if (n.parentElement.closest('option, select, title, .sr, [aria-hidden="true"]:not(.td-meta *)') && n.parentElement.closest('option, select, title, .sr')) continue;
        for (let i = 0; i < t.length; i++) {
          if (t[i] !== '·') continue;
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
          const d = r.getBoundingClientRect(); if (!d.width) continue;
          // the nearest visible glyph before and after the dot (within the same block)
          const block = n.parentElement.closest('p, li, div, td, span.stat-sub, summary') || n.parentElement;
          const rects = [...block.getClientRects()]; if (!rects.length) continue;
          const all = document.createRange(); all.selectNodeContents(block);
          const lines = [...all.getClientRects()].filter((x) => x.width > 0);
          const minLeft = Math.min(...lines.map((x) => x.left));
          if (d.left - minLeft < 3) out.push('starts line: ' + (block.textContent || '').trim().slice(0, 70));
        }
      }
      // clipped meta dots: an item that starts a line must sit at its list's left edge (its dot in the clipped gutter)
      for (const ml of document.querySelectorAll('.td-meta')) {
        if (!vis(ml)) continue;
        const L = ml.getBoundingClientRect().left;
        const items = [...ml.children]; let prevTop = null;
        items.forEach((it, i) => {
          const r = it.getBoundingClientRect();
          const lineStart = i === 0 || (prevTop != null && r.top > prevTop + 2);
          if (lineStart && Math.abs(r.left - L) > 1) out.push('meta item not at line start edge: ' + it.textContent.slice(0, 50));
          prevTop = r.top;
        });
        if (ml.scrollWidth > ml.clientWidth + 1 && getComputedStyle(ml).flexWrap === 'wrap') out.push('meta overflows: ' + ml.textContent.slice(0, 60));
      }
      return out;
    });
    assert(bad.length === 0, `no line starts with "·" (${bad.length ? bad.join(' | ') : 'clean'})`);
    if (await page.$('.st-out-row')) {
      const sum = await page.$$eval('.st-out-row .faint', (els) => els.reduce((a, e) => a + (parseInt(e.textContent, 10) || 0), 0));
      assert(sum === 100, `Outcomes sum to 100% (got ${sum})`);
    }
  },
  async scrollOutcomes(page) {
    await page.evaluate(() => { const w = document.getElementById('workspace'); w.style.scrollBehavior = 'auto'; const el = document.querySelector('.st-out-rows'); w.scrollTop = el.getBoundingClientRect().top + w.scrollTop - 200; });
    await page.waitForTimeout(200);
  },
};
