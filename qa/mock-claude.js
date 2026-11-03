// QA-only test double for window.claude (never shipped). Injected by qa/shot.js when MOCK=1.
window.claude = (() => {
  const docs = new Map();
  const snap = (path) => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => docs.get(path), metadata: { fromCache: false, hasPendingWrites: false } });
  const docRef = (path) => ({ id: path.split('/').pop(), path, get: async () => snap(path), set: async (d) => { docs.set(path, JSON.parse(JSON.stringify(d))); }, update: async (d) => { docs.set(path, { ...(docs.get(path) || {}), ...d }); }, delete: async () => { docs.delete(path); }, onSnapshot: (n) => { n(snap(path)); return () => {}; } });
  const coll = (cpath) => { const q = { limit: () => q, where: () => q, orderBy: () => q, get: async () => { const ds = [...docs.keys()].filter((k) => k.startsWith(cpath + '/') && k.split('/').length === cpath.split('/').length + 1).map(snap); return { docs: ds, size: ds.length, empty: !ds.length, docChanges: () => [], metadata: {} }; }, doc: (id) => docRef(cpath + '/' + (id || Math.random().toString(36).slice(2))), onSnapshot: (n) => { q.get().then(n); return () => {}; } }; return q; };
  // seed a few pooled contributors so pooled UI can be exercised
  const seedCo = ['Northwind Labs'];
  for (let i = 0; i < 4; i++) docs.set('pool/mock' + i, { v: 1, updatedAt: Date.now(), entries: [{ co: 'Northwind Labs', cat: 'Software', lvl: 'intern', wk: '2026-W40', reached: i % 2 ? 'interview' : 'applied', out: i === 3 ? 'ghosted' : 'open', rd: i % 2 ? 6 + i : null }, { co: 'Northwind Labs', cat: 'Software', lvl: 'intern', wk: '2026-W41', reached: 'screen', out: 'rejected', rd: 9 }] });
  const reply = (p) => {
    if (/JSON/i.test(p) && /email/i.test(p)) return JSON.stringify({ kind: 'interview', company: 'Northwind Labs', title: 'Software Engineer Intern', date: new Date().toISOString(), interviewAt: new Date(Date.now() + 2 * 864e5).toISOString(), roundType: 'technical', interviewers: 'Priya S.', nextStep: 'Confirm the time.' });
    if (/JSON/i.test(p) && /question/i.test(p)) return JSON.stringify(['Walk me through a project you are proud of.', 'How would you design a URL shortener?', 'Tell me about a bug that took you a long time to find.', 'How do you decide what to test?', 'Explain a trade-off you made recently.', 'What would you improve about our product?']);
    if (/JSON/i.test(p)) return JSON.stringify({ why: ['Strong Python and SQL from two data internships.'], whyNot: ['No production ML deployment yet.'], bullets: ['Built a Python ETL pipeline that cut report time by 40%.'] });
    return 'MOCK CLAUDE ANSWER. This text comes from the QA test double, not from Claude. It is here to check layout, streaming and buttons.';
  };
  const sample = async (input, opts = {}) => { const p = typeof input === 'string' ? input : input.map((m) => m.content).join('\n'); const text = reply(p); await new Promise((r) => setTimeout(r, 300)); opts.onText && opts.onText({ text, delta: text }); return { text, truncated: false, modelTierApplied: 'default' }; };
  sample.json = async (input, opts) => JSON.parse((await sample(input, opts)).text);
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const caps = {
    sample,
    db: { doc: docRef, collection: coll },
    user: { id: async () => 'mock-viewer', can: async () => true, isOwner: async () => true, canEdit: async () => true, me: async () => ({ id: 'mock-viewer' }) },
    downloads: { save: async () => ({ ok: true }) },
  };
  return { use: async (n) => caps[n] || null };
})();
