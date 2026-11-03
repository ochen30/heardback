/* ===== Interview prep =====
   Left: rounds (upcoming, waiting on outcome) + practice. Right: workspace for one round:
   likely questions (deterministic bank: round type x role category), talking points from the resume,
   questions to ask, prep notes (bound to round.prep), and a timed practice mode. Claude is optional. */

/* ---------- Question bank: plain, commonly asked questions. q = question, t = what a good answer shows ---------- */
const PREP_BANK = {
  recruiter: [
    { q: "Walk me through your background.", t: "Two minutes, in order: school, one or two relevant experiences, why this role now." },
    { q: "Why are you interested in this role?", t: "Connect something specific about the role to something you’ve done or want to learn." },
    { q: "What do you know about what we do?", t: "One accurate sentence about the product and who uses it. Check their site before the call." },
    { q: "What are you looking for in your next role?", t: "Name two or three things: the kind of work, the team, how you want to grow." },
    { q: "What’s your timeline, and are you interviewing elsewhere?", t: "Be honest and brief. Mention deadlines from other offers if you have them." },
    { q: "When could you start, and where would you be based?", t: "Know your graduation date or term dates and your location preferences." },
    { q: "Will you need visa sponsorship now or in the future?", t: "Answer plainly. Recruiters ask this early so nobody’s time is wasted." },
    { q: "Tell me about a project you’re proud of.", t: "Short version: the problem, what you built, one result. Save the detail for later rounds." },
    { q: "What are your compensation expectations?", t: "It’s fine to ask for their range first, or give a researched range rather than one number." },
    { q: "Do you have any questions for me?", t: "Ask about the interview process and what the team is working on." },
  ],
  behavioral: [
    { q: "Tell me about a time you worked through a disagreement on a team.", t: "Show you listened, found the real issue, and kept the relationship intact." },
    { q: "Describe a project that didn’t go as planned. What did you do?", t: "Own your part, explain how you adjusted, and what you’d do differently." },
    { q: "Tell me about a time you had to learn something quickly.", t: "How you learned, not just that you did. End with what you shipped with it." },
    { q: "Give an example of when you took initiative without being asked.", t: "Why you noticed the problem, what you did, and the effect on others." },
    { q: "Tell me about a mistake you made and how you handled it.", t: "A real mistake, caught and fixed, plus the habit you changed afterwards." },
    { q: "Describe a time you had several deadlines at once.", t: "How you prioritized and communicated. Be concrete about the trade-off." },
    { q: "Tell me about a time you received critical feedback.", t: "Show you took it seriously and changed something visible." },
    { q: "Describe a time you led a group or a piece of work.", t: "Leadership without a title counts: organizing, unblocking, deciding." },
    { q: "Tell me about the hardest problem you’ve solved.", t: "Make the difficulty clear first, then your approach, then the outcome." },
    { q: "Why do you want to work here, and why this team?", t: "Specific reasons tied to the work, not the brand or perks." },
    { q: "Where do you want to be in a few years?", t: "Show direction and ambition that fits what this role can offer." },
  ],
  software: [
    { q: "Find whether any two numbers in an array add up to a target.", t: "Start brute force, then use a hash set for O(n). Say the complexity out loud." },
    { q: "Reverse a linked list, then reverse it in groups of k.", t: "Draw pointers before coding. Handle empty and single-node lists." },
    { q: "Find the shortest path between two cells in a grid with walls.", t: "BFS with a visited set. Explain why BFS and not DFS here." },
    { q: "Merge a list of overlapping intervals.", t: "Sort by start, then sweep. Ask whether touching intervals count as overlapping." },
    { q: "Design a data structure for an LRU cache.", t: "Hash map plus doubly linked list for O(1) get and put." },
    { q: "Return the k most frequent elements in a list.", t: "Count with a map, then a heap or bucket sort. Compare the trade-offs." },
    { q: "Check whether a binary tree is a valid binary search tree.", t: "Pass min/max bounds down, or use an in-order traversal." },
    { q: "Design a URL shortener.", t: "Clarify scale, then IDs, storage, redirects, and caching. Keep it simple first." },
    { q: "What happens when you type a URL into a browser and press Enter?", t: "DNS, TCP/TLS, HTTP request, server, response, rendering. Go deep where you’re strongest." },
    { q: "Walk me through a bug that took you a long time to find.", t: "How you narrowed it down matters more than the bug itself." },
    { q: "How would you test a function you just wrote?", t: "Normal cases, edge cases, invalid input. Mention automating them." },
  ],
  data: [
    { q: "Explain the bias-variance trade-off.", t: "Use one concrete model example and how you’d detect each problem." },
    { q: "How would you handle a dataset with heavy class imbalance?", t: "Better metrics first (precision/recall, PR-AUC), then resampling or class weights." },
    { q: "Write a SQL query for the top three products by revenue in each category.", t: "Window function with ROW_NUMBER or RANK, partitioned by category. Ask how ties work." },
    { q: "How would you design an A/B test for a new feature?", t: "Hypothesis, one primary metric, sample size, duration, and guardrail metrics." },
    { q: "What’s the difference between L1 and L2 regularization?", t: "L1 pushes weights to zero (sparsity), L2 shrinks them smoothly." },
    { q: "How do you deal with missing data?", t: "First ask why it’s missing. Then drop, impute, or model it, and say what each costs." },
    { q: "How would you evaluate a classification model?", t: "Pick metrics that match the cost of each error. Mention validation and leakage." },
    { q: "Explain how gradient descent works.", t: "Loss, gradient, learning rate. Mention batch vs. stochastic and why it matters." },
    { q: "Walk me through a model or analysis you built end to end.", t: "Problem, data, baseline, what you tried, how you measured, what changed." },
    { q: "How would you explain a p-value to someone non-technical?", t: "How surprising the data would be if there were no real effect. Avoid “probability it’s true”." },
    { q: "A key metric dropped 10% overnight. How would you investigate?", t: "Check data issues first, then segment by time, platform, region, and recent changes." },
  ],
  product: [
    { q: "What’s a product you use often, and how would you improve it?", t: "Pick a user, a real problem, one change, and how you’d measure it." },
    { q: "How would you decide what to build next with limited engineering time?", t: "Tie options to goals, estimate impact and effort, and say what you’d cut." },
    { q: "Design a product for first-year college students to find study groups.", t: "Clarify users and goals, list pain points, pick one, sketch a simple solution." },
    { q: "Daily active users dropped 15% last week. What do you do?", t: "Rule out tracking issues, then segment. Ask about launches and seasonality." },
    { q: "How would you measure the success of a new feature?", t: "One north-star metric, a few supporting metrics, and a guardrail." },
    { q: "Tell me about a time you used data to change someone’s mind.", t: "What they believed, what you showed, and what happened next." },
    { q: "How do you work with engineers and designers when you disagree?", t: "Show you start from the user problem and use evidence, not authority." },
    { q: "Estimate how many rideshare trips happen in a large city on a weekday.", t: "State assumptions, structure the math, sanity-check the result." },
    { q: "What makes a product good, in your view?", t: "A clear point of view with one example you can defend." },
    { q: "Walk me through a launch you were part of.", t: "Your role, the goal, a hard decision, and what the numbers showed." },
  ],
  quant: [
    { q: "You flip a fair coin until you get two heads in a row. What’s the expected number of flips?", t: "Set up states and solve the equations. The answer is 6." },
    { q: "What’s the expected value of the maximum of two fair dice rolls?", t: "Count outcomes by maximum value. Show the method, then the number (161/36)." },
    { q: "Explain what a p-value and a confidence interval tell you.", t: "Precise definitions plus one sentence on how people misread them." },
    { q: "How would you test whether a trading signal has real predictive power?", t: "Out-of-sample testing, transaction costs, multiple-testing risk, look-ahead bias." },
    { q: "What’s the difference between correlation and covariance?", t: "Covariance has units, correlation is scaled to [-1, 1]. Note what neither captures." },
    { q: "Explain linear regression assumptions and what happens when they break.", t: "Linearity, independence, constant variance, normal errors. Give one fix for each." },
    { q: "Implement a function to compute a moving average over a stream of prices.", t: "Running sum with a queue for O(1) per update. Discuss memory." },
    { q: "Estimate how many piano tuners work in a major city.", t: "Structure, round sensibly, and check the order of magnitude." },
    { q: "What’s an option, and what affects its price?", t: "Underlying price, strike, time, volatility, rates. Intuition beats formulas here." },
    { q: "Walk me through a statistics or modeling project you’ve done.", t: "Question, data, method, how you validated it, and the result." },
    { q: "Mental math: what is 17 × 24, and 7/8 as a percentage?", t: "Speed and accuracy. Say your steps out loud so they can follow." },
  ],
  hardware: [
    { q: "Explain the difference between a microcontroller and a microprocessor.", t: "Integrated memory and peripherals versus external. Say where you’d use each." },
    { q: "What is a race condition, and how do you prevent one in embedded code?", t: "Shared state with interrupts or threads. Mention volatile, critical sections, atomics." },
    { q: "How does an interrupt work, and what belongs in an interrupt handler?", t: "Keep handlers short: set a flag or buffer data, do the work elsewhere." },
    { q: "Explain setup and hold time.", t: "Why they exist, what happens on a violation, and how timing is closed." },
    { q: "Walk me through how you’d debug a board that doesn’t power on.", t: "Visual check, rails with a multimeter, current draw, then one block at a time." },
    { q: "What’s the difference between I2C, SPI, and UART?", t: "Wires, speed, addressing, and when you’d pick each one." },
    { q: "Design a finite state machine for a traffic light.", t: "States, transitions, timing, and a pedestrian button input." },
    { q: "What does a decoupling capacitor do, and where do you place it?", t: "Supplies local current and filters noise. As close to the power pin as you can." },
    { q: "Write a function to set, clear, and toggle a bit in a register.", t: "Bitwise OR, AND with NOT, and XOR with a mask." },
    { q: "Tell me about a hardware project you built and a problem you hit.", t: "Show a real debugging story with measurements, not guesses." },
  ],
};
const PREP_ASK = {
  recruiter: ["What does the rest of the interview process look like, and how long does it usually take?", "What does a typical first few months look like for someone in this role?", "What team would I be on, and what is it working on now?", "What do people who do well in this role have in common?", "Is there anything in my background you’d like me to clarify?"],
  behavioral: ["What does success look like in this role after six months?", "How does the team give feedback, and how often?", "What’s something the team changed recently because of feedback?", "How are projects chosen and prioritized?", "What do you enjoy most about working here?"],
  technical: ["What does the team’s tech stack look like, and why was it chosen?", "How does code review work on your team?", "What’s a recent technical problem the team solved that you’re proud of?", "How do new hires get up to speed on the codebase?", "How do you balance shipping quickly with paying down technical debt?"],
  case: ["How do product decisions usually get made on your team?", "Which metrics does the team watch most closely?", "Can you tell me about a recent decision that changed because of user research or data?", "How do PMs, engineers, and designers split responsibilities here?", "What’s the biggest open question for the product right now?"],
  onsite: ["What would my first project likely be?", "How is mentorship set up for new hires or interns?", "What’s the biggest challenge the team faces this year?", "How does the team celebrate wins or learn from misses?", "What’s one thing you’d change about working here if you could?"],
  other: ["What would you want me to accomplish in the first month?", "How does the team measure good work?", "What’s the best part of working on this team?", "What are the next steps after this conversation?"],
};
const PREP_CAT_KEY = { Software: "software", "Data & AI": "data", Product: "product", Quant: "quant", Hardware: "hardware" };
const PREP_PRACTICE_TYPES = [{ id: "recruiter", label: "Recruiter" }, { id: "behavioral", label: "Behavioral" }, { id: "technical", label: "Technical" }, { id: "case", label: "Case" }];

