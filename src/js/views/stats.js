/* ===== Insights: personal analytics, honest about sample sizes ===== */

const STATS_REPLY_STAGES = ["screen", "interview", "offer", "rejected"];
function stats_isReplied(a) { return !!a.lastReplyAt || STATS_REPLY_STAGES.includes(a.stage); }
/* Same rule as the Interviewed count: the Interviews stage, or a round that already happened (online assessments excluded). */
function stats_reachedInterview(a) { return ["interview", "offer"].includes(a.stage) || (a.rounds || []).some((r) => r.at && r.at <= now() && r.type !== "assessment") || (a.events || []).some((e) => e.to === "interview"); }
function stats_days(d) { return d == null ? "—" : d < 10 && d % 1 ? d.toFixed(1) : String(Math.round(d)); }
function stats_niceScale(max) {
  if (max <= 4) return { step: 1, top: Math.max(2, max) };
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]) if (max / step <= 5) return { step, top: Math.ceil(max / step) * step };
  return { step: max, top: max };
}
/* Whole-number percentages that always sum to 100 (largest remainder). */
function stats_pcts(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => null);
  const raw = counts.map((n) => (n / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out;
}

/* Deterministic, plain-language observations. Each one only appears when there is enough data behind it,
   names its sample, and compares like with like: any comparison uses only applications sent 14+ days ago,
   so recent ones that haven't had time to get a reply can't drag a group down. At most one action each. */
const STATS_MATURE_DAYS = 14;
const STATS_MIN_GROUP = 8;
function stats_observations(s, apps, st, jobsById) {
  const t = now();
  const applied = apps.filter((a) => a.stage !== "saved" && a.appliedAt);
  const ghostDays = s.settings.ghostDays || 21;
  const out = [];
  const seePipeline = { label: "See them", run: () => go("pipeline") };

  // 1. Silence after the ghost window
  const old = applied.filter((a) => t - a.appliedAt >= ghostDays * DAY);
  const silent = old.filter((a) => !stats_isReplied(a));
  const stillOpen = silent.filter((a) => ACTIVE_STAGES.includes(a.stage));
  if (old.length >= 3 && silent.length) {
    const most = silent.length / old.length > 0.5;
    out.push({ key: "silent", icon: "ghost", tone: "ghost",
      text: `${most ? "Most applications go silent: " : ""}${silent.length} of ${old.length} applications sent ${ghostDays}+ days ago never got a reply.${stillOpen.length ? ` ${stillOpen.length === 1 ? "1 is" : `${stillOpen.length} are`} still marked active.` : ""}`,
      action: stillOpen.length ? seePipeline : null });
  }

  // 2. Biggest drop-off between funnel steps (each step needs at least 5 at the start)
  const repliedApps = applied.filter(stats_isReplied);
  const positive = applied.filter((a) => ["screen", "interview", "offer"].includes(a.stage) || (a.events || []).some((e) => ["screen", "interview", "offer"].includes(e.to)));
  const interviewed = applied.filter(stats_reachedInterview);
  const decidedInterviews = interviewed.filter((a) => ["offer", "rejected", "ghosted"].includes(a.stage));
  const steps = [
    // Recent applications haven't had time to hear back, so the reply step only counts ones sent 14+ days ago.
    { label: "getting a first reply", n: applied.filter((a) => t - a.appliedAt >= STATS_MATURE_DAYS * DAY).length, k: repliedApps.filter((a) => t - a.appliedAt >= STATS_MATURE_DAYS * DAY).length, note: ` sent ${STATS_MATURE_DAYS}+ days ago` },
    { label: "turning a reply into an interview", n: positive.length, k: positive.filter(stats_reachedInterview).length },
    { label: "turning interviews into an offer", n: decidedInterviews.length, k: decidedInterviews.filter((a) => a.stage === "offer").length },
  ].filter((x) => x.n >= 5);
  if (steps.length) {
    const worst = steps.reduce((a, b) => (b.k / b.n < a.k / a.n ? b : a));
    out.push({ key: "drop", icon: "filter", tone: "wait", text: `Biggest drop-off: ${worst.label} (${worst.k} of ${worst.n}${worst.note || ""}).` });
  }

  // 3. Where rejections happen
  const rej = applied.filter((a) => a.stage === "rejected");
  if (rej.length >= 3) {
    const pre = rej.filter((a) => !stats_reachedInterview(a)).length;
    out.push({ key: "rej", icon: "x", tone: "bad",
      text: pre / rej.length >= 0.5
        ? `${pre} of ${rej.length} rejections came before any interview. That points at the resume screen, so tailoring your resume to each listing is the best lever.`
        : `${rej.length - pre} of ${rej.length} rejections came after an interview. Your round notes are the place to look for patterns.`,
      action: pre / rej.length >= 0.5 ? null : { label: "Open prep", run: () => go("prep") } });
  }

  // 4. Interview rounds by type (online assessments and recruiter calls aren't interviews)
  const byType = {};
  for (const a of apps) for (const r of a.rounds || []) {
    if (r.outcome !== "passed" && r.outcome !== "failed") continue;
    if (r.type === "assessment" || r.type === "recruiter") continue;
    const b = (byType[r.type] = byType[r.type] || { p: 0, f: 0 });
    b[r.outcome === "passed" ? "p" : "f"]++;
  }
  const typed = Object.entries(byType).map(([type, b]) => ({ type, ...b, d: b.p + b.f }));
  const decided = typed.reduce((x, y) => x + y.d, 0);
  const weak = typed.filter((x) => x.d >= 3 && x.f > 0).sort((x, y) => x.p / x.d - y.p / y.d)[0];
  if (weak) out.push({ key: "rounds", icon: "prep", tone: "accent", text: `${ROUND[weak.type]?.label || "These"} rounds are your toughest so far: you passed ${weak.p} of ${weak.d}.`, action: { label: "Prep for the next one", run: () => go("prep") } });
  else if (decided >= 3) {
    const passed = typed.reduce((x, y) => x + y.p, 0);
    out.push({ key: "rounds", icon: "trophy", tone: "ok", text: `You’ve passed ${passed} of ${decided} interview rounds with a logged outcome (not counting recruiter calls or online assessments).` });
  }

  // 5. Reply timing vs. who is still waiting
  if (st.medianReplyDays != null && (st.replyN ?? st.replied) >= 3) {
    const waiting = applied.filter((a) => a.stage === "applied" && !stats_isReplied(a) && (t - a.appliedAt) / DAY > st.medianReplyDays && (t - a.appliedAt) / DAY < ghostDays);
    out.push({ key: "timing", icon: "clock", tone: "",
      text: `Replies took a median of ${stats_days(st.medianReplyDays)} days (from ${pluralize(st.replyN ?? st.replied, "reply", "replies")}).${waiting.length ? ` ${waiting.length === 1 ? "1 application is" : `${waiting.length} applications are`} past that with no reply, so a short follow-up is reasonable.` : ""}`,
      action: waiting.length ? { label: "Follow up from Today", run: () => go("today") } : null });
  }

  // Comparisons: linked applications sent 14+ days ago only, at least 8 in each group.
  const mature = applied.filter((a) => t - a.appliedAt >= STATS_MATURE_DAYS * DAY);
  const linked = mature.map((a) => ({ a, j: a.jobId && jobsById.get(a.jobId) })).filter((x) => x.j);
  const rate = (xs) => xs.filter((x) => stats_isReplied(x.a)).length;

  // 6. Category response rates
  const cats = {};
  for (const x of linked) (cats[x.j.cat] = cats[x.j.cat] || []).push(x);
  const cl = Object.entries(cats).filter(([, xs]) => xs.length >= STATS_MIN_GROUP).sort((x, y) => rate(y[1]) / y[1].length - rate(x[1]) / x[1].length);
  if (cl.length >= 2) {
    const [hi, lo] = [cl[0], cl[cl.length - 1]];
    const n = cl.reduce((m, [, xs]) => m + xs.length, 0);
    if (rate(hi[1]) / hi[1].length - rate(lo[1]) / lo[1].length >= 0.15) out.push({ key: "cat", icon: "layers", tone: "info",
      text: `${hi[0]} roles replied more often: ${rate(hi[1])} of ${hi[1].length}, vs ${rate(lo[1])} of ${lo[1].length} for ${lo[0]}. From ${n} applications linked to a listing and sent ${STATS_MATURE_DAYS}+ days ago.` });
  }

  // 7. Applying early
  const timed = linked.filter((x) => x.j.p && x.a.appliedAt >= x.j.p - DAY);
  const early = timed.filter((x) => x.a.appliedAt - x.j.p <= 3 * DAY), late = timed.filter((x) => x.a.appliedAt - x.j.p > 3 * DAY);
  if (early.length >= STATS_MIN_GROUP && late.length >= STATS_MIN_GROUP) {
    const re = rate(early) / early.length, rl = rate(late) / late.length;
    if (Math.abs(re - rl) >= 0.15) out.push({ key: "early", icon: "bolt", tone: "accent",
      text: `Applied within 3 days of posting: ${rate(early)} of ${early.length} got a reply. Applied later: ${rate(late)} of ${late.length}. From ${timed.length} linked applications sent ${STATS_MATURE_DAYS}+ days ago.`,
      action: re > rl ? { label: "See new roles", run: () => go("find") } : null });
  }
  return out;
}

function stats_WeeklyChart({ weeks }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 640, h: 0 });
  const [hi, setHi] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const read = (r) => setBox((b) => { const w = Math.max(260, Math.round(r.width)), h = Math.round(r.height); return b.w === w && b.h === h ? b : { w, h }; });
    read(el.getBoundingClientRect());
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => read(es[0].contentRect));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const w = box.w;
  const m = { l: w < 420 ? 52 : 60, r: 8, t: 22, b: 58 };
  const n = weeks.length;
  const max = Math.max(1, ...weeks.map((x) => x.applied));
  const { step, top } = stats_niceScale(max);
  /* Small counts get a shorter plot; beside the funnel the card stretches to the funnel's height and the plot fills it. */
  const minH = max <= 4 ? (w < 420 ? 196 : 220) : (w < 420 ? 224 : 284);
  const H = Math.max(minH, box.h);
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
  const every = band < 46 ? 2 : 1;
  const last = n - 1;
  const lbl = (x, i) => i === last ? (band < 60 ? "Now" : "This week") : fmt.date(x.start);
  const tip = hi != null ? weeks[hi] : null;
  const yx = y(0) + 18, yr = H - 10;
  return html`<div class="st-chart-inner" ref=${ref} style=${`min-height:${minH}px`}>
    <svg class="chart st-chart" width=${w} height=${H} viewBox=${`0 0 ${w} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Applications and replies per week, last 8 weeks">
      ${ticks.map((v) => html`<g key=${"t" + v}>
        <line class=${v === 0 ? "base-line" : "grid-line"} x1=${m.l} x2=${w - m.r} y1=${y(v)} y2=${y(v)} />
        <text x=${m.l - 8} y=${y(v) + 4} text-anchor="end">${v}</text>
      </g>`)}
      ${hi != null && html`<rect class="st-band" x=${xc(hi) - band / 2 + 2} y=${m.t - 6} width=${band - 4} height=${H - m.t + 4} rx="4" />`}
      ${weeks.map((x, i) => html`<path key=${"b" + i} class=${cx("st-bar", i === last && "now")} d=${bar(i, x.applied)} />`)}
      ${weeks.map((x, i) => (i % every === (last % every) ? html`<text key=${"x" + i} class=${cx("st-xl", i === last && "now")} x=${xc(i)} y=${yx} text-anchor="middle">${lbl(x, i)}</text>` : null))}
      ${weeks[last].applied > 0 && html`<text class="st-val" x=${xc(last)} y=${y(weeks[last].applied) - 8} text-anchor="middle">${weeks[last].applied}</text>`}
      <line class="grid-line" x1=${0} x2=${w - m.r} y1=${yr - 18} y2=${yr - 18} />
      <text class="st-row-label" x=${0} y=${yr}>Replies</text>
      ${weeks.map((x, i) => html`<text key=${"r" + i} class=${cx("st-reply", x.replies > 0 && "on")} x=${xc(i)} y=${yr} text-anchor="middle">${x.replies}</text>`)}
      ${weeks.map((x, i) => html`<rect key=${"h" + i} class="st-hit" x=${xc(i) - band / 2} y=${m.t - 6} width=${band} height=${H - m.t + 4} tabindex="0"
        aria-label=${`Week of ${fmt.date(x.start)}: ${pluralize(x.applied, "application")}, ${pluralize(x.replies, "reply", "replies")}`}
        onMouseEnter=${() => setHi(i)} onMouseLeave=${() => setHi(null)} onFocus=${() => setHi(i)} onBlur=${() => setHi(null)}>
        <title>${`Week of ${fmt.date(x.start)}: ${x.applied} applied, ${x.replies} ${x.replies === 1 ? "reply" : "replies"}`}</title>
      </rect>`)}
    </svg>
    ${tip && html`<div class="st-tip" style=${`left:${clamp(xc(hi), 70, w - 70)}px;top:${y(tip.applied) - 12}px`}>
      <span>${hi === last ? "This week" : "Week of " + fmt.date(tip.start)}</span>
      <span class="st-tip-row td-meta"><span><b>${tip.applied}</b> applied</span><span><b>${tip.replies}</b> ${tip.replies === 1 ? "reply" : "replies"}</span></span>
    </div>`}
    <table class="sr"><caption>Applications and replies per week</caption><thead><tr><th>Week of</th><th>Applied</th><th>Replies</th></tr></thead>
      <tbody>${weeks.map((x) => html`<tr key=${x.start}><td>${fmt.date(x.start)}</td><td>${x.applied}</td><td>${x.replies}</td></tr>`)}</tbody></table>
  </div>`;
}

function stats_Kpis({ st, saved }) {
  const small = st.applied < 10;
  /* Under 5 applications a rate is noise (one reply = 100%); show the counts, not a percentage */
  const early = st.applied < 5;
  const smallTag = small ? html`<span class="st-small-n" title="Fewer than 10 applications. Rates can swing a lot.">small sample</span>` : null;
  const d = st.medianReplyDays;
  return html`<section class="card stats-row st-kpis" aria-label="Key numbers">
    <div class="stat"><span class="stat-label">Tracked</span><span class="stat-value">${st.total}</span>${today_meta([`${st.applied} applied`, `${saved} saved`, `${st.thisWeek} this week`], "stat-sub num")}</div>
    <div class="stat"><span class="stat-label">Response rate</span>${early ? html`<span class="stat-value td-early">Too early to tell</span>` : html`<span class="stat-value">${fmt.pct(st.responseRate)}</span>`}${today_meta([`${st.replied} of ${st.applied} replied`, !early && smallTag], "stat-sub num")}</div>
    <div class="stat"><span class="stat-label">Interview rate</span>${early ? html`<span class="stat-value td-early">Too early to tell</span>` : html`<span class="stat-value">${fmt.pct(st.interviewRate)}</span>`}<span class="stat-sub num">${st.interviewed} of ${st.applied} reached interviews</span></div>
    <div class="stat"><span class="stat-label">Time to first reply</span><span class="stat-value">${stats_days(d)}${d != null ? html`<span class="st-unit">days</span>` : null}</span><span class="stat-sub num">${st.replied ? `median of ${pluralize(st.replyN ?? st.replied, "reply", "replies")}` : "No replies yet"}</span></div>
  </section>`;
}

function stats_Funnel({ st }) {
  const rows = [
    { k: "Applied", n: st.applied }, { k: "Replied", n: st.replied }, { k: "Interviewed", n: st.interviewed }, { k: "Offer", n: st.offers },
  ];
  return html`<section class="card st-funnel-card" aria-labelledby="st-funnel-h">
    <div class="card-head"><h2 id="st-funnel-h">Funnel</h2></div>
    <div class="card-body st-funnel">
      ${rows.map((r, i) => html`<div class="funnel-row" key=${r.k}>
        <span class="st-fl">${r.k}</span>
        <div class="funnel-bar" role="img" aria-label=${`${r.k}: ${r.n} (${fmt.pct(st.applied ? r.n / st.applied : 0)})`}>${r.n > 0 && st.applied ? html`<i style=${`width:${(r.n / st.applied) * 100}%`}></i>` : null}</div>
        <span class="st-fv"><b>${r.n}</b><span>${st.applied ? fmt.pct(r.n / st.applied) : "—"}</span></span>
      </div>`)}
      <div class="st-steps">
        ${rows.slice(1).map((r, i) => html`<div class="st-step" key=${r.k}><span class="faint">${rows[i].k} to ${r.k.toLowerCase()}</span><b class="num">${rows[i].n ? fmt.pct(r.n / rows[i].n) : "—"}</b><span class="faint num">${r.n} of ${rows[i].n}</span></div>`)}
      </div>
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
  const pcts = stats_pcts(rows.map((r) => r.n));
  return html`<section class="card" aria-labelledby="st-out-h">
    <div class="card-head"><h2 id="st-out-h">Outcomes</h2></div>
    <div class="card-body stack" style="gap:12px">
      <div class="st-outcome-bar" role="img" aria-label=${"Outcomes: " + rows.map((r) => `${r.label} ${r.n}`).join(", ")}>
        ${rows.filter((r) => r.n).map((r) => html`<i key=${r.id} style=${`flex:${r.n};background:${r.color}`} title=${`${r.label}: ${r.n}`}></i>`)}
      </div>
      <div class="st-out-rows">
        ${rows.map((r) => html`<div class="st-out-row" key=${r.id}>
          <span class="st-out-sw" style=${`background:${r.color}`}></span><span>${r.label}</span><span class="num">${r.n}</span><span class="faint">${total ? `${pcts[rows.indexOf(r)]}%` : "—"}</span>
        </div>`)}
      </div>
    </div>
  </section>`;
}

