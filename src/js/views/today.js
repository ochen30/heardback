/* ===== Today: the home screen ===== */

function today_greeting(h = new Date().getHours()) {
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function today_firstName(name) { return (name || "").trim().split(/\s+/)[0] || ""; }
function today_dayLabel(ts) {
  const diff = Math.round((fmt.startOfDay(ts) - fmt.startOfDay(now())) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return fmt.date(ts, { weekday: "short", month: "short", day: "numeric" });
}
function today_setPrepFocus(focus) { store.set((s) => ({ ...s, ui: { ...s.ui, prepFocus: focus } })); }
function today_undismiss(key, prev) {
  store.set((s) => { const d = { ...s.dismissed }; if (prev) d[key] = prev; else delete d[key]; return { ...s, dismissed: d }; });
}

/* Rounds in the next 7 days (anything starting less than an hour ago still counts as upcoming). */
function today_upcoming(apps) {
  const t = now(), end = fmt.startOfDay(t) + 7 * DAY;
  const items = [];
  for (const a of apps) for (const r of a.rounds || []) {
    if (r.at && r.at >= t - 3600000 && r.at < end && r.outcome !== "cancelled") items.push({ a, r });
  }
  items.sort((x, y) => x.r.at - y.r.at);
  const groups = [];
  for (const it of items) {
    const k = fmt.startOfDay(it.r.at);
    let g = groups[groups.length - 1];
    if (!g || g.day !== k) { g = { day: k, label: today_dayLabel(it.r.at), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  return { items, groups };
}

/* Run a task's primary action. */
function today_runTask(tk) {
  const a = tk.app;
  if (tk.kind === "prep") { today_setPrepFocus({ appId: a.id, roundId: tk.round.id }); go("prep"); }
  else if (tk.kind === "thanks" || tk.kind === "follow") {
    const props = tk.kind === "thanks" ? { appId: a.id, roundId: tk.round.id, kind: "thanks" } : { appId: a.id, kind: "follow" };
    if (MODALS.draft) openModal("draft", props);
    else {
      const prof = store.get().profile;
      copyText(tk.kind === "thanks" ? thankYouTemplate(a, tk.round, prof) : followUpTemplate(a, prof), "Draft copied to your clipboard");
    }
  }
  else if (tk.kind === "ghost") Apps.move(a.id, "ghosted");
  else if (tk.kind === "outcome") openApp(a.id, "rounds");
  else openApp(a.id);
}

/* Small anchored menu (snooze). Fixed-position so it escapes card overflow; closes on outside click, Esc, scroll. */
function today_Menu({ anchor, items, onClose, label }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const mw = ref.current ? ref.current.offsetWidth : 200, mh = ref.current ? ref.current.offsetHeight : 140;
    let left = r.right - mw; left = clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 4; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    setPos({ left, top });
    setTimeout(() => ref.current?.querySelector("button")?.focus(), 10);
  }, [anchor]);
  useEffect(() => {
    const down = (e) => { if (!ref.current?.contains(e.target) && !anchor.contains(e.target)) onClose(); };
    const key = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); anchor.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const bs = [...ref.current.querySelectorAll("button")]; const i = bs.indexOf(document.activeElement);
        bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
      }
    };
    const scroll = () => onClose();
    document.addEventListener("mousedown", down, true);
    window.addEventListener("keydown", key, true);
    document.getElementById("workspace")?.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("mousedown", down, true); window.removeEventListener("keydown", key, true);
      document.getElementById("workspace")?.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll);
    };
  }, [anchor, onClose]);
  return html`<div class="menu td-menu" role="menu" aria-label=${label} ref=${ref} style=${pos ? `left:${pos.left}px;top:${pos.top}px` : "visibility:hidden;left:0;top:0"}>
    ${items.map((it) => it.sep ? html`<div class="td-menu-sep" key=${it.key} role="separator"></div>` : html`<button type="button" role="menuitem" class=${it.cls} key=${it.key} onClick=${() => { onClose(); it.run(); }}>
      ${it.icon && html`<${Icon} name=${it.icon} />`}<span style="flex:1">${it.label}</span>${it.hint && html`<span class="faint td-menu-hint">${it.hint}</span>`}
    </button>`)}
  </div>`;
}

