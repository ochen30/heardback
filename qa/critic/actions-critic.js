const wait = (p, ms = 400) => p.waitForTimeout(ms);
module.exports = {
  async palette(p) { await p.click('body'); await p.keyboard.press('Control+k'); await wait(p, 400); },
  async paletteType(p) { await p.click('body'); await p.keyboard.press('Control+k'); await wait(p, 300); await p.keyboard.type('north'); await wait(p, 400); },
  async help(p) { await p.click('body'); await p.keyboard.press('Shift+?'); await wait(p, 400); },
  async scroll(p) { await p.evaluate(() => { const w = document.querySelector('.workspace') || document.scrollingElement; w.scrollTop = 900; }); await wait(p); },
  async scroll2(p) { await p.evaluate(() => { const w = document.querySelector('.workspace') || document.scrollingElement; w.scrollTop = 1800; }); await wait(p); },
};
