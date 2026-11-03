const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(path.join(__dirname, '../../tools/node_modules/axe-core/axe.min.js'), 'utf8');
module.exports = { scan: async (page) => {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => { const res = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'], rules: { 'color-contrast': { enabled: true } } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes.slice(0, 2).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n')[1]) })); });
  console.log('AXE ' + JSON.stringify(r));
} };
