module.exports = {
  addRemoved: async (page) => { await page.evaluate(() => { const t = Date.now(); Apps.create({ company: 'Gone Corp', title: 'Data Engineer Intern', jobId: 'deadbeef00', stage: 'saved', source: 'find' }); const a = Apps.create({ company: 'Vanished Ltd', title: 'SWE New Grad', jobId: 'deadbeef01', stage: 'applied' }); }); await page.waitForTimeout(500); },
  openRemoved: async (page) => { await page.evaluate(() => { const a = Object.values(store.get().apps).find((x) => x.company === 'Gone Corp'); openApp(a.id); }); await page.waitForTimeout(500); },
};
