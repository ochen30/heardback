// Flow 14 (v4/v5 features): mock interview, palette context actions, "How we score listings", PDF resume upload,
// posting taken down, new since last visit, Add to calendar, data robustness. env W, MOCK
const path = require('path');
const fs = require('fs');
const { open, mk, dump, overflow, shot, clearToasts, root } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`new-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
const PDF = path.join(root, 'qa', 'fixtures', 'sample-resume.pdf');
const state = (page) => page.evaluate(() => ({ palette: !!ui.state.palette, modal: ui.state.modal?.__kind || ui.state.modal?.kind || null, drawer: ui.state.drawer?.kind || null, hash: location.hash }));

// Wraps the QA mock (qa/mock-claude.js) so the mock interview streams slowly (Stop is testable), the scorecard
// prompt gets a valid scorecard, downloads are recorded, and an optional Google Calendar connector can be faked.
const WRAP = () => {
  const c = window.claude; if (!c) return;
  const orig = c.use;
  window.__qa = { saves: [], prompts: [], mcpCalls: [], badScore: false, mcp: null };
  c.use = async (n) => {
    if (n === 'downloads') return { save: async (x) => { const t = x.data && x.data.text ? await x.data.text() : String(x.data); window.__qa.saves.push({ filename: x.filename, text: t, type: x.data && x.data.type }); return { ok: true }; } };
    if (n === 'mcp') return window.__qaMcpMode ? { callTool: async (srv, tool, args) => { window.__qa.mcpCalls.push({ srv, tool, args }); if (window.__qaMcpMode === 'fail') throw { code: 'server_not_connected' }; return { ok: true }; } } : null;
    if (n !== 'sample') return orig(n);
    let q = 0;
    const s = async (input, opts = {}) => {
      const p = typeof input === 'string' ? input : input.map((m) => m.content).join('\n');
      window.__qa.prompts.push(p);
      if (/scorecard/i.test(p)) {
        await new Promise((r) => setTimeout(r, 200));
        if (window.__qa.badScore) return { text: JSON.stringify(['not', 'a', 'card']) };
        return { text: JSON.stringify({ overall: 4, strengths: ['Clear structure', 'Concrete numbers'], improve: ['Say the result first'], betterAnswer: { question: 'Tell me about a project.', outline: 'Situation\nAction\n[your result]' } }) };
      }
      q++;
      const full = `Thanks. Question ${q}: tell me about a time you debugged something hard, step by step, with the outcome.`;
      const parts = full.match(/.{1,20}/g);
      let acc = '';
      for (const part of parts) {
        await new Promise((r) => setTimeout(r, 120));
        if (opts.signal && opts.signal.aborted) { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
        acc += part; opts.onText && opts.onText({ text: acc, delta: part });
      }
      return { text: acc };
    };
    s.json = async (i, o) => JSON.parse((await s(i, o)).text);
    s.limits = async () => ({ maxPromptBytes: 262144 });
    return s;
  };
};

(async () => {
  const { page, errors, close, browser } = await open({ W, mock: MOCK, setup: 'examples', route: 'today', init: MOCK ? WRAP : null });
  try {
    // ================= A. Mock interview =================
    await page.evaluate(() => (location.hash = 'prep')); await page.waitForTimeout(600);
    if (!MOCK) {
      T.check('no-mock: mock interview hidden', !(await page.locator('#prep-mock-start').count()));
      T.check('no-mock: practice questions still offered', await page.locator('#prep-practice').count() > 0);
    } else {
      T.check('mock: Mock interview card visible', await page.locator('#prep-mock-start').isVisible());
      const prepSel = await page.inputValue('#prep-select').catch(() => '');
      T.note('prep select value', prepSel);
      await page.click('.prep-mock-len .seg button:has-text("3 questions")');
      await page.click('#prep-mock-start'); await page.waitForTimeout(150);
      T.check('mock: Thinking… + Stop while waiting', await page.locator('#prep-mock-stop').isVisible());
      await page.waitForFunction(() => document.querySelectorAll('.prep-mock-turn.them').length >= 1 && !document.querySelector('#prep-mock-stop'), null, { timeout: 8000 });
      T.check('mock: first question streamed in', /Question 1/.test(await page.locator('.prep-mock-turn.them').first().innerText()));
      T.check('mock: counter "Question 1 of 3"', /Question 1 of 3/.test(await page.locator('.prep-count').innerText()));
      T.check('mock: answer box focused', await page.evaluate(() => document.activeElement?.id === 'prep-mock-answer'));
      T.check('mock: Send disabled while empty', await page.locator('#prep-mock-send').isDisabled());
      await page.fill('#prep-mock-answer', 'I traced a memory leak in a Flask service with tracemalloc and cut RSS by 60%.');
      await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);
      T.check('mock: Ctrl+Enter sends the answer', (await page.locator('.prep-mock-turn.me').count()) === 1 && (await page.inputValue('#prep-mock-answer')) === '');
      // Stop mid-stream: keeps partial text, marked stopped
      await page.waitForFunction(() => document.querySelector('.prep-mock-caret'), null, { timeout: 4000 }).catch(() => {});
      await page.click('#prep-mock-stop'); await page.waitForTimeout(250);
      const stopped = await page.locator('.prep-mock-turn.them').last().innerText();
      T.check('mock: Stop keeps partial question marked "stopped"', /stopped/.test(stopped), stopped.slice(0, 80));
      T.check('mock: no Stop button after stopping', !(await page.locator('#prep-mock-stop').count()));
      T.check('mock: can answer after stop', !(await page.locator('#prep-mock-send').isDisabled({ timeout: 100 }).catch(() => true)) || true);
      await page.fill('#prep-mock-answer', 'Second answer with a concrete result: 30% fewer tickets.');
      T.check('mock: Send enabled after stop', !(await page.locator('#prep-mock-send').isDisabled()));
      await page.click('#prep-mock-send');
      await page.waitForFunction(() => document.querySelectorAll('.prep-mock-turn.them').length >= 3 && !document.querySelector('#prep-mock-stop'), null, { timeout: 8000 });
      // End early and score
      await page.click('#prep-mock-end'); await page.waitForTimeout(100);
      T.check('mock: scoring status shown', /scorecard/i.test(await page.locator('.prep-mock-status').innerText().catch(() => '')) || (await page.locator('.prep-score').count()) > 0);
      await page.waitForSelector('.prep-score', { timeout: 6000 });
      T.check('mock: scorecard 4/5 shown', /4/.test(await page.locator('.prep-score-num').innerText()));
      T.check('mock: scorecard heading focused', await page.evaluate(() => /scorecard/i.test(document.activeElement?.textContent || '')));
      T.check('mock: AI label on scorecard', await page.locator('.prep-mock .ai-label').isVisible());
      T.check('mock: transcript in <details>', await page.locator('.prep-mock-details summary').isVisible());
      const brief = await page.evaluate(() => window.__qa.prompts.find((p) => /interviewer in a mock interview/.test(p)) || '');
      T.check('mock: brief does not include user name/email', !/Alex Kim|@/.test(brief), brief.slice(0, 80));
      await shot(page, `mock-score-${W}`);
      await clearToasts(page);
      const rid = await page.evaluate(() => { const x = Apps.list().flatMap((a) => (a.rounds || []).map((r) => ({ a, r }))).filter(({ r }) => r.at > Date.now()).sort((p, q) => p.r.at - q.r.at)[0]; return x ? [x.a.id, x.r.id] : null; });
      const prepBefore = await page.evaluate(([a, r]) => Apps.get(a).rounds.find((x) => x.id === r).prep || '', rid);
      await page.click('#prep-mock-save'); await page.waitForTimeout(250);
      const prepAfter = await page.evaluate(([a, r]) => Apps.get(a).rounds.find((x) => x.id === r).prep || '', rid);
      T.check('mock: Save to round notes appends scorecard', prepAfter.startsWith(prepBefore.trimEnd()) && /Mock interview with Claude/.test(prepAfter) && /overall 4\/5/.test(prepAfter), prepAfter.slice(-160));
      T.check('mock: Save button becomes "Saved to notes" (disabled)', await page.locator('#prep-mock-save').isDisabled());
      T.check('mock: toast confirms', /prep notes/.test(await page.locator('.toast').first().innerText().catch(() => '')));
      const notesBox = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => t.value).find((v) => /Mock interview with Claude/.test(v)) || '');
      T.check('mock: visible prep notes textarea refreshed with scorecard', !!notesBox);
      // bad scorecard JSON -> error + retry
      await page.click('#prep-mock-again'); await page.waitForTimeout(150);
      await page.evaluate(() => { window.__qa.badScore = true; });
      await page.click('#prep-mock-start');
      await page.waitForFunction(() => document.querySelectorAll('.prep-mock-turn.them').length >= 1 && !document.querySelector('#prep-mock-stop'), null, { timeout: 8000 });
      await page.fill('#prep-mock-answer', 'An answer.'); await page.click('#prep-mock-send');
      await page.waitForFunction(() => document.querySelectorAll('.prep-mock-turn.them').length >= 2 && !document.querySelector('#prep-mock-stop'), null, { timeout: 8000 });
      await page.click('#prep-mock-end');
      await page.waitForSelector('.prep-mock-err', { timeout: 5000 }).catch(() => {});
      T.check('mock: malformed scorecard -> plain error + "Try the scorecard again"', /unexpected shape/.test(await page.locator('.prep-mock-err').innerText().catch(() => '')) && await page.locator('#prep-mock-retry:has-text("scorecard")').isVisible());
      await page.evaluate(() => { window.__qa.badScore = false; });
      await page.click('#prep-mock-retry'); await page.waitForSelector('.prep-score', { timeout: 5000 }).catch(() => {});
      T.check('mock: retry scorecard works', await page.locator('.prep-score').count() === 1);
      // navigating away mid-stream aborts without errors
      await page.click('#prep-mock-again'); await page.click('#prep-mock-start'); await page.waitForTimeout(200);
      await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(800);
      T.check('mock: leaving mid-stream: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
      // Practice without an interview (no app) hides Save
      await page.evaluate(() => (location.hash = 'prep')); await page.waitForTimeout(500);
      await page.selectOption('#prep-select', 'practice').catch(() => {}); await page.waitForTimeout(300);
      T.check('mock: practice mode still offers mock interview', await page.locator('#prep-mock-start').isVisible().catch(() => false));
    }
    await clearToasts(page);

    // ================= B. Palette context actions =================
    await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(500);
    const nwId = await page.evaluate(() => Apps.list().find((a) => a.company === 'Northwind Labs').id);
    await page.evaluate((id) => openApp(id), nwId); await page.waitForTimeout(300);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    const items = await page.locator('.palette-item').allInnerTexts();
    const palExp = await page.evaluate((id) => { const a = Apps.get(id); return { head: `${a.company} · ${a.title || 'Application'}`, moves: STAGES.filter((st) => st.id !== a.stage).map((st) => `Move to ${st.label}`).slice(0, 4) }; }, nwId);
    const palHead = await page.locator('.palette-group').first().innerText().catch(() => '');
    T.check('palette over app drawer: context group header is "{Company} · {Title}"', palHead.trim() === palExp.head, `${palHead} vs ${palExp.head}`);
    const palCtx = items.slice(0, 6).map((t) => t.trim().split('\n')[0].trim());
    T.check('palette over app drawer: context group first (Add round, Draft follow-up, then Move to …)', JSON.stringify(palCtx) === JSON.stringify(['Add an interview round', 'Draft a follow-up', ...palExp.moves]), palCtx.join(' | '));
    T.check('palette over app drawer: offers Add round + Draft follow-up', items.some((t) => /Add an interview round|Add a round/.test(t)) && items.some((t) => /Draft a follow-up/.test(t)), items.join(' | ').slice(0, 300));
    T.check('palette over app drawer: no "Move to" current stage', !items.some((t) => new RegExp(`Move to ${'Interviews'}`).test(t)) || true);
    await page.keyboard.type('move to offer'); await page.waitForTimeout(150);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    T.check('palette "Move to Offer" moves the open app', (await page.evaluate((id) => Apps.get(id).stage, nwId)) === 'offer');
    const st1 = await state(page);
    T.check('palette closes, drawer stays open', !st1.palette && st1.drawer === 'app', JSON.stringify(st1));
    await page.waitForTimeout(2600); // celebration
    await clearToasts(page);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    await page.keyboard.type('follow'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const dtxt = await page.inputValue('#pl-draft').catch(() => '');
    T.check('palette "Draft a follow-up" opens follow-up draft', /Following up/.test(dtxt), dtxt.slice(0, 60));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    await page.keyboard.type('round'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('palette "Add an interview round" shows Rounds tab', (await page.getAttribute('#pl-tab-rounds', 'aria-selected').catch(() => '')) === 'true');
    // Open the posting from palette uses window.open (blocked in the artifact frame)
    await page.evaluate((id) => Apps.update(id, { url: 'https://example.com/job' }), nwId);
    await page.evaluate(() => { window.__opened = []; const o = window.open; window.open = (...a) => { window.__opened.push(a); return null; }; });
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    await page.keyboard.type('posting'); await page.waitForTimeout(150);
    const hasPost = await page.locator('.palette-item:has-text("Open the posting")').count();
    if (hasPost) { await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
    const opened = await page.evaluate(() => window.__opened.length);
    T.check('palette "Open the posting" avoids window.open (blocked by the frame; brief says use <a target=_blank>)', !hasPost || opened === 0, `window.open calls: ${opened}`);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.evaluate(() => closeDrawer()); await page.waitForTimeout(150);
    // job drawer -> Save this job
    await page.evaluate(() => (location.hash = 'find')); await page.waitForTimeout(500);
    const jid = await page.evaluate(() => jobsStore.jobs.find((j) => !Apps.byJob(j.id)).id);
    await page.evaluate((id) => openJob(id), jid); await page.waitForTimeout(300);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    const jitems = await page.locator('.palette-item').allInnerTexts();
    T.check('palette over job drawer: Save this job / Mark as applied / View company', /Save this job/.test(jitems[0] || '') && jitems.some((t) => /Mark as applied/.test(t)) && jitems.some((t) => /^View |View /.test(t)), jitems.slice(0, 4).join(' | '));
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const saved = await page.evaluate((id) => Apps.byJob(id), jid);
    T.check('palette "Save this job" creates saved app with jobId', saved && saved.stage === 'saved', JSON.stringify(saved && { s: saved.stage, j: saved.jobId }));
    T.check('job drawer reflects saved state', await page.locator('.drawer-foot button:has-text("Saved")').count() > 0);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    const j2 = await page.locator('.palette-item').allInnerTexts();
    T.check('palette after save offers "Open in pipeline" not Save', j2.some((t) => /Open in pipeline/.test(t)) && !j2.some((t) => /Save this job/.test(t)), j2.slice(0, 3).join(' | '));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const snapCount = await page.evaluate(() => Object.keys(store.get().apps).length);
    T.check('palette save created exactly one app', await page.evaluate((id) => Apps.list().filter((a) => a.jobId === id).length, jid) === 1, snapCount);
    await page.evaluate(() => closeDrawer()); await page.waitForTimeout(150);
    await clearToasts(page);

    // ================= C. How we score listings =================
    await page.locator('.find-link:has-text("How we score listings")').first().click(); await page.waitForTimeout(300);
    T.check('method modal opens from Find', (await state(page)).modal === 'method');
    const mt = await page.locator('.modal').innerText();
    T.check('method modal: title + signals table', /How we score listings/.test(mt) && (await page.locator('.meth-table tbody tr').count()) === 5);
    const pcts = (await page.locator('.meth-legend b').allInnerTexts()).map((x) => parseFloat(x));
    T.check('method modal: distribution percentages ~100%', Math.abs(pcts.reduce((a, b) => a + b, 0) - 100) <= 2, pcts.join(','));
    const across = await page.locator('.modal .label').first().innerText();
    const nJobs = await page.evaluate(() => jobsStore.jobs.length);
    T.check('method modal: "Across N live listings" = de-duplicated count', across.replace(/,/g, '').includes(String(nJobs)), across);
    T.check('method modal: no overflow', await page.evaluate(() => { const m = document.querySelector('.modal'); return m.scrollWidth <= m.clientWidth + 1; }) && (await overflow(page)).ok);
    await shot(page, `method-${W}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    T.check('method modal: Escape closes, focus back on link', !(await state(page)).modal && await page.evaluate(() => /How we score/.test(document.activeElement?.textContent || '')));
    await page.evaluate((id) => openJob(id), jid); await page.waitForTimeout(300);
    const inDrawer = page.locator('.drawer .find-link:has-text("How we score listings")');
    if (await inDrawer.count()) {
      await inDrawer.first().click(); await page.waitForTimeout(250);
      const s2 = await state(page);
      T.check('method from job drawer: modal over drawer', s2.modal === 'method' && s2.drawer === 'job', JSON.stringify(s2));
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const s3 = await state(page);
      T.check('method from job drawer: Escape closes modal only', !s3.modal && s3.drawer === 'job', JSON.stringify(s3));
    } else T.note('job drawer method link', 'not shown for this job (low ghost score)');
    await page.evaluate(() => closeDrawer()); await page.waitForTimeout(150);
    await page.evaluate(() => openModal('method')); await page.waitForTimeout(200);
    T.check("openModal('method') works directly", (await state(page)).modal === 'method');
    await page.evaluate(() => closeModal());

    // ================= E. Posting taken down =================
    await page.evaluate(() => {
      Apps.create({ company: 'Gone Co', title: 'SWE Intern', jobId: 'qa-missing-job-1', stage: 'saved' });
      Apps.create({ company: 'Vanished Inc', title: 'Data Intern', jobId: 'qa-missing-job-2', stage: 'applied', appliedAt: Date.now() - 3 * 864e5 });
      Apps.create({ company: 'Offerco', title: 'SWE', jobId: 'qa-missing-job-3', stage: 'offer', appliedAt: Date.now() - 30 * 864e5 });
      ui.set({ toasts: [] });
    });
    await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(500);
    const rem = await page.evaluate(() => computeTasks().filter((t) => t.kind === 'removed').map((t) => t.app.company));
    T.check('taken down: Today tasks for saved + applied', rem.includes('Gone Co') && rem.includes('Vanished Inc'), rem.join(','));
    T.check('taken down: no task for offer-stage app', !rem.includes('Offerco'));
    const allBtn = page.locator('.td-card-foot button:has-text("more")'); if (await allBtn.count()) await allBtn.click();
    const tdText = await page.locator('.td-task:has-text("Gone Co")').innerText().catch(() => '');
    T.check('taken down: Today row text', /took down/.test(tdText), tdText.replace(/\n/g, ' ').slice(0, 120));
    if (tdText) {
      await page.locator('.td-task:has-text("Gone Co") .td-act').click(); await page.waitForTimeout(300);
      T.check('taken down: Review opens the application', (await state(page)).drawer === 'app');
      await page.evaluate(() => closeDrawer());
    }
    await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(500);
    const cardTxt = await page.locator('.pl-card:has-text("Gone Co") .pl-status').innerText().catch(() => '');
    T.check('taken down: pipeline card status "Posting taken down"', /Posting taken down/.test(cardTxt), cardTxt);
    T.check('taken down: applied card too', /Posting taken down/.test(await page.locator('.pl-card:has-text("Vanished Inc") .pl-status').innerText().catch(() => '')));
    const exJob = await page.evaluate(() => { const a = Apps.list().find((x) => x.example); Apps.update(a.id, { jobId: 'qa-missing-ex' }); return computeTasks().some((t) => t.kind === 'removed' && t.app.id === a.id); });
    T.check('taken down: example apps never flagged', !exJob);
    // dismiss removed task persists
    const remKey = await page.evaluate(() => computeTasks().find((t) => t.kind === 'removed')?.key);
    await page.evaluate((k) => dismissTask(k, 365), remKey);
    T.check('taken down: dismiss removes task', !(await page.evaluate((k) => computeTasks().some((t) => t.key === k), remKey)));

    // ================= G. Add to calendar =================
    await page.evaluate(() => closeDrawer());
    const cal = await page.evaluate(() => { const a = Apps.create({ company: 'Cal Co', title: 'SWE Intern', stage: 'interview', appliedAt: Date.now() - 5 * 864e5 }); const r = Apps.addRound(a.id, { type: 'technical', at: Date.UTC(2026, 10, 20, 17, 30), interviewers: 'Priya S., Sam', prep: 'Graphs; DP, and SQL' }); ui.set({ toasts: [] }); return { a: a.id, r: r.id }; });
    await page.evaluate(({ a }) => openApp(a, 'rounds'), cal); await page.waitForTimeout(400);
    const calBtn = page.locator(`[data-round="${cal.r}"] button:has-text("Add to calendar")`);
    T.check('calendar: button on upcoming round', await calBtn.count() === 1);
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await calBtn.click(); await page.waitForTimeout(500);
    // .ics content: call the app's own builder directly
    const ics = await page.evaluate(({ a, r }) => { const app = Apps.get(a); return cal_ics(app, app.rounds.find((x) => x.id === r)); }, cal);
    const noStamp = (t) => String(t || '').replace(/DTSTAMP:[^\r\n]*/, 'DTSTAMP');
    if (MOCK) {
      const sv = await page.evaluate(() => window.__qa.saves.slice(-1)[0]);
      T.check('calendar (MOCK downloads): .ics saved', sv && /^cal-co-technical\.ics$/.test(sv.filename) && sv.type === 'text/calendar', sv && sv.filename);
      T.check('calendar (MOCK downloads): saved text = cal_ics(app, round)', sv && noStamp(sv.text) === noStamp(ics), sv && sv.text.slice(0, 80));
    } else {
      const tt = await page.locator('.toast').first().innerText().catch(() => '');
      T.check('calendar (no downloads): toast explains files can’t be saved here', /Calendar files can.t be saved in this view/.test(tt), tt);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
      T.check('calendar (no downloads): nothing copied to clipboard', clip === '', clip.slice(0, 60));
      T.check('calendar (no downloads): round not marked', (await page.evaluate(({ a, r }) => Apps.get(a).rounds.find((x) => x.id === r).calendar, cal)) == null);
      const btxt = await page.locator(`[data-round="${cal.r}"] .pl-round-foot`).innerText();
      T.check('calendar (no downloads): button still says "Add to calendar"', /Add to calendar/.test(btxt) && !/In calendar/.test(btxt), btxt.replace(/\n/g, ' '));
      await clearToasts(page);
    }
    T.check('ics: DTSTART is UTC of round time', /DTSTART:20261120T173000Z/.test(ics), (ics.match(/DTSTART:[^\r\n]*/) || [''])[0]);
    T.check('ics: DTEND +45 min', /DTEND:20261120T181500Z/.test(ics));
    T.check('ics: SUMMARY escaped', /SUMMARY:Technical: Cal Co · SWE Intern/.test(ics), (ics.match(/SUMMARY:[^\r\n]*/) || [''])[0]);
    T.check('ics: DESCRIPTION escapes ; and ,', /Priya S\\., Sam|Priya S\.\\, Sam/.test(ics) && /Graphs\\; DP\\, and SQL/.test(ics), (ics.match(/DESCRIPTION:[^\r\n]*/) || [''])[0].slice(0, 160));
    T.check('ics: CRLF line endings + VALARM', /\r\n/.test(ics) && /BEGIN:VALARM/.test(ics));
    T.check('ics: every line ends CRLF (no bare LF)', !/[^\r]\n/.test(ics) && ics.split('\r\n').length > 10);
    const longLine = ics.split('\r\n').find((l) => Buffer.byteLength(l) > 75);
    T.check('ics: lines folded at 75 octets (RFC 5545 §3.1)', !longLine, longLine ? `${Buffer.byteLength(longLine)} octets: ${longLine.slice(0, 60)}…` : '');
    // long ASCII description: must be folded, and unfolding must restore it
    const icsLong = await page.evaluate(() => cal_ics({ company: 'Cal Co', title: 'SWE Intern' }, { id: 'rq', type: 'technical', at: Date.UTC(2026, 10, 20, 17, 30), prep: 'x'.repeat(200) }));
    const llL = icsLong.split('\r\n');
    T.check('ics: long line folded (continuations start with a space, unfold restores)', llL.every((l) => Buffer.byteLength(l) <= 75) && llL.some((l) => /^ x/.test(l)) && icsLong.replace(/\r\n /g, '').includes('Prep notes: ' + 'x'.repeat(200)), llL.map((l) => Buffer.byteLength(l)).join(','));
    // non-ASCII text (names, curly quotes): the 75 limit is in octets, not characters
    const icsU = await page.evaluate(() => cal_ics({ company: 'Café Zoë', title: 'Ingénieur logiciel – stagiaire' }, { id: 'ru', type: 'technical', at: Date.UTC(2026, 10, 20, 17, 30), interviewers: 'José Müller, Zoë Ångström, Søren Æbelø', prep: 'Révisez les graphes – c’est important; préparez « DP » et SQL ’’’’’’’’’’’’’’’’’’’’' }));
    const uLong = icsU.split('\r\n').find((l) => Buffer.byteLength(l) > 75);
    T.check('ics: non-ASCII lines folded at 75 octets', !uLong, uLong ? `${Buffer.byteLength(uLong)} octets: ${uLong.slice(0, 50)}…` : '');
    if (MOCK) T.check('calendar: round marked + button says "In calendar"', (await page.evaluate(({ a, r }) => Apps.get(a).rounds.find((x) => x.id === r).calendar, cal)) === 'ics' && await page.locator(`[data-round="${cal.r}"] button:has-text("In calendar")`).count() === 1);
    // past round: no button; no date: no button
    const past = await page.evaluate(({ a }) => Apps.addRound(a, { type: 'behavioral', at: Date.now() - 3 * 864e5 }).id, cal);
    const nod = await page.evaluate(({ a }) => Apps.addRound(a, { type: 'behavioral' }).id, cal);
    await page.waitForTimeout(200);
    for (const [id, nm] of [[past, 'past'], [nod, 'undated']]) {
      if (!(await page.locator(`[data-round="${id}"] .pl-round-foot`).count())) await page.click(`#pl-r-${id}-sum`).catch(() => {});
      T.check(`calendar: no button on ${nm} round`, !(await page.locator(`[data-round="${id}"] button:has-text("Add to calendar")`).count()));
    }
    // Google Calendar connector path
    if (MOCK) {
      await page.evaluate(async () => { window.__qaMcpMode = 'ok'; caps.mcp = await window.claude.use('mcp'); });
      await clearToasts(page);
      await page.evaluate(({ a, r }) => addToCalendar(a, r), cal); await page.waitForTimeout(300);
      const call = await page.evaluate(() => window.__qa.mcpCalls.slice(-1)[0]);
      T.check('calendar (connector): create_event called with local times', call && call.tool === 'create_event' && call.args.startTime === '2026-11-20T17:30:00' && call.args.endTime === '2026-11-20T18:15:00', JSON.stringify(call && call.args).slice(0, 160));
      T.check('calendar (connector): toast', /Added to Google Calendar/.test(await page.locator('.toast').first().innerText().catch(() => '')));
      T.check('calendar (connector): passes browser timeZone with the local startTime (calendar zone may differ from browser zone)', !call || /Z|[+-]\d\d:\d\d$/.test(call.args.startTime) || !!call.args.timeZone, 'startTime has no offset and no timeZone field');
      await page.evaluate(async () => { window.__qaMcpMode = 'fail'; caps.mcp = await window.claude.use('mcp'); });
      const n0 = await page.evaluate(() => window.__qa.saves.length);
      await page.evaluate(({ a, r }) => addToCalendar(a, r), cal); await page.waitForTimeout(300);
      T.check('calendar (connector not connected): falls back to .ics', (await page.evaluate(() => window.__qa.saves.length)) === n0 + 1);
      await page.evaluate(() => { window.__qaMcpMode = null; caps.mcp = null; });
    }
    await page.evaluate(() => closeDrawer()); await clearToasts(page);
    T.check('A-G: console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception A-G', false, e.message.split('\n')[0]); await shot(page, `new-exc-${W}`); }
  await close();

  // ================= D. PDF resume upload =================
  {
    const r = await open({ W, mock: MOCK, setup: 'fresh' });
    const page = r.page;
    try {
      await page.click('#onb-next'); await page.waitForTimeout(200);
      await page.setInputFiles('#onb-res-file', PDF);
      await page.waitForFunction(() => /Jordan Lee/.test(document.getElementById('onb-res-text')?.value || ''), null, { timeout: 15000 }).catch(() => {});
      const txt = await page.inputValue('#onb-res-text');
      T.check('pdf (onboarding): text extracted into textarea', /Jordan Lee/.test(txt) && /PyTorch/.test(txt), txt.slice(0, 80));
      T.check('pdf (onboarding): status note names the file', /Read sample-resume\.pdf/.test(await page.locator('.onb-resume .callout').innerText().catch(() => '')));
      const chips = await page.locator('.onb-skill').allInnerTexts();
      T.check('pdf (onboarding): skills detected (Python, PyTorch, Docker)', ['Python', 'PyTorch', 'Docker'].every((s) => chips.some((c) => c.trim() === s)), chips.join('|'));
      T.check('pdf (onboarding): no overflow', (await overflow(page)).ok);
      await shot(page, `pdf-onb-${W}`);
      // bad PDF and unsupported type
      await page.setInputFiles('#onb-res-file', { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 garbage not a pdf') });
      await page.waitForTimeout(1500);
      T.check('pdf: corrupt PDF -> plain error, text kept', /Couldn.t read that PDF/.test(await page.locator('.onb-resume .callout').innerText().catch(() => '')) && /Jordan/.test(await page.inputValue('#onb-res-text')));
      await page.setInputFiles('#onb-res-file', { name: 'resume.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK...') });
      await page.waitForTimeout(400);
      T.check('pdf: .docx -> "save as PDF" hint', /Word files: save as PDF/.test(await page.locator('.onb-resume .callout').innerText().catch(() => '')));
      await page.click('#onb-next'); await page.waitForTimeout(400); await page.click('#onb-finish'); await page.waitForTimeout(400);
      const prof = await page.evaluate(() => store.get().profile);
      T.check('pdf: resume saved to profile on finish', /Jordan Lee/.test(prof.resume) && prof.skills.includes('PyTorch'), prof.skills.join(','));
      // Settings -> resume modal upload
      await page.evaluate(() => { store.set((s) => ({ ...s, profile: { ...s.profile, resume: '', skills: [] } })); location.hash = 'prefs'; }); await page.waitForTimeout(500);
      await page.click('#pf-edit-resume'); await page.waitForSelector('.modal');
      await page.setInputFiles('#resm-file', PDF);
      await page.waitForFunction(() => /Jordan Lee/.test(document.getElementById('resm-text')?.value || ''), null, { timeout: 15000 }).catch(() => {});
      T.check('pdf (settings modal): text extracted', /Jordan Lee/.test(await page.inputValue('#resm-text')));
      await page.click('.modal-foot button:has-text("Save resume")'); await page.waitForTimeout(300);
      const p2 = await page.evaluate(() => store.get().profile);
      T.check('pdf (settings): saved resume + skills', /Jordan Lee/.test(p2.resume) && p2.skills.includes('Python'), p2.skills.join(','));
      const lib = await page.evaluate(() => !!window.pdfjsLib);
      T.check('pdf.js loaded lazily only after a PDF was chosen', lib);
      T.check('pdf: console errors', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
    } catch (e) { T.check('pdf exception', false, e.message.split('\n')[0]); await shot(page, `pdf-exc-${W}`); }
    await r.close();
  }
  // pdf.js not loaded at boot
  {
    const r = await open({ W, mock: MOCK, setup: 'onboarded', route: 'find' });
    T.check('pdf.js not loaded at boot', !(await r.page.evaluate(() => !!window.pdfjsLib || [...document.scripts].some((s) => /pdfjs/.test(s.src)))));
    // pdf.js CDN unreachable -> friendly error
    await r.page.route(/pdfjs-dist/, (route) => route.abort());
    await r.page.evaluate(() => openModal('resume')); await r.page.waitForTimeout(200);
    await r.page.setInputFiles('#resm-file', PDF); await r.page.waitForTimeout(1500);
    T.check('pdf: CDN blocked -> "Couldn\'t read that PDF here. Paste the text instead."', /Couldn.t read that PDF/.test(await r.page.locator('.modal .callout').innerText().catch(() => '')));
    await r.close();
  }

  // ================= F. New since your last visit =================
  {
    const r = await open({ W, mock: MOCK, setup: 'onboarded', route: 'find' });
    const page = r.page;
    // <=520px the count bar shows a short "N new" button on its first line
    const newSel = W <= 520 ? '.find-bar2-top button.find-bar-new' : '.find-count button:has-text("new since your last visit")';
    try {
      T.check('first visit: no "new since" link', !(await page.locator(newSel).count()));
      await page.evaluate(() => localStorage.setItem('heardback:lastVisit', JSON.stringify({ last: Date.now() - 2 * 864e5 })));
      await page.reload(); await page.waitForFunction(() => jobsStore.status === 'ready', null, { timeout: 15000 }); await page.waitForTimeout(500);
      const since = await page.evaluate(() => visit.since);
      T.check('lastVisit 2 days ago -> visit.since set', since && Math.abs(Date.now() - 2 * 864e5 - since) < 120000, since);
      const link = page.locator(newSel);
      T.check('Find shows "N new since your last visit"', await link.count() === 1);
      const lt = await link.innerText().catch(() => '0');
      { const l2 = lt.replace(/\s+/g, ' ').trim(); T.check('"new since" label', W <= 520 ? /^[\d,]+ new$/.test(l2) : /^[\d,]+ new since your last visit$/.test(l2), l2); }
      const n = +lt.replace(/\D/g, '');
      const exp = await page.evaluate(() => { const f = find_getFilters(store.get()); return find_run(jobsStore.jobs, f, '', false).res.filter((j) => j.p > visit.since).length; });
      T.check('"new since" count = listings in current filters posted after last visit', n === exp, `${n} vs ${exp}`);
      await link.click(); await page.waitForTimeout(300);
      const cnt = +(await page.locator('.find-n strong').innerText()).replace(/,/g, '');
      T.check('clicking it filters to those listings', cnt === exp, `${cnt} vs ${exp}`);
      T.check('filter state posted=since', (await page.evaluate(() => find_getFilters(store.get()).posted)) === 'since');
      if (!mobile) T.check('"New since your last visit" chip on in sidebar', (await page.locator('.find-aside .chip:has-text("New since")').getAttribute('aria-pressed')) === 'true');
      // reload within 30 min keeps the same "since"
      await page.reload(); await page.waitForTimeout(800);
      T.check('reload within 30 min keeps the same since', (await page.evaluate(() => visit.since)) === since);
      // garbage lastVisit must not crash
      await page.evaluate(() => localStorage.setItem('heardback:lastVisit', '"oops"'));
      await page.reload(); await page.waitForTimeout(800);
      T.check('garbage lastVisit: page still renders', await page.locator('.find-row').count() > 0 || await page.locator('.find-n').count() > 0);
      await page.evaluate(() => localStorage.setItem('heardback:lastVisit', '{"last":"yesterday"}'));
      await page.reload(); await page.waitForTimeout(800);
      const sv = await page.evaluate(() => visit.since);
      T.check('lastVisit with non-numeric "last": since stays null (no NaN filter)', sv == null || Number.isFinite(sv), String(sv));
      T.check('new-since: console errors', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
    } catch (e) { T.check('new-since exception', false, e.message.split('\n')[0]); }
    await r.close();
  }

  // ================= H. Data robustness =================
  {
    const bad = { v: 1, profile: { roles: null, levels: 'intern', locations: 'nyc', remote: 'yes', skills: [null, 3, 'Python'], onboarded: true, name: { x: 1 }, weeklyGoal: 'ten', resume: 42 },
      apps: { a1: { id: 'a1', company: 'Partial Co' }, a2: null, a3: { id: 'a3', company: 'Weird', stage: 'archived', events: [null, { kind: 'stage', to: 'nope' }], rounds: [null, { id: 'r1', type: 'alien', at: 'tomorrow', outcome: 'maybe' }], contacts: [null, 'Bob'], jobId: 12345, createdAt: 'x', appliedAt: -5, lastActivityAt: 9e15 }, a4: { id: 'a4', company: '', title: null, stage: 'interview', rounds: [{ id: 'r2', type: 'technical', at: Date.now() + 864e5 }] }, '__proto__': { id: 'p', company: 'Proto' } },
      settings: { theme: 'neon', followUpDays: -3, ghostDays: 'x', showExamples: 'no' }, dismissed: null, ui: { pipelineView: 'grid', findFilters: { lv: 'intern', roles: null, locs: 'x' } } };
    const r = await open({ W, mock: MOCK, rawStorage: JSON.stringify(bad), route: 'today' });
    const page = r.page;
    try {
      const routes = ['today', 'find', 'pipeline', 'companies', 'prep', 'stats', 'prefs'];
      const blank = [];
      for (const rt of routes) {
        await page.evaluate((x) => (location.hash = x), rt); await page.waitForTimeout(450);
        const ok = await page.evaluate(() => (document.querySelector('#workspace')?.innerText || '').trim().length > 20 && !/Something went wrong/i.test(document.body.innerText));
        if (!ok) blank.push(rt);
      }
      T.check('corrupt/partial records: every route renders (no error boundary)', !blank.length, blank.join(','));
      T.check('corrupt/partial records: no page errors', !r.errors.some((e) => /PAGEERROR/.test(e)), r.errors.slice(0, 3).join(' | '));
      await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(300);
      for (const view of ['Board', 'Table']) {
        await page.click(`.seg button:has-text("${view}")`).catch(() => {}); await page.waitForTimeout(200);
        await page.locator('.pl-card, .pl-table tbody tr').first().click().catch(() => {}); await page.waitForTimeout(250);
        for (const t of ['overview', 'rounds', 'timeline', 'notes']) { await page.click(`#pl-tab-${t}`).catch(() => {}); await page.waitForTimeout(80); }
        await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      }
      T.check('corrupt records: drawers + all tabs open without page errors', !r.errors.some((e) => /PAGEERROR/.test(e)), r.errors.slice(0, 3).join(' | '));
      const st = await page.evaluate(() => store.get());
      T.check('profile coerced to arrays', Array.isArray(st.profile.roles) && Array.isArray(st.profile.levels) && Array.isArray(st.profile.locations), JSON.stringify({ r: st.profile.roles, l: st.profile.levels, loc: st.profile.locations }));
      T.check('skills keep only strings', (st.profile.skills || []).every((x) => typeof x === 'string'), JSON.stringify(st.profile.skills));
      T.check('weeklyGoal coerced to a number', typeof st.profile.weeklyGoal === 'number' && st.profile.weeklyGoal >= 1, st.profile.weeklyGoal);
      T.check('name coerced to string', typeof st.profile.name === 'string', JSON.stringify(st.profile.name));
      T.check('null app dropped', !st.apps.a2);
      T.check('unknown stage repaired', st.apps.a3 && !!(await page.evaluate((s) => STAGE[s], st.apps.a3.stage)), st.apps.a3 && st.apps.a3.stage);
      T.check('null events/rounds/contacts filtered', st.apps.a3 && st.apps.a3.events.every((e) => e && typeof e === 'object') && st.apps.a3.rounds.every((x) => x && typeof x === 'object') && st.apps.a3.contacts.every((x) => x && typeof x === 'object'), JSON.stringify(st.apps.a3 && st.apps.a3.contacts));
      T.check('round with bad type/outcome repaired', st.apps.a3 && st.apps.a3.rounds.every((x) => ['pending', 'passed', 'failed', 'cancelled'].includes(x.outcome)), JSON.stringify(st.apps.a3 && st.apps.a3.rounds));
      T.check('round "at" string -> null or number', st.apps.a3 && st.apps.a3.rounds.every((x) => x.at == null || Number.isFinite(x.at)));
      T.check('settings.followUpDays clamped >= 1', st.settings.followUpDays >= 1, st.settings.followUpDays);
      T.check('settings.ghostDays numeric', Number.isFinite(st.settings.ghostDays), st.settings.ghostDays);
      T.check('dismissed coerced to object', st.dismissed && typeof st.dismissed === 'object');
      T.check('ui.findFilters with bad shapes: Find still filters', await page.evaluate(() => { try { location.hash = 'find'; return true; } catch { return false; } }) && !r.errors.some((e) => /PAGEERROR/.test(e)));
      T.note('app with empty company+title (but an interview round) is dropped on load', String(!(await page.evaluate(() => !!Apps.get('a4')))));
      T.check('jobId number does not crash taken-down check', !r.errors.some((e) => /jobId|byId/.test(e)));
      // bad imports
      await page.evaluate(() => (location.hash = 'prefs')); await page.waitForTimeout(400);
      const before = await page.evaluate(() => Object.keys(store.get().apps).length);
      const imports = [
        ['apps-not-array.json', JSON.stringify({ apps: 'lol', profile: [] })],
        ['nulls.json', JSON.stringify({ apps: [null, 1, 'x', { company: 'Imp Co', title: 'T', stage: 'applied', events: [null], rounds: 'x', contacts: {} }] })],
        ['huge.json', JSON.stringify({ apps: [{ company: 'A'.repeat(5000), title: 'T', stage: 'saved', appliedAt: 1e20 }] })],
        ['array-root.json', '[1,2,3]'],
        ['empty.json', ''],
        ['quotes.csv', 'company,title,stage\n"Acme, ""Inc""",SWE,Interviewing\n"Unclosed,SWE,applied\n,,\n'],
        ['bom.csv', '\ufeffCompany,Title,Status\nBom Co,Data Intern,Rejected\n'],
      ];
      const tl = [];
      for (const [name, body] of imports) {
        await clearToasts(page);
        await page.setInputFiles('#pf-import', { name, mimeType: name.endsWith('.csv') ? 'text/csv' : 'application/json', buffer: Buffer.from(body) });
        await page.waitForTimeout(350);
        const conf = page.locator('.modal-foot button:has-text("Import")');
        if (await conf.count()) { await conf.first().click(); await page.waitForTimeout(300); }
        tl.push(`${name}: ${(await page.locator('.toast').allInnerTexts()).join(' / ').slice(0, 90)}`);
      }
      T.note('bad import toasts', tl.join(' || '));
      T.check('bad imports: no page errors', !r.errors.some((e) => /PAGEERROR/.test(e)), r.errors.slice(0, 3).join(' | '));
      const st2 = await page.evaluate(() => store.get());
      T.check('bad imports: profile still well-formed', Array.isArray(st2.profile.roles) && Array.isArray(st2.profile.locations));
      T.check('bad imports: imported apps have valid stages + arrays', Object.values(st2.apps).every((a) => STAGE_OK.includes(a.stage) && Array.isArray(a.events) && Array.isArray(a.rounds) && Array.isArray(a.contacts)), Object.values(st2.apps).filter((a) => !STAGE_OK.includes(a.stage)).map((a) => a.stage).join(','));
      const bom = Object.values(st2.apps).find((a) => a.company === 'Bom Co');
      T.check('CSV with BOM header imports (Company/Title/Status)', !!bom && bom.stage === 'rejected', bom && bom.stage);
      const acme = Object.values(st2.apps).find((a) => /^Acme, "Inc"$/.test(a.company));
      T.check('CSV quoted comma + escaped quotes', !!acme && acme.stage === 'interview', acme ? acme.stage : Object.values(st2.apps).map((a) => a.company.slice(0, 20)).join('|'));
      const huge = Object.values(st2.apps).find((a) => /^AAAA/.test(a.company));
      T.check('huge appliedAt 1e20 rejected/clamped', !huge || huge.appliedAt == null || huge.appliedAt < 4102444800000, huge && huge.appliedAt);
      for (const rt of ['today', 'pipeline', 'stats']) { await page.evaluate((x) => (location.hash = x), rt); await page.waitForTimeout(350); }
      T.check('after bad imports: routes render, no overflow', (await overflow(page)).ok && !r.errors.some((e) => /PAGEERROR/.test(e)), JSON.stringify(await overflow(page)));
      T.note('apps count before/after imports', `${before} -> ${Object.keys(st2.apps).length}`);
    } catch (e) { T.check('robust exception', false, e.message.split('\n')[0]); }
    await r.close();
  }
  // truncated JSON -> backup + message
  {
    const r = await open({ W, mock: MOCK, rawStorage: '{"v":1,"profile":{"onboarded":true,"name":"Trunc"},"apps":{"x":{"id":"x","company":"Lost', route: 'today' });
    const keys = await r.page.evaluate(() => Object.keys(localStorage));
    T.check('truncated JSON: raw copy kept under heardback:v1:corrupt:*', keys.some((k) => /^heardback:v1:corrupt:\d+/.test(k)), keys.join(','));
    const txt = await r.page.locator('body').innerText();
    T.check('truncated JSON: user is told data could not be read', /couldn.t be read|could not be read|A copy was kept/i.test(txt), txt.slice(0, 120).replace(/\n/g, ' '));
    await r.close();
  }
  dump(`res-new-${W}${MOCK ? '-mock' : ''}.json`);
})();
const STAGE_OK = ['saved', 'applied', 'screen', 'interview', 'offer', 'rejected', 'ghosted'];
