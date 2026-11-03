/* ===== Registries: view files add to these ===== */
const VIEWS = {};    // route -> component
const DRAWERS = {};  // kind -> component({id, tab})
const MODALS = {};   // kind -> component(props)
MODALS.confirm = (p) => html`<${Confirm} ...${p} onClose=${closeModal} />`;

const NAV = [
  { id: "today", label: "Today", icon: "today" },
  { id: "find", label: "Find jobs", icon: "find" },
  { id: "pipeline", label: "Pipeline", icon: "pipeline" },
  { id: "companies", label: "Companies", icon: "companies" },
  { id: "prep", label: "Interview prep", icon: "prep" },
  { id: "stats", label: "Insights", icon: "stats" },
];
const TITLES = { today: "Today", find: "Find jobs", pipeline: "Pipeline", companies: "Companies", prep: "Interview prep", stats: "Insights", prefs: "Settings" };

function Rail({ route }) {
  const s = useStore();
  const tasks = useMemo(() => computeTasks(s), [s]);
  const apps = Apps.list(s);
  const active = apps.filter((a) => ACTIVE_STAGES.includes(a.stage)).length;
  const st = computeStats(s, apps);
  const goal = s.profile.weeklyGoal || 10;
  const counts = { today: tasks.length || "", pipeline: active || "" };
  return html`<nav class="rail" aria-label="Main">
    <div class="brand"><${BrandMark} /><span class="brand-name">Heardback</span></div>
    <div class="nav">
      ${NAV.map((n) => html`<a class="nav-item" href=${"#" + n.id} aria-current=${route === n.id ? "page" : undefined}><${Icon} name=${n.icon} />${n.label}${counts[n.id] ? html`<span class="nav-count">${counts[n.id]}</span>` : null}</a>`)}
    </div>
    <div class="rail-foot">
      <div class="goal-card">
        <div class="goal-top"><span style="font-weight:500">This week</span><span class="num muted">${st.thisWeek} / ${goal} applied</span></div>
        <${Meter} value=${st.thisWeek} max=${goal} ok=${st.thisWeek >= goal} />
        <span class="hint">${st.thisWeek >= goal ? "Weekly goal reached. Nice work." : `${goal - st.thisWeek} more to hit your goal`}</span>
      </div>
      <a class="nav-item" href="#prefs" aria-current=${route === "prefs" ? "page" : undefined}><${Icon} name="prefs" />Settings</a>
    </div>
  </nav>`;
}

function Topbar({ route }) {
  const s = useStore((s) => s.settings.theme);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const cycle = () => { const order = ["system", "light", "dark"]; const next = order[(order.indexOf(s) + 1) % 3]; store.set((st) => ({ ...st, settings: { ...st.settings, theme: next } })); toast(`Theme: ${next === "system" ? "match system" : next}`); };
  return html`<header class="topbar">
    <span class="show-sm" style="display:inline-flex"><${BrandMark} size=${24} /></span>
    <div class="top-title" role="heading" aria-level="1">${TITLES[route]}</div>
    <div class="top-actions">
      <button type="button" class="search-trigger" onClick=${() => ui.set({ palette: true })} aria-label="Search and commands">
        <${Icon} name="search" /><span class="label-text">Search jobs, companies, actions</span><span class="kbd">${isMac ? "⌘" : "Ctrl"} K</span>
      </button>
      <${Btn} icon="mail" onClick=${() => openModal("paste")} cls="hide-sm" title="Log an email (E)">Log an email</${Btn}>
      <${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")} aria-label="Add application" title="Add application (N)"><span class="hide-sm">Add</span></${Btn}>
    </div>
  </header>`;
}

