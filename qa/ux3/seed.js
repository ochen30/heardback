// Seed a 5-week-old account: onboarded profile + ~40 real (non-example) applications.
// Run: FRESH=1 TAG=seed node qa/ux3/seed.js
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  const res = await page.evaluate(() => {
    const T = now(); const H = 3600000;
    // n days ago at hour h (local)
    const d = (n, h = 10) => { const x = new Date(T - n * DAY); x.setHours(h, (n * 7) % 60, 0, 0); return x.getTime(); };
    store.set((s) => ({ ...s, profile: { ...s.profile, roles: ['Software', 'Data & AI'], levels: ['intern'], locations: ['sf bay area', 'new york', 'remote'], remote: true, needsSponsor: false, onboarded: true, name: 'Jordan Lee', weeklyGoal: 8,
      resume: 'Jordan Lee — B.S. Computer Science, UC Davis (expected 2028). GPA 3.7.\nSkills: Python, Java, TypeScript, React, Node.js, SQL, PostgreSQL, pandas, PyTorch, scikit-learn, AWS, Docker, Git, Linux, REST APIs.\nExperience: Software Engineering Intern, Bay Area startup (Summer 2026) — built a React dashboard and a Node/Postgres ingestion service; cut p95 latency 40%.\nResearch Assistant, ML lab — trained PyTorch models for text classification; wrote data pipelines in pandas.\nProjects: course-planner web app (React, Flask, 2k users); Kaggle tabular competition top 10%.',
      skills: ['Python', 'Java', 'TypeScript', 'React', 'Node.js', 'SQL', 'PyTorch', 'Machine Learning', 'AWS', 'Docker', 'Git', 'Algorithms'] },
      settings: { ...s.settings, showExamples: false } }));
    const ev = (at, kind, text, extra = {}) => ({ id: uid('e_'), at, kind, text, ...extra });
    const st = (at, from, to) => ev(at, 'stage', `Moved to ${STAGE[to].label}`, { from, to });
    const rd = (type, at, o = {}) => ({ id: uid('r_'), type, at, interviewers: '', prep: '', reflection: '', outcome: 'pending', thanked: false, ...o });
    const mk = (o) => {
      const created = o.createdAt || (o.appliedAt ? o.appliedAt - 2 * H : d(3));
      const events = [ev(created, 'created', 'Saved')];
      if (o.appliedAt) events.push(st(o.appliedAt, 'saved', 'applied'));
      (o.ev || []).forEach((e) => events.push(e));
      const fields = { company: o.company, title: o.title, location: o.location || '', jobId: o.jobId || null, url: o.url || '', stage: o.stage, appliedAt: o.appliedAt || null, createdAt: created, source: o.jobId ? 'find' : 'manual', notes: o.notes || '', salary: o.salary || '', events, lastActivityAt: events[events.length - 1].at, lastReplyAt: o.lastReplyAt || null, followedUpAt: o.followedUpAt || null };
      const a = Apps.create(fields);
      // Apps.create backfills lastReplyAt = now for later stages; correct it to the real reply time
      Apps.update(a.id, { lastReplyAt: o.lastReplyAt || null, rounds: o.rounds || [], contacts: o.contacts || [] });
      return a.id;
    };
    const L = [];
    // ---------- Applied (18) ----------
    L.push(mk({ company: 'Stripe', title: 'Machine Learning Engineer Intern', location: 'San Francisco, CA', jobId: '6fc8c909-a', stage: 'applied', appliedAt: d(2) }));
    L.push(mk({ company: 'LinkedIn', title: 'Software Engineer Intern - First Play', location: 'Mountain View, CA', jobId: '87a05892-5', stage: 'applied', appliedAt: d(4) }));
    L.push(mk({ company: 'Workday', title: 'Analytics Engineer Intern', location: 'Pleasanton, CA', jobId: '55838bcc-4', stage: 'applied', appliedAt: d(5) }));
    L.push(mk({ company: 'Subtotal', title: 'Software Engineer Intern', location: 'Remote in USA', jobId: 'f5f92fa6-3', stage: 'applied', appliedAt: d(5, 22) }));
    L.push(mk({ company: 'Wex', title: 'Software Engineer Intern', location: 'Remote in USA', jobId: '29a95b15-0', stage: 'applied', appliedAt: d(3) }));
    L.push(mk({ company: 'Atoms', title: 'AI Research Intern', location: 'San Francisco, CA', jobId: 'a52db0c1-d', stage: 'applied', appliedAt: d(6) }));
    L.push(mk({ company: 'Niantic Spatial', title: 'Software Engineer Intern - Native SDK & Mobile Platforms', location: 'San Francisco, CA', jobId: '3619b4c7-5', stage: 'applied', appliedAt: d(8) }));
    L.push(mk({ company: 'Rhoda AI', title: 'Software Engineer Intern - Inference', location: 'Mountain View, CA', jobId: 'b3c0d835-c', stage: 'applied', appliedAt: d(10) }));
    L.push(mk({ company: 'Intercontinental Exchange', title: 'Data Science Intern', location: 'New York, NY', jobId: 'f58cb7db-5', stage: 'applied', appliedAt: d(9) }));
    L.push(mk({ company: 'Netflix', title: 'Software Engineer Intern', location: 'Los Gatos, CA', jobId: 'fa621e40-4', stage: 'applied', appliedAt: d(14), followedUpAt: d(6) }));
    L.push(mk({ company: 'Courier Health', title: 'Software Engineer Intern', location: 'New York, NY', jobId: '341ad57c-d', stage: 'applied', appliedAt: d(16) }));
    L.push(mk({ company: 'Roblox', title: 'Applied Scientist Intern', location: 'San Mateo, CA', jobId: 'f9a6c34d-a', stage: 'applied', appliedAt: d(18) }));
    L.push(mk({ company: 'Tanium', title: 'Software Engineer Intern - Summer 2027', location: 'Emeryville, CA', jobId: '9cd21651-9', stage: 'applied', appliedAt: d(23) }));
    L.push(mk({ company: 'Talos', title: 'Software Engineer Intern - RFQ', location: 'New York, NY', jobId: '59e5e5be-d', stage: 'applied', appliedAt: d(26) }));
    L.push(mk({ company: 'American Express', title: 'Data Analytics Intern - US Consumer Services', location: 'New York, NY', jobId: 'b18a5562-2', stage: 'applied', appliedAt: d(29) }));
    L.push(mk({ company: 'CACI', title: 'Software Engineer Intern - Summer 2027', location: 'Remote in USA', jobId: 'e772b664-0', stage: 'applied', appliedAt: d(31) }));
    // taken down #1 (applied, job id no longer live)
    L.push(mk({ company: 'Figma', title: 'Software Engineer Intern, Summer 2027', location: 'San Francisco, CA', jobId: 'zz-gone-figma-01', stage: 'applied', appliedAt: d(12), url: 'https://boards.greenhouse.io/figma/jobs/0000001' }));
    L.push(mk({ company: 'Plaid', title: 'Data Engineering Intern', location: 'New York, NY', stage: 'applied', appliedAt: d(34) }));
    // ---------- Screen (6) ----------
    L.push(mk({ company: 'Point72', title: 'Data Scientist Intern', location: 'New York, NY', jobId: '07d9a5af-4', stage: 'screen', appliedAt: d(20), lastReplyAt: d(6), ev: [st(d(6), 'applied', 'screen')],
      rounds: [rd('other', d(0, 23), { interviewers: 'HackerRank', prep: 'Due tonight 11:59 PM' })] }));
    L.push(mk({ company: 'Hex Technologies', title: 'AI Engineer Intern', location: 'San Francisco, CA', jobId: 'a408c971-8', stage: 'screen', appliedAt: d(15), lastReplyAt: d(4), ev: [st(d(4), 'applied', 'screen')],
      rounds: [rd('recruiter', d(1, 14), { interviewers: 'Maya Chen (Recruiter)' })] }));
    L.push(mk({ company: 'Coinbase', title: 'Forward Deployed Engineer Intern - HR Technology', location: 'New York, NY', jobId: '4dacd1f1-1', stage: 'screen', appliedAt: d(19), lastReplyAt: d(9), ev: [st(d(9), 'applied', 'screen')],
      rounds: [rd('recruiter', d(5, 11), { interviewers: 'Sam (Recruiter)' })] }));
    L.push(mk({ company: 'Zipline', title: 'Autonomy Intern', location: 'South San Francisco, CA', jobId: '27be24cd-7', stage: 'screen', appliedAt: d(24), lastReplyAt: d(12), ev: [st(d(12), 'applied', 'screen')],
      rounds: [rd('recruiter', d(11, 15), { outcome: 'passed', thanked: true })] }));
    L.push(mk({ company: 'Eudia', title: 'AI Engineer Intern', location: 'Palo Alto, CA', jobId: 'c22731f2-f', stage: 'screen', appliedAt: d(22), lastReplyAt: d(3), ev: [st(d(3), 'applied', 'screen')],
      rounds: [rd('recruiter', T + 6 * H, { interviewers: 'Priya Nair' , confirmed: true })] }));
    // taken down #2 (screen stage, job id no longer live)
    L.push(mk({ company: 'Ramp', title: 'Software Engineer Intern, Summer 2027', location: 'New York, NY', jobId: 'zz-gone-ramp-02', stage: 'screen', appliedAt: d(21), lastReplyAt: d(10), ev: [st(d(10), 'applied', 'screen')],
      rounds: [rd('other', d(8, 20), { interviewers: 'CodeSignal', outcome: 'passed' })] }));
    // ---------- Interviews (5) ----------
    L.push(mk({ company: 'Databricks', title: 'Software Engineering Intern', location: 'San Francisco, CA', stage: 'interview', appliedAt: d(30), lastReplyAt: d(20), ev: [st(d(20), 'applied', 'screen'), st(d(12), 'screen', 'interview')],
      rounds: [rd('recruiter', d(18, 13), { outcome: 'passed', thanked: true }), rd('technical', d(1, 11), { interviewers: 'Arjun P.' }), rd('technical', T + 1 * DAY + 2 * H, { interviewers: 'Lena K.', confirmed: true })] }));
    L.push(mk({ company: 'Two Sigma', title: 'Quantitative Software Engineer Intern', location: 'New York, NY', stage: 'interview', appliedAt: d(28), lastReplyAt: d(17), ev: [st(d(17), 'applied', 'screen'), st(d(10), 'screen', 'interview')],
      rounds: [rd('recruiter', d(16), { outcome: 'passed', thanked: true }), rd('technical', d(4, 15), { interviewers: 'Two engineers', thanked: true })] }));
    L.push(mk({ company: 'Notion', title: 'Software Engineer Intern', location: 'San Francisco, CA', stage: 'interview', appliedAt: d(25), lastReplyAt: d(14), ev: [st(d(14), 'applied', 'screen'), st(d(7), 'screen', 'interview')],
      rounds: [rd('recruiter', d(13), { outcome: 'passed', thanked: true }), rd('technical', T + 5.5 * H, { interviewers: 'Chris W.', confirmed: true })] }));
    L.push(mk({ company: 'Scale AI', title: 'Machine Learning Research Intern', location: 'San Francisco, CA', stage: 'interview', appliedAt: d(33), lastReplyAt: d(22), ev: [st(d(22), 'applied', 'screen'), st(d(15), 'screen', 'interview')],
      rounds: [rd('recruiter', d(21), { outcome: 'passed', thanked: true }), rd('technical', d(9), { outcome: 'passed', thanked: true }), rd('onsite', d(2, 13), { interviewers: 'Panel of 3' })] }));
    L.push(mk({ company: 'Palantir', title: 'Software Engineer Intern', location: 'New York, NY', stage: 'interview', appliedAt: d(32), lastReplyAt: d(19), ev: [st(d(19), 'applied', 'screen'), st(d(13), 'screen', 'interview')],
      rounds: [rd('recruiter', d(18), { outcome: 'passed', thanked: true }), rd('technical', d(11), { outcome: 'passed', thanked: true })] }));
    // ---------- Offers (2) ----------
    L.push(mk({ company: 'Snowflake', title: 'Software Engineer Intern', location: 'San Mateo, CA', stage: 'offer', appliedAt: d(35), lastReplyAt: d(1), ev: [st(d(27), 'applied', 'screen'), st(d(20), 'screen', 'interview'), st(d(1), 'interview', 'offer')], salary: '$58/hr',
      notes: 'Offer deadline Nov 13. Ask about team match.', rounds: [rd('recruiter', d(26), { outcome: 'passed', thanked: true }), rd('technical', d(18), { outcome: 'passed', thanked: true }), rd('onsite', d(8), { outcome: 'passed', thanked: true })] }));
    L.push(mk({ company: 'Capital One', title: 'Technology Internship Program', location: 'McLean, VA', stage: 'offer', appliedAt: d(34), lastReplyAt: d(6), ev: [st(d(28), 'applied', 'screen'), st(d(21), 'screen', 'interview'), st(d(6), 'interview', 'offer')],
      notes: 'Exploding offer: respond by Nov 6.', rounds: [rd('recruiter', d(27), { outcome: 'passed', thanked: true }), rd('onsite', d(14), { outcome: 'passed', thanked: true })] }));
    // ---------- Rejected (6) ----------
    [['Meta', 'Software Engineer Intern', 32, 11], ['Google', 'Software Engineering Intern, BS', 34, 6], ['Airbnb', 'Software Engineer Intern', 27, 19], ['Robinhood', 'Software Engineer Intern, Backend', 20, 13], ['Duolingo', 'Software Engineer Intern', 17, 15], ['Jane Street', 'Software Engineer Intern', 30, 24]]
      .forEach(([c, ti, ap, rj]) => L.push(mk({ company: c, title: ti, location: 'New York, NY', stage: 'rejected', appliedAt: d(ap), lastReplyAt: d(rj), ev: [st(d(rj), 'applied', 'rejected')] })));
    // ---------- Ghosted (3) ----------
    [['Sage', 'Software Engineer Intern - Full Stack', 'bc4407ea-4', 35, 8], ['Eulerity', 'Backend Developer Intern', '7ae95eff-5', 34, 7], ['Pinterest', 'Software Engineer Intern', null, 33, 5]]
      .forEach(([c, ti, j, ap, gh]) => L.push(mk({ company: c, title: ti, location: 'New York, NY', jobId: j, stage: 'ghosted', appliedAt: d(ap), ev: [st(d(gh), 'applied', 'ghosted')] })));
    // ---------- Saved (2) ----------
    L.push(mk({ company: 'Intel', title: 'Software Engineer Intern', location: 'Austin, TX', jobId: 'ac297577-f', stage: 'saved', createdAt: d(5) }));
    L.push(mk({ company: 'Meta', title: 'Research Scientist Intern - PAR Safety Evals and Red Teaming', location: 'Menlo Park, CA', jobId: '94f5d650-2', stage: 'saved', createdAt: d(0, 7) }));
    store.save();
    const all = Apps.list();
    const by = {}; all.forEach((a) => { by[a.stage] = (by[a.stage] || 0) + 1; });
    return { n: all.length, by, tasks: computeTasks().map((x) => `${x.pri} ${x.kind} ${x.title}`) };
  });
  console.log(JSON.stringify(res, null, 1));
  await page.waitForTimeout(800);
  await t.go('today');
  await t.shot('today-after-seed', true);
});
