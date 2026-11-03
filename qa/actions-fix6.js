// QA actions for fix round 6 (today/prefs/prep/find). Usage: ACTIONS=qa/actions-fix6.js OUT=qa/out-fix6 node qa/shot.js prefs:csv
const path = require('path');
const boxes = async (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return `${(e.id || e.textContent).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
module.exports = {
  async findBar(page) { console.log('targets', await boxes(page, '.find-bar2 button, .find-bar2 select')); },
  async findBarShown(page) { await page.click('#find-bar-ghost'); await page.waitForTimeout(300); console.log('targets', await boxes(page, '.find-bar2 button, .find-bar2 select')); },
  async csv(page) {
    await page.evaluate(() => { const st = store.get(); store.set((s) => ({ ...s, apps: Object.fromEntries(Object.entries(s.apps).filter(([, a]) => !a.example)) })); });
    await page.setInputFiles('#pf-import', path.join(__dirname, 'ux2', 'my-applications.csv'));
    await page.waitForSelector('.pf-imp-row');
    const rows = await page.$$eval('.pf-imp-row', (els) => els.map((e) => e.querySelector('.pf-imp-co').textContent + ' -> ' + e.querySelector('select').value));
    console.log(rows.join('\n'));
    console.log('targets', await boxes(page, '.pf-imp-sel'));
  },
  async csvImport(page) {
    await module.exports.csv(page);
    await page.selectOption('#pf-imp-st-0', 'screen');
    await page.click('#pf-imp-go');
    await page.waitForTimeout(400);
    const apps = await page.evaluate(() => Object.values(store.get().apps).map((a) => `${a.company}:${a.stage}`));
    console.log('imported', apps.join(', '));
    await page.evaluate(() => { location.hash = 'today'; });
    await page.waitForTimeout(600);
    const tasks = await page.$$eval('.td-task', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 110)));
    console.log('tasks\n' + tasks.join('\n'));
  },
  async nextround(page) {
    await module.exports.csvImport(page);
    const btn = page.locator('.td-task', { hasText: 'Zillow' }).locator('.td-act');
    console.log('zillow action', await btn.innerText());
    await btn.click(); await page.waitForTimeout(500);
    console.log('drawer tab', await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]')?.textContent));
  },
  async newForYou(page) {
    await page.evaluate(() => store.set((s) => ({ ...s, profile: { ...s.profile, levels: ['newgrad'], roles: ['Data & AI'], locations: ['seattle', 'remote'], remote: true } })));
    await page.waitForTimeout(500);
    const rows = await page.$$eval('.td-job', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
    console.log('newForYou\n' + rows.join('\n'));
  },
  async newForYouIntern(page) {
    await page.evaluate(() => store.set((s) => ({ ...s, profile: { ...s.profile, levels: ['intern'], roles: [], locations: [], remote: false } })));
    await page.waitForTimeout(500);
    const rows = await page.$$eval('.td-job', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
    console.log('newForYouIntern\n' + rows.join('\n'));
  },
  async prepPractice(page) {
    // pick practice, then add a round while Prep is open: should switch to the new round
    const a = await page.evaluate(() => Apps.list().find((x) => x.stage === 'interview' || x.stage === 'screen') || Apps.list()[0]);
    await page.evaluate(() => { location.hash = 'prep'; });
    await page.waitForTimeout(400);
    const hasSel = await page.$('#prep-practice-item:visible');
    if (hasSel) await page.click('#prep-practice-item'); else await page.selectOption('#prep-select', 'practice');
    await page.waitForTimeout(300);
    console.log('before', await page.$eval('#prep-select', (e) => e.value));
    await page.evaluate((id) => Apps.addRound(id, { type: 'technical', at: now() + 2 * DAY + 3600000, interviewers: '', outcome: 'pending' }), a.id);
    await page.waitForTimeout(400);
    console.log('after add', await page.$eval('#prep-select', (e) => e.value), a.company);
  },
  async prepStale(page) {
    await page.evaluate(() => store.set((s) => ({ ...s, ui: { ...s.ui, prepFocus: { practice: true } } })));
    await page.evaluate(() => { location.hash = 'today'; }); await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = 'prep'; }); await page.waitForTimeout(500);
    console.log('stale practice focus ->', await page.$eval('#prep-select', (e) => e.value));
  },
};
module.exports.prepAnyway = async (page) => {
  await page.evaluate(() => { location.hash = 'prep'; }); await page.waitForTimeout(300);
  await page.click('#prep-anyway'); await page.waitForTimeout(300);
  console.log('anyway', await page.$eval('#prep-select', (e) => e.value));
  await page.evaluate(() => { const a = Apps.create({ company: 'Zillow', title: 'Associate Data Scientist', stage: 'interview' }); Apps.addRound(a.id, { type: 'technical', at: now() + 3 * DAY, interviewers: '', outcome: 'pending' }); });
  await page.waitForTimeout(400);
  console.log('after add', await page.$eval('#prep-select', (e) => e.value), await page.$eval('.page-head', (e) => e.innerText.replace(/\s+/g, ' ')));
};
