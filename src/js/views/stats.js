/* ===== Insights: personal analytics, honest about sample sizes ===== */

const STATS_REPLY_STAGES = ["screen", "interview", "offer", "rejected"];
function stats_isReplied(a) { return !!a.lastReplyAt || STATS_REPLY_STAGES.includes(a.stage); }
function stats_reachedInterview(a) { return ["interview", "offer"].includes(a.stage) || (a.rounds || []).length > 0 || (a.events || []).some((e) => e.to === "interview"); }
function stats_days(d) { return d == null ? "—" : d < 10 && d % 1 ? d.toFixed(1) : String(Math.round(d)); }
function stats_niceScale(max) {
  if (max <= 4) return { step: 1, top: 4 };
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]) if (max / step <= 5) return { step, top: Math.ceil(max / step) * step };
  return { step: max, top: max };
}

/* Deterministic, plain-language observations. Each one only appears when there is enough data behind it. */
function stats_observations(s, apps, st, jobsById) {
  const t = now();
  const applied = apps.filter((a) => a.stage !== "saved" && a.appliedAt);
  const ghostDays = s.settings.ghostDays || 21;
  const out = [];

  // 1. Silence after the ghost window
  const old = applied.filter((a) => t - a.appliedAt >= ghostDays * DAY);
  const silent = old.filter((a) => !stats_isReplied(a));
  if (old.length >= 3 && silent.length) {
    const most = silent.length / old.length > 0.5;
    out.push({ key: "silent", icon: "ghost", tone: "ghost",
      text: most ? `Most of your applications go silent: ${silent.length} of ${old.length} sent ${ghostDays}+ days ago never got a reply.` : `${silent.length} of ${old.length} applications sent ${ghostDays}+ days ago never got a reply.`,
      hint: `Only counts applications old enough to judge (${ghostDays} days, from your settings).` });
  }

  // 2. Biggest drop-off between funnel steps (each step needs at least 3 at the start)
  const repliedApps = applied.filter(stats_isReplied);
  const positive = applied.filter((a) => ["screen", "interview", "offer"].includes(a.stage) || (a.events || []).some((e) => ["screen", "interview", "offer"].includes(e.to)));
  const interviewed = applied.filter(stats_reachedInterview);
  const decidedInterviews = interviewed.filter((a) => ["offer", "rejected", "ghosted"].includes(a.stage));
  const steps = [
    { from: "sending an application", to: "getting any reply", n: applied.length, k: repliedApps.length },
    { from: "a positive reply", to: "an interview", n: positive.length, k: positive.filter(stats_reachedInterview).length },
    { from: "interviewing", to: "an offer", n: decidedInterviews.length, k: decidedInterviews.filter((a) => a.stage === "offer").length, note: "finished processes only" },
  ].filter((x) => x.n >= 3);
  if (steps.length) {
    const worst = steps.reduce((a, b) => (b.k / b.n < a.k / a.n ? b : a));
    out.push({ key: "drop", icon: "filter", tone: "wait",
      text: `Your biggest drop-off is between ${worst.from} and ${worst.to}: ${worst.k} of ${worst.n} (${fmt.pct(worst.k / worst.n)}) made it through.`,
      hint: steps.length > 1 ? `Compared across ${steps.length} funnel steps${worst.note ? ", " + worst.note : ""}.` : "Other steps need at least 3 applications to compare." });
  }

  // 3. Where rejections happen
  const rej = applied.filter((a) => a.stage === "rejected");
  if (rej.length >= 2) {
    const pre = rej.filter((a) => !stats_reachedInterview(a)).length;
    out.push({ key: "rej", icon: "x", tone: "bad",
      text: pre / rej.length >= 0.5 ? `${pre} of ${rej.length} rejections came before any interview, so the resume screen is where most of them happen.` : `${rej.length - pre} of ${rej.length} rejections came after at least one interview round.`,
      hint: pre / rej.length >= 0.5 ? "Tailoring your resume to each listing usually matters most at this stage." : "Your reflections on those rounds are the best place to look for patterns." });
  }

  // 4. Round outcomes by type
  const byType = {};
  for (const a of apps) for (const r of a.rounds || []) {
    if (r.outcome !== "passed" && r.outcome !== "failed") continue;
    const b = (byType[r.type] = byType[r.type] || { p: 0, f: 0 });
    b[r.outcome === "passed" ? "p" : "f"]++;
  }
  const typed = Object.entries(byType).map(([type, b]) => ({ type, ...b, d: b.p + b.f }));
  const decided = typed.reduce((x, y) => x + y.d, 0);
  const weak = typed.filter((x) => x.d >= 2 && x.f > 0).sort((x, y) => x.p / x.d - y.p / y.d)[0];
  if (weak) out.push({ key: "rounds", icon: "prep", tone: "accent", text: `${ROUND[weak.type]?.label || "These"} rounds are your toughest so far: you passed ${weak.p} of ${weak.d}.`, hint: `Based on ${pluralize(decided, "round")} with a logged outcome.` });
  else if (decided >= 3) {
    const passed = typed.reduce((x, y) => x + y.p, 0);
    out.push({ key: "rounds", icon: "trophy", tone: "ok", text: `You've passed ${passed} of ${decided} interview rounds with a logged outcome.`, hint: "Only counts rounds marked passed or failed." });
  }

  // 5. Reply timing vs. who is still waiting
  if (st.medianReplyDays != null && st.replied >= 3) {
    const waiting = applied.filter((a) => a.stage === "applied" && !stats_isReplied(a) && (t - a.appliedAt) / DAY > st.medianReplyDays);
    out.push({ key: "timing", icon: "clock", tone: "",
      text: `Companies that replied took a median of ${stats_days(st.medianReplyDays)} days.${waiting.length ? ` ${waiting.length === 1 ? "1 application still waiting is" : `${waiting.length} applications still waiting are`} past that point.` : ""}`,
      hint: `n=${st.replied} replies.${waiting.length ? " A short follow-up is reasonable for those." : ""}` });
  }

  // 6. Category response rates (needs applications linked to listings)
  const cats = {};
  for (const a of applied) {
    const j = a.jobId && jobsById.get(a.jobId);
    if (!j) continue;
    const c = (cats[j.cat] = cats[j.cat] || { n: 0, r: 0 });
    c.n++; if (stats_isReplied(a)) c.r++;
  }
  const cl = Object.entries(cats).filter(([, c]) => c.n >= 3).sort((x, y) => y[1].r / y[1].n - x[1].r / x[1].n);
  if (cl.length >= 2) {
    const [hi, lo] = [cl[0], cl[cl.length - 1]];
    if (hi[1].r / hi[1].n > lo[1].r / lo[1].n) out.push({ key: "cat", icon: "layers", tone: "info", text: `${hi[0]} roles reply more often: ${fmt.pct(hi[1].r / hi[1].n)} vs ${fmt.pct(lo[1].r / lo[1].n)} for ${lo[0]}.`, hint: `n=${hi[1].n} and n=${lo[1].n}, from applications linked to listings.` });
  }

  // 7. Applying early (needs linked listings with a posted date)
  const timed = applied.map((a) => ({ a, j: a.jobId && jobsById.get(a.jobId) })).filter((x) => x.j && x.j.p);
  const early = timed.filter((x) => x.a.appliedAt - x.j.p <= 3 * DAY), late = timed.filter((x) => x.a.appliedAt - x.j.p > 3 * DAY);
  if (early.length >= 3 && late.length >= 3) {
    const re = early.filter((x) => stats_isReplied(x.a)).length / early.length, rl = late.filter((x) => stats_isReplied(x.a)).length / late.length;
    if (Math.abs(re - rl) >= 0.1) out.push({ key: "early", icon: "bolt", tone: "accent", text: `Applying within 3 days of posting got replies ${fmt.pct(re)} of the time, vs ${fmt.pct(rl)} when you applied later.`, hint: `n=${early.length} early, n=${late.length} later.` });
  }
  return out;
}