const TODAY_SNOOZE = [{ d: 1, label: "Snooze 1 day" }, { d: 3, label: "Snooze 3 days" }, { d: 7, label: "Snooze 1 week" }];

/* Display copy for a task. Core builds the text; Today trims it to one plain line and matches the verb to the task. */
function today_taskCopy(tk) {
  const a = tk.app;
  if (tk.kind === "ghost") return { sub: "Most replies come within 3 weeks.", action: "Mark ghosted" };
  if (tk.kind === "apply") return { sub: tk.sub, action: "Apply" };
  if (tk.kind === "outcome") return { sub: `${fmt.date(tk.round.at, { weekday: "short", month: "short", day: "numeric" })}. Log it while it's fresh.`, action: "Log outcome" };
  return { sub: tk.sub, action: tk.action };
}

function today_TaskRow({ tk, first }) {
  const [menu, setMenu] = useState(null);
  const close = useCallback(() => setMenu(null), []);
  const snooze = (d) => {
    const prev = store.get().dismissed[tk.key];
    dismissTask(tk.key, d);
    toast(`Snoozed until ${fmt.date(now() + d * DAY, { weekday: "short", month: "short", day: "numeric" })}`, { undo: () => today_undismiss(tk.key, prev) });
  };
  const dismiss = () => {
    const prev = store.get().dismissed[tk.key];
    dismissTask(tk.key);
    toast("Dismissed", { undo: () => today_undismiss(tk.key, prev) });
  };
  const a = tk.app;
  const copy = today_taskCopy(tk);
  const cls = cx("btn sm td-act", first && "primary");
  let primary;
  if (tk.kind === "apply" && a.url) primary = html`<a class=${cls} href=${a.url} target="_blank" rel="noopener" aria-label=${`Apply to ${a.company} (opens the posting in a new tab)`}>Apply<${Icon} name="ext" /></a>`;
  else if (tk.kind === "apply" && a.jobId && typeof openJob === "function") primary = html`<button type="button" class=${cls} onClick=${() => openJob(a.jobId)}>Apply</button>`;
  else primary = html`<button type="button" class=${cls} onClick=${() => today_runTask(tk)}>${copy.action}</button>`;
  const safeKey = tk.key.replace(/[^a-z0-9]/gi, "-");
  return html`<div class="task td-task" data-key=${tk.key}>
    <span class=${cx("task-ico", today_tone(tk))}><${Icon} name=${tk.icon} /></span>
    <div class="td-task-text">
      <button type="button" class="td-task-title task-title" onClick=${() => openApp(a.id)} title="Open application">${tk.title}</button>
      <div class="task-sub">${copy.sub}</div>
    </div>
    <div class="task-actions td-task-actions">
      ${primary}
      <button type="button" class="btn sm ghost icon td-more" id=${"more-" + safeKey} aria-haspopup="menu" aria-expanded=${menu ? "true" : "false"}
        aria-label=${"More options: " + tk.title} title="Snooze or dismiss" onClick=${(e) => setMenu(menu ? null : e.currentTarget)}><${Icon} name="more" /></button>
    </div>
    ${menu && html`<${today_Menu} anchor=${menu} onClose=${close} label="Task options"
      items=${[
        ...TODAY_SNOOZE.map((o) => ({ key: "s" + o.d, icon: "clock", label: o.label, hint: fmt.date(now() + o.d * DAY, { weekday: "short" }), run: () => snooze(o.d) })),
        { key: "sep", sep: true },
        { key: "dismiss", icon: "x", label: "Dismiss", cls: "td-dismiss", run: dismiss },
      ]} />`}
  </div>`;
}

