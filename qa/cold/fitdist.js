// Fit-score spread on the onboarding match list for persona A (no resume) and B (no role)
const { serve, open, chromium } = require('./lib');
(async () => { const server = await serve(); const browser = await chromium.launch();
  const s = await open(browser, server.address().port, { mobile: false, persona: 'fit' });
  await s.page.goto(s.url); await s.page.waitForTimeout(1500);
  const r = await s.page.evaluate(() => { const J = useJobs ? null : null; return null; }).catch(() => null);
  const res = await s.page.evaluate(async () => {
    const data = await (await fetch('data/jobs.json')).json(); const co = data.companies; const jobs = data.jobs.map((j) => ({ ...j, co: co[j.c] }));
    const run = (p) => { const l = onbMatches(jobs, p); const h = {}; for (const j of l) { const f = fitScore(j, p); const k = f ? f.score : 'none'; h[k] = (h[k] || 0) + 1; } return { n: l.length, hist: h }; };
    const base = { skills: [], resume: '', needsSponsor: false, remote: true };
    return { A: run({ ...base, levels: ['intern'], roles: ['Software'], locations: ['sf bay area', 'remote'] }), B: run({ ...base, levels: ['intern'], roles: [], locations: ['new york', 'remote'] }) };
  });
  console.log(JSON.stringify(res)); await browser.close(); server.close(); })();