function stats_Stall({ obs, applied }) {
  const need = 5;
  return html`<section class="card" aria-labelledby="st-stall-h">
    <div class="card-head"><h2 id="st-stall-h">Patterns</h2></div>
    ${applied < need
      ? html`<div class="st-unlock">
          <strong>Insights unlock after ${need} applications</strong>
          <span class="muted td-small">You’ve sent ${applied}. ${need - applied} more and Heardback can start pointing out where applications stall.</span>
          <${Meter} value=${applied} max=${need} />
          <div><${Btn} size="sm" icon="find" onClick=${() => go("find")}>Find roles to apply to</${Btn}></div>
        </div>`
      : obs.length
        ? html`<div class="st-insights">${obs.map((o) => html`<div class="st-insight" key=${o.key}>
            <span class="task-ico"><${Icon} name=${o.icon} /></span>
            <p>${o.text}${o.action ? html` <a href="#" class="st-insight-act" onClick=${(e) => { e.preventDefault(); o.action.run(); }}>${o.action.label}<${Icon} name="arrowR" size=${14} /></a>` : null}</p>
          </div>`)}</div>`
        : html`<div class="st-unlock"><strong>No clear pattern yet</strong><span class="muted td-small">Keep logging replies, rounds and outcomes. Patterns show up here once there’s enough behind them.</span></div>`}
  </section>`;
}