function today_NeedsYou({ tasks, fresh }) {
  const [all, setAll] = useState(false);
  const shown = all ? tasks : tasks.slice(0, 5);
  return html`<section class="card" aria-labelledby="td-needs-h">
    <div class="card-head"><h2 id="td-needs-h">Needs you</h2>${tasks.length ? html`<span class="td-count num">${tasks.length}</span>` : null}</div>
    ${tasks.length
      ? html`<div class="list">${shown.map((tk, i) => html`<${today_TaskRow} key=${tk.key} tk=${tk} first=${i === 0} />`)}</div>
        ${tasks.length > 5 && html`<div class="td-card-foot"><${Btn} size="sm" kind="ghost" iconRight=${all ? undefined : "chevD"} onClick=${() => setAll(!all)}>${all ? "Show fewer" : `Show ${tasks.length - 5} more`}</${Btn}></div>`}`
      : html`<div class="td-caught">
          <span class="td-caught-ico"><${Icon} name="check" size=${18} /></span>
          <div class="stack-sm td-grow">
            <strong>${fresh ? "Nothing to do yet" : "You're all caught up"}</strong>
            <span class="muted td-small">${fresh
              ? "Follow-ups, interview prep and thank-you notes show up here once you track applications."
              : "Nothing needs a reply, prep or follow-up right now."}</span>
          </div>
          ${fresh
            ? html`<${Btn} size="sm" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}>`
            : html`<${Btn} size="sm" icon="find" onClick=${() => go("find")}>Find new roles</${Btn}>`}
        </div>`}
  </section>`;
}

function today_Upcoming({ up }) {
  return html`<section class="card" aria-labelledby="td-up-h">
    <div class="card-head"><h2 id="td-up-h">Upcoming</h2>${up.items.length ? html`<span class="td-count num">${up.items.length}</span>` : null}</div>
    ${up.items.length
      ? html`<div class="td-up">${up.groups.map((g) => html`<div class="td-up-day" key=${g.day}>
          <div class=${cx("td-up-label", g.label === "Today" && "is-today")}>${g.label}</div>
          <div class="list">${g.items.map(({ a, r }) => html`<button type="button" class="td-up-row" key=${r.id} onClick=${() => openApp(a.id, "rounds")}>
            <span class="td-up-time num">${fmt.time(r.at)}</span>
            <${Logo} name=${a.company} size="sm" />
            <span class="td-up-main">
              <span class="td-up-title truncate"><b>${a.company}</b><span class="faint"> · </span>${ROUND[r.type]?.label || "Interview"}</span>
              <span class="td-up-sub truncate">${r.interviewers ? `With ${r.interviewers}` : a.title}</span>
            </span>
            ${g.label === "Today" ? html`<span class="faint td-up-until hide-sm">${fmt.until(r.at)}</span>` : html`<span></span>`}
            <${Icon} name="chevR" cls="faint" />
          </button>`)}</div>
        </div>`)}</div>`
      : html`<div class="td-mini-empty">
          <${Icon} name="cal" cls="faint" />
          <span class="muted td-small td-grow">No interviews in the next 7 days. Paste an invite email and the round shows up here.</span>
          <${Btn} size="sm" kind="ghost" icon="mail" onClick=${() => openModal("paste")}>Log an email</${Btn}>
        </div>`}
  </section>`;
}

