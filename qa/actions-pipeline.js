// Pipeline QA actions. Run: ACTIONS=qa/actions-pipeline.js node qa/shot.js pipeline:<name>
const log = (...a) => console.log('  [pipeline]', ...a);
const assert = (c, msg) => { if (!c) { console.log('  [pipeline] ASSERT FAILED: ' + msg); throw new Error(msg); } else log('ok -', msg); };
const stageOf = (page, company) => page.evaluate((c) => Object.values(store.get().apps).find((a) => a.company === c)?.stage, company);
const wait = async (page, ms = 250) => { await page.waitForTimeout(ms); await page.evaluate(() => ui.set({ toasts: [] })); };

async function firstCard(page, company) { return page.locator(`.pl-card:has-text("${company}")`).first(); }

module.exports = {
  async table(page) {
    await page.evaluate(() => store.set((s) => ({ ...s, ui: { ...s.ui, pipelineView: 'table' } })));
    await wait(page);
    const rows = await page.locator('.pl-table tbody tr').count();
    assert(rows === 10, `table shows 10 rows (got ${rows})`);
    await page.click('.pl-table th button:has-text("Days silent")');
    await wait(page, 150);
  },
  async tableStage(page) {
    await module.exports.table(page);
    const id = await page.evaluate(() => Object.values(store.get().apps).find((a) => a.company === 'Verity Labs').id);
    await page.selectOption(`#pl-st-${id}`, 'screen');
    await wait(page);
    assert((await stageOf(page, 'Verity Labs')) === 'screen', 'inline select moves stage');
  },
  async filter(page) {
    await page.fill('#pl-filter', 'north');
    await wait(page);
    const n = await page.locator('.pl-card').count();
    assert(n === 1, `filter "north" leaves 1 card (got ${n})`);
  },
  async empty(page) {
    await page.evaluate(() => clearExamples());
    await wait(page, 300);
    assert(await page.locator('.pl-empty').count() === 1, 'empty state renders');
  },
  async dnd(page) {
    const before = await stageOf(page, 'Verity Labs');
    await page.dragAndDrop('.pl-card:has-text("Verity Labs")', '[data-col="screen"]');
    await wait(page, 400);
    const after = await stageOf(page, 'Verity Labs');
    assert(before === 'applied' && after === 'screen', `drag Verity Labs applied -> screen (got ${before} -> ${after})`);
    await page.dragAndDrop('.pl-card:has-text("Lumen Robotics")', '[data-col="rejected"]');
    await wait(page, 400);
    assert((await stageOf(page, 'Lumen Robotics')) === 'rejected', 'drag onto collapsed Rejected rail');
  },
  async keys(page) {
    const card = await firstCard(page, 'Quarry Analytics');
    await card.focus();
    await page.keyboard.press('ArrowRight');
    await wait(page, 300);
    assert((await stageOf(page, 'Quarry Analytics')) === 'screen', 'ArrowRight moves to Screen');
    const focused = await page.evaluate(() => document.activeElement?.dataset?.card && Apps.get(document.activeElement.dataset.card).company);
    assert(focused === 'Quarry Analytics', 'focus follows the moved card');
    await page.keyboard.press(']');
    await wait(page, 300);
    assert((await stageOf(page, 'Quarry Analytics')) === 'interview', '] moves to Interviews');
    await page.keyboard.press('[');
    await wait(page, 300);
    assert((await stageOf(page, 'Quarry Analytics')) === 'screen', '[ moves back to Screen');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await wait(page, 300);
    assert(await page.locator('.drawer').count() === 1, 'Enter opens drawer');
    await page.keyboard.press('Escape');
    await wait(page, 200);
    await (await firstCard(page, 'Lumen Robotics')).focus();
  },
  async moveMenu(page) {
    await page.locator('.pl-card:has-text("Ostrich Systems") .pl-more').click();
    await wait(page, 200);
    assert(await page.locator('.pl-menu').count() === 1, 'move menu opens');
    await wait(page, 100);
  },
  async moveMenuPick(page) {
    await module.exports.moveMenu(page);
    await page.locator('.pl-menu button:has-text("Applied")').click();
    await wait(page, 300);
    assert((await stageOf(page, 'Ostrich Systems')) === 'applied', 'menu pick moves to Applied');
  },
  async expandClosed(page) {
    await page.click('.pl-rail[data-col="rejected"]');
    await page.click('.pl-rail[data-col="ghosted"]');
    await wait(page, 200);
    await page.evaluate(() => document.querySelector('.pl-board').scrollLeft = 9999);
  },
  async drawer(page) {
    await wait(page, 50);
    await page.click('.pl-card:has-text("Northwind Labs")');
    await wait(page, 300);
    assert(await page.locator('.drawer .pl-stepper').count() === 1, 'drawer opens with stepper');
  },
  async drawerRounds(page) {
    await module.exports.drawer(page);
    await page.click('.drawer .seg button:has-text("Rounds")');
    await wait(page);
    const n = await page.locator('.pl-round').count();
    assert(n === 2, `2 rounds (got ${n})`);
  },
  async drawerAddRound(page) {
    await module.exports.drawerRounds(page);
    await page.click('.drawer button:has-text("Add round")');
    await wait(page, 300);
    assert(await page.locator('.pl-round').count() === 3, 'round added');
    const rid = await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'); return a.rounds[a.rounds.length - 1].id; });
    await page.fill(`#pl-r-${rid}-who`, 'Sam Ortiz');
    await page.fill(`#pl-r-${rid}-refl`, 'Good conversation about distributed caching.');
    await wait(page, 700);
    const v = await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'); return a.rounds[a.rounds.length - 1]; });
    assert(v.interviewers === 'Sam Ortiz' && /caching/.test(v.reflection), 'round fields autosave');
    await page.click(`[data-round="${rid}"] .pl-outcome button:has-text("Passed")`);
    await wait(page, 150);
  },
  async drawerTimeline(page) {
    await module.exports.drawer(page);
    await page.click('.drawer .seg button:has-text("Timeline")');
    await page.fill('#pl-tl-note', 'Recruiter said decisions by Friday');
    await page.keyboard.press('Enter');
    await wait(page);
    assert(await page.locator('.tl-item:has-text("decisions by Friday")').count() === 1, 'quick note added to timeline');
  },
  async drawerNotes(page) {
    await module.exports.drawer(page);
    await page.click('.drawer .seg button:has-text("Notes")');
    await page.fill('#pl-notes', 'Referral from Jamie. Team works on the routing service.');
    await wait(page, 900);
    const n = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs').notes);
    assert(/Referral/.test(n), 'notes autosave');
  },
  async drawerGhost(page) {
    await wait(page, 50);
    await page.click('.pl-card:has-text("Quarry Analytics")');
    await wait(page, 300);
  },
  async drawerContacts(page) {
    await page.click('.pl-card:has-text("Fernhill Capital")');
    await wait(page, 300);
    await page.fill('#pl-c-name', 'Marcus Webb');
    await page.fill('#pl-c-role', 'Recruiter');
    await page.fill('#pl-c-email', 'marcus@fernhill.example');
    await page.keyboard.press('Enter');
    await wait(page, 200);
    assert(await page.locator('.pl-contact').count() === 1, 'contact added');
    await page.click('.drawer .pl-step:has-text("Interviews")');
    await wait(page, 200);
    assert((await stageOf(page, 'Fernhill Capital')) === 'interview', 'stepper moves stage');
  },
  async drawerDelete(page) {
    await page.click('.pl-card:has-text("Cobalt Atlas")');
    await wait(page, 300);
    await page.click('.drawer-foot button:has-text("Delete")');
    await wait(page, 200);
    await page.click('.modal button:has-text("Delete application")');
    await wait(page, 300);
    assert((await stageOf(page, 'Cobalt Atlas')) === undefined, 'application deleted');
  },
  async draft(page) {
    await module.exports.drawerGhost(page);
    await page.click('.drawer-foot button:has-text("Draft follow-up")');
    await wait(page, 300);
    assert(await page.locator('#pl-draft').count() === 1, 'draft modal opens');
  },
  async draftAI(page) {
    await module.exports.draft(page);
    const b = page.locator('.modal button:has-text("Improve with Claude")');
    assert(await b.count() === 1, 'Improve with Claude shown when caps.sample');
    await b.click();
    await wait(page, 800);
    const v = await page.inputValue('#pl-draft');
    assert(/MOCK/.test(v), 'draft replaced by Claude output');
  },
  async draftSent(page) {
    await module.exports.draft(page);
    await page.click('.modal button:has-text("Mark as sent")');
    await wait(page, 300);
    const f = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Quarry Analytics').followedUpAt);
    assert(!!f, 'followedUpAt set');
  },
  async thanks(page) {
    await module.exports.drawerRounds(page);
    await page.locator('.pl-round').first().locator('button:has-text("Draft thank-you")').click();
    await wait(page, 300);
  },
  async add(page) {
    await page.click('.pl-add-btn');
    await wait(page, 200);
    await page.click('.modal-foot button:has-text("Add application")');
    await wait(page, 150);
    assert(await page.locator('.pl-err').count() === 2, 'validation errors for company + role');
  },
  async addSubmit(page) {
    await module.exports.add(page);
    await page.fill('#pl-add-co', 'Pinecrest Software');
    await page.fill('#pl-add-title', 'Platform Engineer Intern');
    await page.press('#pl-add-title', 'Enter');
    await wait(page, 300);
    assert((await stageOf(page, 'Pinecrest Software')) === 'applied', 'Enter submits and creates app in Applied');
  },
  async paste(page) {
    await page.evaluate(() => openModal('paste'));
    await wait(page, 200);
  },
  ...Object.fromEntries(['confirmation', 'interview', 'rejection', 'offer'].map((k) => [`paste_${k}`, async (page) => {
    await page.evaluate(() => openModal('paste'));
    await wait(page, 200);
    await page.click(`#pl-sample-${k}`);
    await wait(page, 300);
    const got = await page.evaluate(() => ({ kind: document.getElementById('pl-p-kind').value, co: document.getElementById('pl-p-co').value, title: document.getElementById('pl-p-title').value, when: document.getElementById('pl-p-when')?.value, target: document.getElementById('pl-p-target').selectedOptions[0].textContent, plan: document.querySelector('.pl-plan p').textContent }));
    log(JSON.stringify(got));
    const want = { confirmation: ['confirmation', 'Northwind Labs', 'Software Engineer Intern, Summer 2027'], interview: ['interview', 'Northwind Labs', 'Software Engineer Intern'], rejection: ['rejection', 'Quarry Analytics', 'Data Science Intern'], offer: ['offer', 'Fernhill Capital', 'Quantitative Research Intern'] }[k];
    assert(got.kind === want[0] && got.co === want[1] && got.title === want[2], `sample ${k} parsed`);
    if (k === 'interview') assert(/T14:00$/.test(got.when || ''), `interview time parsed as 2:00 PM (got ${got.when})`);
  }])),
  async pasteApplyInterview(page) {
    await module.exports.paste_interview(page);
    await page.click('.modal-foot button:has-text("Update application")');
    await wait(page, 300);
    const a = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'));
    assert(a.rounds.length === 3 && a.events.some((e) => e.kind === 'email'), 'interview email adds round + event');
  },
  async pasteApplyRejection(page) {
    await module.exports.paste_rejection(page);
    await page.click('.modal-foot button:has-text("Update application")');
    await wait(page, 300);
    assert((await stageOf(page, 'Quarry Analytics')) === 'rejected', 'rejection email moves to Rejected');
  },
  async pasteAI(page) {
    await page.evaluate(() => openModal('paste'));
    await page.fill('#pl-p-raw', 'Hi Alex, we would like to set up a technical interview...');
    await page.click('.modal button:has-text("Read with Claude")');
    await wait(page, 800);
    assert(await page.locator('.pl-preview .ai-label').count() === 1, 'AI-read preview labeled');
  },
  async mobileDrawer(page) { await module.exports.drawer(page); },
  async scrollBoard(page) { await page.evaluate(() => document.querySelector('.pl-board').scrollBy({ left: 300, behavior: 'instant' })); await wait(page, 300); },
};
