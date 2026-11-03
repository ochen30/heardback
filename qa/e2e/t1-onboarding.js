// Flow 1: first-run onboarding. node qa/e2e/t1-onboarding.js  (env W, MOCK)
const { open, mk, dump, overflow, shot } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`onboard-${W}${MOCK ? '-mock' : ''}`);
const RESUME = `Alex Kim
Software engineering student, Python, Java, React, SQL, AWS, Docker.
Experience
- Built a React dashboard used by 2,000 students, reducing support tickets by 30%.
- Led a team of 4 to ship a Flask REST API with PostgreSQL on AWS.
- Optimized a pandas ETL pipeline, cutting runtime from 40 min to 6 min.
Skills: Python, Java, JavaScript, TypeScript, SQL, Git, Linux, machine learning`;
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'fresh' });
  try {
    T.check('onboarding visible on fresh', await page.locator('.onboard-wrap').isVisible());
    T.check('no overflow step1', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    // keyboard shortcuts should be inert while onboarding
    await page.keyboard.press('n'); await page.waitForTimeout(150);
    T.check('N shortcut inert during onboarding', !(await page.evaluate(() => ui.state.modal)));
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    T.check('Ctrl+K inert during onboarding', !(await page.evaluate(() => ui.state.palette)));
    // step 1 prefs
    // Level starts unpicked (empty = both levels)
    T.check('Level starts unpicked', (await page.locator('.onboard .chip[aria-pressed="true"]:has-text("Internship"), .onboard .chip[aria-pressed="true"]:has-text("New grad")').count()) === 0 && (await page.locator('.onboard .chip:has-text("New grad")').count()) === 1);
    await page.click('.onboard .chip:has-text("New grad")'); // pick newgrad only
    await page.click('.onboard .chip:has-text("Software")');
    await page.click('.onboard .chip:has-text("Data & AI")');
    // v5: locations are a checkbox list (top N + "Show more")
    if (!(await page.locator('#onb-loc-seattle').count())) await page.click('.onb-more');
    await page.check('#onb-loc-new-york');
    await page.check('#onb-loc-seattle');
    await page.click('label[for="onb-sponsor"]');
    await page.fill('#onb-name', '  Sam  ');
    await shot(page, `onb-step1-${W}`);
    await page.click('#onb-next');
    // step 2 resume
    T.check('step 2 shows resume textarea', await page.locator('#onb-res-text').isVisible());
    await page.fill('#onb-res-text', RESUME);
    await page.waitForTimeout(100);
    const chips = await page.locator('.onb-skill').allInnerTexts();
    T.check('skills detected from resume', chips.length >= 8, chips.join('|'));
    T.check('"C" not falsely detected', !chips.some((c) => c.trim() === 'C'), chips.join('|'));
    T.check('"R" not falsely detected', !chips.some((c) => c.trim() === 'R'), chips.join('|'));
    // remove a skill, add a custom one
    await page.click('.onb-skill:has-text("Docker")');
    await page.fill('#onb-res-add', 'kubernetes');
    await page.click('.onb-add button[type=submit]');
    const chips2 = await page.locator('.onb-skill').allInnerTexts();
    T.check('removed skill gone', !chips2.some((c) => c.includes('Docker')), chips2.join('|'));
    T.check('added skill normalized to known name', chips2.some((c) => c.trim() === 'Kubernetes'), chips2.join('|'));
    await page.click('#onb-next');
    // step 3
    await page.waitForSelector('.onb-big', { timeout: 10000 }).catch(() => {});
    const n = await page.locator('.onb-big').innerText().catch(() => 'none');
    T.check('step 3 shows match count', /\d/.test(n), n);
    // compute expected count ourselves
    const exp = await page.evaluate(() => {
      const p = { levels: ['newgrad'], roles: ['Software', 'Data & AI'], locations: ['new york', 'seattle'], remote: true, needsSponsor: true };
      return jobsStore.jobs.filter((j) => p.levels.includes(j.lvl) && p.roles.includes(j.cat) && (p.locations.some((l) => jobInLoc(j, l)) || (p.remote && jobInLoc(j, 'remote'))) && !(j.sp === 'no' || j.sp === 'citizen')).length;
    });
    T.check('step 3 count matches own computation', n.replace(/,/g, '') === String(exp), `${n} vs ${exp}`);
    T.check('no overflow step3', (await overflow(page)).ok);
    await shot(page, `onb-step3-${W}`);
    await page.check('#onb-examples');
    await page.click('#onb-finish');
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => store.get());
    T.check('onboarded=true', st.profile.onboarded === true);
    T.check('name trimmed', st.profile.name === 'Sam', JSON.stringify(st.profile.name));
    T.check('levels saved', JSON.stringify(st.profile.levels) === '["newgrad"]', JSON.stringify(st.profile.levels));
    T.check('roles saved', st.profile.roles.length === 2);
    T.check('locations saved', st.profile.locations.includes('new york') && st.profile.locations.includes('seattle'), JSON.stringify(st.profile.locations));
    T.check('needsSponsor saved', st.profile.needsSponsor === true);
    T.check('resume saved', st.profile.resume.startsWith('Alex Kim'));
    T.check('skills saved incl Kubernetes, excl Docker', st.profile.skills.includes('Kubernetes') && !st.profile.skills.includes('Docker'), st.profile.skills.join(','));
    T.check('examples loaded', Object.values(st.apps).filter((a) => a.example).length === 10);
    T.check('lands on today', (await page.evaluate(() => location.hash)) === '#today');
    T.check('onboarding gone', !(await page.locator('.onboard-wrap').count()));
    T.check('greeting uses name', (await page.locator('.greeting h1').innerText()).includes('Sam'));
    await page.waitForTimeout(300);
    await page.reload(); await page.waitForTimeout(800);
    const st2 = await page.evaluate(() => store.get());
    T.check('reload persists profile', st2.profile.onboarded && st2.profile.name === 'Sam' && Object.keys(st2.apps).length === 10);
    T.check('no onboarding after reload', !(await page.locator('.onboard-wrap').count()));
    // Find uses prefs
    await page.evaluate(() => (location.hash = 'find')); await page.waitForTimeout(600);
    const usingPrefs = await page.locator(W <= 520 ? '.find-bar2-sub' : '.find-count').innerText().catch(() => '');
    const prefEl = page.locator(W <= 520 ? '.find-bar2-sub #find-bar-prefs:text-is("Your preferences")' : '.find-count .find-prefs:text-is("Your preferences")');
    T.check('Find shows "Your preferences" (filtered by prefs)', (await prefEl.count()) === 1 && (await page.evaluate(() => find_isPrefs(find_getFilters(store.get()), store.get().profile))), usingPrefs.replace(/\n/g, ' | '));
    // Just browse jobs path
    T.check('console errors', errors.length === 0, errors.join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); }
  await close();
  // skip path
  const r2 = await open({ W, mock: MOCK, setup: 'fresh' });
  try {
    await r2.page.click('text=Just browse jobs'); await r2.page.waitForTimeout(300);
    const p = await r2.page.evaluate(() => store.get().profile);
    T.check('just browse jobs -> onboarded, defaults (levels unpicked = both), lands on Find', p.onboarded && p.levels.length === 0 && (await r2.page.evaluate(() => location.hash)) === '#find', JSON.stringify(p.levels));
    T.check('skip: no console errors', r2.errors.length === 0, r2.errors.join('|'));
    // back button retains state
  } catch (e) { T.check('exception skip', false, e.message.split('\n')[0]); }
  await r2.close();
  dump(__dirname + `/out/res-onboard-${W}${MOCK ? '-mock' : ''}.json`);
})();