function today_matches(jobs, profile, apps) {
  if (jobs.status !== "ready") return null;
  const tracked = new Set(Object.values(apps).map((a) => a.jobId).filter(Boolean));
  const cut = now() - 3 * DAY;
  const recent = [], older = [], seen = new Set();
  for (const j of jobs.jobs) {
    if (j.g >= 50 || tracked.has(j.id)) continue;
    const dk = j.co + "|" + norm(j.t);
    if (seen.has(dk)) continue;
    const f = fitScore(j, profile);
    if (!f) return { list: [], recentCount: 0, noProfile: true };
    if (f.score < 60) continue;
    seen.add(dk);
    if (j.p >= cut) recent.push({ j, f });
    else { if (recent.length >= 6) break; older.push({ j, f }); if (older.length >= 6) break; }
  }
  // Strongest fits first among the fresh ones, newest first within each band.
  const band = (f) => (f.score >= 80 ? 0 : f.score >= 70 ? 1 : 2);
  const fresh = recent.slice().sort((x, y) => band(x.f) - band(y.f) || y.j.p - x.j.p);
  return { list: fresh.concat(older).slice(0, 6), recentCount: recent.length, noProfile: false };
}

function today_NewForYou({ jobs, m }) {
  const head = html`<div class="card-head"><h2 id="td-new-h">New for you</h2>
    <span class="spacer"></span><a href="#find" class="td-link" onClick=${(e) => { e.preventDefault(); go("find"); }}>See all in Find<${Icon} name="arrowR" size=${14} /></a></div>`;
  let body;
  if (jobs.status === "error") body = html`<div class="td-mini-empty"><${Icon} name="alert" cls="faint" /><span class="muted td-small td-grow">Job listings didn't load. Check your connection, then try again.</span><${Btn} size="sm" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}></div>`;
  else if (!m) body = html`<${Skeleton} rows=${4} />`;
  else if (m.noProfile) body = html`<div class="td-mini-empty"><${Icon} name="target" cls="faint" /><span class="muted td-small td-grow">Add target roles and locations so Heardback can pick roles that fit you.</span><${Btn} size="sm" onClick=${() => go("prefs")}>Set preferences</${Btn}></div>`;
  else if (!m.list.length) body = html`<div class="td-mini-empty"><${Icon} name="find" cls="faint" /><span class="muted td-small td-grow">No new strong matches right now. Broaden your roles or locations, or browse everything in Find.</span><${Btn} size="sm" onClick=${() => go("find")}>Browse all jobs</${Btn}></div>`;
  else body = html`<div class="list">${m.list.map(({ j, f }) => html`<div class="job-row td-job" key=${j.id} role="button" tabindex="0" onClick=${() => openJob(j.id)} onKeyDown=${(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJob(j.id); } }}>
      <${Logo} name=${j.co} />
      <div class="stack-sm" style="gap:2px">
        <span class="job-title truncate">${j.t}</span>
        <span class="job-meta"><span class="truncate">${j.co}</span><span class="sep">·</span><span class="truncate">${j.r && !(j.l || []).length ? "Remote" : (j.l || [])[0] || "Location not listed"}${j.nl > 1 ? ` +${j.nl - 1}` : ""}</span></span>
      </div>
      <div class="job-side"><${Fresh} ts=${j.p} /><span class=${cx("fit", f.score >= 95 && "hi")} title="Fit with your targets and skills, out of 100">Fit ${f.score}</span></div>
    </div>`)}</div>
    <div class="td-card-foot faint td-small">From SimplifyJobs community listings. Each links to the employer's own page.</div>`;
  return html`<section class="card" aria-labelledby="td-new-h">${head}${body}</section>`;
}