MODALS.more = () => {
  const items = [
    { icon: "companies", label: "Companies", run: () => go("companies") },
    { icon: "stats", label: "Insights", run: () => go("stats") },
    { icon: "mail", label: "Log an email", run: () => openModal("paste") },
    { icon: "prefs", label: "Settings", run: () => go("prefs") },
    { icon: "keyboard", label: "Keyboard shortcuts", run: () => openModal("shortcuts") },
  ];
  return html`<${Modal} title="More" onClose=${closeModal}>
    <div class="list">${items.map((it) => html`<button type="button" class="nav-item" style="min-height:48px" onClick=${() => { closeModal(); setTimeout(it.run, 0); }}><${Icon} name=${it.icon} />${it.label}<span style="margin-left:auto" class="faint"><${Icon} name="chevR" /></span></button>`)}</div>
  </${Modal}>`;
};
function BottomNav({ route }) {
  const items = [NAV[0], NAV[1], NAV[2], NAV[4], { id: "prefs", label: "More", icon: "menu" }];
  return html`<nav class="bottom-nav" aria-label="Main">
    ${items.map((n) => html`<button type="button" aria-current=${route === n.id || (n.id === "prefs" && ["companies", "stats", "prefs"].includes(route)) ? "page" : undefined} onClick=${() => (n.id === "prefs" ? openModal("more") : go(n.id))}><${Icon} name=${n.icon} size=${20} />${n.id === "find" ? "Find" : n.id === "prep" ? "Prep" : n.label}</button>`)}
  </nav>`;
}

/* ===== Command palette ===== */
function Palette() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const jobs = useJobs();
  const s = useStore();
  const listRef = useRef(null);
  const inRef = useRef(null);
  useLayoutEffect(() => { const prev = document.activeElement; inRef.current?.focus(); return () => { try { prev?.focus?.(); } catch {} }; }, []);
  const close = () => ui.set({ palette: false });
  useEscape(close);
  const items = useMemo(() => {
    const n = norm(q);
    const acts = [
      { g: "Actions", icon: "plus", label: "Add application", sub: "N", run: () => openModal("add") },
      { g: "Actions", icon: "mail", label: "Log an email", sub: "E", run: () => openModal("paste") },
      { g: "Actions", icon: "doc", label: "Update your resume", run: () => openModal("resume") },
      { g: "Actions", icon: "moon", label: "Toggle dark mode", run: () => store.set((st) => ({ ...st, settings: { ...st.settings, theme: document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches) ? "light" : "dark" } })) },
      { g: "Actions", icon: "keyboard", label: "Keyboard shortcuts", sub: "?", run: () => openModal("shortcuts") },
      ...NAV.concat([{ id: "prefs", label: "Settings", icon: "prefs" }]).map((x, i) => ({ g: "Go to", icon: x.icon, label: x.label, sub: `G then ${"TFPCIS"[i] || ","}`, run: () => go(x.id) })),
    ];
    const res = [];
    const actHits = n ? acts.filter((a) => norm(a.label).includes(n)) : acts.slice(0, 5);
    res.push(...actHits);
    if (n.length >= 2) {
      const apps = Apps.list(s).filter((a) => norm(`${a.company} ${a.title}`).includes(n)).slice(0, 5);
      res.push(...apps.map((a) => ({ g: "Your applications", logo: a.company, label: `${a.company} · ${a.title}`, sub: STAGE[a.stage].label, run: () => openApp(a.id) })));
      if (jobs.status === "ready") {
        const words = n.split(" ");
        const jm = [];
        for (const j of jobs.jobs) { if (words.every((w) => j._s.includes(w))) { jm.push(j); if (jm.length >= 6) break; } }
        res.push(...jm.map((j) => ({ g: "Jobs", logo: j.co, label: j.t, sub: `${j.co} · ${fmt.ago(j.p)}`, run: () => openJob(j.id) })));
        const cos = jobs.companies.filter((c) => norm(c).includes(n)).slice(0, 4);
        res.push(...cos.map((c) => ({ g: "Companies", logo: c, label: c, sub: `${(jobs.byCompany.get(c) || []).length} open roles`, run: () => openCompany(c) })));
      }
    }
    return res;
  }, [q, jobs.status, s]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [sel]);
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(items.length - 1, x + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const it = items[sel]; if (it) { close(); setTimeout(it.run, 0); } }
  };
  let lastG = null;
  return html`<${Fragment}>
    <div class="scrim modal-scrim" onClick=${close}></div>
    <div class="modal palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="palette-input"><${Icon} name="search" size=${18} /><input id="palette-q" ref=${inRef} placeholder="Search jobs, companies, your applications, or type a command" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} onKeyDown=${onKey} aria-label="Search" autocomplete="off" /></div>
      <div class="palette-list" ref=${listRef} role="listbox">
        ${items.length === 0 && html`<div class="empty" style="padding:28px"><p>No matches for “${q}”.</p></div>`}
        ${items.map((it, i) => {
          const head = it.g !== lastG ? html`<div class="palette-group">${it.g}</div>` : null; lastG = it.g;
          return html`${head}<button type="button" class="palette-item" role="option" aria-selected=${i === sel ? "true" : "false"} onMouseMove=${() => setSel(i)} onClick=${() => { close(); setTimeout(it.run, 0); }}>
            ${it.logo ? html`<${Logo} name=${it.logo} size="sm" />` : html`<${Icon} name=${it.icon} />`}<span class="truncate" style="flex:1">${it.label}</span>${it.sub && html`<span class="sub">${it.sub}</span>`}
          </button>`;
        })}
      </div>
      <div class="palette-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> to move</span><span><span class="kbd">↵</span> to open</span><span><span class="kbd">esc</span> to close</span></div>
    </div>
  </${Fragment}>`;
}

