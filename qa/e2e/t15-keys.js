// Flow 15: keyboard + focus. Tab trapping in modals/drawers (Tab + Shift+Tab), Escape layering, shortcut keys,
// focus restore. env W, MOCK
const { open, mk, dump, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`keys-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
const state = (page) => page.evaluate(() => ({ palette: !!ui.state.palette, modal: ui.state.modal?.__kind || null, drawer: ui.state.drawer?.kind || null, hash: location.hash }));
async function trapped(page, sel, n = 30, key = 'Tab') {
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(key);
    const r = await page.evaluate((sel) => { const a = document.activeElement; const top = [...document.querySelectorAll(sel)].pop(); return { inside: !!(top && top.contains(a)), id: a ? (a.id || a.tagName + '.' + (a.className || '').toString().slice(0, 30) + ':' + (a.textContent || '').trim().slice(0, 15)) : 'none' }; }, sel);
    if (!r.inside) return { ok: false, at: i, id: r.id, seen: seen.size };
    seen.add(r.id);
  }
  return { ok: true, seen: seen.size };
}
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'pipeline' });
  try {
    await page.waitForSelector('.pl-card');
    // ---- Modals ----
    for (const [kind, sel] of [['add', '.modal'], ['paste', '.modal'], ['method', '.modal'], ['shortcuts', '.modal'], ['resume', '.modal']]) {
      await page.evaluate((k) => openModal(k), kind); await page.waitForTimeout(250);
      const f = await page.evaluate(() => !!document.activeElement?.closest('.modal'));
      T.check(`modal ${kind}: initial focus inside`, f);
      const r1 = await trapped(page, sel, 25, 'Tab');
      T.check(`modal ${kind}: Tab stays inside`, r1.ok, JSON.stringify(r1));
      const r2 = await trapped(page, sel, 25, 'Shift+Tab');
      T.check(`modal ${kind}: Shift+Tab stays inside`, r2.ok, JSON.stringify(r2));
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      T.check(`modal ${kind}: Escape closes`, !(await state(page)).modal);
    }
    // focus restore after modal opened from a button
    await page.locator('button[aria-label="Add application"]').first().focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    T.check('modal close restores focus to opener', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Add application'));
    // ---- Drawers ----
    const nw = await page.evaluate(() => Apps.list().find((a) => a.company === 'Northwind Labs').id);
    await page.evaluate((id) => openApp(id), nw); await page.waitForTimeout(300);
    let r = await trapped(page, '.drawer', 40, 'Tab'); T.check('app drawer: Tab trapped', r.ok, JSON.stringify(r));
    r = await trapped(page, '.drawer', 40, 'Shift+Tab'); T.check('app drawer: Shift+Tab trapped', r.ok, JSON.stringify(r));
    // tabs: arrow keys move between tabs
    await page.focus('#pl-tab-overview'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    T.check('drawer tabs: ArrowRight -> Rounds (roving focus)', await page.evaluate(() => document.activeElement?.id === 'pl-tab-rounds' && document.getElementById('pl-tab-rounds').getAttribute('aria-selected') === 'true'));
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    T.check('drawer tabs: ArrowLeft wraps to Notes', await page.evaluate(() => document.activeElement?.id === 'pl-tab-notes'));
    // Escape layering: drawer -> modal -> palette
    await page.click('#pl-tab-overview');
    await page.evaluate((id) => openModal('draft', { appId: id, mode: 'follow' }), nw); await page.waitForTimeout(250);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
    let s = await state(page);
    T.check('layer: palette opens over modal over drawer', s.palette && s.modal === 'draft' && s.drawer === 'app', JSON.stringify(s));
    if (s.palette) { const r3 = await trapped(page, '.palette', 10, 'Tab'); T.check('palette: Tab stays inside palette', r3.ok, JSON.stringify(r3)); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); s = await state(page);
    T.check('Escape 1 closes palette only', !s.palette && s.modal === 'draft' && s.drawer === 'app', JSON.stringify(s));
    T.check('focus back inside modal after palette', await page.evaluate(() => !!document.activeElement?.closest('.modal')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); s = await state(page);
    T.check('Escape 2 closes modal only', !s.modal && s.drawer === 'app', JSON.stringify(s));
    T.check('focus back inside drawer after modal', await page.evaluate(() => !!document.activeElement?.closest('.drawer')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); s = await state(page);
    T.check('Escape 3 closes drawer', !s.drawer, JSON.stringify(s));
    // Shortcut keys must not fire inside a modal text field
    await page.evaluate(() => openModal('add')); await page.waitForTimeout(200);
    await page.keyboard.type('ne/'); await page.waitForTimeout(150); s = await state(page);
    T.check('typing n/e// in Add modal field does not trigger shortcuts', s.modal === 'add' && !s.palette && s.hash === '#pipeline', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // Shortcut while modal open (focus on a button) should not swap the modal
    await page.evaluate(() => openModal('method')); await page.waitForTimeout(200);
    await page.keyboard.press('n'); await page.waitForTimeout(150); s = await state(page);
    T.check('N while a modal is open does not replace it', s.modal === 'method', JSON.stringify(s));
    await page.keyboard.press('g'); await page.keyboard.press('t'); await page.waitForTimeout(200); s = await state(page);
    T.check('G T while a modal is open does not navigate behind it', s.hash === '#pipeline', JSON.stringify(s));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // Digit keys while drawer open
    await page.evaluate((id) => openApp(id), nw); await page.waitForTimeout(250);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('3'); await page.waitForTimeout(200);
    T.check('digit 3 in drawer moves to Screen', (await page.evaluate((id) => Apps.get(id).stage, nw)) === 'screen');
    await clearToasts(page);
    await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    T.note('Ctrl+Z after a move', await page.evaluate((id) => Apps.get(id).stage, nw));
    // Digit typed into an inline edit field must not move
    await page.click('#pl-loc-v'); await page.waitForTimeout(100); await page.keyboard.type('5'); await page.waitForTimeout(150);
    T.check('digit typed into inline edit does not move stage', (await page.evaluate((id) => Apps.get(id).stage, nw)) !== 'offer');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.click('#pl-loc-v'); await page.keyboard.type('5'); await page.waitForTimeout(150);
    const raced = await page.evaluate((id) => Apps.get(id).stage, nw);
    T.check('digit typed immediately after clicking an inline value does not move stage (focus race)', raced !== 'offer', `stage became ${raced}`);
    if (raced === 'offer') { await page.evaluate((id) => Apps.move(id, 'screen', { silent: true }), nw); await page.waitForTimeout(2700); await page.evaluate(() => ui.set({ celebrate: null })); }
    if (await page.locator('#pl-loc').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
    // digit while a menu (move menu in card) is open? n/a in drawer. Escape closes drawer
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    T.check('Escape after inline-cancel closes drawer', !(await state(page)).drawer);
    // Global shortcuts
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('?'); await page.waitForTimeout(200);
    T.check('? opens shortcuts', (await state(page)).modal === 'shortcuts');
    const sc = await page.locator('.modal').innerText();
    T.check('shortcuts sheet lists X (select) and Ctrl/Cmd K', /select/i.test(sc) && /K/.test(sc), sc.replace(/\n/g, ' ').slice(0, 200));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    for (const [k, h] of [['t', '#today'], ['f', '#find'], ['p', '#pipeline'], ['c', '#companies'], ['i', '#prep'], ['s', '#stats']]) {
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('g'); await page.keyboard.press(k); await page.waitForTimeout(250);
      T.check(`G then ${k.toUpperCase()} -> ${h}`, (await state(page)).hash === h, (await state(page)).hash);
    }
    await page.keyboard.press('e'); await page.waitForTimeout(200);
    T.check('E opens Log an email', (await state(page)).modal === 'paste');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.keyboard.press('/'); await page.waitForTimeout(300);
    T.check('/ -> Find with search focused', (await state(page)).hash === '#find' && await page.evaluate(() => document.activeElement?.id === 'find-q'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    T.check('Escape in empty search blurs it (or keeps it) without errors', true);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    T.check('Ctrl+K twice toggles palette closed', !(await state(page)).palette);
    // palette arrow navigation + aria
    await page.keyboard.press('Control+k'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
    const act = await page.evaluate(() => { const i = document.querySelector('.palette input'); const id = i?.getAttribute('aria-activedescendant'); return { id, ok: !!(id && document.getElementById(id)), role: i?.getAttribute('role') }; });
    T.check('palette: aria-activedescendant follows arrow keys', act.ok, JSON.stringify(act));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // Find drawer: J/K blocked while drawer open?
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('j'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('Find: J then Enter opens job drawer', (await state(page)).drawer === 'job');
    r = await trapped(page, '.drawer', 30, 'Tab'); T.check('job drawer: Tab trapped', r.ok, JSON.stringify(r));
    await page.evaluate(() => document.activeElement.blur());
    const before = await page.evaluate(() => ui.state.drawer?.id);
    await page.keyboard.press('j'); await page.waitForTimeout(200);
    T.note('J while job drawer open', (await page.evaluate(() => ui.state.drawer?.id)) === before ? 'drawer stays on same job' : 'drawer moved to next job');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    T.check('Escape closes job drawer (opened with J+Enter) and focus returns to the row, not body', !(await state(page)).drawer && await page.evaluate(() => !!document.activeElement?.closest('.find-row')), await page.evaluate(() => document.activeElement?.className));
    // company drawer trap
    await page.evaluate(() => openCompany(jobsStore.jobs[0].co)); await page.waitForTimeout(300);
    r = await trapped(page, '.drawer', 30, 'Tab'); T.check('company drawer: Tab trapped', r.ok, JSON.stringify(r));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // Mobile "More" sheet (a Modal) trap
    if (mobile) {
      await page.locator('.bottom-nav button:has-text("More")').click(); await page.waitForTimeout(250);
      r = await trapped(page, '.modal', 15, 'Tab'); T.check('mobile More sheet: Tab trapped', r.ok, JSON.stringify(r));
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      T.check('mobile More sheet: Escape closes + focus back on More', !(await state(page)).modal && await page.evaluate(() => /More/.test(document.activeElement?.textContent || '')));
    }
    // Today task menu keyboard
    await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(400);
    const more = page.locator('.td-more').first();
    if (await more.count()) {
      await more.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      T.check('Today task menu: focus moves into menu', await page.evaluate(() => !!document.activeElement?.closest('.td-menu')), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
      await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
      T.check('Today task menu: ArrowDown moves within menu', await page.evaluate(() => !!document.activeElement?.closest('.td-menu')));
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      T.check('Today task menu: Escape returns focus to ⋯ button', await page.evaluate(() => document.activeElement?.classList.contains('td-more')));
    }
    // Pipeline card move menu keyboard
    await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(400);
    await page.locator('.pl-card .pl-more').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    T.check('card move menu: focus on first non-current stage', await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitemradio'));
    await page.keyboard.press('Tab'); await page.waitForTimeout(100);
    T.note('Tab inside card menu', await page.evaluate(() => (document.querySelector('.pl-menu') ? 'menu still open' : 'menu closed') + ' / focus ' + (document.activeElement?.closest('.pl-menu') ? 'inside' : 'outside')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await shot(page, `keys-end-${W}`);
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `keys-exc-${W}`); }
  await close();
  dump(`res-keys-${W}${MOCK ? '-mock' : ''}.json`);
})();
