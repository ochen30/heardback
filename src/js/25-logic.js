/* ===== Nudges: what to do today ===== */
function computeTasks(s = store.get()) {
  const t = now();
  const out = [];
  const dis = s.dismissed || {};
  const skip = (key) => dis[key] && dis[key] > t;
  const apps = Apps.list(s);
  for (const a of apps) {
    for (const r of a.rounds || []) {
      if (!r.at) continue;
      const until = r.at - t;
      if (until > 0 && until < 3 * DAY) {
        const key = `prep:${a.id}:${r.id}`;
        if (!skip(key)) out.push({ key, kind: "prep", pri: until < DAY ? 0 : 1, app: a, round: r, icon: "cal", tone: "accent", title: `${ROUND[r.type]?.label || "Interview"} with ${a.company} ${fmt.until(r.at)}`, sub: `${fmt.dateTime(r.at)}${r.interviewers ? " · " + r.interviewers : ""}`, action: "Prep" });
      }
      if (until <= 0 && -until < 2 * DAY && !r.thanked && r.outcome === "pending") {
        const key = `thanks:${a.id}:${r.id}`;
        if (!skip(key)) out.push({ key, kind: "thanks", pri: 0, app: a, round: r, icon: "send", tone: "ok", title: `Send a thank-you note to ${a.company}`, sub: `Within 24 hours of your ${(ROUND[r.type]?.label || "interview").toLowerCase()}${r.interviewers ? " with " + r.interviewers : ""}`, action: "Draft note" });
      }
      if (until <= -DAY && r.outcome === "pending") {
        const key = `outcome:${a.id}:${r.id}`;
        if (!skip(key)) out.push({ key, kind: "outcome", pri: 2, app: a, round: r, icon: "flag", tone: "", title: `How did the ${a.company} ${(ROUND[r.type]?.label || "interview").toLowerCase()} go?`, sub: `It was ${fmt.ago(r.at)}. Log the outcome and a few notes while you remember.`, action: "Log outcome" });
      }
    }
    if (["applied", "screen", "interview"].includes(a.stage)) {
      const silent = Apps.daysSilent(a);
      const upcoming = (a.rounds || []).some((r) => r.at && r.at > t);
      if (!upcoming && silent >= s.settings.ghostDays) {
        const key = `ghost:${a.id}`;
        if (!skip(key)) out.push({ key, kind: "ghost", pri: 3, app: a, icon: "ghost", tone: "ghost", title: `No reply from ${a.company} in ${silent} days`, sub: "Most companies reply within 3 weeks if they're interested. Mark it as ghosted to keep your board honest.", action: "Mark ghosted" });
      } else if (!upcoming && a.stage === "applied" && silent >= s.settings.followUpDays && !a.followedUpAt) {
        const key = `follow:${a.id}`;
        if (!skip(key)) out.push({ key, kind: "follow", pri: 2, app: a, icon: "reply", tone: "wait", title: `Follow up with ${a.company}`, sub: `You applied ${silent} days ago and haven't heard back.`, action: "Draft follow-up" });
      }
    }
    if (a.stage === "saved") {
      const age = Math.floor((t - a.createdAt) / DAY);
      const job = a.jobId ? jobsStore.byId.get(a.jobId) : null;
      if (age >= 3) {
        const key = `apply:${a.id}`;
        if (!skip(key)) out.push({ key, kind: "apply", pri: 4, app: a, icon: "bolt", tone: "", title: `Apply to ${a.company}`, sub: `Saved ${age} days ago${job && job.g >= 50 ? " · this listing shows ghost-job signs" : ". Early applicants get more replies."}`, action: "Open" });
      }
    }
  }
  out.sort((x, y) => x.pri - y.pri);
  return out;
}
function dismissTask(key, days = 365) { store.set((s) => ({ ...s, dismissed: { ...s.dismissed, [key]: now() + days * DAY } })); }