function stats_WeeklyChart({ weeks }) {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  const [hi, setHi] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    setW(Math.max(260, Math.round(el.clientWidth)));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => setW(Math.max(260, Math.round(es[0].contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = w < 420 ? 200 : 268;
  const m = { l: 28, r: 8, t: 22, b: 28 };
  const n = weeks.length;
  const max = Math.max(1, ...weeks.map((x) => Math.max(x.applied, x.replies)));
  const { step, top } = stats_niceScale(max);
  const iw = w - m.l - m.r, ih = H - m.t - m.b;
  const band = iw / n, bw = Math.min(24, band * 0.5);
  const xc = (i) => m.l + band * (i + 0.5);
  const y = (v) => m.t + ih - (v / top) * ih;
  const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  const bar = (i, v) => {
    if (!v) return null;
    const x0 = xc(i) - bw / 2, x1 = x0 + bw, yb = y(0), yt = y(v), r = Math.min(4, yb - yt, bw / 2);
    return `M${x0},${yb}V${yt + r}Q${x0},${yt} ${x0 + r},${yt}H${x1 - r}Q${x1},${yt} ${x1},${yt + r}V${yb}Z`;
  };
  const line = weeks.map((x, i) => `${i ? "L" : "M"}${xc(i)},${y(x.replies)}`).join("");
  const every = band < 46 ? 2 : 1;
  const last = n - 1;
  const lbl = (x, i) => i === last ? "This week" : fmt.date(x.start);
  const tip = hi != null ? weeks[hi] : null;
  return html`<div class="st-chart-inner" ref=${ref} style="position:relative">
    <svg class="chart st-chart" width=${w} height=${H} viewBox=${`0 0 ${w} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Applications and replies per week, last 8 weeks">
      ${ticks.map((v) => html`<g key=${"t" + v}>
        <line class=${v === 0 ? "base-line" : "grid-line"} x1=${m.l} x2=${w - m.r} y1=${y(v)} y2=${y(v)} />
        <text x=${m.l - 8} y=${y(v) + 4} text-anchor="end">${v}</text>
      </g>`)}
      ${hi != null && html`<rect class="st-band" x=${xc(hi) - band / 2 + 2} y=${m.t - 6} width=${band - 4} height=${ih + 6} rx="4" />`}
      ${weeks.map((x, i) => html`<path key=${"b" + i} class="st-bar" d=${bar(i, x.applied)} />`)}
      ${weeks.map((x, i) => (i % every === (last % every) ? html`<text key=${"x" + i} class=${cx("st-xl", i === last && "now")} x=${xc(i)} y=${H - 8} text-anchor=${i === last && band < 70 ? "end" : "middle"} dx=${i === last && band < 70 ? bw / 2 + 4 : 0}>${lbl(x, i)}</text>` : null))}
      <path class="st-line" d=${line} />
      ${weeks.map((x, i) => html`<circle key=${"d" + i} class="st-dot" cx=${xc(i)} cy=${y(x.replies)} r=${i === last ? 5 : 4} />`)}
      ${weeks[last].applied > 0 && html`<text class="st-val" x=${xc(last)} y=${y(weeks[last].applied) - 8} text-anchor="middle">${weeks[last].applied}</text>`}
      ${weeks.map((x, i) => html`<rect key=${"h" + i} class="st-hit" x=${xc(i) - band / 2} y=${m.t - 6} width=${band} height=${ih + 6} tabindex="0"
        aria-label=${`Week of ${fmt.date(x.start)}: ${pluralize(x.applied, "application")}, ${pluralize(x.replies, "reply", "replies")}`}
        onMouseEnter=${() => setHi(i)} onMouseLeave=${() => setHi(null)} onFocus=${() => setHi(i)} onBlur=${() => setHi(null)}>
        <title>${`Week of ${fmt.date(x.start)}: ${x.applied} applied, ${x.replies} ${x.replies === 1 ? "reply" : "replies"}`}</title>
      </rect>`)}
    </svg>
    ${tip && html`<div class="st-tip" style=${`left:${clamp(xc(hi), 70, w - 70)}px;top:${y(Math.max(tip.applied, tip.replies)) - 12}px`}>
      <span>${hi === last ? "This week" : "Week of " + fmt.date(tip.start)}</span>
      <span class="st-tip-row"><i class="st-tip-key" style="background:var(--accent)"></i><b>${tip.applied}</b> applied</span>
      <span class="st-tip-row"><i class="st-tip-key" style="background:var(--ok)"></i><b>${tip.replies}</b> ${tip.replies === 1 ? "reply" : "replies"}</span>
    </div>`}
    <table class="sr"><caption>Applications and replies per week</caption><thead><tr><th>Week of</th><th>Applied</th><th>Replies</th></tr></thead>
      <tbody>${weeks.map((x) => html`<tr key=${x.start}><td>${fmt.date(x.start)}</td><td>${x.applied}</td><td>${x.replies}</td></tr>`)}</tbody></table>
  </div>`;
}

function stats_Kpis({ st }) {
  const small = st.applied < 10;
  const smallTag = small ? html`<span class="st-small-n" title="Fewer than 10 applications. Rates can swing a lot."> · small sample</span>` : null;
  return html`<section class="card stats-row st-kpis" aria-label="Key numbers">
    <div class="stat"><span class="stat-label">Applications sent</span><span class="stat-value">${st.applied}</span><span class="stat-sub num">${st.thisWeek} this week · ${st.active} active</span></div>
    <div class="stat"><span class="stat-label">Response rate</span><span class="stat-value">${fmt.pct(st.responseRate)}</span><span class="stat-sub num">${st.replied} of ${st.applied} replied${smallTag}</span></div>
    <div class="stat"><span class="stat-label">Interview rate</span><span class="stat-value">${fmt.pct(st.interviewRate)}</span><span class="stat-sub num">${st.interviewed} of ${st.applied} reached interviews</span></div>
    <div class="stat"><span class="stat-label">Median days to first reply</span><span class="stat-value">${stats_days(st.medianReplyDays)}${st.medianReplyDays != null ? html`<span class="st-unit">days</span>` : null}</span><span class="stat-sub num">${st.replied ? `n=${st.replied} ${st.replied === 1 ? "reply" : "replies"}` : "No replies yet"}</span></div>
  </section>`;
}

function stats_Funnel({ st }) {
  const rows = [
    { k: "Applied", n: st.applied }, { k: "Replied", n: st.replied }, { k: "Interviewed", n: st.interviewed }, { k: "Offer", n: st.offers },
  ];
  return html`<section class="card st-funnel-card" aria-labelledby="st-funnel-h">
    <div class="card-head"><h2 id="st-funnel-h">Funnel</h2><span class="spacer"></span><span class="hint">Share of applications sent</span></div>
    <div class="card-body st-funnel">
      ${rows.map((r, i) => html`<div class="funnel-row" key=${r.k}>
        <span class="st-fl">${r.k}</span>
        <div class="funnel-bar" role="img" aria-label=${`${r.k}: ${r.n} (${fmt.pct(st.applied ? r.n / st.applied : 0)})`}>${r.n > 0 && st.applied ? html`<i style=${`width:${(r.n / st.applied) * 100}%`}></i>` : null}</div>
        <span class="st-fv"><b>${r.n}</b><span>${st.applied ? fmt.pct(r.n / st.applied) : "—"}</span></span>
      </div>`)}
      <div class="st-steps">
        ${rows.slice(1).map((r, i) => html`<div class="st-step" key=${r.k}><span class="faint">${rows[i].k} to ${r.k.toLowerCase()}</span><b class="num">${rows[i].n ? fmt.pct(r.n / rows[i].n) : "—"}</b><span class="faint num">${r.n} of ${rows[i].n}</span></div>`)}
      </div>
      <p class="hint st-funnel-note">“Replied” counts any response, including rejections. “Interviewed” counts any logged round, including recruiter calls.</p>
    </div>
  </section>`;
}

const STATS_OUTCOMES = [
  { id: "active", label: "Still active", color: "var(--accent)", test: (a) => ACTIVE_STAGES.includes(a.stage) },
  { id: "offer", label: "Offer", color: "var(--ok)", test: (a) => a.stage === "offer" },
  { id: "rejected", label: "Rejected", color: "var(--bad)", test: (a) => a.stage === "rejected" },
  { id: "ghosted", label: "Ghosted", color: "var(--ghost)", test: (a) => a.stage === "ghosted" },
];
function stats_Outcomes({ applied }) {
  const rows = STATS_OUTCOMES.map((o) => ({ ...o, n: applied.filter(o.test).length }));
  const total = applied.length;
  return html`<section class="card" aria-labelledby="st-out-h">
    <div class="card-head"><h2 id="st-out-h">Outcomes</h2><span class="spacer"></span><span class="hint num">${pluralize(total, "application")}</span></div>
    <div class="card-body stack" style="gap:12px">
      <div class="st-outcome-bar" role="img" aria-label=${"Outcomes: " + rows.map((r) => `${r.label} ${r.n}`).join(", ")}>
        ${rows.filter((r) => r.n).map((r) => html`<i key=${r.id} style=${`flex:${r.n};background:${r.color}`} title=${`${r.label}: ${r.n}`}></i>`)}
      </div>
      <div class="st-out-rows">
        ${rows.map((r) => html`<div class="st-out-row" key=${r.id}>
          <span class="st-out-sw" style=${`background:${r.color}`}></span><span>${r.label}</span><span class="num">${r.n}</span><span class="faint">${total ? fmt.pct(r.n / total) : "—"}</span>
        </div>`)}
      </div>
    </div>
  </section>`;
}

function stats_Stall({ obs, applied }) {
  const need = 5;
  return html`<section class="card" aria-labelledby="st-stall-h">
    <div class="card-head"><h2 id="st-stall-h">Where you stall</h2><span class="spacer"></span><span class="hint">Computed from your own data</span></div>
    ${applied < need
      ? html`<div class="st-unlock">
          <strong>Insights unlock after ${need} applications</strong>
          <span class="muted td-small">You've sent ${applied}. ${need - applied} more and Heardback can start pointing out where applications stall.</span>
          <${Meter} value=${applied} max=${need} />
          <div><${Btn} size="sm" icon="find" onClick=${() => go("find")}>Find roles to apply to</${Btn}></div>
        </div>`
      : obs.length
        ? html`<div class="st-insights">${obs.map((o) => html`<div class="st-insight" key=${o.key}>
            <span class=${cx("task-ico", o.tone)}><${Icon} name=${o.icon} /></span>
            <div><p>${o.text}</p>${o.hint && html`<span class="hint">${o.hint}</span>`}</div>
          </div>`)}</div>`
        : html`<div class="st-unlock"><strong>No clear pattern yet</strong><span class="muted td-small">Keep logging replies, rounds and outcomes. Patterns show up here once there's enough behind them.</span></div>`}
  </section>`;
}

function stats_Radar({ apps, jobs }) {
  const linked = apps.filter((a) => a.jobId);
  const ready = jobs.status === "ready";
  const flagged = ready ? linked.map((a) => ({ a, j: jobs.byId.get(a.jobId) })).filter((x) => x.j && x.j.g >= 50).sort((x, y) => y.j.g - x.j.g) : [];
  let body;
  if (!linked.length) body = html`<div class="td-mini-empty"><${Icon} name="ghost" cls="faint" /><span class="muted td-small td-grow">None of your applications are linked to a listing yet. Roles you track from Find get checked for ghost-job signals automatically.</span><${Btn} size="sm" onClick=${() => go("find")}>Find jobs</${Btn}></div>`;
  else if (jobs.status === "error") body = html`<div class="td-mini-empty"><span class="muted td-small td-grow">Listings didn't load, so ghost signals can't be checked right now.</span><${Btn} size="sm" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}></div>`;
  else if (!ready) body = html`<${Skeleton} rows=${2} />`;
  else if (!flagged.length) body = html`<div class="td-mini-empty"><span class="task-ico ok"><${Icon} name="shield" /></span><span class="muted td-small td-grow">All ${pluralize(linked.length, "linked listing")} look active. No strong ghost-job signals.</span></div>`;
  else body = html`<div class="st-radar-big"><span class="td-big">${flagged.length}</span><span class="muted td-small">of ${pluralize(linked.length, "linked application")} show strong ghost-job signals</span></div>
    <div class="list">${flagged.map(({ a, j }) => html`<button type="button" class="st-radar-row" key=${a.id} onClick=${() => openApp(a.id)}>
      <${Logo} name=${a.company} />
      <span class="stack-sm" style="gap:1px;min-width:0"><span class="st-radar-title truncate">${a.company} · ${a.title}</span><span class="st-radar-sub truncate">${(j.gr || [])[0] || ghostLabel(j.g)}</span></span>
      <${GhostScore} g=${j.g} compact=${true} />
    </button>`)}</div>`;
  return html`<section class="card" aria-labelledby="st-radar-h">
    <div class="card-head"><h2 id="st-radar-h">Ghost-job radar</h2>${flagged.length ? html`<span class="td-count num">${flagged.length}</span>` : null}<span class="spacer"></span><span class="hint">Score 50+ of 100</span></div>
    ${body}
  </section>`;
}

function stats_View() {
  const s = useStore();
  const jobs = useJobs();
  const apps = Apps.list(s);
  const st = useMemo(() => computeStats(s, apps), [s]);
  const applied = useMemo(() => apps.filter((a) => a.stage !== "saved" && a.appliedAt), [s]);
  const obs = useMemo(() => stats_observations(s, apps, st, jobs.byId), [s, jobs.status]);
  const ex = hasExamples(s);
  const setShow = (v) => store.set((x) => ({ ...x, settings: { ...x.settings, showExamples: v } }));
  return html`<div class="page st-page">
    <div class="page-head">
      <div><h1>Insights</h1><p>What your own applications say about your search. Every rate shows how many applications it's based on.</p></div>
      <span class="spacer"></span>
      ${ex && html`<div class="st-head-note">${s.settings.showExamples ? html`<${ExampleTag} /><span>Includes example applications</span>` : null}<${Switch} id="stats-show-examples" checked=${s.settings.showExamples} onChange=${setShow} label="Show examples" /></div>`}
    </div>
    ${st.applied === 0
      ? html`<div class="card"><${Empty} icon="stats" title="Insights start with your first application" action=${html`<div class="row wrap" style="justify-content:center"><${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}><${Btn} icon="find" onClick=${() => go("find")}>Find jobs</${Btn}></div>`}>
          Track the roles you apply to and the replies you get. This page then shows your response rate, how long companies take to reply and where applications stall.
        </${Empty}></div>`
      : html`
        <${stats_Kpis} st=${st} />
        <div class="st-grid st-grid-top">
          <section class="card" aria-labelledby="st-week-h">
            <div class="card-head"><h2 id="st-week-h">Weekly activity</h2><span class="spacer"></span>
              <span class="st-legend"><span><i class="st-key-bar"></i>Applications</span><span><i class="st-key-line"></i>Replies</span></span></div>
            <div class="st-chart-wrap"><${stats_WeeklyChart} weeks=${st.weeks} /></div>
            <div class="st-chart-foot">Last 8 weeks. Replies are counted in the week the first reply arrived.</div>
          </section>
          <${stats_Funnel} st=${st} />
        </div>
        <div class="st-grid">
          <${stats_Stall} obs=${obs} applied=${st.applied} />
          <div class="st-col">
            <${stats_Outcomes} applied=${applied} />
            <${stats_Radar} apps=${apps} jobs=${jobs} />
          </div>
        </div>`}
  </div>`;
}
VIEWS.stats = stats_View;
