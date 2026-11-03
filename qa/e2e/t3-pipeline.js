// Flow 3 + 4: Pipeline board/table + application drawer. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`pipeline-${W}${MOCK ? '-mock' : ''}`);
const mobile = W < 700;
const stageOf = (page, c) => page.evaluate((c) => Object.values(store.get().apps).find((a) => a.company === c)?.stage, c);
async function drag(page, src, dst) {
  const a = await page.locator(src).first().boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 10, { steps: 4 }); await page.waitForTimeout(150);
  const b = await page.locator(dst).first().boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40), { steps: 8 }); await page.waitForTimeout(100);
  await page.mouse.up(); await page.waitForTimeout(200);
}
const appOf = (page, c) => page.evaluate((c) => Object.values(store.get().apps).find((a) => a.company === c), c);
(async () => {
  const { page, errors, close } = await open({ W, mock: MOCK, setup: 'examples', route: 'pipeline' });
  try {
    await page.waitForSelector('.pl-card');
    T.check('no overflow board (page-level)', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `pl-board-${W}`);
    const cards = await page.locator('.pl-card').count();
    T.check('board shows 8 visible cards (rejected/ghosted collapsed)', cards === 8, cards);
    // drag & drop
    if (!mobile) {
      await drag(page, '.pl-card:has-text("Verity Labs")', '[data-col="screen"]');
      await page.waitForTimeout(300);
      T.check('DnD Verity -> screen', (await stageOf(page, 'Verity Labs')) === 'screen');
      const v = await appOf(page, 'Verity Labs');
      T.check('DnD sets lastReplyAt', !!v.lastReplyAt);
      // undo in toast
      await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(200);
      const v2 = await appOf(page, 'Verity Labs');
      T.check('Undo restores stage', v2.stage === 'applied', v2.stage);
      T.check('Undo removes stage event', v2.events.length === v.events.length - 1, `${v2.events.length} vs ${v.events.length}`);
      T.check('Undo restores lastReplyAt=null', v2.lastReplyAt == null, v2.lastReplyAt);
      // drop on collapsed rejected rail
      await drag(page, '.pl-card:has-text("Verity Labs")', '.pl-drop[data-col="rejected"]');
      await page.waitForTimeout(300);
      T.check('DnD to Closed rail -> Rejected target', (await stageOf(page, 'Verity Labs')) === 'rejected');
      await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(200);
      await clearToasts(page);
    }
    // keyboard arrows
    await page.locator('.pl-card:has-text("Lumen Robotics")').focus();
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
    T.check('ArrowRight applied->screen', (await stageOf(page, 'Lumen Robotics')) === 'screen');
    T.check('focus stays on moved card', await page.evaluate(() => document.activeElement?.textContent.includes('Lumen')));
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
    T.check('ArrowLeft screen->applied', (await stageOf(page, 'Lumen Robotics')) === 'applied');
    // ArrowRight from offer goes where?
    await page.locator('.pl-card:has-text("Harbor & Finch")').focus();
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
    const hf = await stageOf(page, 'Harbor & Finch');
    T.check('ArrowRight on Offer card should not silently reject', hf === 'offer', `became ${hf}`);
    if (hf !== 'offer') { await page.evaluate(() => { const a = Object.values(store.get().apps).find((a) => a.company === 'Harbor & Finch'); Apps.move(a.id, 'offer', { silent: true }); }); }
    await clearToasts(page);
    await page.waitForTimeout(2700); // celebrate overlay
    // Move menu
    await page.locator('.pl-card:has-text("Quarry Analytics") .pl-more').click();
    await page.waitForSelector('.pl-menu');
    const menuBox = await page.locator('.pl-menu').boundingBox();
    T.check('move menu inside viewport', menuBox.x >= 0 && menuBox.x + menuBox.width <= W && menuBox.y >= 0, JSON.stringify(menuBox));
    await page.click('.pl-menu button:has-text("Interviews")'); await page.waitForTimeout(250);
    T.check('Move menu -> Interviews', (await stageOf(page, 'Quarry Analytics')) === 'interview');
    await clearToasts(page);
    // menu Escape closes only the menu
    await page.locator('.pl-card:has-text("Quarry Analytics") .pl-more').click();
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    T.check('Escape closes move menu', !(await page.locator('.pl-menu').count()));
    // filter box
    await page.fill('#pl-filter', 'north');
    await page.waitForTimeout(150);
    T.check('filter "north" -> 1 card', (await page.locator('.pl-card').count()) === 1);
    await page.fill('#pl-filter', 'Seattle'); await page.waitForTimeout(150);
    T.check('filter matches location', (await page.locator('.pl-card').count()) === 1);
    await page.fill('#pl-filter', 'qqqq'); await page.waitForTimeout(150);
    T.check('filter no-match callout', await page.locator('text=No applications match').isVisible());
    await page.fill('#pl-filter', '');
    // table view
    await page.click('.seg button:has-text("Table")'); await page.waitForTimeout(250);
    T.check('table view rows', (await page.locator('.pl-table tbody tr').count()) === 10);
    T.check('no overflow table (page-level)', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `pl-table-${W}`);
    // sort by company asc
    await page.click('.pl-table th button:has-text("Company")'); await page.waitForTimeout(200);
    let cos = await page.locator('.pl-tco').allInnerTexts();
    const names = cos.map((c) => c.split(' · ')[0]);
    T.check('sort by company asc', names.join('|') === [...names].sort((a, b) => a.localeCompare(b)).join('|'), names.join('|'));
    await page.click('.pl-table th button:has-text("Company")'); await page.waitForTimeout(200);
    cos = (await page.locator('.pl-tco').allInnerTexts()).map((c) => c.split(' · ')[0]);
    T.check('sort by company desc', cos.join('|') === [...names].sort((a, b) => b.localeCompare(a)).join('|'), cos.join('|'));
    if (!mobile) await page.click('.pl-table th button:has-text("Days silent")'); else T.note('mobile table', 'only Company/Stage columns visible; cannot sort by applied/activity/silent on mobile'); await page.waitForTimeout(200);
    const ds = await page.evaluate(() => [...document.querySelectorAll('.pl-table tbody tr td:last-child')].map((td) => td.innerText.trim()));
    T.note('days silent column (desc)', ds.join(','));
    // stage select inline
    const vid = (await appOf(page, 'Verity Labs')).id;
    await page.selectOption(`#pl-st-${vid}`, 'screen'); await page.waitForTimeout(250);
    T.check('inline select moves stage', (await stageOf(page, 'Verity Labs')) === 'screen');
    T.check('inline select does not open drawer', !(await page.locator('.drawer').count()));
    await clearToasts(page);
    T.check('view persisted', (await page.evaluate(() => store.get().ui.pipelineView)) === 'table');
    await page.click('.seg button:has-text("Board")'); await page.waitForTimeout(200);

    // ===== App drawer =====
    await page.locator('.pl-card:has-text("Northwind Labs")').click(); await page.waitForTimeout(300);
    T.check('app drawer opens', await page.locator('.drawer').isVisible());
    T.check('no overflow drawer', (await overflow(page)).ok);
    const tabs = await page.locator('.drawer [role=tablist] [role=tab]').allInnerTexts();
    T.check('drawer has 4 underline tabs', tabs.length === 4, tabs.join('|'));
    // v5: read-mode details that edit on click (PlInline): click value -> input -> Enter saves
    const inline = async (id, v) => { await page.click(`#${id}-v`); await page.waitForSelector(`#${id}`); await page.waitForTimeout(80); await page.fill(`#${id}`, v); await page.locator(`#${id}`).press('Enter'); await page.waitForTimeout(150); };
    await inline('pl-loc', 'Seattle, WA (hybrid)');
    await inline('pl-salary', '$55/hr');
    await inline('pl-url', 'northwind.example/jobs/1');
    await inline('pl-applied', '2026-10-01');
    await page.waitForTimeout(300);
    let nw = await appOf(page, 'Northwind Labs');
    T.check('location saved', nw.location === 'Seattle, WA (hybrid)', nw.location);
    T.check('salary saved', nw.salary === '$55/hr');
    T.check('url saved', nw.url === 'northwind.example/jobs/1');
    T.check('appliedAt edited', new Date(nw.appliedAt).getDate() === 1 && new Date(nw.appliedAt).getMonth() === 9, new Date(nw.appliedAt).toString());
    T.check('focus returns to read-mode value after Enter', await page.evaluate(() => document.activeElement?.id === 'pl-applied-v'));
    // Escape inside inline edit cancels edit only (drawer stays)
    await page.click('#pl-salary-v'); await page.waitForTimeout(80); await page.fill('#pl-salary', 'nope'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    nw = await appOf(page, 'Northwind Labs');
    T.check('Escape cancels inline edit, keeps drawer', nw.salary === '$55/hr' && (await page.locator('.drawer').count()) === 1, nw.salary);
    // contacts: "Add contact" button reveals the form
    T.check('contacts start empty with Add contact', await page.locator('#pl-c-add').isVisible());
    await page.click('#pl-c-add'); await page.waitForTimeout(100);
    T.check('Add contact focuses name', await page.evaluate(() => document.activeElement?.id === 'pl-c-name'));
    await page.click('.pl-contact-form button[type=submit]'); await page.waitForTimeout(100);
    T.check('empty contact name shows error', await page.locator('.pl-contact-form [aria-invalid=true]').count() === 1);
    await page.fill('#pl-c-name', 'Dana Ruiz'); await page.fill('#pl-c-role', 'Recruiter'); await page.fill('#pl-c-email', 'dana@northwind.example');
    await page.click('.pl-contact-form button[type=submit]'); await page.waitForTimeout(200);
    nw = await appOf(page, 'Northwind Labs');
    T.check('contact added', nw.contacts.length === 1 && nw.contacts[0].name === 'Dana Ruiz');
    // rounds tab
    await page.click('#pl-tab-rounds'); await page.waitForTimeout(200);
    const r0 = await page.locator('.pl-round').count();
    T.check('rounds tab lists 2 rounds', r0 === 2, r0);
    T.check('rounds are summary rows with Edit', (await page.locator('.pl-round-row .pl-round-edit').count()) >= 1, await page.locator('.pl-round-row').count());
    await page.click('.drawer button:has-text("Add round")'); await page.waitForTimeout(300);
    nw = await appOf(page, 'Northwind Labs');
    T.check('add round', nw.rounds.length === 3);
    const newR = nw.rounds[2];
    await page.selectOption(`#pl-r-${newR.id}-type`, 'behavioral');
    await page.fill(`#pl-r-${newR.id}-at`, '2026-11-20T15:30');
    await page.fill(`#pl-r-${newR.id}-who`, 'Sam Lee');
    await page.fill(`#pl-r-${newR.id}-prep`, 'STAR stories');
    await page.waitForTimeout(700);
    nw = await appOf(page, 'Northwind Labs');
    const rr = nw.rounds.find((r) => r.id === newR.id);
    T.check('round type edited', rr.type === 'behavioral');
    T.check('round time edited', new Date(rr.at).getHours() === 15 && new Date(rr.at).getMinutes() === 30, new Date(rr.at).toString());
    T.check('round interviewers saved', rr.interviewers === 'Sam Lee');
    T.check('round prep saved', rr.prep === 'STAR stories');
    // outcome changes
    await page.selectOption(`#pl-r-${newR.id}-out`, 'passed'); await page.waitForTimeout(150);
    nw = await appOf(page, 'Northwind Labs');
    T.check('outcome -> passed', nw.rounds.find((r) => r.id === newR.id).outcome === 'passed');
    await page.selectOption(`#pl-r-${newR.id}-out`, 'failed'); await page.waitForTimeout(150);
    nw = await appOf(page, 'Northwind Labs');
    T.check('outcome -> failed', nw.rounds.find((r) => r.id === newR.id).outcome === 'failed');
    // thanked checkbox
    await page.click(`label[for="pl-r-${newR.id}-thx"]`); await page.waitForTimeout(150);
    nw = await appOf(page, 'Northwind Labs');
    T.check('thanked toggled', nw.rounds.find((r) => r.id === newR.id).thanked === true);
    // delete round with confirm
    await page.locator(`[data-round="${newR.id}"] button[aria-label="Delete round"]`).click(); await page.waitForTimeout(200);
    T.check('delete round confirm modal shown', await page.locator('.modal:has-text("Delete this round?")').isVisible());
    T.check('drawer still open under confirm', await page.locator('.drawer').count() === 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const afterEsc = { modal: await page.locator('.modal').count(), drawer: await page.locator('.drawer').count() };
    T.check('Escape on confirm closes only confirm (drawer stays)', afterEsc.modal === 0 && afterEsc.drawer === 1, JSON.stringify(afterEsc));
    if (!afterEsc.drawer) { await page.locator('.pl-card:has-text("Northwind Labs")').click(); await page.waitForTimeout(300); await page.click('#pl-tab-rounds'); await page.waitForTimeout(200); }
    if (!(await page.locator(`#pl-r-${newR.id}-type`).count())) await page.click(`#pl-r-${newR.id}-sum`);
    await page.locator(`[data-round="${newR.id}"] button[aria-label="Delete round"]`).click(); await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("Delete round")'); await page.waitForTimeout(200);
    nw = await appOf(page, 'Northwind Labs');
    T.check('round deleted', nw.rounds.length === 2);
    // Done collapses an open round to a summary row and focuses it
    const openR = await page.locator('.pl-round-open').first().getAttribute('data-round').catch(() => null);
    if (openR) { await page.locator(`.pl-round-open[data-round="${openR}"] button:has-text("Done")`).click(); await page.waitForTimeout(150);
      T.check('Done collapses round + focuses summary', await page.evaluate((id) => document.activeElement?.id === `pl-r-${id}-sum`, openR)); }
    T.check('drawer still open after confirm', await page.locator('.drawer').count() === 1);
    // timeline note
    await page.click('#pl-tab-timeline'); await page.waitForTimeout(200);
    await page.fill('#pl-tl-note', 'Recruiter said decisions by Friday');
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    nw = await appOf(page, 'Northwind Labs');
    T.check('timeline note added', nw.events.some((e) => e.kind === 'note' && e.text.includes('Friday')));
    T.check('timeline note updates lastActivityAt', Date.now() - nw.lastActivityAt < 5000, new Date(nw.lastActivityAt).toString());
    T.check('timeline shows note first', (await page.locator('.pl-tl .tl-item').first().innerText()).includes('Friday'));
    // notes autosave
    await page.click('#pl-tab-notes'); await page.waitForTimeout(200);
    await page.fill('#pl-notes', 'Referral from Jamie. Team: Payments.');
    await page.waitForTimeout(1000);
    T.check('notes saved indicator', /Saved/.test(await page.locator('.pl-saved').innerText()));
    // keyboard 1-7 while drawer open
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('3'); await page.waitForTimeout(200);
    T.check('key 3 moves to Screen', (await stageOf(page, 'Northwind Labs')) === 'screen');
    await page.keyboard.press('4'); await page.waitForTimeout(200);
    T.check('key 4 moves to Interviews', (await stageOf(page, 'Northwind Labs')) === 'interview');
    // typing digits in notes should NOT move
    await page.click('#pl-notes'); await page.keyboard.type(' 6');
    await page.waitForTimeout(200);
    T.check('digit typed in notes does not move stage', (await stageOf(page, 'Northwind Labs')) === 'interview');
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await page.reload(); await page.waitForTimeout(900);
    nw = await appOf(page, 'Northwind Labs');
    T.check('notes persist after reload', nw.notes === 'Referral from Jamie. Team: Payments. 6', JSON.stringify(nw.notes));
    // notes: type then reload quickly (within debounce)
    await page.locator('.pl-card:has-text("Northwind Labs")').click(); await page.waitForTimeout(300);
    await page.click('#pl-tab-notes'); await page.waitForTimeout(200);
    await page.fill('#pl-notes', 'quick edit then reload');
    await page.waitForTimeout(300);
    await page.reload(); await page.waitForTimeout(900);
    nw = await appOf(page, 'Northwind Labs');
    T.check('notes typed <600ms before reload are kept', nw.notes === 'quick edit then reload', JSON.stringify(nw.notes));
    // Draft follow-up from drawer + Escape order
    await page.locator('.pl-card:has-text("Lumen Robotics")').click(); await page.waitForTimeout(300);
    await page.click('.drawer-foot button:has-text("Draft follow-up")'); await page.waitForTimeout(300);
    T.check('draft modal opens over drawer', (await page.locator('.modal').count()) === 1 && (await page.locator('.drawer').count()) === 1);
    const txt = await page.inputValue('#pl-draft');
    T.check('follow-up template filled', /Following up/.test(txt) && /Lumen Robotics/.test(txt), txt.slice(0, 60));
    T.check('template signs with profile name', /Alex Kim/.test(txt));
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const esc2 = { modal: await page.locator('.modal').count(), drawer: await page.locator('.drawer').count() };
    T.check('Escape closes modal first, drawer stays', esc2.modal === 0 && esc2.drawer === 1, JSON.stringify(esc2));
    if (!esc2.drawer) { await page.locator('.pl-card:has-text("Lumen Robotics")').click(); await page.waitForTimeout(300); }
    // delete app with confirm
    await page.click('.drawer-foot button:has-text("Delete")'); await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("Delete application")'); await page.waitForTimeout(300);
    T.check('app deleted', !(await appOf(page, 'Lumen Robotics')));
    T.check('drawer closed after delete', !(await page.locator('.drawer').count()));
    await page.click('.toast button:has-text("Undo")'); await page.waitForTimeout(200);
    T.check('undo delete restores app', !!(await appOf(page, 'Lumen Robotics')));
    // focus return after drawer close
    await page.locator('.pl-card:has-text("Lumen Robotics")').focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    T.check('Enter on card opens drawer', await page.locator('.drawer').count() === 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    T.check('focus returns to card after drawer close', await page.evaluate(() => !!document.activeElement?.closest?.('.pl-card')), await page.evaluate(() => document.activeElement?.className));
    // Tab focus trap in drawer
    await page.locator('.pl-card:has-text("Lumen Robotics")').click(); await page.waitForTimeout(300);
    let escaped = false;
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => !!document.activeElement.closest('.drawer')))) { escaped = true; break; } }
    T.check('Tab focus is trapped in drawer', !escaped);
    await page.keyboard.press('Escape');
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `pl-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-pipeline-${W}${MOCK ? '-mock' : ''}.json`);
})();