function prepCatOf(app) {
  const job = app && app.jobId ? jobsStore.byId.get(app.jobId) : null;
  if (job && job.cat) return job.cat;
  const t = (app && app.title) || "";
  if (/quant|trad(ing|er)/i.test(t)) return "Quant";
  if (/data|machine learning|\bml\b|\bai\b|analytic|scien/i.test(t)) return "Data & AI";
  if (/product manag|\bapm\b|\bpm\b|product analyst/i.test(t)) return "Product";
  if (/hardware|embedded|firmware|fpga|asic|electrical|silicon|robot|mechanical/i.test(t)) return "Hardware";
  return "Software";
}
function prepQuestions(type, cat) {
  const tech = PREP_BANK[PREP_CAT_KEY[cat] || "software"];
  if (type === "recruiter") return PREP_BANK.recruiter;
  if (type === "behavioral") return PREP_BANK.behavioral;
  if (type === "technical") return tech;
  if (type === "case") return cat === "Quant" ? PREP_BANK.quant : cat === "Data & AI" ? PREP_BANK.data : PREP_BANK.product;
  // onsite / other: a deterministic mix of the role's technical questions and behavioral ones
  const mix = [];
  for (let i = 0; i < 6; i++) { if (tech[i]) mix.push(tech[i]); if (i < 4 && PREP_BANK.behavioral[i]) mix.push(PREP_BANK.behavioral[i]); }
  return mix;
}

/* ---------- Talking points from the resume (deterministic) ---------- */
const PREP_VERBS = /^(built|led|designed|developed|created|launched|shipped|implemented|reduced|increased|improved|optimized|automated|scaled|migrated|analyzed|won|grew|cut|saved|mentored|managed|founded|organized|delivered|architected|engineered|deployed|trained|researched|wrote|published|redesigned|streamlined|owned|drove|co-?founded|prototyped|integrated|refactored|accelerated|coordinated|taught|presented)\b/i;
const PREP_USE = [
  [/^(led|managed|mentored|organized|coordinated|founded|co-?founded|owned|drove|taught)/i, "leadership or ownership questions"],
  [/^(reduced|cut|optimized|improved|streamlined|accelerated|refactored|saved|automated)/i, "“Tell me about improving something”"],
  [/^(built|shipped|launched|designed|developed|created|implemented|architected|engineered|deployed|prototyped|integrated)/i, "“A project you’re proud of”"],
  [/^(analyzed|researched|trained|published|wrote|presented)/i, "technical deep dives and “walk me through your work”"],
  [/^(won|grew|increased|scaled|delivered)/i, "“Your biggest impact”"],
];
function prepTalkingPoints(resume) {
  if (!resume) return [];
  const lines = resume.split(/\n|•|·|▪|◦|(?:^|\s)[-*–]\s/).map((l) => l.replace(/^[\s\-*•·–>]+/, "").replace(/\s+/g, " ").trim()).filter((l) => l.length >= 25 && l.length <= 260);
  const seen = new Set();
  const scored = lines.map((l, i) => {
    const num = /\d/.test(l) || /%|\$/.test(l);
    const verb = PREP_VERBS.test(l);
    return { l, i, s: (num ? 2 : 0) + (verb ? 2 : 0) + (/\b(users|customers|team|latency|revenue|accuracy|time|cost|performance)\b/i.test(l) ? 1 : 0), num, verb };
  }).filter((x) => x.s >= 2 && !seen.has(x.l.toLowerCase()) && seen.add(x.l.toLowerCase()));
  return scored.sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 5).sort((a, b) => a.i - b.i).map((x) => {
    const strong = x.l.match(/\$\d[\d,.]*\s?[kKmMbB]?\b|\d[\d,.]*\s?%|\b\d[\d,.]*x\b/g) || [];
    const plain = x.l.match(/\b\d[\d,.]*\b/);
    const metric = strong.length >= 2 ? `${strong[0]} to ${strong[1]}` : strong[0] || null;
    const use = (PREP_USE.find(([re]) => re.test(x.l)) || [null, "behavioral questions and “tell me about yourself”"])[1];
    return { text: x.l, metric, plain: !metric && plain ? plain[0] : null, use };
  });
}

