// Interactions for Share your progress. Run e.g.:
//   OUT=qa/out-share SETUP=examples ACTIONS=qa/actions-share.js node qa/shot.js stats:openShare
//   OUT=qa/out-share ACTIONS=qa/actions-share.js node qa/shot.js stats:seedReal stats:openShare stats:darkCard stats:saveCard
const fs = require('fs'); const path = require('path');
const log = (...a) => console.log('[share]', ...a);
const assert = (c, msg) => { if (!c) { console.log('[share] FAIL', msg); process.exitCode = 1; } else log('ok', msg); };
const out = process.env.OUT ? path.resolve(process.env.OUT) : path.join(__dirname, 'out');

async function dumpCard(page, name) {
  await page.waitForSelector('.share-img[src]', { timeout: 4000 }).catch(() => null);
  const data = await page.evaluate(async () => {
    const img = document.querySelector('.share-img[src]'); if (!img) return null;
    const b = await (await fetch(img.src)).blob();
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  });
  if (!data) return assert(false, 'card image rendered');
  const f = path.join(out, `card-${name}-${page.viewportSize().width}.png`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  const dims = await page.evaluate(() => { const i = document.querySelector('.share-img'); return [i.naturalWidth, i.naturalHeight]; });
  assert(dims[0] === 2400 && dims[1] === 1260, `card is 2400x1260 (got ${dims})`);
  log('card', f);
}

module.exports = {
  async seedReal(page) {
    await page.evaluate(() => {
      const t = now(), D = DAY;
      const mk = (company, title, stage, days, extra = {}) => Apps.create({ company, title, stage, appliedAt: t - days * D, createdAt: t - days * D - D, ...extra });
      mk('Acme Robotics', 'Software Engineer Intern', 'applied', 1);
      mk('Globex', 'Data Science Intern', 'applied', 3);
      mk('Initech', 'Backend Intern', 'screen', 9, { lastReplyAt: t - 4 * D });
      mk('Umbrella Health', 'ML Intern', 'interview', 16, { lastReplyAt: t - 10 * D, rounds: [{ id: 'r1', type: 'technical', at: t - 5 * D, outcome: 'passed' }] });
      mk('Stark Systems', 'SWE Intern', 'rejected', 22, { lastReplyAt: t - 12 * D });
      mk('Wayne Data', 'Quant Intern', 'offer', 34, { lastReplyAt: t - 20 * D, events: [{ id: 'e1', at: t - 34 * D, kind: 'stage', from: 'saved', to: 'applied' }, { id: 'e2', at: t - 3 * D, kind: 'stage', from: 'interview', to: 'offer' }] });
      mk('Hooli', 'Product Intern', 'ghosted', 45);
      mk('Pied Piper', 'Frontend Intern', 'saved', 0, { appliedAt: null });
    });
    const n = await page.evaluate(() => Object.values(store.get().apps).filter((a) => !a.example).length);
    assert(n === 8, `seeded 8 real apps (got ${n})`);
  },
  async openShare(page) {
    await page.click('button:has-text("Share progress")');
    await page.waitForSelector('.modal', { timeout: 2000 });
    await page.waitForTimeout(600);
    const empty = await page.$('.modal .empty');
    const real = await page.evaluate(() => Object.values(store.get().apps).some((a) => !a.example && a.appliedAt));
    if (!real) { assert(!!empty, 'examples-only shows empty state'); const t = await page.textContent('.modal .empty h3'); assert(/Add a real application/.test(t), 'empty state copy'); return; }
    await dumpCard(page, 'light-month');
    const cap = await page.textContent('#share-caption-text');
    log('caption:', cap);
    assert(!/Northwind|Harbor|Fernhill/.test(cap), 'caption has no example companies');
  },
  async allTime(page) {
    await page.click('.modal .seg button:has-text("All time")');
    await page.waitForTimeout(500);
    await dumpCard(page, 'light-all');
    log('caption:', await page.textContent('#share-caption-text'));
  },
  async darkCard(page) {
    await page.click('.modal .seg button:has-text("Dark")');
    await page.click('label[for="share-show-companies"]');
    await page.waitForTimeout(500);
    await dumpCard(page, 'dark-companies');
    log('caption:', await page.textContent('#share-caption-text'));
  },
  async weekCard(page) {
    await page.click('.modal .seg button:has-text("This week")');
    await page.waitForTimeout(500);
    await dumpCard(page, 'week');
    log('caption:', await page.textContent('#share-caption-text'));
  },
  async saveCard(page) {
    const hasDl = await page.evaluate(() => !!caps.downloads);
    await page.click('.modal-foot button:has-text("Save image")');
    await page.waitForTimeout(400);
    const toastT = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => e.textContent).join(' | '));
    log('downloads cap:', hasDl, 'toast:', toastT);
    assert(hasDl ? /Saved heardback-progress\.png/.test(toastT) : /Right-click or long-press/.test(toastT), 'save feedback');
  },
  async scrollBottom(page) {
    await page.evaluate(() => { const b = document.querySelector('.modal-body'); if (b) b.scrollTop = b.scrollHeight; });
    await page.waitForTimeout(200);
  },
};