MODALS.shortcuts = () => {
  const rows = [["⌘K / Ctrl K", "Search and commands"], ["/", "Search jobs"], ["N", "Add application"], ["E", "Paste an email"], ["G then T", "Today"], ["G then F", "Find jobs"], ["G then P", "Pipeline"], ["G then C", "Companies"], ["G then I", "Interview prep"], ["G then S", "Insights"], ["J / K", "Next / previous item in lists"], ["1 – 7", "Move the open application to a stage"], ["Esc", "Close panel"], ["?", "This list"]];
  return html`<${Modal} title="Keyboard shortcuts" onClose=${closeModal}>
    <div class="list">${rows.map(([k, v]) => html`<div class="row" style="padding:9px 0"><span style="flex:1">${v}</span>${k.split(" ").map((x) => x === "then" || x === "/" && k.length > 1 ? html`<span class="faint" style="font-size:var(--fs-xs)">${x}</span>` : html`<${Kbd}>${x}</${Kbd}>`)}</div>`)}</div>
  </${Modal}>`;
};

/* ===== Global keyboard shortcuts ===== */
function useShortcuts() {
  useEffect(() => {
    let gPending = 0;
    const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && store.get().profile.onboarded) { e.preventDefault(); ui.set({ palette: !ui.state.palette }); return; }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!store.get().profile.onboarded) return;
      if (ui.state.palette || ui.state.modal) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (gPending && now() - gPending < 1200) {
        gPending = 0;
        const map = { t: "today", f: "find", p: "pipeline", c: "companies", i: "prep", s: "stats", ",": "prefs" };
        if (map[k.toLowerCase()]) { e.preventDefault(); closeDrawer(); go(map[k.toLowerCase()]); }
        return;
      }
      if (k === "g") { gPending = now(); return; }
      if (k === "?") { e.preventDefault(); openModal("shortcuts"); return; }
      if (ui.state.drawer?.kind === "app" && /^[1-7]$/.test(k)) { e.preventDefault(); Apps.move(ui.state.drawer.id, STAGES[+k - 1].id); return; }
      if (ui.state.drawer) return;
      if (k === "n") { e.preventDefault(); openModal("add"); }
      else if (k === "e") { e.preventDefault(); openModal("paste"); }
      else if (k === "/") { e.preventDefault(); go("find"); setTimeout(() => document.getElementById("find-q")?.focus(), 60); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function Toasts() {
  const { toasts, drawer } = useUI();
  return html`<div class=${cx("toasts", drawer && "over-drawer")} role="status" aria-live="polite">${toasts.map((t) => html`<div class="toast" key=${t.id}><${Icon} name="check" /><span>${t.text}</span>${t.action && html`<button type="button" onClick=${() => { t.action.run(); ui.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })); }}>${t.action.label}</button>`}${t.undo && html`<button type="button" onClick=${() => { t.undo(); ui.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })); }}>Undo</button>`}</div>`)}</div>`;
}
function Celebrate() {
  const { celebrate } = useUI();
  if (!celebrate) return null;
  return html`<div class="celebrate" aria-live="polite"><div class="celebrate-card"><div class="celebrate-ring"><${Icon} name="trophy" size=${26} /></div><strong style="font-size:var(--fs-lg)">Offer from ${celebrate.company}</strong><span class="muted" style="font-size:var(--fs-sm)">You heard back. Take a moment, then get it in writing.</span></div></div>`;
}

class Boundary extends preact.Component {
  constructor() { super(); this.state = { err: null }; }
  componentDidCatch(err) { this.setState({ err }); try { console.warn("Heardback view error:", err); } catch {} }
  render() {
    if (!this.state.err) return this.props.children;
    const exportBackup = () => saveFile(`heardback-backup-${fmt.toDateInput(now())}.json`, JSON.stringify(store.get(), null, 2), "application/json");
    return html`<div class="page"><${Empty} icon="alert" title="This screen hit a problem" action=${html`<div class="row wrap" style="justify-content:center"><${Btn} kind="primary" icon="refresh" onClick=${() => this.setState({ err: null })}>Try again</${Btn}><${Btn} icon="download" onClick=${exportBackup}>Export a backup</${Btn}><${Btn} kind="ghost" onClick=${() => { this.setState({ err: null }); go("prefs"); }}>Open Settings</${Btn}></div>`}>Your data is safe in this browser. Try again, or export a backup first.</${Empty}></div>`;
  }
}
function Placeholder({ name }) { return html`<div class="page"><${Empty} icon="info" title=${name}>This area is being built.</${Empty}></div>`; }

function App() {
  const route = useRoute();
  const s = useStore((s) => s);
  const u = useUI();
  useShortcuts();
  useEffect(() => applyTheme(s.settings.theme), [s.settings.theme]);
  useEffect(() => { const w = document.querySelector(".workspace"); if (w) w.scrollTop = 0; ui.set({ drawer: null, modal: null, palette: false }); }, [route]);
  const View = VIEWS[route];
  const DrawerC = u.drawer && DRAWERS[u.drawer.kind];
  const ModalC = u.modal && MODALS[u.modal.__kind];
  const showOnboard = !s.profile.onboarded && VIEWS.__onboarding;
  return html`<div class="frame">
    <${Rail} route=${route} />
    <div class="main">
      <${Topbar} route=${route} />
      <main class="workspace" id="workspace"><${Boundary} key=${route}>${View ? html`<${View} />` : html`<${Placeholder} name=${TITLES[route]} />`}</${Boundary}></main>
      <${BottomNav} route=${route} />
    </div>
    ${DrawerC && html`<${Boundary} key=${"d" + u.drawer.kind + u.drawer.id}><${DrawerC} id=${u.drawer.id} tab=${u.drawer.tab} /></${Boundary}>`}
    ${ModalC && html`<${Boundary} key=${"m" + u.modal.__kind}><${ModalC} ...${u.modal} /></${Boundary}>`}
    ${u.palette && html`<${Palette} />`}
    ${showOnboard && html`<${VIEWS.__onboarding} />`}
    <${Toasts} />
    <${Celebrate} />
  </div>`;
}
