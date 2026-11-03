// node qa/cold/personas.js [a|b|c ...]  -> OUT=qa/out-cold/<persona>-<w>-NN-label.png + timeline JSON
const { serve, open, chromium, out } = require('./lib');
const fs = require('fs'); const path = require('path');
const visible = (page) => page.evaluate(() => {
  const r = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; const b = el.getBoundingClientRect();
    if (b.width && b.bottom > 0 && b.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' && el.closest('[aria-hidden=true]') == null) {
      // skip things hidden under the onboarding overlay
      const ov = document.querySelector('.onboard-wrap'); if (ov && !ov.contains(el)) continue; r.push(t); } }
  return r.join(' | ');
});
const firstJobVisible = (page) => page.evaluate(() => [...document.querySelectorAll('.job-row,.onb-job,.find-row,[class*=job-card]')].some((e) => { const b = e.getBoundingClientRect(); return b.height && b.top < innerHeight && b.bottom > 0; }));
const flows = {
  // (a) skeptical CS sophomore: picks Internship + Software + SF, skips resume, scans matches
  async a(s, m) {
    const { page, shot, note, tap } = s;
    await tap(page.getByRole('button', { name: 'Internship', exact: true })); await tap(page.getByRole('button', { name: 'Software', exact: true }));
    await tap(page.locator('label.onb-opt', { hasText: 'SF Bay Area' })); await shot('picked');
    await tap(page.locator('#onb-next')); await page.waitForTimeout(300); await shot('step2-resume');
    note('step2 visible: ' + (await visible(page)).slice(0, 600));
    await tap(page.getByRole('button', { name: 'Skip this step' })); await page.waitForTimeout(600); await shot('step3-matches');
    note('FIRST JOB VISIBLE: ' + (await firstJobVisible(page)));
    note('step3 visible: ' + (await visible(page)).slice(0, 1200));
    await shot('step3-full', true);
    const g = page.locator('.onb-job .gscore').first(); if (await g.count()) note('ghost tooltip: ' + (await g.getAttribute('title'))); else note('no ghost badge on top 5');
    // tap a match: does anything happen?
    const before = page.url(); await tap(page.locator('.onb-job').first()); note('tap job row -> url ' + (page.url() === before ? 'unchanged (rows are not tappable)' : page.url()));
    await tap(page.locator('#onb-finish')); await page.waitForTimeout(800); await shot('landed-today');
    note('today visible: ' + (await visible(page)).slice(0, 900));
  },
  // (b) finance/consulting student: looks for Finance, leaves roles empty, New York, finishes, searches
  async b(s, m) {
    const { page, shot, note, tap } = s;
    const roles = await page.locator('#onb-g-role ~ * , .onb-group').nth(1).innerText(); note('role choices: ' + roles.replace(/\n/g, ' / '));
    await tap(page.getByRole('button', { name: 'Internship', exact: true })); await tap(page.locator('label.onb-opt', { hasText: 'New York' }));
    await shot('picked-no-role');
    await tap(page.locator('#onb-next')); await tap(page.getByRole('button', { name: 'Skip this step' })); await page.waitForTimeout(600);
    await shot('step3-matches'); note('step3 visible: ' + (await visible(page)).slice(0, 1200));
    await tap(page.locator('#onb-finish')); await page.waitForTimeout(800); await shot('landed-today');
    await page.evaluate(() => { location.hash = 'find'; }); await page.waitForTimeout(900); await shot('find');
    for (const q of ['finance', 'consulting', 'investment banking']) {
      const inp = page.locator('#find-q'); await inp.fill(q); await inp.press('Enter'); await page.waitForTimeout(700);
      await shot('search-' + q.replace(/\s+/g, '-'));
      note(`search "${q}": ` + (await page.evaluate(() => (document.querySelector('.find-count,.find-bar,[class*=find-count]')?.innerText || '').replace(/\n/g, ' '))) + ' | ' + (await visible(page)).slice(0, 500));
    }
  },
  // (c) just looking: taps Skip setup immediately, wanders
  async c(s, m) {
    const { page, shot, note, tap } = s;
    await tap(page.getByRole('button', { name: 'Skip setup' })); await page.waitForTimeout(800); await shot('after-skip');
    note('after skip visible: ' + (await visible(page)).slice(0, 1000));
    note('FIRST JOB VISIBLE after skip: ' + (await firstJobVisible(page)));
    const txt = await s.text(); note('mentions example on Today: ' + /example/i.test(txt));
    // try the primary nav: on mobile the nav may be a bottom bar / menu
    await page.evaluate(() => { location.hash = 'find'; }); await page.waitForTimeout(900); await shot('find');
    note('find visible: ' + (await visible(page)).slice(0, 900)); note('FIRST JOB VISIBLE in find: ' + (await firstJobVisible(page)));
    // open first job
    const row = page.locator('.find-row, .job-row').first(); if (await row.count()) { await tap(row); await page.waitForTimeout(700); await shot('job-open'); note('job open visible: ' + (await visible(page)).slice(0, 900)); }
    await page.keyboard.press('Escape'); await page.evaluate(() => { location.hash = 'pipeline'; }); await page.waitForTimeout(900); await shot('pipeline');
    note('pipeline visible: ' + (await visible(page)).slice(0, 700));
    const ex = page.getByText('Load an example pipeline'); note('example link on pipeline: ' + (await ex.count()));
    if (await ex.count()) { await tap(ex.first()); await page.waitForTimeout(800); await shot('pipeline-examples'); }
  },
};
(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : ['a', 'b', 'c'];
  const server = await serve(); const browser = await chromium.launch(); const all = {};
  for (const p of which) for (const mobile of [true, false]) {
    const s = await open(browser, server.address().port, { mobile, persona: p });
    await s.page.goto(s.url); await s.page.waitForTimeout(300); await s.shot('t0');
    s.note('t0 visible: ' + (await visible(s.page)).slice(0, 500));
    try { await flows[p](s, mobile); } catch (e) { s.note('FLOW ERROR ' + e.message.split('\n')[0]); await s.shot('error'); }
    s.note('errors: ' + JSON.stringify(s.errors));
    all[s.tag] = s.log; await s.ctx.close();
  }
  fs.writeFileSync(path.join(out, 'timeline-' + which.join('') + '.json'), JSON.stringify(all, null, 1));
  for (const [k, v] of Object.entries(all)) { console.log('\n#### ' + k); for (const e of v) console.log(e.t + 's', e.label ? '[shot] ' + e.label : e.note); }
  await browser.close(); server.close();
})();