/* ---------- Round lists ---------- */
function prepRounds(s) {
  const t = now();
  const up = [], past = [];
  for (const a of Apps.list(s)) for (const r of a.rounds || []) {
    if (r.outcome === "cancelled") continue;
    if (!r.at) { if (r.outcome === "pending") up.push({ a, r }); }
    else if (r.at >= t - 2 * 3600000) up.push({ a, r });
    else if (r.outcome === "pending") past.push({ a, r });
  }
  up.sort((x, y) => (x.r.at || Infinity) - (y.r.at || Infinity));
  past.sort((x, y) => (y.r.at || 0) - (x.r.at || 0));
  return { up, past };
}
function prepSetFocus(f) { store.set((s) => ({ ...s, ui: { ...s.ui, prepFocus: f } })); }

/* ---------- Small pieces ---------- */
function PrepRoundItem({ a, r, on, onClick, past }) {
  return html`<button type="button" class="prep-item" aria-current=${on ? "true" : undefined} onClick=${onClick}>
    <${Logo} name=${a.company} size="sm" />
    <span class="stack-sm prep-item-main">
      <span class="prep-item-title truncate">${a.company}</span>
      <span class="prep-item-sub truncate">${ROUND[r.type]?.label || "Interview"}</span>
    </span>
    <span class=${cx("prep-when num", !past && r.at && r.at - now() < DAY && "soon")}>${r.at ? (past ? fmt.date(r.at) : fmt.until(r.at)) : "No date"}</span>
  </button>`;
}

