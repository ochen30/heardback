/* ===== Job data (published files next to the page) ===== */
const jobsStore = { status: "idle", jobs: [], companies: [], cstats: {}, meta: null, byId: new Map(), byCompany: new Map(), error: null };
const jobSubs = new Set();
function useJobs() { const [v, setV] = useState({ ...jobsStore }); useEffect(() => { const f = () => setV({ ...jobsStore }); jobSubs.add(f); f(); return () => jobSubs.delete(f); }, []); return v; }
async function loadJobs() {
  if (jobsStore.status === "loading") return;
  jobsStore.status = "loading"; jobsStore.error = null; jobSubs.forEach((f) => f());
  try {
    const [jr, cr] = await Promise.all([fetch("data/jobs.json"), fetch("data/companies.json")]);
    if (!jr.ok) throw new Error(`jobs ${jr.status}`);
    const j = await jr.json();
    const c = cr.ok ? await cr.json() : { companies: {} };
    const companies = j.companies || [];
    const jobs = (j.jobs || []).map((x) => {
      const co = companies[x.c] || "Unknown";
      return { ...x, co, p: x.p * 1000, u: (x.u || x.p) * 1000, _s: norm(`${x.t} ${co} ${(x.l || []).join(" ")}`) };
    });
    jobs.sort((a, b) => b.p - a.p);
    const byId = new Map(jobs.map((x) => [x.id, x]));
    const byCompany = new Map();
    for (const x of jobs) { if (!byCompany.has(x.co)) byCompany.set(x.co, []); byCompany.get(x.co).push(x); }
    const cstats = {};
    for (const [k, v] of Object.entries(c.companies || {})) cstats[v.n || companies[+k]] = v;
    Object.assign(jobsStore, { status: "ready", jobs, companies, cstats, meta: { generatedAt: j.generatedAt, source: j.source, stats: j.stats }, byId, byCompany });
  } catch (e) {
    jobsStore.status = "error"; jobsStore.error = String(e?.message || e);
  }
  jobSubs.forEach((f) => f());
}

const LOC_ALIASES = {
  "sf bay area": ["san francisco", "bay area", "mountain view", "palo alto", "sunnyvale", "san jose", "menlo park", "redwood city", "santa clara", "cupertino", "oakland", "berkeley", "foster city", "san mateo", "south san francisco", "san bruno", "milpitas", "fremont", "emeryville"],
  "new york": ["new york", "nyc", "brooklyn", "manhattan", "jersey city", "hoboken"],
  "seattle": ["seattle", "bellevue", "redmond", "kirkland"],
  "boston": ["boston", "cambridge, ma", "somerville", "waltham"],
  "los angeles": ["los angeles", "santa monica", "irvine", "culver city", "pasadena", "el segundo", "long beach"],
  "chicago": ["chicago"],
  "austin": ["austin"],
  "washington dc": ["washington, dc", "washington dc", "arlington, va", "mclean", "reston", "bethesda", "herndon", "tysons"],
  "denver": ["denver", "boulder"],
  "atlanta": ["atlanta"],
  "dallas": ["dallas", "plano", "irving", "frisco", "fort worth"],
  "canada": ["canada", "toronto", "vancouver", "montreal", "waterloo", "ottawa", "on, canada", "bc, canada"],
  "remote": ["remote"],
};
const LOC_OPTIONS = [
  { id: "remote", label: "Remote" }, { id: "sf bay area", label: "SF Bay Area" }, { id: "new york", label: "New York" }, { id: "seattle", label: "Seattle" },
  { id: "boston", label: "Boston" }, { id: "los angeles", label: "Los Angeles" }, { id: "chicago", label: "Chicago" }, { id: "austin", label: "Austin" },
  { id: "washington dc", label: "Washington, DC" }, { id: "denver", label: "Denver" }, { id: "atlanta", label: "Atlanta" }, { id: "dallas", label: "Dallas" }, { id: "canada", label: "Canada" },
];
function jobInLoc(job, locId) {
  const al = LOC_ALIASES[locId] || [locId];
  const ls = (job.l || []).map((x) => x.toLowerCase());
  if (locId === "remote") return !!job.r;
  return ls.some((l) => al.some((a) => l.includes(a)));
}