/* ===== Personal stats ===== */
function computeStats(s = store.get(), apps = Apps.list(s)) {
  const applied = apps.filter((a) => a.stage !== "saved" && a.appliedAt);
  const replied = applied.filter((a) => a.lastReplyAt || ["screen", "interview", "offer", "rejected"].includes(a.stage));
  const interviewed = applied.filter((a) => ["interview", "offer"].includes(a.stage) || (a.rounds || []).length || a.events.some((e) => e.to === "interview"));
  const offers = applied.filter((a) => a.stage === "offer" || a.events.some((e) => e.to === "offer"));
  const replyDays = replied.map((a) => a.lastReplyAt && a.appliedAt ? (firstReplyAt(a) - a.appliedAt) / DAY : null).filter((x) => x != null && x >= 0);
  const median = (arr) => { if (!arr.length) return null; const v = [...arr].sort((a, b) => a - b); const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  const weekStart = startOfWeek(now());
  const thisWeek = applied.filter((a) => a.appliedAt >= weekStart).length;
  const weeks = [];
  for (let i = 7; i >= 0; i--) { const ws = weekStart - i * 7 * DAY; weeks.push({ start: ws, applied: applied.filter((a) => a.appliedAt >= ws && a.appliedAt < ws + 7 * DAY).length, replies: replied.filter((a) => { const r = firstReplyAt(a); return r && r >= ws && r < ws + 7 * DAY; }).length }); }
  return {
    total: apps.length, applied: applied.length, replied: replied.length, interviewed: interviewed.length, offers: offers.length,
    ghosted: applied.filter((a) => a.stage === "ghosted").length, rejected: applied.filter((a) => a.stage === "rejected").length,
    responseRate: applied.length ? replied.length / applied.length : null,
    interviewRate: applied.length ? interviewed.length / applied.length : null,
    medianReplyDays: median(replyDays), thisWeek, weeks,
    active: apps.filter((a) => ACTIVE_STAGES.includes(a.stage)).length,
  };
}
function firstReplyAt(a) {
  const e = (a.events || []).find((e) => e.kind === "stage" && ["screen", "interview", "offer", "rejected"].includes(e.to));
  return e ? e.at : a.lastReplyAt;
}
function startOfWeek(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); const day = (d.getDay() + 6) % 7; return d.getTime() - day * DAY; }

