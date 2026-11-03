const base = require('./axe.js');
const F = require('../actions-find.js'); const P = require('../actions-pipeline.js');
const wrap = (fn) => async (page) => { await fn(page); await page.waitForTimeout(500); await base.scan(page); };
module.exports = {
  job: wrap(F.openFirstJob), company: wrap(F.openCompany), drawer: wrap(P.drawer), rounds: wrap(P.drawerRounds), paste: wrap(P.paste_interview), table: wrap(P.table),
  method: wrap(async (page) => { await page.evaluate(() => openModal('method')); }),
  palette: wrap(async (page) => { await page.keyboard.press('Control+k'); }),
  share: wrap(async (page) => { await page.evaluate(() => openModal('share')); }),
};
