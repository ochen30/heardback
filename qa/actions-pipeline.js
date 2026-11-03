// Pipeline QA actions. Run: ACTIONS=qa/actions-pipeline.js node qa/shot.js pipeline:<name>
const log = (...a) => console.log('  [pipeline]', ...a);
const assert = (c, msg) => { if (!c) { console.log('  [pipeline] ASSERT FAILED: ' + msg); throw new Error(msg); } else log('ok -', msg); };
const stageOf = (page, company) => page.evaluate((c) => Object.values(store.get().apps).find((a) => a.company === c)?.stage, company);
const wait = async (page, ms = 250) => { await page.waitForTimeout(ms); await page.evaluate(() => ui.set({ toasts: [] })); };

async function firstCard(page, company) { return page.locator(`.pl-card:has-text("${company}")`).first(); }
// Close any drawer/modal/menu, restore the 10 example applications (dropping anything an earlier
// action created or changed) and return to the board, so every action is order-independent.
async function reset(page, view = 'board') {
  await page.evaluate((v) => {
    ui.set({ drawer: null, modal: null, palette: false, toasts: [] });
    store.set((s) => ({ ...s, apps: {}, settings: { ...s.settings, showExamples: true }, ui: { ...s.ui, pipelineView: v, pipelineClosedOpen: false, pipelineHintDone: false, pipelineSort: undefined } }));
    loadExamples();
    ui.set({ toasts: [] });
    if (location.hash !== '#pipeline') location.hash = 'pipeline';
  }, view);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(150);
}
// HTML5 drag with manual mouse steps (drop targets can change once a drag starts).
async function drag(page, from, to) {
  const a = await page.locator(from).first().boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 6, { steps: 3 });
  await page.waitForTimeout(150);
  const b = await page.locator(to).first().boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 60), { steps: 6 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

const actions = {
  async table(page) {
    await page.evaluate(() => store.set((s) => ({ ...s, ui: { ...s.ui, pipelineView: 'table' } })));
    await wait(page);
    const rows = await page.locator('.pl-table tbody tr').count();
    assert(rows === 10, `table shows 10 rows (got ${rows})`);
    await page.evaluate(() => store.set((s) => ({ ...s, ui: { ...s.ui, pipelineSort: { k: 'silent', dir: -1 } } })));
    await wait(page, 150);
  },
  async tableStage(page) {
    await actions.table(page);
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
    if (page.viewportSize().width < 600) { log('skip dnd at phone width (columns scroll horizontally; use the move menu)'); return; }
    const before = await stageOf(page, 'Verity Labs');
    await drag(page, '.pl-card:has-text("Verity Labs")', '[data-col="screen"]');
    await wait(page, 400);
    const after = await stageOf(page, 'Verity Labs');
    assert(before === 'applied' && after === 'screen', `drag Verity Labs applied -> screen (got ${before} -> ${after})`);
    await drag(page, '.pl-card:has-text("Lumen Robotics")', '[data-col="rejected"]');
    await wait(page, 400);
    assert((await stageOf(page, 'Lumen Robotics')) === 'rejected', 'drag onto the Rejected target of the Closed rail');
    assert(await page.locator('.pl-col-closed').count() === 1, 'Closed column expands after the drop');
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
    await actions.moveMenu(page);
    await page.locator('.pl-menu button:has-text("Applied")').click();
    await wait(page, 300);
    assert((await stageOf(page, 'Ostrich Systems')) === 'applied', 'menu pick moves to Applied');
  },
  async expandClosed(page) {
    await page.click('.pl-rail[data-col="closed"]');
    await wait(page, 200);
    const n = await page.locator('.pl-col-closed .pl-card').count();
    assert(n >= 2, `Closed column shows rejected + ghosted (got ${n})`);
    await page.evaluate(() => document.querySelector('.pl-board').scrollLeft = 9999);
  },
  async drawer(page) {
    await wait(page, 50);
    await page.click('.pl-card:has-text("Northwind Labs")');
    await wait(page, 300);
    assert(await page.locator('.drawer .pl-stepper').count() === 1, 'drawer opens with stepper');
  },
  async drawerRounds(page) {
    await actions.drawer(page);
    await page.click('.drawer [role=tab]:has-text("Rounds")');
    await wait(page);
    const n = await page.locator('.pl-round').count();
    assert(n === 2, `2 rounds (got ${n})`);
    const open = await page.locator('.pl-round-open').count();
    assert(open === 1, `only the next upcoming round is expanded (got ${open})`);
  },
  async drawerAddRound(page) {
    await actions.drawerRounds(page);
    await page.click('.drawer button:has-text("Add round")');
    await wait(page, 300);
    assert(await page.locator('.pl-round').count() === 3, 'round added');
    const rid = await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'); return a.rounds[a.rounds.length - 1].id; });
    await page.fill(`#pl-r-${rid}-who`, 'Sam Ortiz');
    await page.fill(`#pl-r-${rid}-refl`, 'Good conversation about distributed caching.');
    await wait(page, 700);
    const v = await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'); return a.rounds[a.rounds.length - 1]; });
    assert(v.interviewers === 'Sam Ortiz' && /caching/.test(v.reflection), 'round fields autosave');
    await page.selectOption(`#pl-r-${rid}-out`, 'passed');
    await wait(page, 150);
    const o = await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'); return a.rounds[a.rounds.length - 1].outcome; });
    assert(o === 'passed', 'outcome select saves');
  },
  async drawerTimeline(page) {
    await actions.drawer(page);
    await page.click('.drawer [role=tab]:has-text("Timeline")');
    await page.fill('#pl-tl-note', 'Recruiter said decisions by Friday');
    await page.keyboard.press('Enter');
    await wait(page);
    assert(await page.locator('.tl-item:has-text("decisions by Friday")').count() === 1, 'quick note added to timeline');
  },
  async drawerNotes(page) {
    await actions.drawer(page);
    await page.click('.drawer [role=tab]:has-text("Notes")');
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
    assert(await page.locator('#pl-c-name').count() === 0, 'contact form hidden until asked for');
    await page.click('#pl-c-add');
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
    await actions.drawerGhost(page);
    await page.click('.drawer button:has-text("Draft a last follow-up")');
    await wait(page, 300);
    assert(await page.locator('#pl-draft').count() === 1, 'draft modal opens');
    const v = await page.inputValue('#pl-draft');
    assert(/application\n/.test(v) && /^Hi (Quarry Analytics team|\w+),$/m.test(v), 'subject ends with "application" and greeting is personal');
  },
  async draftAI(page) {
    await actions.draft(page);
    const b = page.locator('.modal button:has-text("Improve with Claude")');
    assert(await b.count() === 1, 'Improve with Claude shown when caps.sample');
    await b.click();
    await wait(page, 800);
    const v = await page.inputValue('#pl-draft');
    assert(/MOCK/.test(v), 'draft replaced by Claude output');
  },
  async draftSent(page) {
    await actions.draft(page);
    await page.click('.modal button:has-text("Mark as sent")');
    await wait(page, 300);
    const f = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Quarry Analytics').followedUpAt);
    assert(!!f, 'followedUpAt set');
  },
  async thanks(page) {
    await actions.drawerRounds(page);
    await page.locator('.pl-round').first().locator('.pl-round-sum').click();
    await wait(page, 150);
    await page.locator('.pl-round').first().locator('button:has-text("Draft thank-you")').click();
    await wait(page, 300);
  },
  async add(page) {
    await page.evaluate(() => openModal('add'));
    await wait(page, 200);
    await page.click('.modal-foot button:has-text("Add application")');
    await wait(page, 150);
    assert(await page.locator('.pl-err').count() === 2, 'validation errors for company + role');
  },
  async addSubmit(page) {
    await actions.add(page);
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
    await actions.paste_interview(page);
    await page.click('.modal-foot button:has-text("Update application")');
    await wait(page, 300);
    const a = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs'));
    assert(a.rounds.length === 3 && a.events.some((e) => e.kind === 'email'), 'interview email adds round + event');
  },
  async pasteApplyRejection(page) {
    await actions.paste_rejection(page);
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
  async pasteTwice(page) {
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => openModal('paste'));
      await wait(page, 200);
      await page.click('#pl-sample-interview');
      await wait(page, 200);
      if (i === 1) { const plan = await page.locator('.pl-plan p').first().innerText(); assert(/already logged/.test(plan), `second paste says round already logged (${plan})`); }
      await page.click('.modal-foot button:has-text("Update application")');
      await wait(page, 300);
    }
    const n = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs').rounds.length);
    assert(n === 3, `no duplicate round (got ${n} rounds)`);
  },
  async keysOffer(page) {
    await (await firstCard(page, 'Harbor & Finch')).focus();
    await page.keyboard.press('ArrowRight');
    await wait(page, 200);
    assert((await stageOf(page, 'Harbor & Finch')) === 'offer', 'ArrowRight on Offer does nothing');
  },
  async parseTimes(page) {
    const r = await page.evaluate(() => {
      const iso = (t) => { const d = new Date(t); return d.toISOString(); };
      const a = plParse('Subject: Phone screen\n\nHi, would Tuesday, November 10 at 3:30 PM ET work for a recruiter call with Datadog?');
      const b = plParse('Subject: Technical interview\n\nYour technical interview with Duolingo is Thursday 11/12 at 2pm ET.');
      const c = plParse('Subject: Assessment\n\nYou have been invited to a HackerRank technical assessment. Please complete it by Nov 10, 2026.');
      return { a: a.interviewAt && iso(a.interviewAt), atz: a.tz, b: b.interviewAt && iso(b.interviewAt), c: c.interviewAt };
    });
    log(JSON.stringify(r));
    assert(r.a === '2026-11-10T20:30:00.000Z' && r.atz === 'ET', 'ET time converted (3:30 PM EST = 20:30 UTC)');
    assert(r.b === '2026-11-12T19:00:00.000Z', 'numeric 11/12 at 2pm ET parsed');
    assert(r.c === null, 'deadline date is not an interview time');
  },
  async longDrawer(page) {
    await page.evaluate(() => { const a = Apps.create({ company: 'Extraordinarily Long Company Supercalifragilisticexpialidocious Incorporated', title: 'Intern', location: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch', stage: 'applied', appliedAt: now() }); openApp(a.id); });
    await wait(page, 300);
    const o = await page.evaluate(() => { const d = document.querySelector('.drawer'); return d.scrollWidth - d.clientWidth; });
    assert(o <= 1, `drawer has no horizontal overflow (${o}px)`);
  },
  async mobileDrawer(page) { await actions.drawer(page); },
  async drawerFooter(page) {
    await actions.drawer(page);
    const primary = await page.locator('.drawer-foot .btn.primary').innerText();
    assert(/Prep for this round/.test(primary), `footer CTA matches next step (got ${primary})`);
  },
  async inlineEdit(page) {
    await actions.drawer(page);
    await page.click('#pl-salary-v');
    await page.fill('#pl-salary', '$48/hr');
    await page.keyboard.press('Enter');
    await wait(page, 150);
    const v = await page.evaluate(() => Object.values(store.get().apps).find((x) => x.company === 'Northwind Labs').salary);
    assert(v === '$48/hr', 'inline salary edit saves');
    await page.click('#pl-loc-v');
    await page.waitForTimeout(100);
    log('editing:', await page.evaluate(() => document.activeElement.id + ' esc=' + escStack.length));
    await page.keyboard.press('Escape');
    await wait(page, 150);
    assert(await page.locator('.drawer').count() === 1, 'Escape cancels the edit without closing the drawer');
    await page.click('#pl-applied-v');
    await wait(page, 100);
  },
  async hintDismiss(page) {
    if (page.viewportSize().width <= 520) { log('skip hintDismiss at phone width (tip is hidden there)'); return; }
    assert(await page.locator('.pl-tip').count() === 1, 'keyboard tip shows');
    await page.click('.pl-tip-x');
    await wait(page, 100);
    assert(await page.locator('.pl-tip').count() === 0, 'keyboard tip dismissed');
  },
  async pasteShowRaw(page) {
    await actions.paste_interview(page);
    await page.click('.pl-raw-sum button:has-text("Show")');
    await wait(page, 150);
  },
  async drawerRoundEdit(page) {
    await actions.drawerRounds(page);
    await page.locator('.pl-round-sum').first().click();
    await wait(page, 150);
    assert(await page.locator('.pl-round-open').count() === 2, 'Edit expands a collapsed round');
  },
  async contactForm(page) {
    await page.click('.pl-card:has-text("Fernhill Capital")');
    await wait(page, 300);
    await page.click('#pl-c-add');
    await wait(page, 100);
  },
  /* ---------- Selection + bulk actions ---------- */
  async tableSelect(page) {
    const rows = page.locator('.pl-table tbody tr[data-row]');
    await rows.nth(0).locator('td.pl-chk-cell').click();
    await rows.nth(3).locator('td.pl-chk-cell').click({ modifiers: ['Shift'] });
    await page.waitForTimeout(150);
    const n = await page.locator('.pl-table tbody tr.sel').count();
    assert(n === 4, `checkbox + shift-click selects a range of 4 (got ${n})`);
    assert((await page.locator('.pl-bulk-count').textContent()).trim() === '4 selected', 'action bar shows "4 selected"');
    const ind = await page.evaluate(() => document.getElementById('pl-sel-all').indeterminate);
    assert(ind, 'header checkbox is indeterminate');
    await page.mouse.move(5, 5);
  },
  async tableSelectAll(page) {
    await page.click('#pl-sel-all');
    await page.waitForTimeout(120);
    assert(await page.locator('.pl-table tbody tr.sel').count() === 10, 'header checkbox selects all 10');
    await page.click('#pl-sel-all');
    await page.waitForTimeout(120);
    assert(await page.locator('.pl-bulk').count() === 0, 'header checkbox again clears; bar hides');
    await page.locator('.pl-table tbody tr[data-row]').nth(2).focus();
    await page.keyboard.press('x');
    await page.waitForTimeout(80);
    assert(await page.locator('.pl-table tbody tr.sel').count() === 1, 'X toggles the focused row');
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.locator('.pl-table tbody tr[data-row]').nth(4).focus();
    await page.keyboard.press('Shift+X');
    await page.waitForTimeout(80);
    assert(await page.locator('.pl-table tbody tr.sel').count() === 3, 'Shift+X selects the range');
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(80);
    assert(await page.locator('.pl-table tbody tr.sel').count() === 10, 'Ctrl+A inside the table selects all visible');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    assert(await page.locator('.pl-bulk').count() === 0, 'Escape clears the selection');
    await page.locator('#pl-filter').focus();
    await page.keyboard.press('Control+a');
    assert(await page.locator('.pl-bulk').count() === 0, 'Ctrl+A in the filter does not select rows');
  },
  async tableBulkMove(page) {
    await actions.tableSelect(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.pl-table tr.sel')].map((r) => r.dataset.row));
    const before = await page.evaluate((ids) => ids.map((id) => Apps.get(id).stage), ids);
    await page.click('.pl-bulk-move');
    await page.waitForTimeout(150);
    assert(await page.locator('.pl-menu').count() === 1, 'Move to… opens the stage menu');
    await page.locator('.pl-menu button:has-text("Interview")').click();
    await page.waitForTimeout(200);
    const after = await page.evaluate((ids) => ids.map((id) => Apps.get(id).stage), ids);
    assert(after.every((x) => x === 'interview'), `all selected moved to Interview (${after})`);
    const toasts = await page.evaluate(() => ui.state.toasts.map((t) => t.text));
    assert(toasts.length === 1 && /Moved \d+ applications to Interview/.test(toasts[0]), `one toast: ${toasts}`);
    assert(await page.locator('.pl-bulk').count() === 0, 'selection clears after the move');
  },
  async tableBulkUndo(page) {
    await actions.tableSelect(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.pl-table tr.sel')].map((r) => r.dataset.row));
    const before = await page.evaluate((ids) => ids.map((id) => JSON.stringify(Apps.get(id))), ids);
    await page.click('.pl-bulk-move');
    await page.locator('.pl-menu button:has-text("Rejected")').click();
    await page.waitForTimeout(150);
    await page.locator('.toast button:has-text("Undo")').click();
    await page.waitForTimeout(150);
    const restored = await page.evaluate((ids) => ids.map((id) => JSON.stringify(Apps.get(id))), ids);
    assert(restored.every((x, i) => x === before[i]), 'Undo restores every moved application exactly');
  },
  async tableBulkOffer(page) {
    await page.evaluate(() => { window.__cel = 0; const c = window.celebrate; window.celebrate = (a) => { window.__cel++; c(a); }; });
    await actions.tableSelect(page);
    await page.click('.pl-bulk-move');
    await page.locator('.pl-menu button:has-text("Offer")').click();
    await page.waitForTimeout(200);
    const n = await page.evaluate(() => window.__cel);
    assert(n === 1, `celebrate fires once for a batch of offers (got ${n})`);
  },
  async tableBulkGhost(page) {
    await actions.tableSelect(page);
    await page.click('.pl-bulk button[aria-label="Mark ghosted"]');
    await page.waitForTimeout(150);
    const n = await page.evaluate(() => Object.values(store.get().apps).filter((a) => a.stage === 'ghosted').length);
    assert(n >= 4, `Mark ghosted moves the selection (ghosted now ${n})`);
  },
  async tableBulkDelete(page) {
    await actions.tableSelect(page);
    await page.click('.pl-bulk button[aria-label="Delete"]');
    await page.waitForTimeout(200);
    assert(await page.locator('.modal:has-text("Delete 4 applications?")').count() === 1, 'in-page confirm opens');
  },
  async tableBulkDeleteConfirm(page) {
    await actions.tableBulkDelete(page);
    await page.click('.modal button:has-text("Delete 4 applications")');
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => Apps.list().length) === 6, 'confirm deletes 4 in one go');
    const toasts = await page.evaluate(() => ui.state.toasts.length);
    assert(toasts === 1, 'one toast for the batch');
    await page.locator('.toast button:has-text("Undo")').click();
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => Apps.list().length) === 10, 'Undo restores all 4');
  },
  async tableBulkExport(page) {
    await page.evaluate(() => { window.__saved = null; window.saveFile = (name, text, mime) => { window.__saved = { name, text, mime }; toast(`Saved ${name}`); }; });
    await actions.tableSelect(page);
    await page.click('.pl-bulk button[aria-label="Export CSV"]');
    await page.waitForTimeout(150);
    const f = await page.evaluate(() => window.__saved);
    assert(f && f.mime === 'text/csv' && f.text.split('\n').length === 5, `CSV has a header + 4 rows (${f && f.name})`);
    assert(/^company,title,location,stage/.test(f.text), 'CSV columns match Settings export');
    assert(await page.locator('.pl-bulk').count() === 1, 'selection stays after export');
  },
  async tableFilterKeeps(page) {
    await page.click('#pl-sel-all');
    await page.fill('#pl-filter', 'north');
    await page.waitForTimeout(200);
    assert((await page.locator('.pl-bulk-count').textContent()).trim() === '1 selected', 'filter keeps only still-visible selected items');
    await page.fill('#pl-filter', '');
    await page.waitForTimeout(150);
    assert((await page.locator('.pl-bulk-count').textContent()).trim() === '1 selected', 'hidden items stay deselected after clearing the filter');
    await page.click('.seg button:has-text("Board")');
    await page.waitForTimeout(150);
    assert(await page.locator('.pl-bulk').count() === 0, 'switching view clears the selection');
  },
  async boardHover(page) {
    if (page.viewportSize().width < 600) { log('skip hover at phone width'); return; }
    await page.locator('.pl-card:has-text("Verity Labs")').hover();
    await page.waitForTimeout(200);
    const op = await page.locator('.pl-card:has-text("Verity Labs") .pl-chk').evaluate((el) => getComputedStyle(el).opacity);
    assert(op === '1', 'hover shows the card checkbox');
  },
  async boardSelect(page) {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    const narrow = page.viewportSize().width < 600;
    if (narrow) {
      await page.locator('.pl-card:has-text("Ostrich Systems") .pl-more').click();
      await page.locator('.pl-menu button:has-text("Select")').click();
    } else {
      await page.locator('.pl-card:has-text("Ostrich Systems")').click({ modifiers: [mod] });
    }
    await page.waitForTimeout(100);
    assert(await page.locator('.pl-card.sel').count() === 1, narrow ? 'menu Select starts selection' : 'Cmd/Ctrl-click selects a card');
    await page.locator('.pl-card:has-text("Cobalt Atlas") .pl-chk').click();
    await page.waitForTimeout(100);
    assert(await page.locator('.pl-card.sel').count() === 2, 'checkbox adds a second card');
    assert(await page.locator('.pl-board.selecting').count() === 1, 'board is in selection mode');
    assert(await page.locator('.drawer').count() === 0, 'selecting does not open the drawer');
    const card = page.locator('.pl-card:has-text("Verity Labs")');
    await card.focus();
    await page.keyboard.press('x');
    await page.waitForTimeout(100);
    assert(await page.locator('.pl-card.sel').count() === 3, 'X toggles the focused card');
    await page.mouse.move(5, 5);
  },
  async boardSelectEsc(page) {
    await actions.boardSelect(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert(await page.locator('.pl-card.sel').count() === 0, 'Escape clears the board selection');
  },
  async boardBulkMove(page) {
    await actions.boardSelect(page);
    await page.click('.pl-bulk-move');
    await page.waitForTimeout(150);
    await page.locator('.pl-menu button:has-text("Screen")').click();
    await page.waitForTimeout(200);
    const st = await Promise.all(['Ostrich Systems', 'Cobalt Atlas', 'Verity Labs'].map((c) => stageOf(page, c)));
    assert(st.every((x) => x === 'screen'), `board bulk move to Screen (${st})`);
    // existing interactions still work after a bulk action
    await (await firstCard(page, 'Quarry Analytics')).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    assert((await stageOf(page, 'Quarry Analytics')) === 'screen', 'arrow-key move still works');
  },
  async boardBulkMenu(page) {
    await actions.boardSelect(page);
    await page.click('.pl-bulk-move');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert(await page.locator('.pl-menu').count() === 0 && await page.locator('.pl-card.sel').count() === 3, 'Escape closes the menu first, keeps the selection');
    await page.click('.pl-bulk-move');
    await page.waitForTimeout(200);
  },
  async expandClosedStart(page) {
    await page.click('.pl-rail[data-col="closed"]');
    await wait(page, 250);
    await page.evaluate(() => { document.querySelector('.pl-board').scrollLeft = 0; });
    await page.waitForTimeout(150);
    const cls = await page.locator('.pl-board').getAttribute('class');
    const scrolls = await page.evaluate(() => { const b = document.querySelector('.pl-board'); return b.scrollWidth > b.clientWidth + 2; });
    assert(!scrolls || (/fade-r/.test(cls) && !/fade-l/.test(cls)), `at scroll 0 only the right edge fades (${cls})`);
  },
  async closedAuto(page) {
    await page.locator('.pl-card:has-text("Ostrich Systems") .pl-more').click();
    await page.locator('.pl-menu button:has-text("Rejected")').click();
    await wait(page, 300);
    assert(await page.locator('.pl-col-closed').count() === 1, 'a move into Rejected opens Closed');
    await page.locator('.pl-card:has-text("Ostrich Systems") .pl-more').click();
    await page.locator('.pl-menu button:has-text("Applied")').click();
    await wait(page, 300);
    assert(await page.locator('.pl-col-closed').count() === 0, 'the next move into an active stage folds Closed back');
    await page.click('.pl-rail[data-col="closed"]');
    await wait(page, 200);
    await page.locator('.pl-card:has-text("Verity Labs") .pl-more').click();
    await page.locator('.pl-menu button:has-text("Screen")').click();
    await wait(page, 300);
    assert(await page.locator('.pl-col-closed').count() === 1, 'Closed opened by hand stays open');
  },
  async interviewFoot(page) {
    const t = await page.locator('[data-col="interview"] .pl-card .pl-status').first().innerText();
    const clip = await page.locator('[data-col="interview"] .pl-card .pl-status').first().evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    assert(/^\S+, \d/.test(t.trim()) && !clip, `Interviews footer reads "${t.trim()}" without truncation`);
  },
  async boardSelectFocus(page) {
    await actions.boardSelect(page);
    const sh = await page.locator('.pl-card.sel').first().evaluate((el) => getComputedStyle(el).boxShadow);
    const bw = await page.locator('.pl-card.sel').first().evaluate((el) => getComputedStyle(el).borderTopWidth);
    log('focused selected card shadow:', sh, 'border', bw);
  },
  /* BUGS2 P3-2: a key pressed in the same frame as the click goes to the field, never to the drawer */
  async inlineRace(page) {
    await actions.drawer(page);
    const before = await stageOf(page, 'Northwind Labs');
    await page.click('#pl-loc-v');
    await page.keyboard.press('5');
    await wait(page, 100);
    assert((await stageOf(page, 'Northwind Labs')) === before, `digit typed right after the click stays text (stage ${before})`);
    const lv = await page.inputValue('#pl-loc').catch(() => '(no input)');
    assert(lv === '5', `digit lands in the location input (got "${lv}")`);
    await page.keyboard.press('Escape');
    await page.click('#pl-salary-v');
    await page.keyboard.press('Escape');
    await wait(page, 100);
    assert(await page.locator('.drawer').count() === 1, 'Escape right after the click cancels the edit, drawer stays open');
    assert(await page.evaluate(() => document.activeElement.id) === 'pl-salary-v', 'focus returns to the value');
    await page.click('#pl-salary-v');
    await page.keyboard.press('Tab');
    await wait(page, 100);
    const f = await page.evaluate(() => document.activeElement.id || document.activeElement.className);
    assert(f !== 'pl-salary-v', `Tab out of an edit moves on (focus: ${f})`);
  },
  /* REVIEW4 #3: no caret over the centred dot at 375 on hover or focus */
  async tableStageFocus(page) {
    await actions.table(page);
    const id = await page.evaluate(() => Object.values(store.get().apps).find((a) => a.company === 'Verity Labs').id);
    await page.hover(`tr[data-row="${id}"]`);
    await page.focus(`#pl-st-${id}`);
    const bs = await page.locator(`#pl-st-${id}`).evaluate((el) => getComputedStyle(el).backgroundSize);
    log('stage select background-size on hover+focus:', bs);
    if (page.viewportSize().width <= 520) assert(/^0px/.test(bs), 'caret hidden at mobile width');
  },
  async parseAssessment(page) {
    const p = await page.evaluate(() => plParse('From: Coinbase <no-reply@coinbase.example>\nSubject: Coding assessment\n\nHi Alex,\n\nYou have been invited by Coinbase to take the Software Engineer Intern coding assessment. Please complete it within 7 days.'));
    log('parsed:', JSON.stringify({ kind: p.kind, company: p.company, title: p.title }));
    assert(p.title === 'Software Engineer Intern', 'assessment invite has a title');
  },
  async drawerHead(page) {
    await actions.drawer(page);
    const sub = await page.locator('.drawer .pl-dsub').innerText();
    assert(!/Seattle|Remote|, [A-Z]{2}/.test(sub), `drawer subtitle has no location ("${sub.replace(/\n/g, ' ')}")`);
    const x = await page.evaluate(() => {
      const v = [...document.querySelectorAll('.drawer .pl-kv-v')][0], i = document.querySelector('.drawer .pl-inline');
      const tx = (el) => { const r = document.createRange(); r.selectNodeContents(el.querySelector('.truncate') || el); return r.getBoundingClientRect().left; };
      return [tx(v), tx(i)];
    });
    assert(Math.abs(x[0] - x[1]) < 0.6, `Last reply value aligns with inline values (${x.map((n) => n.toFixed(1))})`);
  },
  async scrollBoard(page) { await page.evaluate(() => document.querySelector('.pl-board').scrollBy({ left: 300, behavior: 'instant' })); await wait(page, 300); },
};
// Every action starts from a clean board (no overlays left from a previous action).
module.exports = Object.fromEntries(Object.entries(actions).map(([k, fn]) => [k, async (page) => { await reset(page, k.startsWith('table') ? 'table' : 'board'); return fn(page); }]));
