// Flow 10: palette + shortcuts + overlay Escape order. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`palette-${W}${MOCK ? '-mock' : ''}`);
const state = (page) => page.evaluate(() => ({ palette: !!ui.state.palette, modal: ui.state.modal?.__kind || ui.state.modal?.kind || null, drawer: ui.state.drawer?.kind || null, hash: location.hash }));
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'today' });
  try {
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    T.check('Ctrl+K opens palette', (await state(page)).palette);
    T.check('palette input focused', await page.evaluate(() => document.activeElement?.id === 'palette-q'));
    T.check('no overflow palette', (await overflow(page)).ok);
    await shot(page, `palette-${W}`);
    await page.keyboard.type('north');
    await page.waitForTimeout(200);
    const groups = await page.locator('.palette-group').allInnerTexts();
    T.check('palette shows Your applications + Jobs/Companies groups', groups.includes('Your applications'), groups.join(','));
    // arrow keys
    const selText = () => page.locator('.palette-item[aria-selected="true"]').innerText();
    const first = await selText();
    await page.keyboard.press('ArrowDown'); const second = await selText();
    T.check('ArrowDown moves selection', first !== second);
    await page.keyboard.press('ArrowUp');
    T.check('ArrowUp moves back', (await selText()) === first);
    // Enter opens app
    const appIdx = await page.evaluate(() => [...document.querySelectorAll('.palette-item')].findIndex((b) => /Northwind Labs ·/.test(b.textContent)));
    for (let i = 0; i < appIdx; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    let s = await state(page);
    T.check('Enter on app opens app drawer', !s.palette && s.drawer === 'app', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // job search
    await page.keyboard.press('Control+k'); await page.waitForTimeout(120); await page.keyboard.type('google'); await page.waitForTimeout(250);
    const jobIdx = await page.evaluate(() => { const items = [...document.querySelectorAll('.palette-list > *')]; let g = null, i = -1; for (const el of items) { if (el.classList.contains('palette-group')) g = el.textContent; else { i++; if (g === 'Jobs') return i; } } return -1; });
    T.check('palette finds jobs for "google"', jobIdx >= 0);
    const coIdx = await page.evaluate(() => { const items = [...document.querySelectorAll('.palette-list > *')]; let g = null, i = -1; for (const el of items) { if (el.classList.contains('palette-group')) g = el.textContent; else { i++; if (g === 'Companies') return i; } } return -1; });
    T.check('palette finds companies for "google"', coIdx >= 0);
    for (let i = 0; i < jobIdx; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('Enter on job opens job drawer', (await state(page)).drawer === 'job');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(120); await page.keyboard.type('google'); await page.waitForTimeout(250);
    await page.locator('.palette-item').nth(coIdx).click(); await page.waitForTimeout(300);
    T.check('click company opens company drawer', (await state(page)).drawer === 'company');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // action: "settings" command
    await page.keyboard.press('Control+k'); await page.waitForTimeout(120); await page.keyboard.type('settings'); await page.waitForTimeout(150);
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('palette "Settings" navigates', (await state(page)).hash === '#prefs');
    // palette no results
    await page.keyboard.press('Control+k'); await page.waitForTimeout(120); await page.keyboard.type('zzqqxx'); await page.waitForTimeout(150);
    T.check('no-match message', await page.locator('.palette .empty').isVisible());
    await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    T.check('Enter on empty results does nothing', (await state(page)).palette);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    T.check('Escape closes palette', !(await state(page)).palette);
    T.check('focus returns from palette', await page.evaluate(() => document.activeElement !== document.body), await page.evaluate(() => document.activeElement?.tagName));
    // shortcuts
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('n'); await page.waitForTimeout(200);
    T.check('n opens Add modal', (await state(page)).modal === 'add');
    T.check('Add modal focuses company field', await page.evaluate(() => document.activeElement?.id === 'pl-add-co'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.keyboard.press('e'); await page.waitForTimeout(200);
    T.check('e opens Paste modal', (await state(page)).modal === 'paste');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.keyboard.press('/'); await page.waitForTimeout(400);
    T.check('/ goes to find and focuses search', (await state(page)).hash === '#find' && await page.evaluate(() => document.activeElement?.id === 'find-q'));
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('g'); await page.keyboard.press('p'); await page.waitForTimeout(300);
    T.check('g then p -> pipeline', (await state(page)).hash === '#pipeline');
    await page.keyboard.press('g'); await page.keyboard.press('i'); await page.waitForTimeout(300);
    T.check('g then i -> prep', (await state(page)).hash === '#prep');
    await page.keyboard.press('g'); await page.keyboard.press('s'); await page.waitForTimeout(300);
    T.check('g then s -> stats', (await state(page)).hash === '#stats');
    await page.keyboard.press('g'); await page.keyboard.press('f'); await page.waitForTimeout(400);
    T.check('g then f -> find', (await state(page)).hash === '#find');
    // on Find, "g then k" must not move selection; "g then t" goes today
    await page.keyboard.press('g'); await page.keyboard.press('t'); await page.waitForTimeout(300);
    T.check('g then t from find -> today', (await state(page)).hash === '#today');
    await page.keyboard.press('?'); await page.waitForTimeout(200);
    T.check('? opens shortcuts', (await state(page)).modal === 'shortcuts');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // Shift+N / caps
    await page.keyboard.press('Shift+N'); await page.waitForTimeout(150);
    T.note('Shift+N (caps) opens add?', JSON.stringify(await state(page)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // Escape ordering: drawer + modal + palette
    await page.evaluate(() => { const a = Object.values(store.get().apps)[0]; openApp(a.id); });
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    s = await state(page);
    T.check('Ctrl+K over open drawer opens palette', s.palette && s.drawer === 'app');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    s = await state(page);
    T.check('Escape closes palette only (drawer stays)', !s.palette && s.drawer === 'app', JSON.stringify(s));
    // modal over drawer, then palette over modal
    await page.evaluate(() => openModal('shortcuts')); await page.waitForTimeout(150);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    s = await state(page);
    T.note('Ctrl+K while modal open', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    s = await state(page);
    T.check('Escape #1 closes only topmost (palette)', !s.palette && s.modal === 'shortcuts' && s.drawer === 'app', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    s = await state(page);
    T.check('Escape #2 closes modal, keeps drawer', !s.modal && s.drawer === 'app', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    s = await state(page);
    T.check('Escape #3 closes drawer', !s.drawer, JSON.stringify(s));
    // Snooze menu Escape on Today should close only menu
    await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(400);
    // keyboard shortcut while drawer open: n should not open add (documented); '?' does
    // mobile bottom nav "More"
    if (W < 700) {
      await page.click('.bottom-nav button:has-text("More")'); await page.waitForTimeout(200);
      T.check('More opens modal', (await state(page)).modal === 'more');
      await page.click('.modal button:has-text("Insights")'); await page.waitForTimeout(300);
      T.check('More -> Insights navigates', (await state(page)).hash === '#stats');
      const btns = await page.locator('.bottom-nav button').evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
      T.check('bottom-nav tap targets >= 44px', btns.every((h) => h >= 44), btns.join(','));
    }
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `palette-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-palette-${W}${MOCK ? '-mock' : ''}.json`);
})();
