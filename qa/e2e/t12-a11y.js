// Flow 12: accessibility basics across routes/themes. env W
const { open, mk, dump, shot } = require('./lib');
const W = +(process.env.W || 1440);
const T = mk(`a11y-${W}`);
const ROUTES = ['today', 'find', 'pipeline', 'companies', 'prep', 'stats', 'prefs'];
const scan = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || el.textContent || el.getAttribute('title') || '').trim();
  const unlabeledBtns = [...document.querySelectorAll('button, a[href], [role=button]')].filter(vis).filter((b) => !name(b)).map((b) => b.outerHTML.slice(0, 90));
  const unlabeledInputs = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((i) => !i.classList.contains('sr') && vis(i)).filter((i) => !(i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || (i.id && document.querySelector(`label[for="${i.id}"]`)) || i.closest('label'))).map((i) => i.outerHTML.slice(0, 90));
  const dupIds = Object.entries([...document.querySelectorAll('[id]')].reduce((m, e) => ((m[e.id] = (m[e.id] || 0) + 1), m), {})).filter(([, n]) => n > 1).map(([k]) => k);
  // contrast
  const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { let e = el; while (e) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; e = e.parentElement; } return rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 }; };
  const low = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('svg')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el); const fg = rgb(cs.color); if (!fg) continue;
    const bg = bgOf(el); const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 18.6 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5) && !el.closest('[disabled],[aria-disabled=true]') && !el.closest('.onb-step-label')) low.push(`${ratio.toFixed(2)} ${el.className || el.tagName} "${el.textContent.trim().slice(0, 30)}"`);
  }
  const uniq = [...new Set(low)];
  return { unlabeledBtns, unlabeledInputs, dupIds, low: uniq };
};
(async () => {
  for (const theme of ['light', 'dark']) {
    const { page, errors, close } = await open({ W, setup: 'examples', route: 'today', theme });
    try {
      const all = { btn: new Set(), inp: new Set(), dup: new Set(), low: new Set() };
      for (const r of ROUTES) {
        await page.evaluate((r) => (location.hash = r), r); await page.waitForTimeout(500);
        const s = await page.evaluate(scan);
        s.unlabeledBtns.forEach((x) => all.btn.add(`${r}: ${x}`)); s.unlabeledInputs.forEach((x) => all.inp.add(`${r}: ${x}`)); s.dupIds.forEach((x) => all.dup.add(`${r}: ${x}`)); s.low.slice(0, 8).forEach((x) => all.low.add(`${r}: ${x}`));
      }
      // drawer + modals
      await page.evaluate(() => { location.hash = 'pipeline'; }); await page.waitForTimeout(300);
      await page.evaluate(() => openApp(Object.values(store.get().apps)[0].id)); await page.waitForTimeout(300);
      let s = await page.evaluate(scan); s.unlabeledBtns.forEach((x) => all.btn.add(`appDrawer: ${x}`)); s.unlabeledInputs.forEach((x) => all.inp.add(`appDrawer: ${x}`)); s.dupIds.forEach((x) => all.dup.add(`appDrawer: ${x}`));
      await page.evaluate(() => { closeDrawer(); openModal('paste'); }); await page.waitForTimeout(300);
      s = await page.evaluate(scan); s.unlabeledInputs.forEach((x) => all.inp.add(`paste: ${x}`)); s.unlabeledBtns.forEach((x) => all.btn.add(`paste: ${x}`));
      await page.evaluate(() => closeModal());
      T.check(`${theme}: all visible buttons/links have accessible names`, !all.btn.size, [...all.btn].slice(0, 6).join(' || '));
      T.check(`${theme}: all form controls labeled`, !all.inp.size, [...all.inp].slice(0, 6).join(' || '));
      T.check(`${theme}: no duplicate ids`, !all.dup.size, [...all.dup].join(', '));
      T.check(`${theme}: text contrast >= AA`, !all.low.size, [...all.low].slice(0, 12).join(' || '));
      // focus visible
      await page.evaluate(() => (location.hash = 'today')); await page.waitForTimeout(300);
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      const fv = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { tag: e.tagName, cls: e.className, outline: cs.outlineStyle + ' ' + cs.outlineWidth, shadow: cs.boxShadow }; });
      T.check(`${theme}: focus visible on tabbed element`, fv.outline !== 'none 0px' || (fv.shadow && fv.shadow !== 'none'), JSON.stringify(fv));
      // modal focus return
      const btn = page.locator('.topbar .btn.primary').first();
      await btn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      T.check(`${theme}: modal moves focus inside`, await page.evaluate(() => !!document.activeElement.closest('.modal')));
      let esc = false;
      for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => !!document.activeElement.closest('.modal')))) { esc = true; break; } }
      T.check(`${theme}: Tab focus trapped in modal`, !esc, await page.evaluate(() => document.activeElement.outerHTML.slice(0, 80)));
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      T.check(`${theme}: focus returns to trigger after modal close`, await page.evaluate(() => document.activeElement?.matches('.topbar .btn.primary')), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
      // skip link / landmarks
      T.check(`${theme}: main landmark present`, await page.locator('main').count() === 1);
      T.check(`${theme}: one h1 per page`, (await page.locator('h1').count()) === 1, await page.locator('h1').allInnerTexts().then((x) => x.join(' | ')));
      await shot(page, `a11y-${theme}-${W}`);
      T.check(`${theme}: console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    } catch (e) { T.check('exception', false, e.message.split('\n')[0]); }
    await close();
  }
  dump(__dirname + `/out/res-a11y-${W}.json`);
})();