function today_ThisWeek({ apps, goal, thisWeek }) {
  const ws = startOfWeek(now());
  const today = fmt.startOfDay(now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = ws + i * DAY;
    const n = apps.filter((a) => a.stage !== "saved" && a.appliedAt >= d && a.appliedAt < d + DAY).length;
    return { d, n, future: d > today, isToday: d === today, label: new Date(d).toLocaleDateString(undefined, { weekday: "short" }) };
  });
  const max = Math.max(1, ...days.map((x) => x.n));
  const left = Math.max(0, goal - thisWeek);
  return html`<section class="card td-week" aria-labelledby="td-week-h">
    <div class="td-week-top">
      <h2 id="td-week-h">This week</h2>
      ${thisWeek > 0 ? html`<span class="td-count num">${thisWeek} of ${goal}</span>` : null}
      <span class="spacer"></span>
      <button type="button" class="btn ghost sm td-goal-edit" onClick=${() => go("prefs")}>Edit goal</button>
    </div>
    ${thisWeek === 0
      ? html`<p class="td-week-zero">No applications yet. Your goal is ${goal}.</p>`
      : html`<div>
          <${Meter} value=${thisWeek} max=${goal} ok=${thisWeek >= goal} />
          <div class="hint" style="margin-top:6px">${thisWeek >= goal ? "Goal reached." : `${left} more to reach your goal`}</div>
        </div>
        <div class="td-bars" role="img" aria-label=${"Applications per day this week: " + days.map((x) => `${x.label} ${x.n}`).join(", ")}>
          ${days.map((x) => html`<div class=${cx("td-bar", x.future && "future", x.isToday && "today")} key=${x.d} title=${`${fmt.date(x.d, { weekday: "long", month: "short", day: "numeric" })}: ${pluralize(x.n, "application")}`}>
            <span class="td-bar-val num">${x.n > 0 ? x.n : ""}</span>
            <span class="td-bar-track"><i style=${`height:${x.n ? Math.max(8, (x.n / max) * 100) : 0}%`}></i></span>
            <span class="td-bar-lbl">${x.label.slice(0, 2)}</span>
          </div>`)}
        </div>`}
  </section>`;
}

const TODAY_STAGE_COLOR = { saved: "var(--fg-3)", applied: "var(--accent)", screen: "var(--info)", interview: "var(--wait)", offer: "var(--ok)", rejected: "var(--bad)", ghosted: "var(--ghost)" };

function today_Pipeline({ apps }) {
  const counts = STAGES.map((st) => ({ ...st, n: apps.filter((a) => a.stage === st.id).length }));
  const total = apps.length;
  return html`<section class="card" aria-labelledby="td-pipe-h">
    <div class="card-head"><h2 id="td-pipe-h">Pipeline at a glance</h2><span class="spacer"></span><a href="#pipeline" class="td-link" onClick=${(e) => { e.preventDefault(); go("pipeline"); }}>Open<${Icon} name="arrowR" size=${14} /></a></div>
    ${total
      ? html`<div class="card-body stack" style="gap:12px">
          <div class="td-seg" role="img" aria-label=${"Applications by stage: " + counts.filter((c) => c.n).map((c) => `${c.label} ${c.n}`).join(", ")}>
            ${counts.filter((c) => c.n).map((c) => html`<i key=${c.id} style=${`flex:${c.n};background:${TODAY_STAGE_COLOR[c.id]}`} title=${`${c.label}: ${c.n}`}></i>`)}
          </div>
          <div class="td-legend">
            ${counts.map((c) => html`<button type="button" key=${c.id} class=${cx("td-legend-row", !c.n && "zero")} onClick=${() => go("pipeline")}>
              <span class=${cx("dot", c.id)}></span><span style="flex:1">${c.label}</span><span class="num">${c.n}</span>
            </button>`)}
          </div>
        </div>`
      : html`<div class="td-mini-empty"><span class="muted td-small td-grow">Nothing tracked yet. Add a role you applied to, or save one from Find.</span><${Btn} size="sm" icon="plus" onClick=${() => openModal("add")}>Add</${Btn}></div>`}
  </section>`;
}