function PrepTimer({ resetKey }) {
  const LIMIT = 120;
  const [left, setLeft] = useState(LIMIT);
  const [run, setRun] = useState(false);
  useEffect(() => { setLeft(LIMIT); setRun(false); }, [resetKey]);
  useEffect(() => {
    if (!run) return;
    const iv = setInterval(() => setLeft((x) => { if (x <= 1) { setRun(false); return 0; } return x - 1; }), 1000);
    return () => clearInterval(iv);
  }, [run]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return html`<div class="prep-timer">
    <span class=${cx("prep-clock num", left === 0 && "done", left > 0 && left <= 20 && "low")} role="timer" aria-live="off" aria-label=${`${mm} minutes ${ss} seconds left`}>${mm}:${ss}</span>
    <div class="row">
      <${Btn} icon=${run ? "clock" : "play"} onClick=${() => { if (left === 0) setLeft(LIMIT); setRun(!run); }} id="prep-timer-toggle">${run ? "Pause" : left < LIMIT && left > 0 ? "Resume" : "Start"}</${Btn}>
      <${Btn} kind="ghost" icon="refresh" onClick=${() => { setRun(false); setLeft(LIMIT); }} disabled=${left === LIMIT && !run}>Reset</${Btn}>
    </div>
    <span class="hint">${left === 0 ? "Time. Land your answer in one sentence." : "Aim for about two minutes per answer."}</span>
  </div>`;
}

function PrepAIStatus({ busy, onStop }) {
  if (!busy) return null;
  return html`<div class="row prep-thinking" role="status"><span class="prep-dot"></span><span class="muted" style="font-size:var(--fs-sm)">Thinking…</span><${Btn} size="sm" kind="ghost" onClick=${onStop}>Stop</${Btn}></div>`;
}

/* Practice outlines are kept per question in store.ui.prepPractice, so they survive Exit and reloads. */
function prepSetOutline(k, v) {
  store.set((s) => { const m = { ...(s.ui.prepPractice || {}) }; if (v) m[k] = v; else delete m[k]; return { ...s, ui: { ...s.ui, prepPractice: m } }; });
}

function PrepPractice({ questions, ctx, onExit }) {
  const c = useCaps();
  const [i, setI] = useState(0);
  const notes = useStore((s) => s.ui.prepPractice) || {};
  const [fb, setFb] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const q = questions[i];
  const outline = notes[q.q] || "";
  const feedback = async () => {
    ctl.current?.abort();
    const ac = new AbortController(); ctl.current = ac;
    setBusy(true); setErr("");
    const prompt = `You are a calm, experienced interview coach. A candidate is practicing for a ${ctx.round} interview for a ${ctx.title || ctx.cat + " role"}.\n\nQuestion: ${q.q}\n\nTheir answer outline:\n"""\n${outline.slice(0, 4000)}\n"""\n\nGive concise, specific, kind feedback as exactly three short bullets, each starting with its label:\n- What worked: ...\n- What to tighten: ...\n- A stronger opening line: "..."\nNo preamble, no headings, under 110 words total. Don’t invent facts about the candidate.`;
    try {
      const r = await askClaude(prompt, { signal: ac.signal, onText: (x) => setFb((f) => ({ ...f, [i]: x.text })) });
      setFb((f) => ({ ...f, [i]: r.text }));
    } catch (e) { if (e?.name !== "AbortError" && !ac.signal.aborted) setErr(aiErr(e)); }
    if (ctl.current === ac) setBusy(false);
  };
  const stop = () => { ctl.current?.abort(); setBusy(false); };
  const goTo = (n) => { stop(); setErr(""); setI(n); };
  return html`<div class="card prep-practice">
    <div class="card-head">
      <h3>Practice</h3><span class="prep-count num">${i + 1} of ${questions.length}</span>
      <span class="spacer"></span><${Btn} size="sm" kind="ghost" icon="x" onClick=${onExit} id="prep-exit"><span class="hide-sm">Exit practice</span><span class="show-sm">Exit</span></${Btn}>
    </div>
    <div class="card-body prep-practice-body">
      <div class="stack prep-q-col">
        <p class="prep-q-big">${q.q}</p>
        ${q.t && html`<div class="prep-tip-block"><span class="prep-tip-label">What a good answer shows</span><p class="prep-tip">${q.t}</p></div>`}
        <${Field} label="Your answer outline" id="prep-outline" hint="Bullet the key points. Notes stay in this browser.">
          <textarea id="prep-outline" class="textarea" rows="5" placeholder="Situation, what you did, the result…" value=${outline} onInput=${(e) => prepSetOutline(q.q, e.currentTarget.value)}></textarea>
        </${Field}>
        ${c.sample && html`<div class="stack-sm">
          <div class="row wrap">
            <${Btn} icon="spark" onClick=${feedback} disabled=${busy || outline.trim().length < 15} id="prep-feedback">Get feedback from Claude</${Btn}>
            ${outline.trim().length < 15 && html`<span class="hint">Write a few lines first.</span>`}
            <${PrepAIStatus} busy=${busy} onStop=${stop} />
          </div>
          ${err && html`<div class="callout wait" role="alert"><${Icon} name="alert" /><span>${err}</span></div>`}
          ${fb[i] && html`<div class="stack-sm"><div class="ai-box">${fb[i]}</div><span class="ai-label"><${Icon} name="spark" />Feedback by Claude. Use what helps.</span></div>`}
        </div>`}
      </div>
      <div class="prep-timer-col"><${PrepTimer} resetKey=${i} /></div>
    </div>
    <div class="prep-practice-foot">
      <${Btn} icon="chevL" onClick=${() => goTo(i - 1)} disabled=${i === 0}>Previous</${Btn}>
      <span class="spacer"></span>
      ${i < questions.length - 1 ? html`<${Btn} kind="primary" iconRight="arrowR" onClick=${() => goTo(i + 1)} id="prep-next">Next question</${Btn}>` : html`<${Btn} kind="primary" icon="check" onClick=${onExit}>Finish practice</${Btn}>`}
    </div>
  </div>`;
}

function PrepNotes({ a, r }) {
  const [v, setV] = useState(r.prep || "");
  const [state, setState] = useState("idle");
  const tm = useRef(null), pending = useRef(null);
  const flush = () => { if (pending.current != null) { Apps.updateRound(a.id, r.id, { prep: pending.current }); pending.current = null; setState("saved"); } };
  useEffect(() => { const off = onFlush(() => { clearTimeout(tm.current); flush(); }); return () => { off(); clearTimeout(tm.current); flush(); }; }, []);
  const onInput = (e) => {
    const x = e.currentTarget.value; setV(x); pending.current = x; setState("typing");
    clearTimeout(tm.current); tm.current = setTimeout(flush, 600);
  };
  return html`<div class="card prep-notes-card">
    <div class="card-head"><h3>Prep notes</h3><span class="spacer"></span>
      <span class="hint prep-saved" aria-live="polite">${state === "saved" ? html`<${Icon} name="check" size=${12} />Saved` : state === "typing" ? "Saving…" : "Saved to this round"}</span></div>
    <div class="card-body prep-notes-body">
      <textarea id=${"prep-notes-" + r.id} class="textarea" rows="6" aria-label="Prep notes" placeholder="Topics to review, stories to tell, things to ask, logistics…" value=${v} onInput=${onInput} onBlur=${() => { clearTimeout(tm.current); flush(); }}></textarea>
    </div>
  </div>`;
}

function PrepTailored({ ctx, skills }) {
  const c = useCaps();
  const [qs, setQs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);
  if (!c.sample) return null;
  const run = async () => {
    ctl.current?.abort(); const ac = new AbortController(); ctl.current = ac;
    setBusy(true); setErr("");
    const prompt = `Write 6 realistic interview questions for a ${ctx.round} round for the role "${ctx.title || ctx.cat}" (${ctx.cat}, early career).${skills.length ? ` The candidate lists these skills: ${skills.slice(0, 15).join(", ")}.` : ""} Mix general questions for this kind of role with ones that probe the listed skills. Do not mention or invent facts about any specific company. Plain, commonly asked wording. Return only a JSON array of 6 question strings.`;
    try {
      const r = await askClaudeJSON(prompt, { signal: ac.signal });
      const arr = Array.isArray(r) ? r : Array.isArray(r?.questions) ? r.questions : null;
      if (!arr || !arr.length) throw { code: "invalid_json" };
      setQs(arr.map((x) => String(typeof x === "string" ? x : x?.q || x?.question || "")).filter(Boolean).slice(0, 6));
    } catch (e) { if (!ac.signal.aborted) setErr(aiErr(e)); }
    if (ctl.current === ac) setBusy(false);
  };
  return html`<div class="card">
    <div class="card-head"><h3>Tailored questions</h3><span class="spacer"></span>
      ${!busy && html`<${Btn} size="sm" icon="spark" onClick=${run} id="prep-tailor">${qs ? "Generate again" : "Tailor questions to this role"}</${Btn}>`}
      <${PrepAIStatus} busy=${busy} onStop=${() => { ctl.current?.abort(); setBusy(false); }} /></div>
    <div class="card-body stack">
      ${!qs && !err && !busy && html`<p class="muted" style="font-size:var(--fs-sm)">Claude can write six questions for this role and round, using the skills on your resume. Runs on your Claude account only when you click.</p>`}
      ${err && html`<div class="callout wait" role="alert"><${Icon} name="alert" /><span>${err}</span></div>`}
      ${qs && html`<ol class="prep-qlist">${qs.map((q, i) => html`<li key=${i}><span class="prep-qn num">${i + 1}</span><span class="prep-qtext">${q}</span></li>`)}</ol>
        <span class="ai-label"><${Icon} name="spark" />AI-generated by Claude. Not from the company. Verify before relying on it.</span>`}
    </div>
  </div>`;
}

function PrepTalking({ resume }) {
  const pts = useMemo(() => prepTalkingPoints(resume), [resume]);
  return html`<div class="card">
    <div class="card-head"><h3>Your talking points</h3><span class="spacer"></span>${resume && html`<${Btn} size="sm" kind="ghost" icon="edit" onClick=${() => openModal("resume")}>Edit resume</${Btn}>`}</div>
    <div class="card-body">
      ${!resume ? html`<div class="prep-cta"><p class="muted">Add your resume and we’ll pull out the lines with real results, ready to turn into stories.</p><${Btn} icon="doc" onClick=${() => openModal("resume")} id="prep-add-resume">Add your resume</${Btn}></div>`
        : !pts.length ? html`<div class="prep-cta"><p class="muted">We couldn’t find lines with numbers or action verbs. Lines like "Built X that cut Y by 30%" make the best stories.</p><${Btn} icon="edit" onClick=${() => openModal("resume")}>Edit resume</${Btn}></div>`
        : html`<div class="prep-star-guide">
            <span class="faint">Turn each line into a two-minute story:</span>
            <span><b>S</b>ituation, what was at stake</span><span><b>T</b>ask, what you owned</span><span><b>A</b>ction, the steps that were yours</span><span><b>R</b>esult, the number</span>
          </div><ol class="prep-points">${pts.map((p, i) => html`<li key=${i} class="prep-point">
            <p class="prep-point-text">${p.text}</p>
            <div class="prep-point-meta">
              <span><b class="prep-r">R</b><span>${p.metric ? html`Lead with <b class="num">${p.metric}</b>, then say what it meant.` : p.plain ? html`Say the number (<b class="num">${p.plain}</b>) early, then what changed.` : "Add a result: what changed, and how do you know?"}</span></span>
              <span class="faint">Good for ${p.use}</span>
            </div>
          </li>`)}</ol>`}
    </div>
  </div>`;
}

function PrepQuestionsCard({ questions, onPractice, title }) {
  const [open, setOpen] = useState(null);
  return html`<div class="card">
    <div class="card-head"><h3>${title || "Likely questions"}</h3><span class="prep-count num">${questions.length}</span><span class="spacer"></span>
      <${Btn} size="sm" icon="play" onClick=${onPractice} id="prep-practice">Practice</${Btn}></div>
    <ol class="prep-qlist prep-qlist-lg">
      ${questions.map((q, i) => html`<li key=${q.q} class=${open === i ? "open" : undefined}>
        <button type="button" class="prep-qbtn" aria-expanded=${open === i ? "true" : "false"} onClick=${() => setOpen(open === i ? null : i)}>
          <span class="prep-qn num">${i + 1}</span><span class="prep-qtext">${q.q}</span><${Icon} name="chevD" cls="prep-chev" />
        </button>
        ${open === i && html`<div class="prep-tip-in"><span class="prep-tip-label">What a good answer shows</span><p class="prep-tip">${q.t}</p></div>`}
      </li>`)}
    </ol>
    <div class="prep-card-foot hint">Commonly asked in this kind of round. Not from the company.</div>
  </div>`;
}

function PrepAskCard({ type }) {
  const list = PREP_ASK[type] || PREP_ASK.other;
  return html`<div class="card">
    <div class="card-head"><h3>Questions to ask them</h3></div>
    <ul class="prep-ask">${list.map((x) => html`<li key=${x}>${x}</li>`)}</ul>
  </div>`;
}

/* ---------- Mock interview with Claude ----------
   The page keeps the turns. Standing instructions travel in the leading user turn; each later user turn is
   the candidate’s answer plus a short pacing note the candidate never sees. Scorecard is a separate JSON call. */
const PREP_MOCK_LENGTHS = [{ id: 3, label: "3 questions" }, { id: 5, label: "5 questions" }];
const prepIsMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

function prepMockStyle(type, cat) {
  const tech = {
    Software: "software engineering concepts and problem solving: data structures, algorithms and complexity, debugging, testing, and system basics. Ask them to talk through an approach in words rather than write full code",
    "Data & AI": "data and machine learning concepts: statistics, SQL, model evaluation, overfitting, feature work, and how they would analyze a real dataset",
    Product: "product thinking with technical awareness: how things are built, trade-offs, metrics, and working with engineers",
    Quant: "quantitative reasoning: probability, expected value, statistics, and mental math. Ask for their reasoning step by step and check the math",
    Hardware: "hardware and embedded concepts: digital logic, timing, microcontrollers, interrupts, buses, and how they would debug a board",
  };
  const t = tech[cat] || tech.Software;
  switch (type) {
    case "recruiter": return "A recruiter screen. Conversational and light: background, why this role, what they are looking for, timeline, location and work authorization. No technical depth.";
    case "behavioral": return "A behavioral interview. Ask for specific past situations and probe for what the candidate personally did and what the measurable result was (situation, task, action, result).";
    case "technical": return `A technical interview focused on ${t}.`;
    case "case":
      if (cat === "Quant") return "A quant case round: probability puzzles, expected value, estimation, and quick mental math. Ask for reasoning step by step and check the math.";
      if (cat === "Data & AI") return "An analytics case: define metrics, diagnose a change in a metric, and design an experiment. Push for clear assumptions.";
      return "A product case: clarify the user and goal, list pain points, prioritize one, propose a solution, and choose success metrics. Push for structure and trade-offs.";
    case "onsite": return `A final-round interview. Mix one behavioral question, questions on ${t}, and one on motivation for the role.`;
    default: return `A general interview for this role: mix motivation, one behavioral question, and questions on ${t}.`;
  }
}

function prepMockBrief(m, n, resume) {
  const res = (resume || "").trim().slice(0, 4000);
  return `You are the interviewer in a mock interview that a candidate is using to practice. Stay in role for the whole conversation.

Context
- Company: ${m.company ? `${m.company}. Do not state or invent anything about this company: its products, teams, culture, values, or interview process. Keep questions general to the role.` : "none. This is general practice, so do not name a company."}
- Role: ${m.title || m.cat + " role"} (${m.cat}, early career: internship or new grad)
- Round: ${m.roundLabel}. ${prepMockStyle(m.type, m.cat)}
- Candidate’s resume${res ? `:\n"""\n${res}\n"""` : ": not provided. Ask about their experience instead of assuming any."}

How to run the interview
- There are ${n} questions in total. Ask exactly one question per message. A follow-up that probes the previous answer counts as the next question.
- Be kind but rigorous, like a good real interviewer: warm, specific, professional, no flattery.
- After each answer, give 1 to 2 sentences of honest feedback on it (what landed, what was missing), then ask the next question.
- Use the resume to ask about real projects when it suits the round. Never invent experience, numbers or details the candidate has not given.
- If the candidate says they don’t know or asks for a hint, give one small nudge, then move on.
- Plain text only. No markdown, headings, bullet points, or speaker labels. Keep each message under 90 words.

Begin now with one short sentence of greeting, then question 1.`;
}

function prepMockTranscript(turns) {
  return turns.map((t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n\n").slice(-14000);
}

function prepMockSummary(m, card, asked) {
  const L = [`Mock interview with Claude, ${fmt.date(now())}: ${pluralize(asked, "question")}${card ? `, overall ${card.overall}/5` : ""}`];
  if (card) {
    if (card.strengths.length) L.push("Strengths: " + card.strengths.join("; "));
    if (card.improve.length) L.push("Work on: " + card.improve.join("; "));
    if (card.better) L.push(`Rework "${card.better.question}":\n${card.better.outline}`);
  }
  return L.join("\n");
}

function prepMockCard(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) throw { code: "invalid_json" };
  const list = (x) => (Array.isArray(x) ? x : []).map((s) => String(typeof s === "string" ? s : s?.text || "").trim()).filter(Boolean).slice(0, 4);
  const overall = Math.round(Number(r.overall));
  if (!(overall >= 1 && overall <= 5)) throw { code: "invalid_json" };
  const b = r.betterAnswer && typeof r.betterAnswer === "object" ? r.betterAnswer : null;
  const outline = b ? (Array.isArray(b.outline) ? b.outline.join("\n") : String(b.outline || "")).trim() : "";
  return { overall, strengths: list(r.strengths), improve: list(r.improve), better: b && b.question && outline ? { question: String(b.question).trim(), outline } : null };
}

function PrepMockTurn({ t, live }) {
  const me = t.role === "user";
  return html`<li class=${cx("prep-mock-turn", me ? "me" : "them")}>
    <span class="prep-mock-who">${me ? "You" : "Interviewer"}${t.stopped && html` <span class="faint sep-item"><span aria-hidden="true">·</span> stopped</span>`}</span>
    <p class="prep-mock-text">${t.text}${live && html`<span class="prep-mock-caret" aria-hidden="true"></span>`}</p>
  </li>`;
}

function PrepMock({ ctx, a, r, resume, onPhase, onSaved }) {
  const [n, setN] = useState(5);
  const [phase, setPhaseS] = useState("start"); // start | live | scoring | end
  const [m, setM] = useState(null); // context frozen at start
  const [turns, setTurns] = useState([]); // {role:'user'|'assistant', text, note?, stopped?}
  const [draft, setDraft] = useState("");
  const [stream, setStream] = useState(null); // null | "" | partial text
  const [err, setErr] = useState("");
  const [card, setCard] = useState(null);
  const [saved, setSaved] = useState(false);
  const ctl = useRef(null), inputRef = useRef(null), headRef = useRef(null);
  const turnsRef = useRef(turns); turnsRef.current = turns;
  useEffect(() => () => ctl.current?.abort(), []);
  const setPhase = (p) => { setPhaseS(p); onPhase && onPhase(p); };
  const busy = stream !== null;
  const asked = turns.filter((t) => t.role === "assistant").length;
  const answered = turns.filter((t) => t.role === "user").length;
  const waitingAnswer = phase === "live" && !busy && turns.length > 0 && turns[turns.length - 1].role === "assistant" && answered < n;

  const roundLabel = ROUND[ctx.type]?.label || "Interview";

  const apiTurns = (list, mm, nn) => [{ role: "user", content: prepMockBrief(mm, nn, resume) }, ...list.map((t) => ({ role: t.role, content: t.text + (t.note ? "\n\n" + t.note : "") }))];

  const score = async (list, mm) => {
    ctl.current?.abort(); const ac = new AbortController(); ctl.current = ac;
    setPhase("scoring"); setErr(""); setStream("");
    const prompt = `You were the interviewer in a mock ${mm.roundLabel.toLowerCase()} interview for an early-career ${mm.title || mm.cat + " role"}. Transcript:\n"""\n${prepMockTranscript(list)}\n"""\n\nWrite a short, honest scorecard based only on this transcript. Kind and specific, no flattery. Do not invent facts about the candidate${mm.company ? " or the company" : ""}.\nReturn only JSON with this shape:\n{"overall": integer 1-5, "strengths": [2 or 3 short phrases], "improve": [2 or 3 short phrases], "betterAnswer": {"question": "the interview question they answered least well, quoted", "outline": "3 to 5 short lines separated by newlines that outline a stronger answer, using only facts from the transcript or placeholders like [your result]"}}`;
    try {
      const res = await askClaudeJSON(prompt, { signal: ac.signal, cache: false });
      if (ac.signal.aborted) return;
      setCard(prepMockCard(res)); setPhase("end");
      requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }));
    } catch (e) { if (!ac.signal.aborted) setErr(aiErr(e)); }
    if (ctl.current === ac) setStream(null);
  };

  const ask = async (list, mm = m, nn = n) => {
    ctl.current?.abort(); const ac = new AbortController(); ctl.current = ac;
    setErr(""); setStream("");
    let partial = "";
    try {
      const res = await askClaude(apiTurns(list, mm, nn), { signal: ac.signal, cache: false, onText: (x) => { if (!ac.signal.aborted) { partial = x.text; setStream(x.text); } } });
      if (ac.signal.aborted) return;
      const text = String(res?.text || partial).trim();
      if (!text) throw { code: "upstream_error" };
      const next = [...list, { role: "assistant", text }];
      setTurns(next); setStream(null);
      const done = next.filter((t) => t.role === "user").length >= nn;
      if (done) score(next, mm);
      else requestAnimationFrame(() => { inputRef.current?.focus({ preventScroll: true }); inputRef.current?.closest(".prep-mock-compose")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
      return;
    } catch (e) { if (!ac.signal.aborted) setErr(aiErr(e)); }
    if (ctl.current === ac) setStream(null);
  };

  const stop = () => {
    const ac = ctl.current; if (!ac) return;
    ac.abort();
    if (phase === "scoring") { setStream(null); setErr("Stopped before the scorecard was ready."); return; }
    const partial = (stream || "").trim();
    setStream(null);
    if (partial) {
      const next = [...turnsRef.current, { role: "assistant", text: partial, stopped: true }];
      setTurns(next);
      if (next.filter((t) => t.role === "user").length >= n) return score(next, m);
    } else setErr("Stopped. Ask Claude again when you’re ready.");
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const start = () => {
    const mm = { company: a?.company || "", title: a?.title || "", cat: ctx.cat, type: ctx.type, roundLabel };
    setM(mm); setTurns([]); setCard(null); setSaved(false); setDraft(""); setPhase("live");
    ask([], mm, n);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || busy || !waitingAnswer) return;
    const k = answered + 1;
    const note = k >= n
      ? `[Note from the practice app, not the candidate: this was the answer to the final question (${k} of ${n}). Give 1 to 2 sentences of feedback on it, then close the interview in one warm sentence. Do not ask another question.]`
      : `[Note from the practice app, not the candidate: this was the answer to question ${k} of ${n}. Give 1 to 2 sentences of feedback, then ask question ${k + 1}.]`;
    const next = [...turns, { role: "user", text, note }];
    setTurns(next); setDraft("");
    ask(next);
  };

  // Retry the last step after a stop or an error.
  const retry = () => {
    if (phase === "scoring") return score(turnsRef.current, m);
    const list = turnsRef.current;
    if (!list.length || list[list.length - 1].role === "user") ask(list);
  };

  const finishEarly = () => {
    if (busy) { ctl.current?.abort(); setStream(null); }
    const list = turnsRef.current;
    if (!list.some((t) => t.role === "user")) { setPhase("start"); setTurns([]); setErr(""); return; }
    score(list, m);
  };

  const reset = () => { ctl.current?.abort(); setStream(null); setErr(""); setTurns([]); setCard(null); setSaved(false); setDraft(""); setPhase("start"); };

  const save = () => {
    if (!a || !r) return;
    flushAll(); // write any unsaved prep-notes typing first
    const cur = Apps.get(a.id)?.rounds?.find((x) => x.id === r.id);
    if (!cur) return;
    const add = prepMockSummary(m, card, answered);
    Apps.updateRound(a.id, r.id, { prep: (cur.prep || "").trim() ? `${cur.prep.trimEnd()}\n\n${add}` : add });
    setSaved(true); onSaved && onSaved();
    toast("Added the scorecard to this round’s prep notes");
  };

  const onKey = (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } };

  /* ----- start ----- */
  if (phase === "start") {
    return html`<div class="card prep-mock-start" aria-labelledby="prep-mock-title">
      <div class="card-head prep-mock-start-head">
        <h3 id="prep-mock-title">Mock interview</h3>
        <span class="spacer"></span>
        <div class="prep-mock-len"><${Seg} label="Interview length" value=${n} options=${PREP_MOCK_LENGTHS} onChange=${setN} /></div>
        <${Btn} kind="primary" size="sm" icon="play" onClick=${start} id="prep-mock-start">Start</${Btn}>
      </div>
      <div class="card-body prep-mock-start-body">
        <p class="prep-mock-desc">Claude plays the interviewer, one question at a time, then scores you.</p>
        <p class="prep-mock-note">Runs on your Claude account. Saved only in this browser.</p>
      </div>
    </div>`;
  }

  /* ----- live, scoring, end ----- */
  const live = phase === "live";
  const shownQ = Math.min(Math.max(asked, 1), n);
  const statusRow = busy && (stream === "" || phase === "scoring")
    ? html`<div class="row prep-thinking prep-mock-status" role="status"><span class="prep-dot"></span><span class="muted">${phase === "scoring" ? "Writing your scorecard…" : "Thinking…"}</span><${Btn} size="sm" kind="ghost" icon="x" onClick=${stop} id="prep-mock-stop">Stop</${Btn}></div>`
    : busy ? html`<div class="row prep-mock-status"><span class="hint">Claude is replying</span><${Btn} size="sm" kind="ghost" icon="x" onClick=${stop} id="prep-mock-stop">Stop</${Btn}></div>` : null;
  const transcript = html`<ol class="prep-mock-log" role="log" aria-label="Interview transcript" aria-busy=${busy ? "true" : "false"}>
    ${turns.map((t, i) => html`<${PrepMockTurn} key=${i} t=${t} />`)}
    ${busy && phase === "live" && stream && html`<${PrepMockTurn} key="s" t=${{ role: "assistant", text: stream }} live=${true} />`}
  </ol>`;

  return html`<div class=${cx("card prep-mock", phase !== "end" && "on")}>
    <div class="card-head prep-mock-head">
      <h3 ref=${headRef} tabindex="-1">${phase === "end" ? "Mock interview scorecard" : "Mock interview"}</h3>
      <span class="spacer"></span>
      ${phase !== "end" && html`<span class="prep-mock-prog">
        <span class="prep-count num" aria-live="polite">${phase === "scoring" ? "Scoring" : `Question ${shownQ} of ${n}`}</span>
        <span class="prep-score-dots prep-mock-ticks" aria-hidden="true">${Array.from({ length: n }, (_, i) => html`<i key=${i} class=${i < (phase === "scoring" ? n : answered) ? "on" : i === shownQ - 1 ? "cur" : undefined}></i>`)}</span>
      </span>`}
      ${live && html`<${Btn} size="sm" kind="ghost" icon="flag" onClick=${finishEarly} id="prep-mock-end"><span class="hide-sm">${answered ? "End and score" : "End"}</span><span class="show-sm">End</span></${Btn}>`}
    </div>
    <div class="card-body prep-mock-body">
      ${phase === "end"
        ? html`<${PrepMockScore} card=${card} />
          <details class="prep-mock-details"><summary>Transcript <span class="faint num sep-item"><span aria-hidden="true">·</span> ${pluralize(turns.length, "message")}</span></summary>${transcript}</details>`
        : transcript}
      ${statusRow}
      ${err && html`<div class="callout wait prep-mock-err" role="alert"><${Icon} name="alert" /><span class="prep-mock-err-text">${err}</span><${Btn} size="sm" icon="refresh" onClick=${retry} id="prep-mock-retry">${phase === "scoring" ? "Try the scorecard again" : "Ask again"}</${Btn}></div>`}
      ${phase === "end" && html`<span class="ai-label"><${Icon} name="spark" />Scored by Claude from this transcript. Use what helps.</span>`}
    </div>
    ${live && html`<div class="prep-mock-compose">
      <label class="sr" for="prep-mock-answer">Your answer</label>
      <textarea id="prep-mock-answer" ref=${inputRef} class="textarea" rows="4" placeholder=${waitingAnswer ? "Type your answer…" : "Wait for the question…"} value=${draft} onInput=${(e) => setDraft(e.currentTarget.value)} onKeyDown=${onKey}></textarea>
      <div class="prep-mock-compose-foot">
        <span class="hint hide-sm"><${Kbd}>${prepIsMac ? "⌘" : "Ctrl"}</${Kbd}> <${Kbd}>Enter</${Kbd}> to send</span>
        <span class="spacer"></span>
        <${Btn} kind="primary" icon="send" onClick=${send} disabled=${!waitingAnswer || !draft.trim()} id="prep-mock-send">Send answer</${Btn}>
      </div>
    </div>`}
    ${phase === "end" && html`<div class="prep-practice-foot prep-mock-foot">
      <${Btn} kind="ghost" icon="copy" onClick=${() => copyText(prepMockSummary(m, card, answered), "Scorecard")} id="prep-mock-copy">Copy</${Btn}>
      <span class="spacer"></span>
      <${Btn} kind=${a ? undefined : "primary"} icon="refresh" onClick=${reset} id="prep-mock-again">New mock interview</${Btn}>
      ${a && html`<${Btn} kind="primary" icon=${saved ? "check" : "doc"} onClick=${save} disabled=${saved} id="prep-mock-save">${saved ? "Saved to notes" : "Save to round notes"}</${Btn}>`}
    </div>`}
    ${phase === "scoring" && !busy && err && html`<div class="prep-practice-foot prep-mock-foot"><span class="spacer"></span><${Btn} onClick=${reset} id="prep-mock-again">New mock interview</${Btn}></div>`}
  </div>`;
}