function stats_Radar({ apps, jobs }) {
  const linked = apps.filter((a) => a.jobId);
  const ready = jobs.status === "ready";
  const flagged = ready ? linked.map((a) => ({ a, j: jobs.byId.get(a.jobId) })).filter((x) => x.j && x.j.g >= 50).sort((x, y) => y.j.g - x.j.g) : [];
  let body;
  if (!linked.length) body = html`<div class="td-mini-empty"><${Icon} name="ghost" cls="faint" /><span class="muted td-small td-grow">No applications are linked to a listing yet. Roles you track from Find are checked for ghost-job signals.</span><${Btn} size="sm" onClick=${() => go("find")}>Find jobs</${Btn}></div>`;
  else if (jobs.status === "error") body = html`<div class="td-mini-empty"><span class="muted td-small td-grow">Listings didn’t load, so ghost signals can’t be checked right now.</span><${Btn} size="sm" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}></div>`;
  else if (!ready) body = html`<${Skeleton} rows=${2} />`;
  else if (!flagged.length) body = html`<div class="td-mini-empty"><span class="task-ico ok"><${Icon} name="shield" /></span><span class="muted td-small td-grow">All ${pluralize(linked.length, "linked listing")} look active.</span></div>`;
  else body = html`<div class="st-radar-big"><span class="td-big">${flagged.length}</span><span class="muted td-small">of ${pluralize(linked.length, "linked application")} show strong ghost-job signals</span></div>
    <div class="list">${flagged.map(({ a, j }) => html`<button type="button" class="st-radar-row" key=${a.id} onClick=${() => openApp(a.id)}>
      <${Logo} name=${a.company} />
      <span class="stack-sm" style="gap:1px;min-width:0"><span class="st-radar-title truncate">${a.company}<span class="faint" aria-hidden="true"> · </span>${a.title}</span><span class="st-radar-sub truncate">${(j.gr || [])[0] || ghostLabel(j.g)}</span></span>
      <${GhostScore} g=${j.g} compact=${true} />
    </button>`)}</div>`;
  return html`<section class="card" aria-labelledby="st-radar-h">
    <div class="card-head"><h2 id="st-radar-h">Ghost-job radar</h2>${flagged.length ? html`<span class="td-count num">${flagged.length}</span>` : null}</div>
    ${body}
  </section>`;
}

