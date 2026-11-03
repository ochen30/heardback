module.exports = {
  prevVisit: async (page) => { await page.evaluate(() => localStorage.setItem('heardback:lastVisit', JSON.stringify({ last: Date.now() - 2 * 864e5, since: null }))); await page.reload(); await page.waitForTimeout(900); },
  clickNew: async (page) => { await page.evaluate(() => localStorage.setItem('heardback:lastVisit', JSON.stringify({ last: Date.now() - 2 * 864e5, since: null }))); await page.reload(); await page.waitForTimeout(900); await page.getByText(/new since your last visit/).first().click(); await page.waitForTimeout(300); },
};