function PrepMockScore({ card }) {
  if (!card) return null;
  const words = ["", "Needs work", "Getting there", "Solid", "Strong", "Excellent"];
  return html`<div class="prep-score">
    <div class="prep-score-top">
      <div class="prep-score-num"><span class="num">${card.overall}</span><span class="faint num">/5</span></div>
      <div class="stack-sm">
        <span class="prep-score-word">${words[card.overall]}</span>
        <span class="prep-score-dots" role="img" aria-label=${`${card.overall} out of 5`}>${[1, 2, 3, 4, 5].map((i) => html`<i key=${i} class=${i <= card.overall ? "on" : undefined}></i>`)}</span>
      </div>
    </div>
    <div class="prep-score-cols">
      <div class="prep-score-col"><h4 class="prep-score-h"><${Icon} name="check" size=${14} />What worked</h4>
        ${card.strengths.length ? html`<ul class="prep-score-list">${card.strengths.map((x, i) => html`<li key=${i}>${x}</li>`)}</ul>` : html`<p class="hint">Nothing specific noted.</p>`}</div>
      <div class="prep-score-col"><h4 class="prep-score-h"><${Icon} name="target" size=${14} />Work on</h4>
        ${card.improve.length ? html`<ul class="prep-score-list">${card.improve.map((x, i) => html`<li key=${i}>${x}</li>`)}</ul>` : html`<p class="hint">Nothing specific noted.</p>`}</div>
    </div>
    ${card.better && html`<div class="prep-score-better">
      <span class="prep-tip-label">A stronger answer to</span>
      <p class="prep-score-q">${card.better.question}</p>
      <p class="prep-score-outline">${card.better.outline}</p>
    </div>`}
  </div>`;
}

