require('./ux').run(async (t) => { await t.go(''); await t.shot('first-load'); await t.text('body'); await t.buttons(); });
