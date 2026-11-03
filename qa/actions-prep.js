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
/* Every onb* action starts from a clean step 1, so actions can be chained in one run
   (e.g. today:onbStep1 today:onbStep2 today:onbStep3). Unmount onboarding, clear the targets, remount it. */
async function onbReset(page) {
  await page.evaluate(() => store.set((s) => ({ ...s, profile: { ...s.profile, onboarded: true } })));
  await wait(page, 120);
  await page.evaluate(() => store.set((s) => ({ ...s, profile: { ...s.profile, onboarded: false, roles: [], levels: [], locations: [], remote: true, needsSponsor: false, name: '', resume: '', skills: [] } })));
  await page.waitForSelector('#onb-title', { timeout: 4000 });
  await page.evaluate(() => { const w = document.querySelector('.onboard-wrap'); w && w.scrollTo(0, 0); });
}
async function step1(page) {
  await onbReset(page);
  await page.getByRole('button', { name: 'Software', exact: true }).click();
  await page.getByRole('button', { name: 'Data & AI', exact: true }).click();
  await page.check('#onb-loc-sf-bay-area');
  await page.check('#onb-loc-new-york');
  await page.fill('#onb-name', 'Alex');
}
module.exports = {
  async onbStep1(page) { await step1(page); },
  async onbLocMore(page) {
    await step1(page);
    const before = await page.locator('.onb-opt').count();
    await page.click('.onb-more'); await wait(page);
    const after = await page.locator('.onb-opt').count();
    console.log('[prep]', before === 6 && after === 12 ? 'ok' : 'FAIL', `location list ${before} -> ${after}`);
  },
  async onbResumePdf(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.setInputFiles('#onb-res-file', 'qa/fixtures/sample-resume.pdf');
    await page.waitForFunction(() => document.querySelector('#onb-res-text')?.value.length > 40, null, { timeout: 15000 }).catch(() => null);
    await wait(page, 400);
    const st = await page.evaluate(() => ({ len: document.querySelector('#onb-res-text').value.length, skills: document.querySelectorAll('.onb-skill').length }));
    console.log('[prep]', st.len > 40 && st.skills > 0 ? 'ok' : 'FAIL', `PDF read: ${st.len} chars, ${st.skills} skills`);
  },
  async onbResumeBad(page) {
    await step1(page); await page.click('#onb-next'); await wait(page);
    await page.setInputFiles('#onb-res-file', { name: 'resume.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await wait(page, 400);
    console.log('[prep]', (await page.locator('.onb-resume .callout').count()) ? 'ok' : 'FAIL', 'unsupported file shows inline message');
  },
  async prefsLocMore(page) { await page.click('.onb-more'); await wait(page); },
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
  async onbStep2Empty(page) { await onbReset(page); await page.click('#onb-next'); await wait(page); },
  async onbCorrupt(page) {
    await page.evaluate(() => { storage.corrupt = true; });
    await onbReset(page);
    console.log('[prep]', (await page.locator('.onb-corrupt #onb-restore').count()) ? 'ok' : 'FAIL', 'onboarding offers Restore from backup when saved data was unreadable');
    await page.evaluate(() => { storage.corrupt = false; });
  },
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

// ---- Mock interview (run with MOCK=1). patchMock swaps in a slower, word-by-word streaming double that honours
// AbortSignal, plus a valid scorecard for the JSON call, so streaming, Stop and the end summary can be checked.
async function patchMock(page, { delay = 30, firstDelay = 0, card = true } = {}) {
  await page.evaluate(({ delay, firstDelay, card }) => {
    if (!window.__qaOrigSample) window.__qaOrigSample = caps.sample;
    const orig = window.__qaOrigSample; let n = 0;
    const f = async (input, opts = {}) => {
      n++;
      const last = Array.isArray(input) ? input[input.length - 1].content : String(input);
      const text = /final question/.test(last) ? 'That answer was clear and well structured. A specific number for the result would make it land harder. Thanks for your time today, that is the end of our interview.'
        : n === 1 ? 'Thanks for making the time today. To start, tell me about a project where you had to make a trade-off under time pressure. What did you choose, and why?'
        : 'Good, you named the constraint clearly, though I would like to hear more about what you personally did. Next: describe a time you got critical feedback on your work. How did you respond?';
      if (firstDelay) await new Promise((r) => setTimeout(r, firstDelay));
      let acc = '';
      for (const w of text.split(' ')) {
        if (opts.signal && opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        await new Promise((r) => setTimeout(r, delay));
        acc += (acc ? ' ' : '') + w; opts.onText && opts.onText({ text: acc, delta: w });
      }
      return { text: acc };
    };
    f.json = async (p, o) => {
      if (!card) return orig.json(p, o);
      await new Promise((r) => setTimeout(r, 400));
      return { overall: 4, strengths: ['Clear structure: constraint, choice, result', 'Owned the decision and explained the reasoning'], improve: ['Quantify the result instead of describing it', 'Say what you would do differently next time'], betterAnswer: { question: 'Describe a time you got critical feedback on your work.', outline: 'Situation: code review on the caching change, one sentence\nFeedback: what the reviewer flagged, quoted plainly\nAction: what you changed and how you checked it\nResult: [your result], and the habit you kept' } };
    };
    caps.sample = f;
  }, { delay, firstDelay, card });
}
const ANSWERS = ['We had two days before a demo, so I cut the export feature and shipped search first because users asked for it most.', 'My lead said my PR was too big to review. I split it into three smaller ones and added tests, and review time dropped.', 'I would start by asking what the user is trying to do, then list the options and pick the simplest one we can measure.'];
async function mockAnswer(page, i, viaKey = true) {
  await page.waitForFunction(() => document.querySelector('#prep-mock-answer') && !document.querySelector('#prep-mock-stop'), null, { timeout: 15000 });
  await page.fill('#prep-mock-answer', ANSWERS[i % ANSWERS.length]);
  if (viaKey) await page.press('#prep-mock-answer', 'Control+Enter'); else await page.click('#prep-mock-send');
}
// Every mock* action starts from the same place, so they chain in one session: restore the real (MOCK=1) caps.sample,
// close overlays, restore the 10 example applications, clear the prep selection and bounce the route so PrepMock remounts.
async function resetMock(page) {
  await page.evaluate(() => {
    if (window.__qaOrigSample) caps.sample = window.__qaOrigSample;
    ui.set({ drawer: null, modal: null, palette: false, toasts: [] });
    store.set((s) => ({ ...s, apps: {}, settings: { ...s.settings, showExamples: true }, ui: { ...s.ui, prepFocus: null } }));
    loadExamples(); ui.set({ toasts: [] });
    location.hash = 'today';
  });
  await wait(page, 150);
  await page.evaluate(() => { location.hash = 'prep'; });
  await wait(page, 500);
  await page.evaluate(() => { ui.set({ toasts: [] }); document.getElementById('workspace')?.scrollTo(0, 0); });
}
const waitIdle = (page) => page.waitForFunction(() => !document.querySelector('#prep-mock-stop'), null, { timeout: 20000 });
const mockActions = {
  async mockStartDefault(page) { await module.exports.withResume(page); },
  async mockCanned(page) { await module.exports.withResume(page); await page.click('#prep-mock-start'); await wait(page, 900); },
  async mockThinking(page) { await module.exports.withResume(page); await patchMock(page, { firstDelay: 5000 }); await page.click('#prep-mock-start'); await wait(page, 400); },
  async mockStreaming(page) { await module.exports.withResume(page); await patchMock(page, { delay: 120 }); await page.click('#prep-mock-start'); await wait(page, 1300); },
  async mockStop(page) {
    await module.exports.withResume(page); await patchMock(page, { firstDelay: 5000 }); await page.click('#prep-mock-start'); await wait(page, 300);
    await page.click('#prep-mock-stop'); await wait(page, 300);
    const st = await page.evaluate(() => ({ err: !!document.querySelector('.prep-mock-err'), stop: !!document.querySelector('#prep-mock-stop') }));
    console.log('[prep]', st.err && !st.stop ? 'ok' : 'FAIL', 'stop before text shows retry', JSON.stringify(st));
  },
  async mockStopMid(page) {
    await module.exports.withResume(page); await patchMock(page, { delay: 120 }); await page.click('#prep-mock-start'); await wait(page, 900);
    await page.click('#prep-mock-stop'); await wait(page, 600);
    const st = await page.evaluate(() => ({ turns: document.querySelectorAll('.prep-mock-turn').length, stopped: /stopped/.test(document.querySelector('.prep-mock-who')?.textContent || ''), canSend: !!document.querySelector('#prep-mock-answer') }));
    console.log('[prep]', st.turns === 1 && st.stopped && st.canSend ? 'ok' : 'FAIL', 'stop mid-stream keeps partial', JSON.stringify(st));
  },
  async mockTurn(page) {
    await module.exports.withResume(page); await patchMock(page); await page.click('#prep-mock-start'); await waitIdle(page);
    await mockAnswer(page, 0); await waitIdle(page); await wait(page, 300);
    const st = await page.evaluate(() => ({ turns: document.querySelectorAll('.prep-mock-turn').length, count: document.querySelector('.prep-mock .prep-count')?.textContent, focus: document.activeElement?.id, draft: document.querySelector('#prep-mock-answer').value }));
    console.log('[prep]', st.turns === 3 && st.focus === 'prep-mock-answer' && !st.draft ? 'ok' : 'FAIL', 'answer via Ctrl+Enter', JSON.stringify(st));
  },
  async mockEnd(page) {
    await module.exports.withResume(page); await patchMock(page, { delay: 5 });
    await page.getByRole('button', { name: '3 questions', exact: true }).click();
    await page.click('#prep-mock-start'); await waitIdle(page);
    for (let i = 0; i < 3; i++) { await mockAnswer(page, i, i !== 1); await wait(page, 100); await waitIdle(page); }
    await page.waitForSelector('.prep-score', { timeout: 10000 });
    await page.evaluate(() => document.getElementById('workspace').scrollTo(0, 0)); await wait(page, 300);
  },
  async mockSave(page) {
    await mockActions.mockEnd(page);
    await page.click('#prep-mock-save'); await wait(page, 500);
    const st = await page.evaluate(() => ({ store: Object.values(store.get().apps).flatMap((a) => a.rounds || []).some((r) => /Mock interview with Claude/.test(r.prep || '')), ui: /Mock interview with Claude/.test(document.querySelector('textarea[id^="prep-notes-"]')?.value || ''), btn: document.querySelector('#prep-mock-save')?.textContent }));
    console.log('[prep]', st.store && st.ui ? 'ok' : 'FAIL', 'save to round notes', JSON.stringify(st));
    await page.locator('#prep-mock-save').scrollIntoViewIfNeeded();
  },
  async mockEndBadJson(page) {
    await module.exports.withResume(page); await patchMock(page, { delay: 5, card: false });
    await page.getByRole('button', { name: '3 questions', exact: true }).click();
    await page.click('#prep-mock-start'); await waitIdle(page);
    for (let i = 0; i < 3; i++) { await mockAnswer(page, i); await wait(page, 100); await waitIdle(page); }
    await wait(page, 800);
    console.log('[prep]', (await page.locator('.prep-mock-err').count()) ? 'ok' : 'FAIL', 'bad scorecard shape shows retry');
    await page.locator('.prep-mock-err').scrollIntoViewIfNeeded();
  },
  async mockPractice(page) { await module.exports.prepPracticeItem(page); },
  async mockHidden(page) {
    const n = await page.locator('#prep-mock-start').count();
    console.log('[prep]', n === 0 ? 'ok' : 'FAIL', 'mock hidden without Claude');
    await page.click('#prep-practice'); await wait(page);
  },
};
Object.assign(module.exports, Object.fromEntries(Object.entries(mockActions).map(([k, fn]) => [k, async (page) => { await resetMock(page); return fn(page); }])));
