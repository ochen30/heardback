module.exports = { m: async (page) => { await page.evaluate(() => openModal('method')); await page.waitForTimeout(500); } };
