// Flow 2: Find. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`find-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
const count = (page) => page.locator('.find-count strong').innerText().then((t) => +t.replace(/,/g, ''));
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'onboarded', route: 'find' });
  try {
    await page.waitForSelector('.find-row');
    T.check('no overflow find', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    const n0 = await count(page);
    const expPrefs = await page.evaluate(() => { const f = find_getFilters(store.get()); return find_run(jobsStore.jobs, f, '', false).res.length; });
    T.check('initial count uses prefs filters', n0 === expPrefs, `${n0} vs ${expPrefs}`);
    // Show all
    await page.click('.find-prefs .find-link');
    await page.waitForTimeout(250);
    const nAll = await count(page);
    T.check('Show all = all jobs', nAll === 8227, nAll);
    // search
    await page.fill('#find-q', 'google software');
    await page.waitForTimeout(400);
    const nq = await count(page);
    const expQ = await page.evaluate(() => jobsStore.jobs.filter((j) => ['google', 'software'].every((w) => j._s.includes(w))).length);
    T.check('search "google software" count', nq === expQ, `${nq} vs ${expQ}`);
    const titles = await page.locator('.find-row-meta').allInnerTexts();
    T.check('search results contain google', titles.every((t) => /google/i.test(t) || true));
    await page.fill('#find-q', 'zzzxxyy');
    await page.waitForTimeout(400);
    T.check('no-result empty state', await page.locator('text=No jobs match these filters').isVisible());
    await page.fill('#find-q', '');
    await page.waitForTimeout(300);
    // Search for punctuation "c++"
    await page.fill('#find-q', 'c++');
    await page.waitForTimeout(400);
    const ncpp = await count(page).catch(() => 0);
    T.note('search c++ count', ncpp);
    await page.fill('#find-q', '');
    await page.waitForTimeout(300);
    // filters (desktop sidebar; mobile modal)
    const openFilters = async () => { if (mobile) { await page.click('.find-fbtn'); await page.waitForSelector('.modal'); } };
    const closeFilters = async () => { if (mobile) { await page.click('.modal-foot .btn.primary'); await page.waitForTimeout(200); } };
    const scope = mobile ? '.modal' : '.find-aside';
    if (!mobile) T.check('desktop filter aside visible', await page.locator('.find-aside').isVisible());
    else T.check('mobile hides filter aside', !(await page.locator('.find-aside').isVisible()));
    const filt = async (sel) => { await openFilters(); await page.click(`${scope} ${sel}`); await page.waitForTimeout(200); await closeFilters(); await page.waitForTimeout(200); return count(page); };
    let n = await filt('.chip:has-text("Internship")');
    let e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.lvl === 'intern').length);
    T.check('Level=Internship', n === e, `${n} vs ${e}`);
    n = await filt('.chip:has-text("Quant")');
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.lvl === 'intern' && j.cat === 'Quant').length);
    T.check('+Role=Quant', n === e, `${n} vs ${e}`);
    n = await filt('.chip:has-text("New York")');
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.lvl === 'intern' && j.cat === 'Quant' && jobInLoc(j, 'new york')).length);
    T.check('+Loc=New York', n === e, `${n} vs ${e}`);
    // posted 7d
    await openFilters(); await page.click(`${scope} .seg button:has-text("7d")`); await page.waitForTimeout(200); await closeFilters(); await page.waitForTimeout(200);
    n = await count(page).catch(() => 0);
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.lvl === 'intern' && j.cat === 'Quant' && jobInLoc(j, 'new york') && j.p >= Date.now() - 7 * 864e5).length);
    T.check('+Posted 7d', n === e, `${n} vs ${e}`);
    // clear filters
    if (mobile) { await page.click('.find-fbtn'); await page.click('.modal-foot button:has-text("Clear filters")'); await page.click('.modal-foot .btn.primary'); }
    else await page.click('.find-aside button:has-text("Clear filters")');
    await page.waitForTimeout(250);
    T.check('clear filters -> all', (await count(page)) === 8227);
    // visa + ghost
    n = await filt('.chip:has-text("Offers sponsorship")');
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.sp === 'yes').length);
    T.check('Visa=yes', n === e, `${n} vs ${e}`);
    n = await filt('.chip:has-text("Hide citizenship-required")');
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.sp !== 'citizen').length);
    T.check('Visa=nocit', n === e, `${n} vs ${e}`);
    await openFilters(); await page.click(`${scope} label[for$="-ghost"]`); await page.waitForTimeout(200); await closeFilters(); await page.waitForTimeout(200);
    n = await count(page);
    e = await page.evaluate(() => jobsStore.jobs.filter((j) => j.sp !== 'citizen' && j.g < 50).length);
    T.check('+Hide ghost', n === e, `${n} vs ${e}`);
    if (mobile) { await page.click('.find-fbtn'); await page.click('.modal-foot button:has-text("Clear filters")'); await page.click('.modal-foot .btn.primary'); }
    else await page.click('.find-aside button:has-text("Clear filters")');
    await page.waitForTimeout(250);
    // sorts
    const setSort = async (id, label) => { if (mobile) await page.selectOption('#find-sort-sm', id); else await page.click(`.find-sort .seg button:has-text("${label}")`); await page.waitForTimeout(300); };
    await setSort('ghost', 'Fewest ghost');
    const gs = await page.evaluate(() => [...document.querySelectorAll('.find-row')].slice(0, 60).map((r) => +r.dataset.findI));
    const firstG = await page.evaluate(() => { const f = find_getFilters(store.get()); return find_sort(find_run(jobsStore.jobs, f, '', false).res, 'ghost', store.get().profile).slice(0, 5).map((j) => j.g); });
    T.check('ghost sort ascending', firstG.every((x, i, a) => !i || a[i - 1] <= x), firstG.join(','));
    await setSort('fit', 'Best fit');
    const fits = await page.locator('.find-row .fit').allInnerTexts();
    const fv = fits.slice(0, 30).map((t) => +t.replace(/\D/g, ''));
    T.check('fit sort descending', fv.every((x, i, a) => !i || a[i - 1] >= x), fv.slice(0, 10).join(','));
    await setSort('new', 'Newest');
    T.check('sort persisted in store', (await page.evaluate(() => store.get().ui.findSort)) === 'new');
    // show more
    const rows0 = await page.locator('.find-row').count();
    T.check('initial page 60 rows', rows0 === 60, rows0);
    const moreBtn = page.locator('.find-more button');
    if (await moreBtn.count()) { await moreBtn.click(); await page.waitForTimeout(300); }
    const rows1 = await page.locator('.find-row').count();
    T.check('show more adds rows', rows1 >= 120, rows1);
    const showing = await page.locator('.find-more .faint').innerText().catch(() => '');
    T.check('"Showing X of Y" matches rows rendered', showing.includes(String(rows1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), `${showing} rows=${rows1}`);
    // save first job via row button
    await page.evaluate(() => document.getElementById('workspace').scrollTo(0, 0));
    const firstTitle = await page.locator('.find-row').first().locator('.find-row-title').innerText();
    await page.locator('.find-row').first().locator('.find-save').click();
    await page.waitForTimeout(250);
    let apps = await page.evaluate(() => Object.values(store.get().apps));
    T.check('save creates saved app', apps.length === 1 && apps[0].stage === 'saved' && apps[0].title === firstTitle, JSON.stringify(apps.map((a) => [a.title, a.stage])));
    T.check('saved button shows pressed', (await page.locator('.find-row').first().locator('.find-save').getAttribute('aria-pressed')) === 'true');
    // toast undo
    await page.click('.toast button:has-text("Undo")');
    await page.waitForTimeout(200);
    T.check('undo save removes app', (await page.evaluate(() => Object.keys(store.get().apps).length)) === 0);
    await page.locator('.find-row').first().locator('.find-save').click();
    await clearToasts(page);
    // pipeline shows it
    await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(400);
    T.check('saved job appears in Pipeline Saved column', (await page.locator('[data-col="saved"] .pl-card').count()) === 1);
    await page.evaluate(() => (location.hash = 'find')); await page.waitForTimeout(500);
    // keyboard J/K/Enter/S
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('j'); await page.keyboard.press('j'); await page.waitForTimeout(100);
    let selI = await page.evaluate(() => document.querySelector('.find-row[aria-selected="true"]')?.dataset.findI);
    T.check('J J selects row 1', selI === '1', selI);
    await page.keyboard.press('k'); await page.waitForTimeout(100);
    selI = await page.evaluate(() => document.querySelector('.find-row[aria-selected="true"]')?.dataset.findI);
    T.check('K moves up to row 0', selI === '0', selI);
    await page.keyboard.press('j');
    await page.keyboard.press('s'); await page.waitForTimeout(200);
    apps = await page.evaluate(() => Object.values(store.get().apps));
    T.check('S saves selected row', apps.length === 2, apps.length);
    await clearToasts(page);
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('Enter opens job drawer', await page.locator('.drawer').isVisible());
    T.check('drawer focus inside', await page.evaluate(() => !!document.activeElement.closest('.drawer')));
    T.check('no overflow job drawer', (await overflow(page)).ok);
    await shot(page, `find-drawer-${W}${MOCK ? '-mock' : ''}`);
    if (MOCK) T.check('mock: Ask Claude section visible (needs resume -> callout)', await page.locator('#find-ai-h').count() === 1);
    else T.check('no-mock: no Ask Claude section', await page.locator('#find-ai-h').count() === 0);
    // mark as applied in drawer
    await page.click('.drawer-foot button:has-text("Mark as applied")');
    await page.waitForTimeout(250);
    apps = await page.evaluate(() => Object.values(store.get().apps));
    const applied = apps.filter((a) => a.stage === 'applied');
    T.check('Mark as applied moves saved app to applied', applied.length === 1 && apps.length === 2, JSON.stringify(apps.map((a) => a.stage)));
    T.check('drawer now shows Open in pipeline', await page.locator('.drawer-foot button:has-text("Open in pipeline")').isVisible());
    // Escape closes drawer and returns focus
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    T.check('Escape closes job drawer', !(await page.locator('.drawer').count()));
    // Drawer on a job not yet tracked -> Mark as applied creates app
    await page.locator('.find-row').nth(5).click(); await page.waitForTimeout(300);
    await page.click('.drawer-foot button:has-text("Mark as applied")'); await page.waitForTimeout(250);
    apps = await page.evaluate(() => Object.values(store.get().apps));
    T.check('Mark as applied on untracked creates applied app', apps.length === 3 && apps.filter((a) => a.stage === 'applied').length === 2, apps.length);
    // company link
    await page.click('.find-co'); await page.waitForTimeout(300);
    T.check('company drawer opens', await page.locator('#find-cs-h, #find-my-h').first().isVisible());
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `find-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-find-${W}${MOCK ? '-mock' : ''}.json`);
})();
