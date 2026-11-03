// Flow 5: paste email. Parser accuracy + UI confirm effects. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const EMAILS = require('./emails');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`email-${W}${MOCK ? '-mock' : ''}`);
const pad = (n) => String(n).padStart(2, '0');
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'pipeline' });
  const mis = [];
  try {
    // ---- Parser accuracy (plParse is what the modal uses; parseEmail is the shared core) ----
    for (const em of EMAILS) {
      const r = await page.evaluate((t) => { const p = plParse(t); const c = parseEmail(t); return { p: { ...p }, core: { kind: c.kind, company: c.company, title: c.title, interviewAt: c.interviewAt } }; }, em.text);
      const at = r.p.interviewAt ? (() => { const d = new Date(r.p.interviewAt); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : null;
      const got = { kind: r.p.kind, company: r.p.company, title: r.p.title, at };
      const fields = ['kind', 'company', 'title', 'at'];
      const bad = fields.filter((f) => (got[f] || '') !== (em.exp[f] || ''));
      T.check(`parse ${em.id}`, !bad.length, bad.map((f) => `${f}: got "${got[f]}" want "${em.exp[f]}"`).join('; '));
      if (bad.length) mis.push({ id: em.id, bad: bad.map((f) => ({ f, got: got[f], want: em.exp[f] })) });
      if (r.core.interviewAt !== r.p.interviewAt && r.p.interviewAt) T.note(`core vs pl interviewAt ${em.id}`, `${r.core.interviewAt} vs ${r.p.interviewAt}`);
    }
    // samples
    for (const k of ['confirmation', 'interview', 'rejection', 'offer']) {
      const r = await page.evaluate((k) => { const p = plParse(PL_SAMPLES[k].text); return { kind: p.kind, company: p.company, title: p.title, at: p.interviewAt, who: p.interviewers }; }, k);
      T.check(`sample ${k} kind`, r.kind === k, JSON.stringify(r));
      T.check(`sample ${k} company`, /Northwind Labs|Quarry Analytics|Fernhill Capital/.test(r.company), r.company);
      T.check(`sample ${k} title`, !!r.title, r.title);
      if (k === 'interview') {
        const d = new Date(r.at);
        T.check('sample interview time = Nov 5 14:00', d.getMonth() === 10 && d.getDate() === 5 && d.getHours() === 14, d.toString());
        T.check('sample interview interviewers', r.who === 'Priya Shah and Tom Lee', r.who);
      }
    }
    // ---- UI flow: samples applied to examples ----
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(store.get().apps)));
    const byCo = (apps, c) => Object.values(apps).find((a) => a.company === c);
    // interview sample -> Northwind (currently interview) : adds round, no stage change
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    T.check('E opens paste modal', true);
    await page.click('#pl-sample-interview'); await page.waitForTimeout(200);
    T.check('interview sample matched to existing Northwind', (await page.locator('#pl-p-target').inputValue()) === byCo(before, 'Northwind Labs').id);
    const plan = await page.locator('.pl-plan p').first().innerText();
    T.check('plan mentions round', /Technical round/.test(plan), plan);
    T.check('no overflow paste modal', (await overflow(page)).ok);
    await shot(page, `paste-${W}${MOCK ? '-mock' : ''}`);
    await page.click('.modal-foot button:has-text("Update application")'); await page.waitForTimeout(300);
    let apps = await page.evaluate(() => store.get().apps);
    let nw = byCo(apps, 'Northwind Labs');
    T.check('interview sample adds round', nw.rounds.length === byCo(before, 'Northwind Labs').rounds.length + 1);
    T.check('interview sample keeps stage', nw.stage === 'interview');
    T.check('email event logged', nw.events.some((e) => e.kind === 'email'));
    await clearToasts(page);
    // re-paste the same interview email -> duplicate round?
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('#pl-sample-interview'); await page.waitForTimeout(150);
    await page.click('.modal-foot button:has-text("Update application")'); await page.waitForTimeout(300);
    apps = await page.evaluate(() => store.get().apps); nw = byCo(apps, 'Northwind Labs');
    T.check('pasting same invite twice does not duplicate round', nw.rounds.length === byCo(before, 'Northwind Labs').rounds.length + 1, `rounds=${nw.rounds.length}`);
    await clearToasts(page);
    // rejection sample -> Quarry applied -> rejected
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('#pl-sample-rejection'); await page.waitForTimeout(150);
    await page.click('.modal-foot button:has-text("Update application")'); await page.waitForTimeout(300);
    apps = await page.evaluate(() => store.get().apps);
    const q = byCo(apps, 'Quarry Analytics');
    T.check('rejection sample moves Quarry to rejected', q.stage === 'rejected', q.stage);
    T.check('rejection lastReplyAt set', !!q.lastReplyAt);
    await clearToasts(page);
    // offer sample -> Fernhill screen -> offer
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('#pl-sample-offer'); await page.waitForTimeout(150);
    await page.click('.modal-foot button:has-text("Update application")'); await page.waitForTimeout(300);
    apps = await page.evaluate(() => store.get().apps);
    T.check('offer sample moves Fernhill to offer', byCo(apps, 'Fernhill Capital').stage === 'offer');
    T.check('celebrate shown', await page.locator('.celebrate').count() === 1);
    await page.waitForTimeout(2700); await clearToasts(page);
    // confirmation sample -> Northwind is in interview -> should NOT move back
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('#pl-sample-confirmation'); await page.waitForTimeout(150);
    await page.click('.modal-foot .btn.primary'); await page.waitForTimeout(300);
    apps = await page.evaluate(() => store.get().apps);
    T.check('confirmation on interview app does not regress', byCo(apps, 'Northwind Labs').stage === 'interview');
    await clearToasts(page);
    // own email -> new application (Datadog screen)
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.fill('#pl-p-raw', EMAILS.find((e) => e.id === 'recruiter-screen').text);
    await page.click('.modal-foot button:has-text("Read email")'); await page.waitForTimeout(250);
    const tgt = await page.locator('#pl-p-target').inputValue();
    T.check('Datadog -> new application target', tgt === 'new', tgt);
    await page.click('.modal-foot button:has-text("Create application")'); await page.waitForTimeout(300);
    apps = await page.evaluate(() => store.get().apps);
    const dd = byCo(apps, 'Datadog');
    T.check('Datadog app created', !!dd, Object.values(apps).map((a) => a.company).join(','));
    if (dd) {
      T.check('Datadog stage screen', dd.stage === 'screen', dd.stage);
      T.check('Datadog recruiter round added', dd.rounds.length === 1 && dd.rounds[0].type === 'recruiter', JSON.stringify(dd.rounds.map((r) => r.type)));
      T.check('Datadog appliedAt <= email date', dd.appliedAt <= Date.now());
    }
    await clearToasts(page);
    // Empty company -> validation
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.fill('#pl-p-raw', 'hello there, just checking in');
    await page.click('.modal-foot button:has-text("Read email")'); await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("Create application")'); await page.waitForTimeout(200);
    T.check('empty company blocked with message', await page.locator('.modal .callout.wait').isVisible());
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // Read email with nothing pasted
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('.modal-foot button:has-text("Read email")'); await page.waitForTimeout(150);
    T.check('Read email with empty textarea shows error', await page.locator('.modal .callout.wait').isVisible());
    if (MOCK) {
      await page.fill('#pl-p-raw', 'From: x\nSome email about an interview');
      await page.click('button:has-text("Read with Claude instead")'); await page.waitForTimeout(700);
      T.check('mock Claude read fills preview with ai label', await page.locator('.pl-preview .ai-label').isVisible());
    }
    await page.keyboard.press('Escape');
    // hidden examples still matchable?
    await page.evaluate(() => store.set((s) => ({ ...s, settings: { ...s.settings, showExamples: false } })));
    await page.waitForTimeout(200);
    await page.keyboard.press('e'); await page.waitForSelector('#pl-p-raw');
    await page.click('#pl-sample-interview'); await page.waitForTimeout(150);
    const tgt2 = await page.locator('#pl-p-target').inputValue();
    T.check('hidden example apps are not auto-matched', tgt2 === 'new', `target=${tgt2}`);
    await page.keyboard.press('Escape');
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `email-exc-${W}`); }
  require('fs').writeFileSync(require('./lib').OUTD + '/misparses.json', JSON.stringify(mis, null, 2));
  await close();
  dump(__dirname + `/out/res-email-${W}${MOCK ? '-mock' : ''}.json`);
})();