/* ===== Skills: deterministic extraction from resume text ===== */
const SKILLS = [
  ["Python", /\bpython\b/i], ["Java", /\bjava\b(?!script)/i], ["JavaScript", /\bjavascript\b|\bjs\b/i], ["TypeScript", /\btypescript\b|\bts\b/i], ["C++", /c\+\+|\bcpp\b/i], ["C", /\bC\b(?![+#])/], ["C#", /c#/i], ["Go", /\bgolang\b|\bgo\b(?= |,|\/)/], ["Rust", /\brust\b/i], ["Kotlin", /\bkotlin\b/i], ["Swift", /\bswift\b/i], ["Ruby", /\bruby\b/i], ["Scala", /\bscala\b/i], ["R", /\bR\b(?=[ ,/)])/], ["MATLAB", /\bmatlab\b/i], ["SQL", /\bsql\b|postgres|mysql|sqlite/i], ["Bash", /\bbash\b|shell script/i],
  ["React", /\breact(\.js|js)?\b/i], ["Node.js", /\bnode(\.js|js)?\b/i], ["Next.js", /next\.js|nextjs/i], ["Vue", /\bvue\b/i], ["Angular", /\bangular\b/i], ["HTML/CSS", /\bhtml\b|\bcss\b/i], ["Django", /\bdjango\b/i], ["Flask", /\bflask\b/i], ["FastAPI", /fastapi/i], ["Spring", /\bspring\b/i], ["GraphQL", /graphql/i], ["REST APIs", /\brest(ful)?\b|\bapi(s)?\b/i],
  ["AWS", /\baws\b|amazon web services/i], ["GCP", /\bgcp\b|google cloud/i], ["Azure", /\bazure\b/i], ["Docker", /docker/i], ["Kubernetes", /kubernetes|\bk8s\b/i], ["Linux", /linux|unix/i], ["Git", /\bgit\b|github/i], ["CI/CD", /ci\/cd|github actions|jenkins/i], ["Terraform", /terraform/i],
  ["Machine Learning", /machine learning|\bml\b/i], ["Deep Learning", /deep learning|neural net/i], ["PyTorch", /pytorch/i], ["TensorFlow", /tensorflow|keras/i], ["scikit-learn", /scikit|sklearn/i], ["NLP", /\bnlp\b|natural language/i], ["LLMs", /\bllms?\b|large language|gpt|transformer/i], ["Computer Vision", /computer vision|opencv|\bcv\b/i], ["Pandas", /pandas/i], ["NumPy", /numpy/i], ["Spark", /\bspark\b|pyspark/i], ["Statistics", /statistic|regression|hypothesis test|a\/b test/i], ["Data Analysis", /data analy/i], ["Tableau", /tableau|power bi|looker/i], ["Excel", /\bexcel\b/i],
  ["iOS", /\bios\b|swiftui/i], ["Android", /android/i], ["Embedded", /embedded|firmware|microcontroller|rtos|arduino/i], ["FPGA", /fpga|verilog|vhdl|systemverilog/i], ["Circuit Design", /circuit|pcb|analog|altium|cadence/i], ["Robotics", /robotic|\bros\b/i], ["CAD", /solidworks|\bcad\b|autocad|fusion 360/i],
  ["Distributed Systems", /distributed system/i], ["Systems", /operating system|\bos\b kernel|low[- ]latency/i], ["Security", /security|cryptograph|penetration/i], ["Algorithms", /algorithm|data structure|leetcode/i],
  ["Product Management", /product manage|roadmap|prd\b|product spec/i], ["UX Research", /user research|ux research|usability/i], ["Figma", /figma/i], ["Quant Research", /quant|stochastic|derivatives|options pricing|time series/i], ["Trading", /trading|market making/i], ["Finance", /finance|financial model|valuation|dcf/i],
];
function extractSkills(text) {
  if (!text) return [];
  const found = [];
  for (const [name, re] of SKILLS) if (re.test(text)) found.push(name);
  return found;
}
const TITLE_SKILL_HINTS = [
  [/machine learning|\bml\b|ai\b|artificial intelligence/i, ["Machine Learning", "PyTorch", "TensorFlow", "Deep Learning", "Python"]],
  [/data scien|analytics|analyst|data engineer/i, ["Python", "SQL", "Statistics", "Data Analysis", "Pandas"]],
  [/front[- ]?end|web|ui engineer/i, ["JavaScript", "TypeScript", "React", "HTML/CSS"]],
  [/back[- ]?end|platform|infrastructure|cloud|devops|site reliability|sre/i, ["Distributed Systems", "AWS", "Docker", "Kubernetes", "Go", "Java", "Python"]],
  [/full[- ]?stack/i, ["JavaScript", "React", "Node.js", "SQL"]],
  [/\bios\b|mobile/i, ["iOS", "Swift", "Android", "Kotlin"]],
  [/android/i, ["Android", "Kotlin", "Java"]],
  [/embedded|firmware/i, ["Embedded", "C", "C++"]],
  [/fpga|asic|hardware|silicon|chip|electrical/i, ["FPGA", "Circuit Design", "C++"]],
  [/mechanical/i, ["CAD"]],
  [/robot/i, ["Robotics", "C++", "Python"]],
  [/security|cyber/i, ["Security", "Linux"]],
  [/quant|trad/i, ["Quant Research", "Statistics", "Python", "C++"]],
  [/product manag|\bapm\b|\bpm\b/i, ["Product Management"]],
  [/design|ux/i, ["Figma", "UX Research"]],
  [/software|swe|engineer|developer/i, ["Algorithms", "Python", "Java", "C++", "Git"]],
];
function expectedSkills(job) {
  const out = [];
  for (const [re, skills] of TITLE_SKILL_HINTS) if (re.test(job.t)) for (const s of skills) if (!out.includes(s)) out.push(s);
  return out.slice(0, 8);
}

/* ===== Fit score: transparent, based only on what the listing states ===== */
function fitScore(job, profile) {
  if (!profile || (!profile.roles?.length && !profile.locations?.length && !profile.skills?.length)) return null;
  const parts = [];
  let score = 0, max = 0;
  // role (35)
  max += 35;
  if (!profile.roles?.length) { score += 20; parts.push({ k: "Role", ok: null, text: "No target roles set" }); }
  else if (profile.roles.includes(job.cat)) { score += 35; parts.push({ k: "Role", ok: true, text: `${job.cat} matches your targets` }); }
  else parts.push({ k: "Role", ok: false, text: `${job.cat} is outside your targets` });
  // level (15)
  max += 15;
  const lv = profile.levels?.length ? profile.levels : ["intern", "newgrad"];
  if (lv.includes(job.lvl)) { score += 15; parts.push({ k: "Level", ok: true, text: job.lvl === "intern" ? "Internship" : "New grad role" }); }
  else parts.push({ k: "Level", ok: false, text: job.lvl === "intern" ? "Internship, you're looking for full-time" : "Full-time, you're looking for internships" });
  // location (20)
  max += 20;
  const locs = profile.locations || [];
  if (!locs.length) { score += 14; parts.push({ k: "Location", ok: null, text: "Open to any location" }); }
  else {
    const hit = locs.find((l) => jobInLoc(job, l)) || (profile.remote && job.r ? "remote" : null);
    if (hit) { score += 20; parts.push({ k: "Location", ok: true, text: hit === "remote" ? "Remote option" : `In ${LOC_OPTIONS.find((o) => o.id === hit)?.label || hit}` }); }
    else parts.push({ k: "Location", ok: false, text: `${(job.l || [])[0] || "Location"} isn't on your list` });
  }
  // sponsorship (10)
  max += 10;
  if (profile.needsSponsor) {
    if (job.sp === "yes") { score += 10; parts.push({ k: "Visa", ok: true, text: "Offers sponsorship" }); }
    else if (job.sp === "no" || job.sp === "citizen") parts.push({ k: "Visa", ok: false, text: job.sp === "citizen" ? "Requires U.S. citizenship" : "Doesn't sponsor visas" });
    else { score += 4; parts.push({ k: "Visa", ok: null, text: "Sponsorship not stated" }); }
  } else { score += 10; }
  // skills (20)
  max += 20;
  const exp = expectedSkills(job);
  const have = new Set(profile.skills || []);
  const matched = exp.filter((s) => have.has(s));
  const missing = exp.filter((s) => !have.has(s));
  if (!profile.skills?.length) { score += 8; parts.push({ k: "Skills", ok: null, text: "Add your resume to compare skills" }); }
  else if (!exp.length) { score += 12; parts.push({ k: "Skills", ok: null, text: "Title doesn't point to specific skills" }); }
  else {
    const r = matched.length / Math.min(exp.length, 4);
    score += Math.round(20 * Math.min(1, r));
    parts.push({ k: "Skills", ok: matched.length ? true : false, text: matched.length ? `You list ${matched.slice(0, 3).join(", ")}` : `Usually asks for ${exp.slice(0, 3).join(", ")}` });
  }
  return { score: Math.round((score / max) * 100), parts, matched, missing, expected: exp };
}

/* ===== Email parsing (rule-based; Claude upgrade lives in the paste modal) ===== */
const EMAIL_KINDS = {
  confirmation: { label: "Application received", stage: "applied" },
  interview: { label: "Interview invite", stage: "interview" },
  screen: { label: "Recruiter screen", stage: "screen" },
  rejection: { label: "Rejection", stage: "rejected" },
  offer: { label: "Offer", stage: "offer" },
  other: { label: "Update", stage: null },
};
function parseEmail(raw) {
  const text = (raw || "").replace(/\r/g, "");
  const low = text.toLowerCase();
  const hdr = (name) => { const m = text.match(new RegExp(`^${name}:\\s*(.+)$`, "im")); return m ? m[1].trim() : ""; };
  const from = hdr("From"), subject = hdr("Subject"), dateH = hdr("Date");
  let kind = "other";
  const has = (...ps) => ps.some((p) => low.includes(p));
  if (has("pleased to offer", "extend an offer", "offer letter", "excited to offer", "formal offer", "offer of employment")) kind = "offer";
  else if (has("unfortunately", "not to move forward", "not be moving forward", "decided to pursue other", "move forward with other", "regret to inform", "position has been filled", "not selected", "will not be proceeding", "other candidates whose", "decided not to proceed")) kind = "rejection";
  else if (has("phone screen", "recruiter call", "initial call", "quick chat", "intro call", "screening call")) kind = "screen";
  else if (has("interview", "schedule a time", "your availability", "calendly", "next round", "onsite", "superday", "technical assessment", "coding challenge", "hackerrank", "codesignal")) kind = "interview";
  else if (has("thank you for applying", "received your application", "application has been received", "we have received your", "thanks for applying", "application was submitted", "successfully submitted", "thank you for your application", "thank you for your interest")) kind = "confirmation";

  // company
  let company = "";
  const pats = [
    /thank you for (?:applying|your (?:application|interest)) (?:to|at|in|with) ([A-Z][\w&.'\- ]{1,40}?)(?:[.!,\n]| for | and )/,
    /(?:position|role|opportunity|job) (?:at|with) ([A-Z][\w&.'\- ]{1,40}?)(?:[.!,\n]| and )/,
    /(?:join|joining) (?:the )?([A-Z][\w&.'\- ]{1,40}?) (?:team|family)/,
    /interest in (?:joining )?([A-Z][\w&.'\- ]{1,40}?)(?:[.!,\n]| and )/,
    /^(?:the )?([A-Z][\w&.'\- ]{1,30}?) (?:Recruiting|Talent|Careers|Hiring) Team/m,
  ];
  for (const re of pats) { const m = text.match(re); if (m) { company = m[1].trim().replace(/^the /i, ""); break; } }
  if (!company && from) {
    const nm = from.match(/^"?([^"<@]+?)"?\s*</);
    const dom = from.match(/@([a-z0-9-]+)\./i);
    if (nm && !/no-?reply|notifications|recruit|talent|careers|hiring|workday|greenhouse|lever|ashby/i.test(nm[1])) company = nm[1].replace(/\s+(Recruiting|Careers|Talent).*$/i, "").trim();
    else if (dom && !/gmail|outlook|yahoo|greenhouse|lever|myworkday|workday|ashbyhq|icims|smartrecruiters|hire|jobvite|taleo/i.test(dom[1])) company = dom[1][0].toUpperCase() + dom[1].slice(1);
  }
  if (!company && subject) { const m = subject.match(/(?:at|from|with)\s+([A-Z][\w&.'\- ]{1,30})/); if (m) company = m[1].trim(); }
  if (/^(our|the|we|us|this)$/i.test(company)) company = "";

  // role
  let title = "";
  const tp = [
    /for (?:the )?(?:position of |role of )?["“]?([A-Z][\w&/,()+.'\- ]{2,70}?)["”]? (?:position|role|opening|internship)/,
    /(?:application|applying|interview|candidacy) for (?:the )?["“]?([A-Z][\w&/()+.'\- ]{2,70}?)["”]?(?: position| role| opening)?(?: at | with |[.!,\n(])/,
    /(?:position|role):\s*([^\n]{3,70})/i,
  ];
  for (const re of tp) { const m = text.match(re); if (m) { title = m[1].trim(); break; } }
  if (!title && subject) { const m = subject.match(/[-–:|]\s*([A-Z][^-–:|]{3,60}(?:Intern|Engineer|Analyst|Scientist|Developer|Manager|Designer|Associate)[^-–:|]*)/); if (m) title = m[1].trim(); }

  // date
  let at = dateH ? Date.parse(dateH) : NaN;
  if (isNaN(at)) at = now();

  // interview time
  let interviewAt = null;
  const dm = text.match(/(?:on\s+)?((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:\s*(?:at|@|,)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?/i);
  if (dm && (kind === "interview" || kind === "screen")) {
    const yr = dm[3] || new Date().getFullYear();
    const t = Date.parse(`${dm[2]} ${yr} ${dm[4] ? dm[4].replace(/(am|pm)/i, " $1") : "10:00 am"}`);
    if (!isNaN(t)) interviewAt = t < now() - 30 * DAY ? Date.parse(`${dm[2]} ${+yr + 1} ${dm[4] || "10:00 am"}`) : t;
  }
  let roundType = null;
  if (kind === "screen") roundType = "recruiter";
  else if (kind === "interview") roundType = /technical|coding|hackerrank|codesignal|leetcode|system design/i.test(text) ? "technical" : /behavioral/i.test(text) ? "behavioral" : /case/i.test(text) ? "case" : /onsite|final|superday/i.test(text) ? "onsite" : "other";

  const next = { confirmation: "Wait for a reply. Follow up in a week if you hear nothing.", screen: "Reply with your availability and prep a 60-second intro.", interview: "Confirm the time and start prep for this round.", rejection: "Log it and move on. Ask for feedback if you had interviews.", offer: "Ask for the offer in writing and the decision deadline.", other: "Review and decide whether anything changed." }[kind];
  return { kind, company, title, at, interviewAt, roundType, next, confidence: (company ? 1 : 0) + (title ? 1 : 0) + (kind !== "other" ? 1 : 0) };
}

/* Fuzzy-match an email to an existing application */
function matchApp(company, title) {
  if (!company) return null;
  const c = norm(company);
  const cands = Object.values(store.get().apps).filter((a) => { const ac = norm(a.company); return ac && (ac === c || ac.includes(c) || c.includes(ac)); });
  if (!cands.length) return null;
  if (title) { const t = norm(title); const exact = cands.find((a) => norm(a.title) === t || norm(a.title).includes(t) || t.includes(norm(a.title))); if (exact) return exact; }
  return cands.sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0];
}