function today_Response({ st }) {
  const small = st.applied > 0 && st.applied < 5;
  const days = st.medianReplyDays;
  return html`<section class="card" aria-labelledby="td-resp-h">
    <div class="card-head"><h2 id="td-resp-h">Response so far</h2><span class="spacer"></span><a href="#stats" class="td-link" onClick=${(e) => { e.preventDefault(); go("stats"); }}>Insights<${Icon} name="arrowR" size=${14} /></a></div>
    ${st.applied
      ? html`<div class="td-resp">
          <div class="stat"><span class="stat-label">Response rate</span><span class="stat-value">${fmt.pct(st.responseRate)}</span><span class="stat-sub num">${st.replied} of ${st.applied} replied</span></div>
          <div class="stat"><span class="stat-label">First reply</span><span class="stat-value">${days == null ? "—" : html`${days < 10 && days % 1 ? days.toFixed(1) : Math.round(days)}<span class="td-unit">days</span>`}</span><span class="stat-sub num">${days == null ? "No replies yet" : `median of ${pluralize(st.replyN ?? st.replied, "reply", "replies")}`}</span></div>
        </div>
        ${small ? html`<div class="td-card-foot faint td-small">Small sample. Rates settle after about 10 applications.</div>` : null}`
      : html`<div class="td-mini-empty"><span class="muted td-small">Once you apply to a few roles, your reply rate and typical wait show up here.</span></div>`}
  </section>`;
}

// Icons stay neutral; amber only when a task is genuinely late or closing: an intern season that is closing,
// or a thank-you note past the 24-hour window.
function today_tone(tk) {
  if (tk.kind === "apply" && tk.tone === "wait") return "wait";
  if (tk.kind === "thanks" && tk.round?.at && now() - tk.round.at > DAY) return "wait";
  return "";
}

function today_ExampleBanner() {
  return html`<div class="example-banner td-banner" role="note">
    <${Icon} name="info" />
    <span class="td-banner-text"><b>Example data.</b><span class="td-banner-more"> Clear it when you add your first application.</span></span>
    <span class="spacer"></span>
    <${Btn} size="sm" onClick=${() => clearExamples()}>Clear examples</${Btn}>
  </div>`;
}

function today_View() {
  const s = useStore();
  const jobs = useJobs();
  const apps = Apps.list(s);
  const tasks = useMemo(() => computeTasks(s), [s, jobs.status]);
  const st = useMemo(() => computeStats(s, apps), [s]);
  const up = useMemo(() => today_upcoming(apps), [s]);
  const m = useMemo(() => today_matches(jobs, s.profile, s.apps), [jobs.status, s.profile, s.apps]);
  const name = today_firstName(s.profile.name);
  const goal = s.profile.weeklyGoal || 10;
  const parts = [];
  if (!apps.length) parts.push("Start with a few roles worth applying to.");
  else {
    parts.push(tasks.length ? `${tasks.length} ${tasks.length === 1 ? "thing needs" : "things need"} you today` : "Nothing needs you right now");
    if (up.items.length) parts.push(pluralize(up.items.length, "interview") + " this week");
    else parts.push(`${st.thisWeek} of ${goal} applications sent this week`);
  }
  return html`<div class="page td-page">
    <header class="greeting td-head">
      <div style="min-width:0">
        <h1>${today_greeting()}${name ? `, ${name}` : ""}</h1>
        <p>${parts.join(" · ")}</p>
      </div>
      <span class="spacer"></span>
      <span class="td-date hide-sm">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
    </header>
    ${hasExamples(s) && s.settings.showExamples ? html`<${today_ExampleBanner} />` : null}
    <div class="split">
      <div class="stack td-col">
        <${today_NeedsYou} tasks=${tasks} fresh=${!apps.length} />
        ${apps.length ? html`<${today_Upcoming} up=${up} />` : null}
        <${today_NewForYou} jobs=${jobs} m=${m} />
      </div>
      <aside class="stack td-col" aria-label="Your week">
        <${today_ThisWeek} apps=${apps} goal=${goal} thisWeek=${st.thisWeek} />
        ${apps.length ? html`<${today_Pipeline} apps=${apps} />` : null}
        ${apps.length ? html`<${today_Response} st=${st} />` : null}
      </aside>
    </div>
  </div>`;
}
VIEWS.today = today_View;
