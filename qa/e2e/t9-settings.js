// Flow 9: Settings export/import/delete/theme/examples. env W, MOCK
const { open, mk, dump, overflow, shot, clearToasts } = require('./lib');
const W = +(process.env.W || 1440), MOCK = !!process.env.MOCK;
const T = mk(`settings-${W}${MOCK ? '-mock' : ''}`);
async function grabExport(page, btn) {
  if (MOCK) {
    await page.evaluate(() => { window.__saved = null; const orig = caps.downloads.save; caps.downloads.save = async ({ filename, data }) => { window.__saved = { filename, text: await data.text() }; return orig({ filename, data }); }; });
    await page.click(btn); await page.waitForTimeout(400);
    return page.evaluate(() => window.__saved);
  }
  await page.click(btn); await page.waitForTimeout(400);
  return { filename: null, text: await page.evaluate(() => navigator.clipboard.readText()) };
}
(async () => {
  const { page, errors, close, browser } = await open({ W, mock: MOCK, setup: 'examples', route: 'prefs' });
  try {
    T.check('no overflow settings', (await overflow(page)).ok, JSON.stringify(await overflow(page)));
    await shot(page, `prefs-${W}${MOCK ? '-mock' : ''}`);
    // enrich state: a real app with notes, rounds, contacts, quotes/commas
    await page.evaluate(() => {
      const a = Apps.create({ company: 'Comma, "Quote" & Co', title: 'SWE Intern, Summer 2027\nline2', stage: 'interview', appliedAt: Date.now() - 10 * 864e5, notes: 'Notes with "quotes", commas, and\nnewlines', url: 'https://x.example/a?b=1,2' });
      Apps.addRound(a.id, { type: 'technical', at: Date.now() + 2 * 864e5, interviewers: 'Pat' });
      Apps.update(a.id, { contacts: [{ name: 'Pat', role: 'Eng', email: 'p@x.example' }] });
      store.set((s) => ({ ...s, dismissed: { 'apply:x': Date.now() + 1e9 } }));
      ui.set({ toasts: [] });
    });
    await page.waitForTimeout(300);
    const snap = await page.evaluate(() => JSON.parse(JSON.stringify(store.get())));
    const exp = await grabExport(page, '#pf-export-json');
    T.check('JSON export produced', !!exp && exp.text.length > 100, exp && exp.filename);
    let data; try { data = JSON.parse(exp.text); } catch (e) { data = null; }
    T.check('JSON export parses', !!data);
    T.check('JSON export has all apps', data && Object.keys(data.apps).length === Object.keys(snap.apps).length);
    T.note('JSON export toast', await page.locator('.toast').first().innerText().catch(() => ''));
    await clearToasts(page);
    // CSV export
    const csv = await grabExport(page, '#pf-export-csv');
    const lines = csv.text.split('\n');
    T.note('CSV header', lines[0]);
    const csvRows = await page.evaluate((t) => parseCSV(t), csv.text);
    T.check('CSV rows = apps + header', csvRows.length === Object.keys(snap.apps).length + 1, `${csvRows.length}`);
    const exCol = csvRows[0].indexOf('example');
    T.check('CSV marks example apps (example column)', exCol >= 0 && csvRows.filter((r) => r[exCol] === 'yes').length === Object.values(snap.apps).filter((a) => a.example).length, csvRows[0].join(','));
    await clearToasts(page);
    // ---- Import JSON into a fresh profile (new context) ----
    const r2 = await open({ W, mock: MOCK, setup: 'onboarded', route: 'prefs', browser });
    await r2.page.setInputFiles('#pf-import', { name: 'heardback-backup.json', mimeType: 'application/json', buffer: Buffer.from(exp.text) });
    await r2.page.waitForTimeout(300);
    T.check('import confirm shown', await r2.page.locator('.modal:has-text("Import")').isVisible());
    await r2.page.click('.modal-foot button:has-text("Import and merge")'); await r2.page.waitForTimeout(400);
    const after = await r2.page.evaluate(() => JSON.parse(JSON.stringify(store.get())));
    const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null); // undefined vs null normalisation is fine
    const diffs = [];
    for (const id of Object.keys(snap.apps)) {
      const x = snap.apps[id], y = after.apps[id];
      if (!y) { diffs.push(`${id} missing`); continue; }
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (!eq(x[k], y[k])) diffs.push(`${x.company}.${k}: ${JSON.stringify(x[k])} -> ${JSON.stringify(y[k])}`);
    }
    T.check('JSON round-trip apps equal', !diffs.length, diffs.slice(0, 6).join(' ; '));
    T.check('JSON round-trip profile equal', eq(snap.profile, after.profile), JSON.stringify(Object.keys(snap.profile).filter((k) => !eq(snap.profile[k], after.profile[k]))));
    T.check('JSON round-trip settings equal', eq(snap.settings, after.settings));
    T.check('JSON round-trip dismissed equal', eq(snap.dismissed, after.dismissed));
    await r2.page.reload(); await r2.page.waitForTimeout(700);
    T.check('imported data persists', Object.keys(await r2.page.evaluate(() => store.get().apps)).length === Object.keys(snap.apps).length);
    // CSV import into another fresh profile
    const r3 = await open({ W, mock: MOCK, setup: 'onboarded', route: 'prefs', browser });
    await r3.page.setInputFiles('#pf-import', { name: 'apps.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.text) });
    await r3.page.waitForTimeout(400);
    const c3 = await r3.page.evaluate(() => Object.values(store.get().apps));
    T.check('CSV import count', c3.length === Object.keys(snap.apps).length, `${c3.length} vs ${Object.keys(snap.apps).length}`);
    const stageDiff = Object.values(snap.apps).filter((a) => { const m = c3.find((b) => b.company === a.company && b.title === a.title); return !m || m.stage !== a.stage; }).map((a) => `${a.company}:${a.stage}`);
    T.check('CSV import stages preserved', !stageDiff.length, stageDiff.join(','));
    T.check('CSV import marks fictional examples as real (example=false)', !c3.some((a) => a.company === 'Northwind Labs' && !a.example), 'Northwind Labs imported as a real application');
    const dateDiff = Object.values(snap.apps).filter((a) => a.appliedAt).filter((a) => { const m = c3.find((b) => b.company === a.company && b.title === a.title); return !m || new Date(m.appliedAt).toDateString() !== new Date(a.appliedAt).toDateString(); }).map((a) => a.company);
    T.check('CSV import applied dates preserved', !dateDiff.length, dateDiff.join(','));
    // CSV re-import dedupe
    await r3.page.setInputFiles('#pf-import', { name: 'apps.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.text) });
    await r3.page.waitForTimeout(300);
    T.check('CSV re-import dedupes', (await r3.page.evaluate(() => Object.keys(store.get().apps).length)) === c3.length);
    // bad files
    await r3.page.setInputFiles('#pf-import', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
    await r3.page.waitForTimeout(300);
    T.check('bad JSON -> toast', /couldn.t be read/.test(await r3.page.locator('.toast').last().innerText().catch(() => '')));
    await r3.page.setInputFiles('#pf-import', { name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('foo,bar\n1,2') });
    await r3.page.waitForTimeout(300);
    T.check('CSV without company/title -> toast', /Couldn.t find a company/.test(await r3.page.locator('.toast').last().innerText().catch(() => '')));
    T.check('import contexts: console errors', r2.errors.length + r3.errors.length === 0, [...r2.errors, ...r3.errors].join('|'));
    await r2.close(); await r3.close();
    // ---- theme switch ----
    await page.click('.pf-card .seg button:has-text("Dark")'); await page.waitForTimeout(200);
    T.check('theme dark applied', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');
    await shot(page, `prefs-dark-${W}`);
    await page.click('.pf-card .seg button:has-text("Light")'); await page.waitForTimeout(200);
    T.check('theme light applied', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
    await page.click('.pf-card .seg button:has-text("System")'); await page.waitForTimeout(200);
    T.check('theme system removes attr', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === null);
    // reminders inputs
    await page.fill('#pf-follow', '3'); await page.locator('#pf-follow').blur(); await page.waitForTimeout(150);
    T.check('followUpDays set', (await page.evaluate(() => store.get().settings.followUpDays)) === 3);
    await page.fill('#pf-ghost', '1'); await page.locator('#pf-ghost').blur(); await page.waitForTimeout(150);
    const gd = await page.evaluate(() => store.get().settings.ghostDays);
    T.check('ghostDays clamps to min followUpDays+1 (=4)', gd === 4, gd);
    await page.fill('#pf-ghost', '2'); await page.waitForTimeout(150);
    T.note('ghostDays while typing "2" before blur', await page.evaluate(() => store.get().settings.ghostDays));
    await page.fill('#pf-follow', '30'); await page.locator('#pf-follow').blur(); await page.fill('#pf-ghost', '10'); await page.locator('#pf-ghost').blur(); await page.waitForTimeout(150);
    const s2 = await page.evaluate(() => store.get().settings);
    T.check('ghostDays may be set below followUpDays (no validation)', s2.ghostDays >= s2.followUpDays, `follow=${s2.followUpDays} ghost=${s2.ghostDays}`);
    await page.fill('#pf-follow', '7'); await page.locator('#pf-follow').blur(); await page.fill('#pf-ghost', '21'); await page.locator('#pf-ghost').blur();
    // examples toggle / clear
    await page.click('label[for="pf-show-ex"]'); await page.waitForTimeout(200);
    T.check('examples hidden flag', (await page.evaluate(() => store.get().settings.showExamples)) === false);
    await page.evaluate(() => (location.hash = 'pipeline')); await page.waitForTimeout(400);
    const cardsHidden = await page.locator('.pl-card .badge.example').count();
    T.check('hidden examples not on board', cardsHidden === 0, cardsHidden);
    await page.evaluate(() => (location.hash = 'prefs')); await page.waitForTimeout(400);
    await page.click('label[for="pf-show-ex"]'); await page.waitForTimeout(200);
    await page.click('#pf-clear-ex'); await page.waitForTimeout(250);
    T.check('clear examples removes only examples', (await page.evaluate(() => Object.values(store.get().apps).map((a) => a.example))).every((x) => !x));
    T.check('Load examples re-enabled', !(await page.locator('#pf-load-ex').isDisabled()));
    await page.click('#pf-load-ex'); await page.waitForTimeout(250);
    T.check('load examples adds 10', (await page.evaluate(() => Object.values(store.get().apps).filter((a) => a.example).length)) === 10);
    await clearToasts(page);
    // delete all
    await page.evaluate(() => localStorage.setItem('heardback:find:brief:Acme', JSON.stringify({ at: Date.now(), text: 'x' })));
    await page.click('#pf-delete'); await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("Delete everything")'); await page.waitForTimeout(400);
    const st = await page.evaluate(() => store.get());
    T.check('delete all clears apps', Object.keys(st.apps).length === 0);
    T.check('delete all resets profile -> onboarding', st.profile.onboarded === false && await page.locator('.onboard-wrap').count() === 1);
    const leftovers = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('heardback') && k !== 'heardback:v1'));
    T.check('delete all removes other heardback:* keys (AI briefs)', !leftovers.length, leftovers.join(','));
    await page.reload(); await page.waitForTimeout(700);
    T.check('delete persists after reload', (await page.evaluate(() => Object.keys(store.get().apps).length)) === 0);
    T.check('console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  } catch (e) { T.check('exception', false, e.message.split('\n')[0]); await shot(page, `settings-exc-${W}`); }
  await close();
  dump(__dirname + `/out/res-settings-${W}${MOCK ? '-mock' : ''}.json`);
})();
