// QA actions for onboarding, prep and settings. Usage: ACTIONS=qa/actions-prep.js node qa/shot.js today:onbStep1
const RESUME = `Alex Kim
alex@example.com

EXPERIENCE
Software Engineer Intern, Acme Corp (Summer 2026)
- Built a React and TypeScript dashboard used by 40 internal analysts every day
- Reduced API latency by 35% by adding Redis caching to a Python Flask service
- Wrote unit tests in Jest and set up GitHub Actions CI for the team
Research Assistant, University ML Lab
- Trained PyTorch models for image classification, improving accuracy from 81% to 89%
- Led a team of 3 students to publish a workshop paper on data augmentation

SKILLS
Python, Java, SQL, React, TypeScript, PyTorch, Docker, AWS, Git`;

const wait = (p, ms = 300) => p.waitForTimeout(ms);
async function step1(page) {
  await page.getByRole('button', { name: 'Software', exact: true }).click();
  await page.getByRole('button', { name: 'Data & AI', exact: true }).click();
  await page.getByRole('button', { name: 'SF Bay Area', exact: true }).click();
  await page.getByRole('button', { name: 'New York', exact: true }).click();
  await page.fill('#onb-name', 'Alex');
}
module.exports = {
  async onbStep1(page) { await step1(page); },
  async onbStep2(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.fill('#onb-res-text', RESUME); await wait(page);
    await page.getByRole('button', { name: 'Remove Java', exact: true }).click();
    await page.fill('#onb-res-add', 'Figma'); await page.press('#onb-res-add', 'Enter');
  },
  async onbStep2Suggest(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.fill('#onb-res-text', RESUME); await wait(page);
    await page.fill('#onb-res-add', 'ja'); await wait(page);
    const n = await page.locator('.onb-sugg-btn').count();
    console.log('suggestions for "ja":', n, await page.locator('.onb-sugg-btn').allTextContents());
  },
  async onbStep2Empty(page) { await page.click('#onb-next'); await wait(page); },
  async onbStep3(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.fill('#onb-res-text', RESUME); await page.click('#onb-next'); await wait(page, 1200);
  },
  async onbFinish(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.fill('#onb-res-text', RESUME); await page.click('#onb-next'); await wait(page, 1000);
    await page.check('#onb-examples'); await page.click('#onb-finish'); await wait(page, 800);
    const st = await page.evaluate(() => { const s = store.get(); return { onboarded: s.profile.onboarded, apps: Object.keys(s.apps).length, skills: s.profile.skills.length, name: s.profile.name, hash: location.hash }; });
    console.log('after finish', JSON.stringify(st));
  },
  async withResume(page) {
    await page.evaluate((r) => store.set((s) => ({ ...s, profile: { ...s.profile, resume: r, skills: extractSkills(r) } })), RESUME);
    await wait(page);
  },
  async prepResume(page) { await module.exports.withResume(page); },
  async prepExpand(page) { await module.exports.withResume(page); await page.locator('.prep-qbtn').first().click(); },
  async prepNotes(page) {
    await page.locator('textarea[id^="prep-notes-"]').fill('Review BFS/DFS and union-find. Story: caching project.');
    await wait(page, 900);
    const saved = await page.evaluate(() => Object.values(store.get().apps).flatMap((a) => a.rounds).some((r) => /union-find/.test(r.prep)));
    console.log('notes saved to round:', saved);
    await page.locator('textarea[id^="prep-notes-"]').scrollIntoViewIfNeeded();
  },
  async prepPractice(page) {
    await page.click('#prep-practice'); await wait(page);
    await page.click('#prep-timer-toggle'); await wait(page, 2200);
    await page.fill('#prep-outline', 'Clarify input size, then BFS from the start with a visited set. O(rows*cols).');
    await page.click('#prep-timer-toggle');
  },
  async prepPracticeNext(page) { await page.click('#prep-practice'); await wait(page); await page.click('#prep-next'); await page.click('#prep-next'); },
  async prepFeedback(page) {
    await page.click('#prep-practice'); await wait(page);
    await page.fill('#prep-outline', 'Clarify input size, then BFS from the start with a visited set. O(rows*cols).');
    await page.click('#prep-feedback'); await wait(page, 900);
  },
  async prepTailor(page) { await page.click('#prep-tailor'); await wait(page, 900); await page.locator('#prep-tailor').scrollIntoViewIfNeeded(); },
  async prepPracticeItem(page) {
    const sm = await page.evaluate(() => innerWidth < 861);
    if (sm) await page.selectOption('#prep-select', 'practice'); else await page.click('#prep-practice-item');
    await wait(page);
  },
  async prepPast(page) {
    const sm = await page.evaluate(() => innerWidth < 861);
    if (sm) { const v = await page.$eval('#prep-select optgroup[label="Waiting on outcome"] option', (o) => o.value); await page.selectOption('#prep-select', v); }
    else await page.locator('.prep-item').nth(1).click();
    await wait(page);
  },
  async prepEmpty(page) { await page.evaluate(() => store.set((s) => ({ ...s, apps: {}, ui: { ...s.ui, prepFocus: null } }))); await wait(page); },
  async prepAnyway(page) { await module.exports.prepEmpty(page); await page.click('#prep-anyway'); await wait(page); },
  async scrollDown(page) { await page.evaluate(() => document.getElementById('workspace').scrollTo(0, 99999)); await wait(page); },
  async scrollMid(page) { await page.evaluate(() => { const w = document.getElementById('workspace'); w.scrollTo(0, w.scrollHeight / 2 - 300); }); await wait(page); },
  async prefsResume(page) { await module.exports.withResume(page); await page.click('#pf-edit-resume'); await wait(page); },
  async prefsCorrupt(page) { await page.evaluate(() => { storage.corrupt = true; store.set((s) => ({ ...s })); }); await page.evaluate(() => { location.hash = 'today'; }); await wait(page); await page.evaluate(() => { location.hash = 'prefs'; }); await wait(page); },
  async prefsBadImport(page) {
    const bad = JSON.stringify({ app: 'Heardback', profile: { roles: 'Software', skills: [null, 3, 'Go'], weeklyGoal: 'x' }, settings: { ghostDays: 'abc' }, apps: [null, { company: 'Acme', title: 'SWE', rounds: [null], events: 'x' }, 5] });
    await page.setInputFiles('#pf-import', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(bad) }); await wait(page);
    await page.click('.modal-foot button:has-text("Import and merge")'); await wait(page, 500);
    console.log('after bad import', await page.evaluate(() => JSON.stringify({ roles: store.get().profile.roles, skills: store.get().profile.skills, goal: store.get().profile.weeklyGoal, ghost: store.get().settings.ghostDays, acme: Object.values(store.get().apps).filter((a) => a.company === 'Acme').length })));
    await page.evaluate(() => { location.hash = 'pipeline'; }); await wait(page); await page.evaluate(() => { location.hash = 'prefs'; }); await wait(page);
  },
  async prefsDelete(page) { await page.click('#pf-delete'); await wait(page); },
  async prefsScroll(page) { await module.exports.withResume(page); await module.exports.scrollMid(page); },
  async prefsBottom(page) { await module.exports.scrollDown(page); },
  async prefsImportCsv(page) {
    const csv = 'Company,Title,Stage,Applied Date,URL,Location\nAcme,SWE Intern,Applied,2026-10-20,https://acme.example/jobs/1,Remote\nBeta Co,Data Intern,Interviewing,2026-10-10,,NYC\n,,,,,\nGamma,PM Intern,,,,\n';
    await page.setInputFiles('#pf-import', { name: 'apps.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await wait(page, 500);
    console.log('apps after csv', await page.evaluate(() => Object.values(store.get().apps).filter((a) => a.source === 'import').map((a) => `${a.company}:${a.stage}`).join(', ')));
  },
  async prefsImportJson(page) {
    const backup = await page.evaluate(() => JSON.stringify({ app: 'Heardback', apps: store.get().apps, profile: store.get().profile, settings: store.get().settings }));
    await page.setInputFiles('#pf-import', { name: 'heardback-backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await wait(page, 500);
  },
  async prefsExport(page) {
    await page.evaluate(() => { window.__saved = []; caps.downloads = { save: async (o) => { window.__saved.push([o.filename, await o.data.text()]); } }; });
    await page.click('#pf-export-csv'); await page.click('#pf-export-json'); await wait(page, 300);
    const s = await page.evaluate(() => window.__saved.map(([n, t]) => `${n}: ${t.split('\n').slice(0, 3).join(' | ').slice(0, 300)}`));
    console.log(s.join('\n'));
  },
};
