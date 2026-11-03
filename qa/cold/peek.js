const { serve, open, chromium } = require('./lib');
(async () => {
  const server = await serve(); const browser = await chromium.launch();
  for (const mobile of [true, false]) {
    const s = await open(browser, server.address().port, { mobile, persona: 'peek' });
    await s.page.goto(s.url); await s.page.waitForTimeout(1200);
    await s.shot('t0'); await s.shot('t0-full', true);
    console.log('=== ', mobile ? 375 : 1440); console.log(await s.text());
    const fold = await s.page.evaluate(() => { const b = [...document.querySelectorAll('button,a,label.btn')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; }).map(e => e.innerText.trim()).filter(Boolean); return { above: b, h: document.querySelector('.onboard-wrap')?.scrollHeight }; });
    console.log(JSON.stringify(fold)); console.log(s.errors);
    await s.ctx.close();
  }
  await browser.close(); server.close();
})();