function PrepWorkspace({ a, r }) {
  const resume = useStore((s) => s.profile.resume);
  const skills = useStore((s) => s.profile.skills);
  const pc = useCaps();
  const [practice, setPractice] = useState(false);
  const [mockPhase, setMockPhase] = useState("start");
  const [notesRev, setNotesRev] = useState(0);
  const [pType, setPType] = useState("behavioral");
  const [pCat, setPCat] = useState(() => store.get().profile.roles?.[0] || "Software");
  const isPractice = !a;
  const type = isPractice ? pType : r.type;
  const cat = isPractice ? pCat : prepCatOf(a);
  const questions = useMemo(() => prepQuestions(type, cat), [type, cat]);
  const ctx = { round: (ROUND[type]?.label || "interview").toLowerCase(), title: a?.title || "", cat };
  const askType = type === "case" ? "case" : type;
  return html`<div class="stack prep-work">
    ${isPractice
      ? html`<div class="card prep-head">
          <div class="prep-head-main">
            <div class="prep-head-ico"><${Icon} name="play" size=${20} /></div>
            <div class="prep-head-text"><h2 class="prep-h2">Practice without an interview</h2><span class="prep-role">Warm up with common questions. Pick a round type and role.</span></div>
          </div>
          <div class="prep-pick">
            <${Seg} label="Round type" value=${pType} options=${PREP_PRACTICE_TYPES} onChange=${setPType} />
            <label class="sr" for="prep-cat">Role</label>
            <select id="prep-cat" class="select prep-cat" value=${pCat} onChange=${(e) => setPCat(e.currentTarget.value)}>${CATS.map((c) => html`<option key=${c} value=${c}>${c}</option>`)}</select>
          </div>
        </div>`
      : html`<div class="card prep-head">
          <div class="prep-head-main">
            <${Logo} name=${a.company} size="lg" />
            <div class="prep-head-text">
              <div class="prep-head-title"><h2 class="prep-h2">${a.company}</h2></div>
              <span class="prep-role">${a.title} <span class="prep-role-type sep-item"><span aria-hidden="true">·</span> ${ROUND[r.type]?.label || "Interview"}</span></span>
            </div>
            <div class="prep-head-actions">
              <span class="prep-cal"><${CalendarButton} appId=${a.id} round=${r} /></span>
              <${Btn} size="sm" kind="ghost" iconRight="chevR" onClick=${() => openApp(a.id, "rounds")} cls="hide-sm">Open application</${Btn}>
              <${Btn} icon="pipeline" onClick=${() => openApp(a.id, "rounds")} cls="show-sm prep-open-ico" aria-label="Open application" title="Open application" id="prep-open-app" />
            </div>
          </div>
          <dl class="prep-facts">
            <div><dt>When</dt><dd class="num">${r.at ? html`${fmt.dateTime(r.at)} <span class=${cx("faint sep-item", r.at > now() && r.at - now() < DAY && "prep-soon")}><span aria-hidden="true">·</span> ${fmt.until(r.at)}</span>` : html`<span class="faint">No date yet</span>`}</dd></div>
            <div><dt>With</dt><dd>${r.interviewers || html`<span class="faint">Not added</span>`}</dd></div>
            <div><dt>Role type</dt><dd>${cat}</dd></div>
          </dl>
        </div>`}
    ${pc.sample && !practice && html`<${PrepMock} key=${r?.id || "p"} ctx=${{ type, cat }} a=${a} r=${r} resume=${resume} onPhase=${setMockPhase} onSaved=${() => setNotesRev((x) => x + 1)} />`}
    ${practice
      ? html`<${PrepPractice} key=${type + cat} questions=${questions} ctx=${ctx} onExit=${() => setPractice(false)} />`
      : !(pc.sample && mockPhase !== "start") && html`<${PrepQuestionsCard} key=${type + cat} questions=${questions} onPractice=${() => { setMockPhase("start"); setPractice(true); }} />`}
    <${PrepTailored} key=${(r?.id || "p") + type + cat} ctx=${ctx} skills=${skills || []} />
    <${PrepTalking} resume=${resume} />
    ${isPractice ? html`<${PrepAskCard} type=${askType} />` : html`<div class="grid cols-2 prep-two">
      <${PrepAskCard} type=${askType} />
      <${PrepNotes} key=${r.id + ":" + notesRev} a=${a} r=${r} />
    </div>`}
  </div>`;
}

