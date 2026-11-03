// Flow 13 (v5): Pipeline bulk selection. Table checkboxes, Shift-range, select-all, X key, Ctrl/Cmd+A,
// floating bar (move with one Undo, mark ghosted, export, delete confirm + undo), board Ctrl-click / Shift-click. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`bulk-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
const selCount = (page) => page.locator('.pl-bulk-count').innerText().then((t) => parseInt(t, 10)).catch(() => 0);
const rowIds = (page) => page.evaluate(() => [...document.querySelectorAll('.pl-table tbody tr[data-row]')].map((r) => r.dataset.row));
const stages = (page, ids) => page.evaluate((ids) => ids.map((id) => Apps.get(id)?.stage), ids);
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'pipeline' });
  try {
    await page.waitForSelector('.pl-card');
    await page.click('.seg button:has-text("Table")'); await page.waitForTimeout(250);
    let ids = await rowIds(page);
    T.check('table: 10 rows', ids.length === 10, ids.length);
    T.check('no bulk bar before selection', !(await page.locator('.pl-bulk').count()));
    // checkbox click (td cell) selects without opening the drawer
    await page.locator(`tr[data-row="${ids[0]}"] td.pl-chk-cell`).click(); await page.waitForTimeout(120);
    T.check('row checkbox selects 1', (await selCount(page)) === 1);
    T.check('checkbox click does not open drawer', !(await page.locator('.drawer').count()));
    T.check('checkbox reflects state', await page.locator(`#pl-sel-${ids[0]}`).isChecked());
    // shift-click range
    await page.locator(`tr[data-row="${ids[3]}"] td.pl-chk-cell`).click({ modifiers: ['Shift'] }); await page.waitForTimeout(120);
    T.check('shift-click selects range 0..3', (await selCount(page)) === 4, await selCount(page));
    T.check('header checkbox indeterminate when partial', await page.evaluate(() => document.getElementById('pl-sel-all').indeterminate));
    const sel = await page.locator('.pl-bulk').boundingBox();
    T.check('bulk bar within viewport', sel && sel.x >= 0 && sel.x + sel.width <= W + 1 && sel.y + sel.height <= (mobile ? 812 : 900) + 1, JSON.stringify(sel));
    T.check('no page overflow with bulk bar', (await overflow(page)).ok);
    await shot(page, `bulk-table-${W}${MOCK ? '-mock' : ''}`);
    // shift-click a row body while selecting toggles range instead of opening
    await page.locator(`tr[data-row="${ids[5]}"] td:nth-child(2)`).click({ modifiers: ['Shift'] }); await page.waitForTimeout(120);
    T.check('shift-click row body extends range (0..5)', (await selCount(page)) === 6, await selCount(page));
    T.check('shift-click row body does not open drawer', !(await page.locator('.drawer').count()));
    // select all / none
    await page.locator('#pl-sel-all').click(); await page.waitForTimeout(120);
    T.check('select-all selects all visible', (await selCount(page)) === 10);
    await page.locator('#pl-sel-all').click(); await page.waitForTimeout(120);
    T.check('select-all again clears', !(await page.locator('.pl-bulk').count()));
    // X key on focused row
    await page.locator(`tr[data-row="${ids[1]}"]`).focus(); await page.keyboard.press('x'); await page.waitForTimeout(100);
    T.check('X on focused row selects it', (await selCount(page)) === 1);
    await page.keyboard.press('x'); await page.waitForTimeout(100);
    T.check('X again deselects', !(await page.locator('.pl-bulk').count()));
    // Ctrl+A in table selects all; Escape clears
    await page.locator(`tr[data-row="${ids[1]}"]`).focus(); await page.keyboard.press('Control+a'); await page.waitForTimeout(100);
    T.check('Ctrl+A in table selects all', (await selCount(page)) === 10, await selCount(page));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    T.check('Escape clears selection', !(await page.locator('.pl-bulk').count()));
    // Filter drops hidden ones
    await page.locator(`tr[data-row="${ids[0]}"] td.pl-chk-cell`).click(); await page.locator(`tr[data-row="${ids[1]}"] td.pl-chk-cell`).click();
    const co0 = await page.evaluate((id) => Apps.get(id).company, ids[0]);
    await page.fill('#pl-filter', co0); await page.waitForTimeout(200);
    T.check('filter drops selected items that are hidden', (await selCount(page)) === 1, await selCount(page));
    await page.fill('#pl-filter', ''); await page.waitForTimeout(200);
    await page.click('.pl-bulk-x'); await page.waitForTimeout(80);
    // ---- Bulk move with single Undo ----
    const pick = ids.slice(0, 3);
    const before = await page.evaluate((ids) => ids.map((id) => JSON.parse(JSON.stringify(Apps.get(id)))), pick);
    for (const id of pick) await page.locator(`tr[data-row="${id}"] td.pl-chk-cell`).click();
    await clearToasts(page);
    await page.click('.pl-bulk-move'); await page.waitForSelector('.pl-menu');
    const mbox = await page.locator('.pl-menu').boundingBox();
    T.check('bulk move menu inside viewport', mbox.x >= 0 && mbox.x + mbox.width <= W + 1 && mbox.y >= 0, JSON.stringify(mbox));
    await page.click('.pl-menu button:has-text("Interviews")'); await page.waitForTimeout(250);
    let st = await stages(page, pick);
    T.check('bulk move: all 3 moved to interview', st.every((s) => s === 'interview'), st.join(','));
    T.check('bulk move: one toast', (await page.locator('.toast').count()) === 1, await page.locator('.toast').allInnerTexts().then((x) => x.join(' | ')));
    T.check('bulk move: toast names count', /3 applications|Moved/.test(await page.locator('.toast').first().innerText()), await page.locator('.toast').first().innerText());
    T.check('bulk move: selection cleared', !(await page.locator('.pl-bulk').count()));
    const ev = await page.evaluate((ids) => ids.map((id) => Apps.get(id).events.filter((e) => e.kind === 'stage' && e.to === 'interview').length), pick);
    T.check('bulk move: stage event logged per app (unless already there)', ev.every((n, i) => before[i].stage === 'interview' || n >= 1), ev.join(','));
    await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(250);
    const after = await page.evaluate((ids) => ids.map((id) => JSON.parse(JSON.stringify(Apps.get(id)))), pick);
    T.check('bulk Undo restores every app exactly', JSON.stringify(after) === JSON.stringify(before), after.map((a) => a.stage).join(','));
    await clearToasts(page);
    // Mark ghosted
    for (const id of pick) await page.locator(`tr[data-row="${id}"] td.pl-chk-cell`).click();
    await page.click('.pl-bulk button[aria-label="Mark ghosted"]'); await page.waitForTimeout(250);
    st = await stages(page, pick);
    T.check('mark ghosted: all ghosted', st.every((s) => s === 'ghosted'), st.join(','));
    T.check('mark ghosted toast', /ghosted/i.test(await page.locator('.toast').first().innerText().catch(() => '')));
    await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(250);
    st = await stages(page, pick);
    T.check('mark ghosted Undo', JSON.stringify(st) === JSON.stringify(before.map((a) => a.stage)), st.join(','));
    await clearToasts(page);
    // Export
    for (const id of pick) await page.locator(`tr[data-row="${id}"] td.pl-chk-cell`).click();
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.click('.pl-bulk button[aria-label="Export CSV"]'); await page.waitForTimeout(400);
    const tmsg = await page.locator('.toast').first().innerText().catch(() => '');
    if (MOCK) T.check('export (downloads cap): Saved heardback-3-applications-*.csv toast', /Saved heardback-3-applications-\d{4}-\d{2}-\d{2}\.csv/.test(tmsg), tmsg);
    else {
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
      const rows = await page.evaluate((t) => parseCSV(t), clip);
      T.check('export (no downloads): CSV copied with header + 3 rows', rows.length === 4 && rows[0][0] === 'company', `${rows.length} rows; toast=${tmsg}`);
    }
    T.check('export keeps selection', (await selCount(page)) === 3);
    await clearToasts(page);
    // Delete confirm + Undo
    await page.click('.pl-bulk button[aria-label="Delete"]'); await page.waitForTimeout(200);
    T.check('delete: confirm dialog', await page.locator('.modal:has-text("Delete 3 applications?")').isVisible());
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    T.check('delete: Escape cancels, selection kept', !(await page.locator('.modal').count()) && (await selCount(page)) === 3 && (await page.evaluate(() => Object.keys(store.get().apps).length)) === 10);
    await page.click('.pl-bulk button[aria-label="Delete"]'); await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("Delete 3 applications")'); await page.waitForTimeout(250);
    T.check('delete: 3 removed', (await page.evaluate(() => Object.keys(store.get().apps).length)) === 7);
    T.check('delete: bar gone', !(await page.locator('.pl-bulk').count()));
    await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(250);
    T.check('delete: Undo restores all 3', (await page.evaluate(() => Object.keys(store.get().apps).length)) === 10);
    await clearToasts(page);
    // switching view clears selection
    await page.locator(`tr[data-row="${ids[0]}"] td.pl-chk-cell`).click();
    await page.click('.seg button:has-text("Board")'); await page.waitForTimeout(250);
    T.check('switching to board clears selection', !(await page.locator('.pl-bulk').count()));
    // ---- Board ----
    const cards = await page.evaluate(() => [...document.querySelectorAll('.pl-card[data-card]')].map((c) => c.dataset.card));
    await page.locator(`[data-card="${cards[0]}"] .pl-card-title`).click({ modifiers: ['Control'] }); await page.waitForTimeout(150);
    T.check('board: Ctrl-click selects card', (await selCount(page)) === 1);
    T.check('board: Ctrl-click does not open drawer', !(await page.locator('.drawer').count()));
    await page.locator(`[data-card="${cards[0]}"] .pl-card-title`).click({ modifiers: ['Meta'] }); await page.waitForTimeout(150);
    T.check('board: Cmd(Meta)-click toggles off', !(await page.locator('.pl-bulk').count()));
    await page.locator(`[data-card="${cards[0]}"] .pl-card-title`).click({ modifiers: ['Control'] });
    await page.locator(`[data-card="${cards[3]}"] .pl-card-title`).click({ modifiers: ['Shift'] }); await page.waitForTimeout(150);
    T.check('board: Shift-click extends range in on-screen order', (await selCount(page)) === 4, await selCount(page));
    T.check('board: selected cards marked', (await page.locator('.pl-card.sel').count()) === 4);
    await shot(page, `bulk-board-${W}${MOCK ? '-mock' : ''}`);
    // plain click while selecting opens drawer (desktop) — note behaviour
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    T.check('board: Escape clears', !(await page.locator('.pl-bulk').count()));
    await page.locator(`[data-card="${cards[1]}"]`).focus(); await page.keyboard.press('x'); await page.waitForTimeout(100);
    T.check('board: X selects focused card', (await selCount(page)) === 1);
    T.check('board: card aria-label says Selected', /Selected\./.test(await page.locator(`[data-card="${cards[1]}"]`).getAttribute('aria-label')));
    // Escape with drawer open closes drawer only, keeps selection
    await page.locator(`[data-card="${cards[2]}"] .pl-card-title`).click(); await page.waitForTimeout(250);
    const drawerOpen = await page.locator('.drawer').count();
    if (drawerOpen) {
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      T.check('Escape with drawer open closes drawer, keeps selection', !(await page.locator('.drawer').count()) && (await selCount(page)) === 1, await selCount(page));
    } else T.note('plain click while selecting', 'did not open drawer');
    // bulk move on board to Offer (celebrate) single undo
    await page.locator(`[data-card="${cards[0]}"] .pl-card-title`).click({ modifiers: ['Control'] }); await page.waitForTimeout(80);
    await clearToasts(page);
    const two = await page.evaluate(() => [...document.querySelectorAll('.pl-card.sel')].map((c) => c.dataset.card));
    const b2 = await stages(page, two);
    await page.click('.pl-bulk-move'); await page.click('.pl-menu button:has-text("Rejected")'); await page.waitForTimeout(300);
    T.check('board: bulk move to Rejected', (await stages(page, two)).every((s) => s === 'rejected'));
    T.check('board: focus lands on a card after bulk move (not body)', await page.evaluate(() => document.activeElement !== document.body), await page.evaluate(() => document.activeElement?.className));
    await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(250);
    T.check('board: Undo restores', JSON.stringify(await stages(page, two)) === JSON.stringify(b2));
    // Already-in-stage message
    await clearToasts(page);
    const appl = await page.evaluate(() => Apps.list().filter((a) => a.stage === 'applied').map((a) => a.id).slice(0, 2));
    for (const id of appl) await page.locator(`[data-card="${id}"] .pl-card-title`).click({ modifiers: ['Control'] });
    await page.click('.pl-bulk-move'); await page.click('.pl-menu button:has-text("Applied")'); await page.waitForTimeout(200);
    T.check('moving to same stage says "Already in Applied"', /Already in Applied/.test(await page.locator('.toast').first().innerText().catch(() => '')));
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `bulk-exc-${W}`); }
  await close();
  dump(`res-bulk-${W}${MOCK ? '-mock' : ''}.json`);
})();