/* ===== Example pipeline (fictional companies, clearly labeled) ===== */
function loadExamples() {
  const base = new Date(); base.setHours(10, 0, 0, 0);
  const t = base.getTime();
  const d = (n) => t - n * DAY + ((n * 5) % 7) * 3600000 + ((n % 2) * 1800000);
  const mk = (o) => {
    const ev = [{ id: uid("e_"), at: o.createdAt, kind: "created", text: "Saved" }];
    if (o.appliedAt) ev.push({ id: uid("e_"), at: o.appliedAt, kind: "stage", from: "saved", to: "applied", text: "Moved to Applied" });
    (o.extra || []).forEach((e) => ev.push({ id: uid("e_"), ...e }));
    const a = { id: uid("a_"), jobId: null, location: "", url: "", notes: "", contacts: [], rounds: [], salary: "", source: "example", example: true, lastReplyAt: null, ...o, events: ev, lastActivityAt: o.lastActivityAt || ev[ev.length - 1].at };
    delete a.extra; return a;
  };
  const list = [
    mk({ company: "Northwind Labs", title: "Software Engineer Intern, Summer 2027", location: "Seattle, WA", stage: "interview", createdAt: d(19), appliedAt: d(18), lastReplyAt: d(9),
      extra: [{ at: d(9), kind: "stage", from: "applied", to: "screen", text: "Moved to Screen" }, { at: d(4), kind: "stage", from: "screen", to: "interview", text: "Moved to Interviews" }],
      rounds: [{ id: uid("r_"), type: "recruiter", at: d(7), interviewers: "Dana (Recruiter)", prep: "", reflection: "Friendly. Asked about timeline and interests.", outcome: "passed", thanked: true },
               { id: uid("r_"), type: "technical", at: t + 1 * DAY + 3 * 3600000, interviewers: "Priya S., Tom L.", prep: "Graphs, BFS/DFS, one design question", reflection: "", outcome: "pending", thanked: false }] }),
    mk({ company: "Fernhill Capital", title: "Quantitative Research Intern", location: "New York, NY", stage: "screen", createdAt: d(12), appliedAt: d(12), lastReplyAt: d(2),
      extra: [{ at: d(2), kind: "stage", from: "applied", to: "screen", text: "Moved to Screen" }],
      rounds: [{ id: uid("r_"), type: "recruiter", at: d(1) + 2 * 3600000, interviewers: "Marcus", prep: "", reflection: "", outcome: "pending", thanked: false }] }),
    mk({ company: "Lumen Robotics", title: "Embedded Software Engineer, New Grad", location: "Boston, MA", stage: "applied", createdAt: d(11), appliedAt: d(10) }),
    mk({ company: "Quarry Analytics", title: "Data Science Intern", location: "Remote", stage: "applied", createdAt: d(27), appliedAt: d(26) }),
    mk({ company: "Bluepeak Health", title: "Product Manager Intern", location: "San Francisco, CA", stage: "rejected", createdAt: d(30), appliedAt: d(29), lastReplyAt: d(15),
      extra: [{ at: d(15), kind: "stage", from: "applied", to: "rejected", text: "Moved to Rejected" }] }),
    mk({ company: "Harbor & Finch", title: "Software Engineer, New Grad", location: "Chicago, IL", stage: "offer", createdAt: d(40), appliedAt: d(39), lastReplyAt: d(3),
      extra: [{ at: d(31), kind: "stage", from: "applied", to: "screen", text: "Moved to Screen" }, { at: d(24), kind: "stage", from: "screen", to: "interview", text: "Moved to Interviews" }, { at: d(3), kind: "stage", from: "interview", to: "offer", text: "Moved to Offer" }],
      rounds: [{ id: uid("r_"), type: "recruiter", at: d(29), interviewers: "Ana", outcome: "passed", thanked: true, prep: "", reflection: "" }, { id: uid("r_"), type: "technical", at: d(20), interviewers: "Kai", outcome: "passed", thanked: true, prep: "", reflection: "Two medium problems. Went well." }, { id: uid("r_"), type: "onsite", at: d(9), interviewers: "Panel of 4", outcome: "passed", thanked: true, prep: "", reflection: "" }] }),
    mk({ company: "Meridian Grid", title: "Machine Learning Engineer Intern", location: "Austin, TX", stage: "ghosted", createdAt: d(45), appliedAt: d(44), extra: [{ at: d(20), kind: "stage", from: "applied", to: "ghosted", text: "Marked as ghosted" }] }),
    mk({ company: "Ostrich Systems", title: "Backend Engineer Intern", location: "Remote", stage: "saved", createdAt: d(4) }),
    mk({ company: "Cobalt Atlas", title: "Hardware Engineering Intern", location: "San Jose, CA", stage: "saved", createdAt: d(1) }),
    mk({ company: "Verity Labs", title: "Frontend Engineer, New Grad", location: "New York, NY", stage: "applied", createdAt: d(3), appliedAt: d(3) }),
  ];
  store.set((s) => ({ ...s, apps: { ...s.apps, ...Object.fromEntries(list.map((a) => [a.id, a])) }, settings: { ...s.settings, showExamples: true } }));
  toast("Added 10 example applications");
}
function clearExamples() {
  store.set((s) => ({ ...s, apps: Object.fromEntries(Object.entries(s.apps).filter(([, a]) => !a.example)) }));
  toast("Example applications removed");
}
function hasExamples(s = store.get()) { return Object.values(s.apps).some((a) => a.example); }

/* ===== Templates (used when Claude isn't available) ===== */
function followUpTemplate(a, profile) {
  return `Subject: Following up on my ${a.title || "application"}\n\nHi ${a.contacts?.[0]?.name || "there"},\n\nI applied for the ${a.title || "role"} at ${a.company} on ${fmt.date(a.appliedAt)} and wanted to follow up. I'm still very interested in the role and in what ${a.company} is building.\n\nIf it's helpful, I'm happy to share more about my experience or availability. Thanks for your time.\n\nBest,\n${profile.name || "[Your name]"}`;
}
function thankYouTemplate(a, r, profile) {
  const who = (r?.interviewers || "").split(/[,&]| and /)[0].replace(/\(.*?\)/g, "").trim().split(/\s+/)[0];
  return `Subject: Thank you, ${ROUND[r?.type]?.label || "interview"} for ${a.title || "the role"}\n\nHi ${who || "there"},\n\nThank you for taking the time to talk with me today about the ${a.title || "role"} at ${a.company}. I enjoyed learning more about the team and the work you're doing.\n\nOur conversation made me even more excited about the opportunity. Please let me know if there's anything else I can share.\n\nBest,\n${profile.name || "[Your name]"}`;
}
