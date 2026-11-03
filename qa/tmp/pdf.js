const fs = require('fs'); const path = require('path');
module.exports = { readPdf: async (page) => {
  const b64 = fs.readFileSync(path.join(__dirname, '../fixtures/sample-resume.pdf')).toString('base64');
  const r = await page.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); try { const { text } = await readResumeFile(new File([bin], 'resume.pdf', { type: 'application/pdf' })); return { ok: true, text: text.slice(0, 400), skills: extractSkills(text) }; } catch (e) { return { ok: false, e: e.message || String(e) }; } }, b64);
  console.log(JSON.stringify(r));
} };
