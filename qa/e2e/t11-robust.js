// Flow 11: robustness. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const fs = require('fs'); const path = require('path');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`robust-${W}${MOCK ? '-mock' : ''}`);
const ROUTES = ['today', 'find', 'pipeline', 'companies', 'prep', 'stats', 'prefs'];
async function visitAll(page, label, errors) {
  const bad = [];
  for (const r of ROUTES) {
    await page.evaluate((r) => (location.hash = r), r); await page.waitForTimeout(450);
    const o = await overflow(page);
    if (!o.ok) bad.push(`${r}:overflow ${o.sw}`);
    const blank = await page.evaluate(() => !document.querySelector('.workspace')?.textContent.trim());
    if (blank) bad.push(`${r}:blank`);
  }
  return bad;
}
(async () => {
  // ---- corrupt storage variants ----
  const variants = {
    truncated: '{"v":1,"profile":{"onboarded":true,"name":"X"},"apps":{"a1":{"id":"a1","company":"Acme"',
    nullLiteral: 'null',
    appsNull: JSON.stringify({ v: 1, profile: { onboarded: true }, apps: null, settings: null }),
    partialApp: JSON.stringify({ v: 1, profile: { onboarded: true, name: 'P' }, apps: { a1: { id: 'a1', company: 'Partial Co' } } }),
    badStage: JSON.stringify({ v: 1, profile: { onboarded: true }, apps: { a1: { id: 'a1', company: 'Weird', title: 'T', stage: 'archived', events: [], rounds: [], contacts: [], createdAt: Date.now(), lastActivityAt: Date.now() } } }),
    profileArrays: JSON.stringify({ v: 1, profile: { onboarded: true, roles: null, locations: 'nyc', levels: null, skills: null }, apps: {} }),
  };
  for (const [k, raw] of Object.entries(variants)) {
    const r = await open({ W, mock: MOCK, rawStorage: raw, route: 'today' });
    try {
      const bad = await visitAll(r.page, k, r.errors);
      if (k !== 'truncated' && k !== 'nullLiteral') {
        await r.page.evaluate(() => (location.hash = 'pipeline')); await r.page.waitForTimeout(300);
        const card = r.page.locator('.pl-card, .pl-table tbody tr').first();
        if (await card.count()) { await card.click().catch(() => {}); await r.page.waitForTimeout(300); }
      }
      T.check(`corrupt storage "${k}": app renders all routes without errors`, !bad.length && !r.errors.length, [...bad, ...r.errors.slice(0, 3)].join(' | '));
      if (k === 'truncated') {
        const onb = await r.page.locator('.onboard-wrap').count();
        T.note('truncated JSON -> shows onboarding (all data treated as gone)', onb ? 'yes' : 'no');
        await r.page.click('text=Skip setup').catch(() => {}); await r.page.waitForTimeout(400);
        const now = await r.page.evaluate(() => localStorage.getItem('heardback:v1'));
        T.check('truncated JSON: original unreadable data preserved/backed up before overwrite', now === raw || await r.page.evaluate(() => Object.keys(localStorage).some((k) => /backup|corrupt/i.test(k))), `stored now: ${String(now).slice(0, 80)}`);
      }
    } catch (e) { T.check(`corrupt ${k} exception`, false, e.message.split('\n')[0]); }
    await r.close();
  }
  // ---- missing data/jobs.json ----
  const src = process.env.DIST || path.join(__dirname, '..', '..', 'dist');
  const tmp = path.join(require('os').tmpdir(), 'hb-nojobs-' + process.pid);
  fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  fs.copyFileSync(path.join(src, 'index.html'), path.join(tmp, 'index.html'));
  fs.copyFileSync(path.join(src, 'data', 'companies.json'), path.join(tmp, 'data', 'companies.json'));
  {
    const r = await open({ W, mock: MOCK, dist: tmp, route: 'find' });
    try {
      await r.page.waitForTimeout(500);
      T.check('missing jobs.json: Find shows error state', await r.page.locator('text=/Couldn.t load job listings/').isVisible());
      T.check('missing jobs.json: Try again button', await r.page.locator('.find-page button:has-text("Try again")').isVisible());
      // add saved app with jobId and open job drawer
      await r.page.evaluate(() => { const a = Apps.create({ company: 'X', title: 'Y', jobId: 'nope-1', stage: 'saved' }); openJob('nope-1'); });
      await r.page.waitForTimeout(300);
      T.check('missing jobs.json: job drawer says not found, not stuck loading', await r.page.locator('.drawer:has-text("Listing not found")').count() === 1);
      await r.page.keyboard.press('Escape');
      const bad = await visitAll(r.page, 'nojobs', r.errors);
      const errs = r.errors.filter((e) => !/404|Failed to load resource/.test(e));
      T.check('missing jobs.json: all routes render, no JS errors', !bad.length && !errs.length, [...bad, ...errs].join(' | '));
      // retry after file restored
      fs.copyFileSync(path.join(src, 'data', 'jobs.json'), path.join(tmp, 'data', 'jobs.json'));
      await r.page.evaluate(() => (location.hash = 'find')); await r.page.waitForTimeout(300);
      await r.page.click('.find-page button:has-text("Try again")'); await r.page.waitForTimeout(2500);
      T.check('Try again loads jobs once file is back', (await r.page.locator('.find-row').count()) > 0);
    } catch (e) { T.check('nojobs exception', false, e.message.split('\n')[0]); }
    await r.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  // fresh onboarding without jobs
  {
    fs.mkdirSync(path.join(tmp, 'data'), { recursive: true }); fs.copyFileSync(path.join(src, 'index.html'), path.join(tmp, 'index.html'));
    const r = await open({ W, mock: MOCK, dist: tmp, setup: 'fresh' });
    try {
      await r.page.click('#onb-next'); await r.page.click('#onb-next'); await r.page.waitForTimeout(400);
      T.check('onboarding step 3 without jobs shows error + can finish', await r.page.locator('text=/Couldn.t load job listings/').isVisible() && await r.page.locator('#onb-finish').isEnabled());
    } catch (e) { T.check('onb nojobs exception', false, e.message.split('\n')[0]); }
    await r.close(); fs.rmSync(tmp, { recursive: true, force: true });
  }
  // ---- long strings + 300 apps ----
  {
    const r = await open({ W, mock: MOCK, setup: 'onboarded', route: 'today' });
    const page = r.page;
    try {
      await page.evaluate(() => {
        const long = 'Supercalifragilisticexpialidocious'.repeat(6);
        const a = Apps.create({ company: 'Extraordinarily Long Company Name Incorporated International Holdings ' + long, title: 'Senior Principal Staff Software Engineering Intern ' + long + ' (Summer 2027, Machine Learning Infrastructure)', location: 'San Francisco, CA; New York, NY; ' + long, stage: 'interview', appliedAt: Date.now() - 30 * 864e5 });
        Apps.addRound(a.id, { type: 'technical', at: Date.now() + 864e5, interviewers: long });
        Apps.update(a.id, { contacts: [{ name: long, role: long, email: long + '@x.example' }] });
        ui.set({ toasts: [] });
      });
      const bad = await visitAll(page, 'long', r.errors);
      T.check('very long strings: no horizontal overflow on any route', !bad.length, bad.join(','));
      await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(300);
      await page.locator('.pl-card').first().click(); await page.waitForTimeout(300);
      for (const tab of ['Overview', 'Rounds', 'Timeline', 'Notes']) {
        await page.click(`#pl-tab-${tab.toLowerCase()}`); await page.waitForTimeout(150);
        const ov = await page.evaluate(() => { const d = document.querySelector('.drawer'); return { sw: d.scrollWidth, cw: d.clientWidth, doc: document.documentElement.scrollWidth, dw: document.documentElement.clientWidth }; });
        T.check(`long strings: drawer ${tab} no horizontal overflow`, ov.sw <= ov.cw + 1 && ov.doc <= ov.dw + 1, JSON.stringify(ov));
      }
      await shot(page, `long-drawer-${W}`);
      await page.keyboard.press('Escape');
      await page.click('.seg button:has-text("Table")').catch(() => {}); await page.waitForTimeout(200);
      const tw = await page.evaluate(() => { const t = document.querySelector('.table-wrap'); return t ? { sw: t.scrollWidth, cw: t.clientWidth } : null; });
      T.note('long strings: table-wrap widths', JSON.stringify(tw));
      await shot(page, `long-table-${W}`);
      await page.click('.seg button:has-text("Board")').catch(() => {});
      // 300 apps
      const t0 = await page.evaluate(() => {
        const st = ['saved', 'applied', 'applied', 'applied', 'screen', 'interview', 'offer', 'rejected', 'ghosted'];
        const apps = {};
        for (let i = 0; i < 300; i++) {
          const id = 'bulk' + i; const ap = Date.now() - (i % 60) * 864e5 - 3600e3;
          const stage = st[i % st.length];
          apps[id] = { id, company: 'Company ' + (i % 120), title: 'Software Engineer Intern ' + i, location: 'City ' + i, url: '', jobId: null, stage, createdAt: ap - 864e5, appliedAt: stage === 'saved' ? null : ap, lastActivityAt: ap + 864e5, lastReplyAt: ['screen', 'interview', 'offer', 'rejected'].includes(stage) ? ap + 5 * 864e5 : null, notes: '', contacts: [], rounds: i % 7 === 0 ? [{ id: 'r' + i, type: 'technical', at: Date.now() + (i % 10 - 5) * 864e5, interviewers: 'X', prep: '', reflection: '', outcome: 'pending', thanked: false }] : [], events: [{ id: 'e' + i, at: ap, kind: 'created', text: 'Saved' }], salary: '', source: 'manual', example: false };
        }
        const t = performance.now();
        store.set((s) => ({ ...s, apps: { ...s.apps, ...apps } }));
        return t;
      });
      for (const rt of ['pipeline', 'today', 'stats', 'prep', 'find']) {
        const ms = await page.evaluate(async (rt) => { const t = performance.now(); location.hash = rt; await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); }, rt);
        await page.waitForTimeout(300);
        T.check(`300 apps: ${rt} renders < 1000ms`, ms < 1000, `${ms}ms`);
        const o = await overflow(page);
        T.check(`300 apps: ${rt} no overflow`, o.ok, JSON.stringify(o));
      }
      await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(400);
      // interaction latency: move a card with keyboard
      const lat = await page.evaluate(async () => { const t = performance.now(); Apps.move('bulk1', 'screen'); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); });
      T.check('300 apps: stage move re-render < 200ms', lat < 200, `${lat}ms`);
      const typing = await page.evaluate(async () => { const el = document.getElementById('pl-filter'); const t = performance.now(); el.value = 'company 1'; el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); });
      T.check('300 apps: filter keystroke < 150ms', typing < 150, `${typing}ms`);
      await shot(page, `bulk-board-${W}`);
      const size = await page.evaluate(() => (localStorage.getItem('heardback:v1') || '').length);
      T.note('300 apps: localStorage size (chars)', size);
      T.check('long/bulk: console errors', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
    } catch (e) { T.check('long/bulk exception', false, e.message.split('\n')[0]); await shot(page, `robust-exc-${W}`); }
    await r.close();
  }
  dump(__dirname + `/out/res-robust-${W}${MOCK ? '-mock' : ''}.json`);
})();