function stats_Method({ ghostDays, ex }) {
  return html`<details class="st-method">
    <summary><${Icon} name="chevR" size=${14} />How we calculate this</summary>
    <ul>
      <li><b>Replied</b> counts any response, including rejections. <b>Interviewed</b> counts applications that reached Interviews or had a round that already happened, including recruiter calls but not online assessments.</li>
      <li>Rates are shares of applications sent. Under 10 applications, they’re flagged as a small sample because one reply moves them a lot.</li>
      <li>Time to first reply is the median across applications that got a reply.</li>
      <li>Replies are counted in the week the first reply arrived, over the last 8 weeks.</li>
      <li>Patterns need at least 3 applications behind them. Silence only counts applications sent ${ghostDays}+ days ago (set in Settings).</li>
      <li>Comparisons between groups only use applications sent 14+ days ago, so recent ones that haven’t had time to get a reply don’t skew them. Each group needs at least 8 applications, and each line says how many it’s based on.</li>
      <li>The ghost-job radar lists linked listings with a ghost score of 50 or more out of 100. It’s a signal from listing data, not proof.</li>
      ${ex ? html`<li>Example applications are included. Turn off “Include examples” to see only your own.</li>` : null}
    </ul>
  </details>`;
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
      <div><h1>Insights</h1><p>How your applications are performing.</p></div>
      <span class="spacer"></span>
      ${ex && html`<div class="st-head-note"><${Switch} id="stats-show-examples" checked=${s.settings.showExamples} onChange=${setShow} label="Include examples" /></div>`}
      <${Btn} icon="send" onClick=${() => openModal("share")}>Share progress</${Btn}>
    </div>
    ${st.applied === 0
      ? html`<div class="card"><${Empty} icon="stats" title="Insights start with your first application" action=${html`<div class="row wrap" style="justify-content:center"><${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}><${Btn} icon="find" onClick=${() => go("find")}>Find jobs</${Btn}></div>`}>
          Track the roles you apply to and the replies you get. Your response rate, reply times and where applications stall show up here.
        </${Empty}></div>`
      : html`
        <${stats_Kpis} st=${st} saved=${apps.filter((a) => a.stage === "saved").length} />
        <div class="st-grid st-grid-top">
          <section class="card st-chart-card" aria-labelledby="st-week-h">
            <div class="card-head"><h2 id="st-week-h">Applications per week</h2></div>
            <div class="st-chart-wrap"><${stats_WeeklyChart} weeks=${st.weeks} /></div>
          </section>
          <${stats_Funnel} st=${st} />
        </div>
        <div class="st-grid">
          <${stats_Stall} obs=${obs} applied=${st.applied} />
          <div class="st-col">
            <${stats_Outcomes} applied=${applied} />
            <${stats_Radar} apps=${apps} jobs=${jobs} />
          </div>
        </div>
        <${stats_Method} ghostDays=${s.settings.ghostDays || 21} ex=${ex && s.settings.showExamples} />`}
  </div>`;
}
VIEWS.stats = stats_View;
