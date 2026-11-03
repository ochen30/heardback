// Flow 7 (Prep) + 8 (Insights consistency). env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`prep-stats-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'prep' });
  try {
    await page.waitForSelector('.prep-layout');
    T.check('no overflow prep', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `prep-${W}${MOCK ? '-mock' : ''}`);
    const opts = await page.locator('#prep-select option').allInnerTexts();
    T.note('prep select options', opts.join(' | '));
    // select rounds via list (desktop) or select (mobile)
    const items = await page.locator('.prep-item').count();
    T.check('prep list has rounds', items >= 2, items);
    const values = await page.locator('#prep-select option').evaluateAll((os) => os.map((o) => o.value));
    await page.selectOption('#prep-select', values[1]); await page.waitForTimeout(250);
    const h2 = await page.locator('.prep-h2').first().innerText();
    T.check('select switches round', h2.length > 0, h2);
    T.check('prepFocus stored', (await page.evaluate(() => store.get().ui.prepFocus?.roundId)) === values[1].split('|')[1]);
    // notes persist
    const rid = values[1].split('|')[1];
    await page.fill(`#prep-notes-${rid}`, 'Review graphs; ask about team');
    await page.waitForTimeout(900);
    const saved = await page.evaluate((rid) => Object.values(store.get().apps).flatMap((a) => a.rounds).find((r) => r.id === rid).prep, rid);
    T.check('prep notes saved to round.prep', saved === 'Review graphs; ask about team', saved);
    await page.reload(); await page.waitForTimeout(900);
    T.check('prep notes persist after reload', (await page.inputValue(`#prep-notes-${rid}`).catch(() => '')) === 'Review graphs; ask about team');
    // switch round and back: notes still show
    await page.selectOption('#prep-select', values[0]); await page.waitForTimeout(200);
    await page.selectOption('#prep-select', values[1]); await page.waitForTimeout(200);
    T.check('notes reload when switching rounds', (await page.inputValue(`#prep-notes-${rid}`)) === 'Review graphs; ask about team');
    // practice timer
    await page.click('#prep-practice'); await page.waitForTimeout(200);
    T.check('practice mode shows question 1', /1 of/.test(await page.locator('.prep-count').innerText()));
    await page.click('#prep-timer-toggle'); await page.waitForTimeout(2300);
    const clock = await page.locator('.prep-clock').innerText();
    T.check('timer counts down', clock === '1:58' || clock === '1:57', clock);
    await page.click('#prep-timer-toggle'); await page.waitForTimeout(1200);
    T.check('timer pauses', (await page.locator('.prep-clock').innerText()) === clock);
    await page.fill('#prep-outline', 'Situation: hackathon; built a thing; result 30% faster');
    await page.click('#prep-next'); await page.waitForTimeout(200);
    T.check('next question resets timer', (await page.locator('.prep-clock').innerText()) === '2:00');
    await page.click('.prep-practice-foot button:has-text("Previous")'); await page.waitForTimeout(200);
    T.check('outline kept when going back', (await page.inputValue('#prep-outline')).startsWith('Situation'));
    if (MOCK) {
      await page.click('#prep-feedback'); await page.waitForTimeout(800);
      T.check('mock: feedback shown', await page.locator('.prep-practice .ai-box').isVisible());
    } else T.check('no-mock: no feedback button', !(await page.locator('#prep-feedback').count()));
    await page.click('#prep-exit'); await page.waitForTimeout(200);
    await page.click('#prep-practice'); await page.waitForTimeout(200);
    const kept = await page.inputValue('#prep-outline');
    T.check('practice outline survives Exit/re-enter ("Notes stay in this browser")', kept.startsWith('Situation'), JSON.stringify(kept));
    await page.click('#prep-exit');
    // resume CTA
    T.check('resume CTA visible (no resume)', await page.locator('#prep-add-resume').isVisible());
    await page.click('#prep-add-resume'); await page.waitForTimeout(250);
    await page.fill('#resm-text', 'Built a React app used by 500 students, cutting wait time by 40%.\nLed a team of 3 to ship an iOS app with 1,200 downloads.');
    await page.click('.modal-foot button:has-text("Save resume")'); await page.waitForTimeout(250);
    const tp = await page.locator('.prep-point').count();
    T.check('talking points derived after resume save', tp === 2, tp);
    // practice without interview
    await page.click('#prep-practice-item').catch(async () => page.selectOption('#prep-select', 'practice'));
    await page.waitForTimeout(250);
    T.check('practice-without-interview header', /Practice without an interview/.test(await page.locator('.prep-h2').first().innerText()));
    if (MOCK) { await page.click('#prep-tailor'); await page.waitForTimeout(800); T.check('mock: tailored questions listed', (await page.locator('.prep-qlist li').count()) >= 6); }
    T.check('no overflow prep after', (await overflow(page)).ok);

    // ===== Insights =====
    await page.evaluate(() => (location.hash = 'stats')); await page.waitForTimeout(600);
    T.check('no overflow stats', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `stats-${W}${MOCK ? '-mock' : ''}`);
    const mine = await page.evaluate(() => {
      const s = store.get(); const apps = Object.values(s.apps).filter((a) => s.settings.showExamples || !a.example);
      const applied = apps.filter((a) => a.stage !== 'saved' && a.appliedAt);
      const replied = applied.filter((a) => a.lastReplyAt || ['screen', 'interview', 'offer', 'rejected'].includes(a.stage));
      const interviewed = applied.filter((a) => ['interview', 'offer'].includes(a.stage) || a.rounds.length || a.events.some((e) => e.to === 'interview'));
      const offers = applied.filter((a) => a.stage === 'offer' || a.events.some((e) => e.to === 'offer'));
      const days = replied.map((a) => { const e = a.events.filter((e) => e.kind === 'stage' && ['screen', 'interview', 'offer', 'rejected'].includes(e.to)).sort((x, y) => x.at - y.at)[0]; const fr = e ? e.at : a.lastReplyAt; return fr && a.appliedAt ? (fr - a.appliedAt) / 864e5 : null; }).filter((x) => x != null && x >= 0).sort((a, b) => a - b);
      const med = days.length ? (days.length % 2 ? days[(days.length - 1) / 2] : (days[days.length / 2 - 1] + days[days.length / 2]) / 2) : null;
      return { applied: applied.length, replied: replied.length, interviewed: interviewed.length, offers: offers.length, med, nDays: days.length };
    });
    const kpis = await page.locator('.st-kpis .stat').allInnerTexts();
    T.note('KPI text', kpis.map((k) => k.replace(/\n/g, ' / ')).join(' || '));
    T.note('own computation', JSON.stringify(mine));
    const kv = (i) => kpis[i].split('\n')[1];
    T.check('KPI applied', kv(0) === String(mine.applied), `${kv(0)} vs ${mine.applied}`);
    T.check('KPI response rate', kv(1) === `${Math.round((mine.replied / mine.applied) * 100)}%`, `${kv(1)} vs ${mine.replied}/${mine.applied}`);
    T.check('KPI interview rate', kv(2) === `${Math.round((mine.interviewed / mine.applied) * 100)}%`, `${kv(2)} vs ${mine.interviewed}/${mine.applied}`);
    const medTxt = mine.med == null ? '—' : mine.med < 10 && mine.med % 1 ? mine.med.toFixed(1) : String(Math.round(mine.med));
    T.check('KPI median days', kpis[3].includes(medTxt), `${kpis[3].replace(/\n/g, ' ')} vs ${medTxt}`);
    T.check('KPI median n matches sample used', kpis[3].includes(`n=${mine.nDays}`), `${kpis[3].replace(/\n/g, ' ')} vs nDays=${mine.nDays}`);
    const funnel = await page.locator('.funnel-row .st-fv b').allInnerTexts();
    T.check('funnel numbers', funnel.join(',') === [mine.applied, mine.replied, mine.interviewed, mine.offers].join(','), `${funnel.join(',')} vs ${[mine.applied, mine.replied, mine.interviewed, mine.offers]}`);
    T.check('funnel monotonic (replied>=interviewed?)', mine.replied >= mine.interviewed, `${mine.replied} replied < ${mine.interviewed} interviewed`);
    const outs = await page.locator('.st-out-row').allInnerTexts();
    const sum = outs.map((o) => +o.split('\n')[2]).reduce((a, b) => a + b, 0);
    T.check('outcomes sum to applied', sum === mine.applied, `${sum} vs ${mine.applied}`);
    // weekly chart total vs applied in last 8 weeks
    const wk = await page.evaluate(() => { const st = computeStats(); return { sum: st.weeks.reduce((a, w) => a + w.applied, 0), first: st.weeks[0].start }; });
    const in8 = await page.evaluate((f) => Object.values(store.get().apps).filter((a) => a.stage !== 'saved' && a.appliedAt >= f).length, wk.first);
    T.check('weekly chart applied sum = applied since window start', wk.sum === in8, `${wk.sum} vs ${in8}`);
    // add app via Add modal in "interview" stage -> replied but no lastReplyAt
    await page.evaluate(() => { Apps.create({ company: 'Direct Interview Co', title: 'SWE', stage: 'interview', appliedAt: Date.now() - 5 * 864e5 }); ui.set({ toasts: [] }); });
    await page.waitForTimeout(300);
    const k2 = await page.locator('.st-kpis .stat').nth(3).innerText();
    const n2 = await page.evaluate(() => { const st = computeStats(); return { replied: st.replied }; });
    T.note('after adding app directly in Interviews stage, median card', `${k2.replace(/\n/g, ' ')} replied=${n2.replied}`);
    // toggle examples off on stats
    await page.click('label[for="stats-show-examples"]'); await page.waitForTimeout(300);
    const kp = await page.locator('.st-kpis .stat').first().innerText().catch(() => 'none');
    T.check('examples off -> applied excludes examples', kp.split('\n')[1] === '1', kp.replace(/\n/g, ' '));
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `prep-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-prep-${W}${MOCK ? '-mock' : ''}.json`);
})();