VIEWS.prep = function PrepView() {
  const s = useStore();
  const { up, past } = useMemo(() => prepRounds(s), [s.apps, s.settings.showExamples]);
  const focus = s.ui.prepFocus;
  const all = [...up, ...past];
  const find = (f) => f && !f.practice && all.find((x) => x.a.id === f.appId && x.r.id === f.roundId);
  const hit = find(focus);
  const [anyway, setAnyway] = useState(false);
  const sel = hit ? hit : focus?.practice || anyway ? { practice: true } : up[0] || past[0] || null;
  const isSel = (x) => sel && !sel.practice && sel.a.id === x.a.id && sel.r.id === x.r.id;
  const choose = (x) => { prepSetFocus(x ? { appId: x.a.id, roundId: x.r.id } : { practice: true }); document.getElementById("workspace")?.scrollTo?.({ top: 0 }); };

  if (!all.length && !sel?.practice) {
    return html`<div class="page">
      <div class="page-head"><div><h1>Interview prep</h1><p>Likely questions, talking points from your resume, and timed practice for every round.</p></div></div>
      <div class="card"><${Empty} icon="prep" title="No interviews on your calendar yet" action=${html`<div class="row wrap" style="justify-content:center"><${Btn} kind="primary" onClick=${() => go("pipeline")} id="prep-open-pipeline">Open Pipeline</${Btn}><${Btn} icon="play" onClick=${() => { setAnyway(true); prepSetFocus({ practice: true }); }} id="prep-anyway">Practice anyway</${Btn}></div>`}>
        Add an interview round to an application and it shows up here with likely questions and a place for notes.
      </${Empty}></div>
    </div>`;
  }
  const value = sel?.practice ? "practice" : sel ? `${sel.a.id}|${sel.r.id}` : "";
  return html`<div class="page">
    <div class="page-head"><div><h1>Interview prep</h1><p>${up.length ? html`${pluralize(up.length, "upcoming round")}${up[0]?.r.at ? html` <span class="sep-item"><span aria-hidden="true">·</span> next ${fmt.until(up[0].r.at)}</span>` : ""}` : "No upcoming rounds. Practice keeps you sharp."}</p></div>
</div>
    <div class="prep-layout">
      <aside class="prep-side">
        <div class="prep-picker">
          <label class="label" for="prep-select">Round</label>
          <select id="prep-select" class="select" value=${value} onChange=${(e) => { const v = e.currentTarget.value; if (v === "practice") choose(null); else { const [ai, ri] = v.split("|"); const x = all.find((y) => y.a.id === ai && y.r.id === ri); if (x) choose(x); } }}>
            ${up.length > 0 && html`<optgroup label="Upcoming">${up.map((x) => html`<option key=${x.r.id} value=${`${x.a.id}|${x.r.id}`}>${x.a.company} · ${ROUND[x.r.type]?.label || "Interview"}${x.r.at ? " · " + fmt.until(x.r.at) : ""}</option>`)}</optgroup>`}
            ${past.length > 0 && html`<optgroup label="Waiting on outcome">${past.map((x) => html`<option key=${x.r.id} value=${`${x.a.id}|${x.r.id}`}>${x.a.company} · ${ROUND[x.r.type]?.label || "Interview"} · ${fmt.date(x.r.at)}</option>`)}</optgroup>`}
            <option value="practice">Practice without an interview</option>
          </select>
        </div>
        <div class="card prep-list-card">
          <div class="prep-group">Upcoming<span class="num">${up.length || ""}</span></div>
          ${up.length ? up.map((x) => html`<${PrepRoundItem} key=${x.r.id} a=${x.a} r=${x.r} on=${isSel(x)} onClick=${() => choose(x)} />`) : html`<p class="prep-none">Nothing scheduled.</p>`}
          ${past.length > 0 && html`<div class="prep-group">Waiting on outcome<span class="num">${past.length}</span></div>`}
          ${past.map((x) => html`<${PrepRoundItem} key=${x.r.id} a=${x.a} r=${x.r} past=${true} on=${isSel(x)} onClick=${() => choose(x)} />`)}
          <div class="prep-sep"></div>
          <button type="button" class="prep-item" aria-current=${sel?.practice ? "true" : undefined} onClick=${() => choose(null)} id="prep-practice-item">
            <span class="prep-item-ico"><${Icon} name="play" size=${14} /></span>
            <span class="stack-sm prep-item-main"><span class="prep-item-title">Practice without an interview</span><span class="prep-item-sub">Common questions by round type</span></span>
          </button>
        </div>
      </aside>
      ${sel?.practice ? html`<${PrepWorkspace} key="practice" />` : html`<${PrepWorkspace} key=${sel.r.id} a=${sel.a} r=${sel.r} />`}
    </div>
  </div>`;
};
