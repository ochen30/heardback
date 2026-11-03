// Measure onboarding footer buttons at 375 (step 2 has three buttons) and Skip-setup target size
const { serve, open, chromium } = require('./lib');
(async () => { const server = await serve(); const browser = await chromium.launch();
  const s = await open(browser, server.address().port, { mobile: true, persona: 'foot' });
  await s.page.goto(s.url); await s.page.waitForTimeout(1200);
  const skip = await s.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Skip setup').getBoundingClientRect(); const cs = getComputedStyle([...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Skip setup')); return { w: b.width, h: b.height, fs: cs.fontSize, color: cs.color }; });
  await s.page.locator('#onb-next').tap(); await s.page.waitForTimeout(500);
  const f = await s.page.evaluate(() => [...document.querySelectorAll('.onb-foot button')].map((b) => { const r = b.getBoundingClientRect(); return [b.innerText.trim(), Math.round(r.left), Math.round(r.right)]; }));
  await s.page.getByRole('button', { name: 'Skip this step' }).tap(); await s.page.waitForTimeout(600);
  const ex = await s.page.evaluate(() => { const r = document.querySelector('#onb-examples').getBoundingClientRect(); return { top: Math.round(r.top), vh: innerHeight }; });
  console.log(JSON.stringify({ skip, foot: f, examplesCheckbox: ex })); await browser.close(); server.close(); })();
