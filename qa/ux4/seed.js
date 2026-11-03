// Seed: onboarded student, 6 apps. Datadog recruiter call today 4 PM, Stripe technical tomorrow 2 PM, Figma technical yesterday (outcome pending).
// Run: FRESH=1 [MOCK=1] TAG=seed node qa/ux4/seed.js
const { run } = require('./h');
run(async (t) => {
  const { page } = t;
  await t.go('today');
  await t.shot('first-load');
  const res = await page.evaluate(() => {
    const T = now(); const H = 3600000;
    const at = (dayOff, h, m = 0) => { const x = new Date(T + dayOff * DAY); x.setHours(h, m, 0, 0); return x.getTime(); };
    store.set((s) => ({ ...s, profile: { ...s.profile, roles: ['Software'], levels: ['intern'], locations: ['sf bay area', 'new york', 'remote'], remote: true, needsSponsor: false, onboarded: true, name: 'Maya Patel', weeklyGoal: 8, degree: 'BS',
      resume: `Maya Patel | maya.patel@berkeley.edu | github.com/mayap
EDUCATION
University of California, Berkeley — B.S. Electrical Engineering & Computer Sciences, expected May 2028. GPA 3.8. Coursework: Data Structures (CS 61B), Algorithms (CS 170), Operating Systems (CS 162), Databases (CS 186).
EXPERIENCE
Software Engineering Intern, Brex (Summer 2026) — Built an idempotent retry layer for card-authorization webhooks in Go and PostgreSQL; cut duplicate charge incidents from ~30/week to 0. Added p95 latency dashboards in Datadog; reduced alert noise 45%.
Undergraduate Researcher, Berkeley RISELab (Jan 2026–present) — Wrote a Python benchmark harness for distributed query engines; profiled Spark jobs and found a shuffle bottleneck that cut runtime 22%.
PROJECTS
SplitSmart — React + Node.js expense-splitting app with Stripe Connect test-mode payouts; 1,200 users across 4 dorms. Designed the ledger schema so balances are always derivable from immutable entries.
Rate limiter — token-bucket rate limiter in Rust with Redis backing; load-tested to 50k req/s.
SKILLS
Go, Python, Java, TypeScript, React, Node.js, SQL, PostgreSQL, Redis, Docker, AWS, Git, Linux`,
      skills: ['Go', 'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'Algorithms'] },
      settings: { ...s.settings, showExamples: false } }));
    const mk = (fields, rounds = [], fix = {}) => {
      const a = Apps.create(fields);
      rounds.forEach((r) => Apps.addRound(a.id, r));
      Apps.update(a.id, fix);
      return a.id;
    };
    const ids = {};
    ids.stripe = mk({ company: 'Stripe', title: 'Software Engineer Intern, Summer 2027', location: 'San Francisco, CA', stage: 'interview', appliedAt: at(-24, 21), createdAt: at(-24, 20), url: 'https://stripe.com/jobs/listing/software-engineer-intern/6000000' },
      [{ type: 'recruiter', at: at(-10, 11), interviewers: 'Hannah Okafor (University Recruiter)', outcome: 'passed', thanked: true },
       { type: 'technical', at: at(1, 14), interviewers: 'Daniel Cho (Software Engineer, Payments)' }],
      { lastReplyAt: at(-6, 15), notes: 'Hannah said the tech round is a 60-min pair-programming exercise in your own IDE. No LeetCode; practical bug-fixing + an API.' });
    ids.datadog = mk({ company: 'Datadog', title: 'Software Engineering Intern - Summer 2027', location: 'New York, NY', stage: 'screen', appliedAt: at(-12, 22), createdAt: at(-12, 21) },
      [{ type: 'recruiter', at: at(0, 16), interviewers: 'Jordan Reyes (Technical Recruiter)' }],
      { lastReplyAt: at(-3, 9) });
    ids.figma = mk({ company: 'Figma', title: 'Software Engineer Intern', location: 'San Francisco, CA', stage: 'interview', appliedAt: at(-30, 20), createdAt: at(-30, 19) },
      [{ type: 'recruiter', at: at(-16, 13), interviewers: 'Lisa Tran (Recruiter)', outcome: 'passed', thanked: true },
       { type: 'technical', at: at(-1, 11), interviewers: 'Marcus Webb (Senior Software Engineer)' }],
      { lastReplyAt: at(-8, 10) });
    ids.airbnb = mk({ company: 'Airbnb', title: 'Software Engineering Intern', location: 'San Francisco, CA', stage: 'applied', appliedAt: at(-9, 23), createdAt: at(-9, 22) }, [], { lastReplyAt: null });
    ids.ramp = mk({ company: 'Ramp', title: 'Software Engineer Intern', location: 'New York, NY', stage: 'rejected', appliedAt: at(-27, 20), createdAt: at(-27, 19) }, [], { lastReplyAt: at(-5, 12) });
    ids.notion = mk({ company: 'Notion', title: 'Software Engineer, Intern', location: 'San Francisco, CA', stage: 'saved', createdAt: at(-2, 18) }, [], {});
    store.save && store.save();
    const all = Apps.list();
    return { ids, n: all.length, rounds: all.flatMap((a) => a.rounds.map((r) => `${a.company} ${r.type} ${new Date(r.at).toString().slice(0, 21)} ${r.outcome}`)), tasks: computeTasks().map((x) => `${x.pri} ${x.kind} ${x.title}`) };
  });
  console.log(JSON.stringify(res, null, 1));
  await page.waitForTimeout(800);
  await t.go('today');
  await t.shot('today-after-seed', true);
  await t.text('main', 3000);
});
