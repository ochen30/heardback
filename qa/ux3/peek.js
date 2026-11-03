// Print Notion's stored notes/events (persistence check)
const { run } = require('./h');
run(async (t) => { await t.go('today'); console.log(JSON.stringify(await t.page.evaluate(() => { const a = Apps.list().find((x) => x.company === 'Notion'); return { notes: a.notes, ev: a.events.map((e) => e.kind + ':' + e.text) }; }))); });
