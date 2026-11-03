// Interactions for the Find / Companies area. Run: ACTIONS=qa/actions-find.js node qa/shot.js find:openFirstJob
const wait = (p, ms = 400) => p.waitForTimeout(ms);
const ready = (p) => p.waitForFunction(() => jobsStore.status === 'ready' || jobsStore.status === 'error', null, { timeout: 15000 });
const fakeClaude = (p) => p.evaluate(() => {
  const fake = async (prompt, o = {}) => { const t = '- Builds a short-video platform and ads products.\n- Large company with engineering hubs in San Jose and Seattle.\n- Hires interns into most engineering teams each summer.'; o.onText && o.onText({ text: t }); return { text: t }; };
  fake.json = async (prompt) => /bullets/.test(prompt)
    ? { bullets: [{ from: 'Built a Flask API for club sign-ups', to: 'Built and deployed a Flask REST API serving 300 members, cutting sign-up time in half', why: 'Shows backend API work' }, { from: 'Wrote Python scripts to clean survey data', to: 'Automated survey data cleaning in Python and Pandas for a 4-person research team', why: 'Data handling for data roles' }] }
    : { why: ['Python and SQL coursework matches the core of this role', 'Internship at a startup shows you can ship'], whyNot: ['No production ML experience on the resume', 'Role may want a graduate degree'], note: 'Pasting the description would show whether ML depth is required.' };
  caps.sample = fake; capSubs.forEach((f) => f());
  store.set((s) => ({ ...s, profile: { ...s.profile, resume: 'Alex Kim. CS student. Built a Flask API for club sign-ups. Wrote Python scripts to clean survey data. Intern at a startup working on React dashboards and SQL reporting.' } }));
});

module.exports = {
  async openFirstJob(p) { await ready(p); await p.click('.find-results .find-row'); await wait(p); },
  async openFirstJobScrolled(p) { await p.click(".find-results .find-row"); await wait(p); await p.evaluate(() => { const b = document.querySelector('.drawer-body'); b.scrollTop = b.scrollHeight; }); await wait(p); },
  async openGhostJob(p) {
    await ready(p);
    await p.evaluate(() => { const j = jobsStore.jobs.find((x) => x.g >= 80 && x.nl > 6); openJob(j.id); });
    await wait(p);
    await p.click('.find-details summary'); await wait(p, 200);
    await p.evaluate(() => { document.querySelector('.find-details').scrollIntoView(); });
  },
  async jobAI(p) {
    await ready(p); await fakeClaude(p);
    await p.click('.find-results .find-row'); await wait(p);
    await p.click('text=Why you, why not you'); await wait(p, 300);
    await p.click('text=Tailor my resume'); await wait(p, 300);
    await p.evaluate(() => { document.querySelector('#find-ai-h').scrollIntoView(); });
  },
  async saveFirst(p) { await ready(p); await p.click('.find-results .find-row .find-save'); await wait(p); await p.click('.find-results .find-row:nth-child(2) .find-save'); await wait(p); await p.keyboard.press('j'); await p.keyboard.press('j'); await p.keyboard.press('j'); await wait(p, 200); },
  async keyboardOpen(p) { await ready(p); await p.click('.page-head h1'); await p.keyboard.press('j'); await p.keyboard.press('j'); await p.keyboard.press('Enter'); await wait(p); },
  async openCompany(p) { await ready(p); await p.evaluate(() => openCompany('TikTok')); await wait(p); },
  async openCompanyScrolled(p) { await p.evaluate(() => openCompany("TikTok")); await wait(p); await p.evaluate(() => { const b = document.querySelector('.drawer-body'); b.scrollTop = 520; }); await wait(p); },
  async companyAI(p) { await ready(p); await fakeClaude(p); await p.evaluate(() => { localStorage.removeItem('heardback:find:brief:Stripe'); openCompany('Stripe'); }); await wait(p); await p.click('text=Brief me on this company'); await wait(p); await p.evaluate(() => document.querySelector('#find-brief-h').scrollIntoView()); },
  async searchData(p) { await ready(p); await p.fill('#find-q', 'data scientist new york'); await wait(p, 500); },
  async searchNone(p) { await ready(p); await p.fill('#find-q', 'zzqx nothing'); await wait(p, 500); },
  async filterRemote(p) { await ready(p); await p.click('text=Show all'); await wait(p, 200); await p.locator('.find-aside .chip', { hasText: 'Remote' }).first().click(); await wait(p, 300); },
  async sortFit(p) { await ready(p); await p.click('.find-sort button:has-text("Best fit")'); await wait(p); },
  async mobileFilters(p) { await ready(p); await p.click('.find-fbtn'); await wait(p); },
  async scrollMore(p) { await ready(p); await p.evaluate(() => { const w = document.querySelector('.workspace'); w.style.scrollBehavior = 'auto'; w.scrollTop = w.scrollHeight; }); await wait(p, 600); await p.evaluate(() => { const w = document.querySelector('.workspace'); w.scrollTop = w.scrollHeight; }); await wait(p, 600); },
  async coSearch(p) { await ready(p); await p.fill('#co-q', 'capital'); await wait(p, 400); },
  async coSortFast(p) { await ready(p); await p.click('.find-toolbar .seg button:has-text("Fastest")'); await wait(p); },
  async coOpen(p) { await ready(p); await p.click('.find-cotable tbody tr'); await wait(p); },
  async coOpenMobile(p) { await ready(p); await p.click('.find-corow'); await wait(p); },
  async markApplied(p) { await ready(p); await p.click('.find-results .find-row'); await wait(p); await p.click('.drawer-foot button:has-text("Mark as applied")'); await wait(p); },
  async perf(p) {
    await ready(p);
    const t = await p.evaluate(async () => {
      const f = { lv: [], roles: [], locs: ['remote', 'new york'], posted: 'any', visa: 'any', hideGhost: true };
      const t0 = performance.now(); for (let i = 0; i < 20; i++) find_run(jobsStore.jobs, f, 'engineer ' + i, true); return (performance.now() - t0) / 20;
    });
    console.log('find_run avg ms', t.toFixed(2));
  },
};
// close any drawer/modal left open by a previous action in the same session
for (const [k, fn] of Object.entries(module.exports)) {
  module.exports[k] = async (p) => { await p.evaluate(() => { try { closeDrawer(); closeModal(); } catch {} }); await p.waitForTimeout(150); if (k !== 'searchNone' && await p.$('#find-q') && await p.inputValue('#find-q')) { await p.fill('#find-q', ''); await p.waitForTimeout(300); } return fn(p); };
}
