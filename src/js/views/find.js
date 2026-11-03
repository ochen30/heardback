/* ===== Find jobs · Job drawer · Companies · Company drawer =====
   Area-private helpers are prefixed find_. Filters live in store.ui.findFilters
   (null = follow the profile's preferences). */

const FIND_PAGE = 60;
const FIND_POSTED = [
  { id: "any", label: "Any", title: "Any time" }, { id: "1", label: "24h", title: "Last 24 hours" },
  { id: "3", label: "3d", title: "Last 3 days" }, { id: "7", label: "7d", title: "Last 7 days" }, { id: "30", label: "30d", title: "Last 30 days" },
];
const FIND_VISA = [{ id: "any", label: "Any" }, { id: "yes", label: "Offers sponsorship" }, { id: "nocit", label: "Hide citizenship-required" }];
const FIND_SORTS = [{ id: "new", label: "Newest" }, { id: "fit", label: "Best fit" }, { id: "ghost", label: "Fewest ghost signals" }];
const FIND_ATS = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", workday: "Workday" };
const FIND_DEG = { BS: "Bachelor's", MS: "Master's", PhD: "PhD", AS: "Associate's", MBA: "MBA", Cert: "Certificate" };
const FIND_LV = { intern: "Internship", newgrad: "New grad" };

/* ---------- filter state ---------- */
const find_blank = () => ({ lv: [], roles: [], locs: [], posted: "any", visa: "any", hideGhost: false });
function find_prefFilters(p) {
  const known = (id) => LOC_OPTIONS.some((o) => o.id === id);
  const locs = (p.locations || []).filter(known);
  if (p.remote && locs.length && !locs.includes("remote")) locs.push("remote");
  return { ...find_blank(), lv: [...(p.levels || [])], roles: [...(p.roles || [])], locs };
}
const find_hasPrefs = (p) => !!((p.roles || []).length || (p.locations || []).filter((id) => LOC_OPTIONS.some((o) => o.id === id)).length || ((p.levels || []).length === 1));
const find_pfC = { p: null, f: null };
function find_getFilters(s) {
  if (s.ui.findFilters) return s.ui.findFilters;
  if (find_pfC.p !== s.profile) { find_pfC.p = s.profile; find_pfC.f = find_prefFilters(s.profile); }
  return find_pfC.f;
}
function find_setFilters(patch) {
  store.set((s) => ({ ...s, ui: { ...s.ui, findFilters: patch === null ? null : { ...find_getFilters(s), ...patch } } }));
}
function find_clearAll() { store.set((s) => ({ ...s, ui: { ...s.ui, findFilters: find_blank() } })); }
const find_sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
function find_isPrefs(f, p) {
  const pf = find_prefFilters(p);
  return find_sameSet(f.lv, pf.lv) && find_sameSet(f.roles, pf.roles) && find_sameSet(f.locs, pf.locs);
}
function find_activeCount(f) {
  return (f.lv.length ? 1 : 0) + (f.roles.length ? 1 : 0) + (f.locs.length ? 1 : 0) + (f.posted !== "any" ? 1 : 0) + (f.visa !== "any" ? 1 : 0) + (f.hideGhost ? 1 : 0);
}
const find_toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const find_state = { q: "" }; // mirrors the debounced search so the mobile filter modal can count matches

/* ---------- per-job location bitmask (computed once per dataset) ---------- */
const find_locC = { jobs: null, m: null };
function find_locMasks(jobs) {
  if (find_locC.jobs !== jobs) {
    const m = new Map();
    for (const j of jobs) { let b = 0; LOC_OPTIONS.forEach((o, i) => { if (jobInLoc(j, o.id)) b |= 1 << i; }); m.set(j.id, b); }
    find_locC.jobs = jobs; find_locC.m = m;
  }
  return find_locC.m;
}
const find_locBit = (id) => 1 << LOC_OPTIONS.findIndex((o) => o.id === id);

/* ---------- filtering: one pass that also yields facet counts ---------- */
const find_cmpC = { jobs: null, f: null, q: null, out: null };
function find_compute(jobs, f, q) {
  if (find_cmpC.jobs === jobs && find_cmpC.f === f && find_cmpC.q === q) return find_cmpC.out;
  const out = find_run(jobs, f, q, true);
  Object.assign(find_cmpC, { jobs, f, q, out });
  return out;
}
function find_run(jobs, f, q, facets) {
  const masks = find_locMasks(jobs);
  const words = norm(q).split(" ").filter(Boolean);
  const locMask = f.locs.reduce((b, id) => b | find_locBit(id), 0);
  const minP = f.posted === "any" ? 0 : f.posted === "since" ? (visit.since || 0) : now() - +f.posted * DAY;
  const res = [];
  const cLv = {}, cRole = {}, cLoc = new Array(LOC_OPTIONS.length).fill(0);
  for (const j of jobs) {
    if (j.p < minP) continue;
    if (f.visa === "yes" && j.sp !== "yes") continue;
    if (f.visa === "nocit" && j.sp === "citizen") continue;
    if (f.hideGhost && j.g >= 50) continue;
    if (words.length) { let ok = true; for (const w of words) if (!j._s.includes(w)) { ok = false; break; } if (!ok) continue; }
    const m = masks.get(j.id) || 0;
    const okLv = !f.lv.length || f.lv.includes(j.lvl);
    const okRole = !f.roles.length || f.roles.includes(j.cat);
    const okLoc = !locMask || (m & locMask) !== 0;
    if (okLv && okRole && okLoc) res.push(j);
    if (!facets) continue;
    if (okRole && okLoc) cLv[j.lvl] = (cLv[j.lvl] || 0) + 1;
    if (okLv && okLoc) cRole[j.cat] = (cRole[j.cat] || 0) + 1;
    if (okLv && okRole && m) for (let i = 0; i < cLoc.length; i++) if (m & (1 << i)) cLoc[i]++;
  }
  return { res, cLv, cRole, cLoc };
}

/* fit cache (one map per profile object) */
const find_fitC = { p: null, m: new Map() };
function find_fit(job, profile) {
  if (find_fitC.p !== profile) { find_fitC.p = profile; find_fitC.m = new Map(); }
  if (!find_fitC.m.has(job.id)) find_fitC.m.set(job.id, fitScore(job, profile));
  return find_fitC.m.get(job.id);
}
function find_sort(res, sort, profile) {
  if (sort === "fit") {
    const sc = (j) => find_fit(j, profile)?.score ?? -1;
    return [...res].sort((a, b) => sc(b) - sc(a) || b.p - a.p);
  }
  if (sort === "ghost") return [...res].sort((a, b) => a.g - b.g || b.p - a.p);
  return res; // jobs already arrive newest first
}

/* ---------- tracking helpers ---------- */
function find_untrack(id) { store.set((s) => { const apps = { ...s.apps }; delete apps[id]; return { ...s, apps }; }); }
function find_restore(a) { store.set((s) => ({ ...s, apps: { ...s.apps, [a.id]: a } })); }
function find_appFields(job) { return { company: job.co, title: job.t, location: (job.l || [])[0] || "", url: job.url, jobId: job.id, source: "find" }; }
function find_toggleSave(job, app) {
  if (app && app.stage === "saved") { find_untrack(app.id); toast(`Removed ${job.co} from saved`, { undo: () => find_restore(app) }); return; }
  if (app) return;
  const a = Apps.create({ ...find_appFields(job), stage: "saved" });
  toast(`Saved ${job.co} to your pipeline`, { undo: () => find_untrack(a.id) });
}
function find_markApplied(job, app) {
  if (app) { Apps.move(app.id, "applied"); return; }
  const a = Apps.create({ ...find_appFields(job), stage: "applied", appliedAt: now() });
  toast(`Marked ${job.co} as applied`, { undo: () => find_untrack(a.id) });
}
function find_useAppsByJob() {
  const apps = useStore((s) => s.apps);
  return useMemo(() => { const m = new Map(); for (const a of Object.values(apps)) if (a.jobId) m.set(a.jobId, a); return m; }, [apps]);
}

/* ---------- formatting ---------- */
function find_locText(job) {
  const first = (job.l || [])[0] || "Location not listed";
  const more = (job.nl || (job.l || []).length) - 1;
  return more > 0 ? `${first} +${more} more` : first;
}
function find_metaText(job) {
  return [job.co, find_locText(job), FIND_LV[job.lvl] || "", job.term].filter(Boolean).join(" · ");
}
function find_atsName(job) {
  if (FIND_ATS[job.ats]) return FIND_ATS[job.ats];
  try { return new URL(job.url).hostname.replace(/^www\./, ""); } catch { return "Employer site"; }
}
function find_visaText(sp) {
  return { yes: "Offers sponsorship", no: "Does not offer sponsorship", citizen: "U.S. citizenship required" }[sp] || "Not stated in the listing";
}
function find_season(cs) {
  const se = cs?.season;
  if (!se || !se.posted) return null;
  const share = se.open / se.posted;
  const since = se.lastNew ? (now() - se.lastNew * 1000) / DAY : null;
  let read = "", tone = "";
  if (since != null && since <= 7) { read = "Still adding roles"; tone = "ok"; }
  else if (share < 0.15 && since != null && since > 21) { read = "Most of this season's roles have closed"; tone = "wait"; }
  const line = `${pluralize(se.posted, "internship posting")} this season · ${fmt.num(se.open)} still open${se.lastNew ? ` · last new posting ${fmt.ago(se.lastNew * 1000)}` : ""}`;
  return { ...se, share, since, read, tone, line };
}
const find_daysText = (d) => (d == null ? null : `~${Math.max(1, Math.round(d))} ${Math.round(d) === 1 ? "day" : "days"}`);
const find_typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

/* ---------- shared row ---------- */
function find_Row({ job, app, profile, i, sel, onSelect, inCompany }) {
  const fit = profile ? find_fit(job, profile) : null;
  const open = () => { onSelect && onSelect(i); openJob(job.id); };
  const saved = app && app.stage === "saved";
  const metaT = inCompany ? [find_locText(job), FIND_LV[job.lvl], job.term].filter(Boolean).join(" · ") : find_metaText(job);
  return html`<div class=${cx("job-row find-row", inCompany && "find-row-co")} role="listitem" data-find-i=${i} aria-selected=${sel ? "true" : "false"} onClick=${open}>
    ${!inCompany && html`<${Logo} name=${job.co} />`}
    <div class="find-row-main">
      <button type="button" class="find-row-title" onClick=${(e) => { e.stopPropagation(); open(); }} title=${job.t}>${job.t}</button>
      <div class="find-row-meta" title=${metaT}>${metaT}</div>
    </div>
    <div class="find-side">
      <span class="find-c-fit">${fit && html`<span class=${cx("fit", fit.score >= 75 && "hi")} title=${`Fit ${fit.score}/100 from role, level, location${profile.needsSponsor ? ", visa" : ""} and skills`}>Fit ${fit.score}</span>`}</span>
      <span class="find-c-fresh"><${Fresh} ts=${job.p} /></span>
      <span class="find-c-ghost"><${GhostScore} g=${job.g} compact /></span>
      <span class="find-c-act" onClick=${(e) => e.stopPropagation()}>
        ${app && !saved
          ? html`<button type="button" class="find-stage" onClick=${() => openApp(app.id)} title="Open in pipeline"><${StageBadge} stage=${app.stage} /></button>`
          : html`<${Btn} kind="ghost" size="sm" icon=${saved ? "bookmarkOn" : "bookmark"} cls=${cx("find-save", saved && "on")} aria-pressed=${saved ? "true" : "false"} aria-label=${saved ? `Remove ${job.t} at ${job.co} from saved` : `Save ${job.t} at ${job.co}`} title=${saved ? "Saved. Click to remove" : "Save to pipeline (S)"} onClick=${() => find_toggleSave(job, app)} />`}
      </span>
    </div>
  </div>`;
}

/* ---------- filter controls (sidebar and mobile modal) ---------- */
function find_FilterControls({ px, f, counts, profile }) {
  const n = (x) => html`<span class="find-chip-n">${fmt.num(x || 0)}</span>`;
  const roles = CATS.concat(counts.cRole.Other ? ["Other"] : []);
  return html`<div class="find-fgroups">
    <div class="filter-group" role="group" aria-labelledby=${px + "-lv"}>
      <h4 id=${px + "-lv"}>Level</h4>
      <div class="chips">${LEVELS.map((l) => html`<${Chip} key=${l.id} on=${f.lv.includes(l.id)} onClick=${() => find_setFilters({ lv: find_toggle(f.lv, l.id) })}>${l.label}${n(counts.cLv[l.id])}</${Chip}>`)}</div>
    </div>
    <div class="filter-group" role="group" aria-labelledby=${px + "-role"}>
      <h4 id=${px + "-role"}>Role</h4>
      <div class="chips">${roles.map((r) => html`<${Chip} key=${r} on=${f.roles.includes(r)} onClick=${() => find_setFilters({ roles: find_toggle(f.roles, r) })}>${r}${n(counts.cRole[r])}</${Chip}>`)}</div>
    </div>
    <div class="filter-group" role="group" aria-labelledby=${px + "-loc"}>
      <h4 id=${px + "-loc"}>Location</h4>
      <div class="chips">${LOC_OPTIONS.map((o, i) => html`<${Chip} key=${o.id} on=${f.locs.includes(o.id)} onClick=${() => find_setFilters({ locs: find_toggle(f.locs, o.id) })}>${o.label}${n(counts.cLoc[i])}</${Chip}>`)}</div>
    </div>
    <div class="filter-group">
      <h4>Posted</h4>
      <${Seg} label="Posted within" value=${f.posted === "since" ? "" : f.posted} options=${FIND_POSTED} onChange=${(v) => find_setFilters({ posted: v })} />
      ${visit.since && html`<div class="chips"><${Chip} on=${f.posted === "since"} icon="bolt" onClick=${() => find_setFilters({ posted: f.posted === "since" ? "any" : "since" })}>New since your last visit</${Chip}></div>`}
    </div>
    <div class="filter-group" role="group" aria-labelledby=${px + "-visa"}>
      <h4 id=${px + "-visa"}>Visa</h4>
      <div class="chips">${FIND_VISA.map((v) => html`<${Chip} key=${v.id} on=${f.visa === v.id} onClick=${() => find_setFilters({ visa: v.id })}>${v.label}</${Chip}>`)}</div>
      ${f.visa === "yes" && html`<span class="hint">Very few listings state sponsorship either way, so this filter hides most jobs.</span>`}
    </div>
    <div class="filter-group">
      <h4>Ghost jobs</h4>
      <${Switch} id=${px + "-ghost"} checked=${f.hideGhost} onChange=${(v) => find_setFilters({ hideGhost: v })} label="Hide strong ghost signals" />
      <span class="hint">Hides listings with several warning signs (score 50 or more).</span>
    </div>
    ${find_activeCount(f) > 0 && html`<div><${Btn} kind="ghost" size="sm" icon="x" onClick=${find_clearAll}>Clear filters</${Btn}></div>`}
  </div>`;
}

MODALS.findFilters = () => {
  const jobs = useJobs();
  const s = useStore();
  const f = find_getFilters(s);
  const counts = jobs.status === "ready" ? find_compute(jobs.jobs, f, find_state.q) : { res: [], cLv: {}, cRole: {}, cLoc: [] };
  return html`<${Modal} title="Filters" onClose=${closeModal} foot=${html`
    <${Btn} kind="ghost" onClick=${find_clearAll} disabled=${!find_activeCount(f)}>Clear filters</${Btn}>
    <span class="spacer" style="flex:1"></span>
    <${Btn} kind="primary" onClick=${closeModal}>Show ${fmt.num(counts.res.length)} ${counts.res.length === 1 ? "match" : "matches"}</${Btn}>`}>
    <${find_FilterControls} px="find-m" f=${f} counts=${counts} profile=${s.profile} />
  </${Modal}>`;
};

/* ---------- VIEWS.find ---------- */
VIEWS.find = function FindView() {
  const jobs = useJobs();
  const s = useStore();
  const profile = s.profile;
  const f = find_getFilters(s);
  const sort = s.ui.findSort || "new";
  const byJob = find_useAppsByJob();
  const [qIn, setQIn] = useState(find_state.q);
  const [q, setQ] = useState(find_state.q);
  const [shown, setShown] = useState(FIND_PAGE);
  const [sel, setSel] = useState(-1);
  const sentinel = useRef(null);

  useEffect(() => { const t = setTimeout(() => { setQ(qIn); find_state.q = qIn; }, 120); return () => clearTimeout(t); }, [qIn]);

  const ready = jobs.status === "ready";
  const counts = useMemo(() => (ready ? find_compute(jobs.jobs, f, q) : null), [ready, jobs.jobs, f, q]);
  const list = useMemo(() => (counts ? find_sort(counts.res, sort, profile) : []), [counts, sort, profile]);
  useEffect(() => { setShown(FIND_PAGE); setSel(-1); }, [list]);

  // auto-load more as the sentinel scrolls into view
  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= list.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown((n) => Math.min(list.length, n + FIND_PAGE)); }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, list]);

  // J / K / Enter / S
  const kref = useRef({}); kref.current = { list, sel, shown, byJob };
  useEffect(() => {
    let lastG = 0;
    const onKey = (e) => {
      if (find_typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (ui.state.modal || ui.state.palette || ui.state.drawer) return;
      const k = e.key.toLowerCase();
      if (k === "g") { lastG = now(); return; }
      if (now() - lastG < 1200) { lastG = 0; return; } // let the shell handle "G then …"
      const { list, sel, shown, byJob } = kref.current;
      if (!list.length) return;
      if (k === "j" || k === "k") {
        e.preventDefault();
        const next = clamp(sel + (k === "j" ? 1 : -1), 0, list.length - 1);
        if (next >= shown) setShown(Math.min(list.length, next + FIND_PAGE));
        setSel(next);
        setTimeout(() => document.querySelector(`.find-results [data-find-i="${next}"]`)?.scrollIntoView({ block: "nearest" }), 0);
      } else if (e.key === "Enter" && sel >= 0) { e.preventDefault(); openJob(list[sel].id); }
      else if (k === "s" && sel >= 0) { e.preventDefault(); const j = list[sel]; find_toggleSave(j, byJob.get(j.id)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = jobs.meta || {};
  const st = meta.stats || {};
  const genAt = meta.generatedAt ? Date.parse(meta.generatedAt) : null;
  const usingPrefs = find_hasPrefs(profile) && find_isPrefs(f, profile);
  const nActive = find_activeCount(f);

  const head = html`<div class="page-head">
    <div>
      <h1>Find jobs</h1>
      <p>${ready
        ? html`<span class="num">${fmt.num(st.active || jobs.jobs.length)}</span> open internship and new-grad roles from <span class="num">${fmt.num(st.companies || jobs.byCompany.size)}</span> companies${genAt ? ` · updated ${fmt.ago(genAt)}` : ""}`
        : "Open internship and new-grad roles, checked for ghost-job signals."}</p>
    </div>
  </div>`;

  if (!ready) {
    return html`<div class="page find-page">${head}
      <div class="find-layout">
        <aside class="filters find-aside" aria-label="Filters">${[0, 1, 2].map((i) => html`<div class="filter-group" key=${i}><div class="skel" style="height:10px;width:60px"></div><div class="skel" style="height:30px;width:100%"></div></div>`)}</aside>
        <div class="stack">
          ${jobs.status === "error"
            ? html`<div class="card"><${Empty} icon="alert" title="Couldn't load job listings" action=${html`<${Btn} kind="primary" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}>`}>The listings file didn't load (${jobs.error || "unknown error"}). Check your connection and try again.</${Empty}></div>`
            : html`<div class="card find-results"><${Skeleton} rows=${9} /></div>`}
        </div>
      </div>
    </div>`;
  }

  // empty-state suggestion: which single change brings back the most jobs
  let suggestion = null;
  if (!list.length) {
    const cands = [];
    if (q) cands.push({ label: "Clear the search", desc: "Clearing the search", run: () => { setQIn(""); setQ(""); find_state.q = ""; }, n: find_run(jobs.jobs, f, "", false).res.length });
    const tries = [["locs", [], "Any location", "Removing the location filter"], ["roles", [], "Any role", "Removing the role filter"], ["lv", [], "Any level", "Removing the level filter"], ["posted", "any", "Any posting date", "Removing the date filter"], ["visa", "any", "Any visa status", "Removing the visa filter"], ["hideGhost", false, "Show listings with strong ghost signals", "Showing listings with strong ghost signals"]];
    for (const [k, v, label, desc] of tries) {
      const cur = f[k]; if (Array.isArray(cur) ? !cur.length : cur === v) continue;
      cands.push({ label, desc, run: () => find_setFilters({ [k]: v }), n: find_run(jobs.jobs, { ...f, [k]: v }, q, false).res.length });
    }
    suggestion = cands.filter((c) => c.n > 0).sort((a, b) => b.n - a.n)[0] || null;
  }

  const rows = list.slice(0, shown);
  return html`<div class="page find-page">
    ${head}
    <div class="find-layout">
      <aside class="filters find-aside" aria-label="Filters">
        <${find_FilterControls} px="find-f" f=${f} counts=${counts} profile=${profile} />
      </aside>
      <div class="stack find-main">
        <div class="find-toolbar">
          <div class="input-icon find-search">
            <${Icon} name="search" />
            <input id="find-q" class="input" type="search" placeholder="Search title, company or location" value=${qIn} onInput=${(e) => setQIn(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === "Escape" && qIn) { e.stopPropagation(); setQIn(""); } else if (e.key === "Enter") { setQ(qIn); find_state.q = qIn; } }} aria-label="Search jobs" autocomplete="off" />
            ${!qIn && html`<span class="kbd find-kbd hide-sm">/</span>`}
          </div>
          <${Btn} cls="find-fbtn" icon="filter" onClick=${() => openModal("findFilters")} aria-label=${`Filters${nActive ? `, ${nActive} active` : ""}`}>Filters${nActive ? html`<span class="find-fcount num">${nActive}</span>` : null}</${Btn}>
        </div>
        <div class="find-bar">
          <div class="find-count">
            <strong class="num">${fmt.num(list.length)}</strong> ${list.length === 1 ? "match" : "matches"}
            ${visit.since && f.posted !== "since" && (() => { const n = list.filter((j) => j.p > visit.since).length; return n ? html`<span class="find-prefs"><span class="sep">·</span><button type="button" class="find-link" onClick=${() => find_setFilters({ posted: "since" })}>${fmt.num(n)} new since your last visit</button></span>` : null; })()}
            ${find_hasPrefs(profile) && (usingPrefs
              ? html`<span class="find-prefs"><span class="sep">·</span>Using your preferences<span class="sep">·</span><button type="button" class="find-link" onClick=${find_clearAll}>Show all</button></span>`
              : html`<span class="find-prefs"><span class="sep">·</span><button type="button" class="find-link" onClick=${() => find_setFilters(null)}>Use my preferences</button></span>`)}
          </div>
          <span class="spacer"></span>
          <div class="find-sort hide-sm"><${Seg} label="Sort by" value=${sort} options=${FIND_SORTS} onChange=${(v) => store.set((x) => ({ ...x, ui: { ...x.ui, findSort: v } }))} /></div>
          <select id="find-sort-sm" class="select find-sort-sm show-sm" aria-label="Sort by" value=${sort} onChange=${(e) => { const v = e.currentTarget.value; store.set((x) => ({ ...x, ui: { ...x.ui, findSort: v } })); }}>
            ${FIND_SORTS.map((o) => html`<option key=${o.id} value=${o.id}>${o.label}</option>`)}
          </select>
        </div>
        ${list.length
          ? html`<div class="card find-results"><div class="list" role="list" aria-label="Job results">
              ${rows.map((j, i) => html`<${find_Row} key=${j.id} job=${j} app=${byJob.get(j.id)} profile=${profile} i=${i} sel=${i === sel} onSelect=${setSel} />`)}
            </div></div>
            ${shown < list.length && html`<div class="find-more" ref=${sentinel}><${Btn} onClick=${() => setShown((n) => n + FIND_PAGE)}>Show ${Math.min(FIND_PAGE, list.length - shown)} more</${Btn}><span class="faint num">Showing ${fmt.num(shown)} of ${fmt.num(list.length)}</span></div>`}
            <div class="find-keys hide-sm"><${Kbd}>J</${Kbd}><${Kbd}>K</${Kbd}> move <${Kbd}>↵</${Kbd}> open <${Kbd}>S</${Kbd}> save</div>`
          : html`<div class="card"><${Empty} icon="search" title="No jobs match these filters"
              action=${html`<div class="row wrap" style="justify-content:center">${suggestion && html`<${Btn} kind="primary" onClick=${suggestion.run}>${suggestion.label} (${fmt.num(suggestion.n)})</${Btn}>`}${(nActive > 0 || q) && html`<${Btn} onClick=${() => { find_clearAll(); setQIn(""); setQ(""); find_state.q = ""; }}>Clear search and filters</${Btn}>`}</div>`}>
              ${suggestion ? `${suggestion.desc} brings back ${pluralize(suggestion.n, "job")}.` : "Try a shorter search or fewer filters."}
            </${Empty}></div>`}
        <p class="footer-note find-foot">Listings from ${meta.source?.url ? html`<a href=${meta.source.url} target="_blank" rel="noopener">SimplifyJobs community listings</a>` : "SimplifyJobs community listings"}${genAt ? `, refreshed ${fmt.ago(genAt)}` : ""}. Listings link to each employer's own application page.</p>
      </div>
    </div>
  </div>`;
};

/* ---------- Claude helper hook ---------- */
function find_useAI() {
  const [st, setSt] = useState({ busy: false, err: "", out: null, partial: "" });
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const run = async (fn) => {
    ctl.current?.abort();
    const c = new AbortController(); ctl.current = c;
    setSt({ busy: true, err: "", out: null, partial: "" });
    try {
      const out = await fn(c.signal, (partial) => { if (!c.signal.aborted) setSt((x) => ({ ...x, partial })); });
      if (!c.signal.aborted) setSt({ busy: false, err: "", out, partial: "" });
    } catch (e) {
      if (c.signal.aborted || e?.name === "AbortError" || e?.code === "aborted") setSt((x) => ({ ...x, busy: false }));
      else setSt({ busy: false, err: aiErr(e), out: null, partial: "" });
    }
  };
  const stop = () => { ctl.current?.abort(); setSt((x) => ({ ...x, busy: false })); };
  return [st, run, stop];
}
function find_Thinking({ onStop, text }) {
  return html`<div class="find-think"><span class="find-pulse" aria-hidden="true"></span><span class="muted">${text || "Thinking…"}</span><span class="spacer" style="flex:1"></span><${Btn} size="sm" onClick=${onStop}>Stop</${Btn}></div>`;
}
const find_hasResume = (p) => (p.resume || "").trim().length >= 40;
const find_jobBrief = (job) => `Title: ${job.t}\nCompany: ${job.co}\nLevel: ${FIND_LV[job.lvl]}${job.term ? ` (${job.term})` : ""}\nCategory: ${job.cat}\nLocations: ${(job.l || []).slice(0, 6).join("; ") || "not listed"}${job.nl > 6 ? ` and ${job.nl - 6} more` : ""}\nDegrees listed: ${(job.deg || []).join(", ") || "not stated"}`;

function find_WhyYou({ job, profile }) {
  const [st, run, stop] = find_useAI();
  const [jd, setJd] = useState("");
  if (!find_hasResume(profile)) return null;
  const go = () => run(async (signal) => {
    const prompt = `You help a student or new grad decide whether a job is worth applying to.
You can see ONLY their resume and the basic listing facts below. ${jd.trim() ? "The candidate also pasted the job description below." : "You cannot see the full job description, so judge only from the title, level and location, and say so when a point depends on details you can't see."}
Never invent experience, skills or facts that aren't in the resume. Be specific and brief (each item under 20 words). Refer to resume content, not the person's name.

LISTING
${find_jobBrief(job)}
${jd.trim() ? `\nJOB DESCRIPTION (pasted by the candidate)\n${jd.trim().slice(0, 6000)}\n` : ""}
RESUME
${profile.resume.slice(0, 8000)}

Return JSON: {"why": [2-4 strings: reasons this resume fits], "whyNot": [2-4 strings: gaps or risks], "note": "one sentence on what would sharpen this read"}`;
    return askClaudeJSON(prompt, { signal, modelTier: "quick" });
  });
  const o = st.out;
  return html`<div class="stack-sm">
    <div class="field">
      <label for="find-jd">Paste the job description for a sharper read <span class="faint">(optional)</span></label>
      <textarea id="find-jd" class="textarea find-jd" placeholder="Claude can't open the listing, so it only sees the title, level and location unless you paste the description here." value=${jd} onInput=${(e) => setJd(e.currentTarget.value)}></textarea>
    </div>
    ${st.busy ? html`<${find_Thinking} onStop=${stop} />` : html`<div><${Btn} icon="spark" onClick=${go}>${o ? "Ask again" : "Why you, why not you"}</${Btn}></div>`}
    ${st.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${st.err} The fit check above works without Claude.</span></div>`}
    ${o && html`<div class="find-ai-out">
      <div class="grid cols-2 find-yn">
        <div><div class="find-yn-h ok"><${Icon} name="check" size=${14} />Why you</div><ul class="reason-list">${(o.why || []).map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>
        <div><div class="find-yn-h bad"><${Icon} name="x" size=${14} />Why not you (yet)</div><ul class="reason-list">${(o.whyNot || []).map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>
      </div>
      ${o.note && html`<p class="hint">${o.note}</p>`}
      <span class="ai-label"><${Icon} name="spark" />Drafted by Claude from your resume${jd.trim() ? " and the pasted description" : " and the listing title only"}. Review before relying on it.</span>
    </div>`}
  </div>`;
}

function find_Tailor({ job, profile }) {
  const [st, run, stop] = find_useAI();
  const go = () => run(async (signal) => {
    const prompt = `Rewrite lines from a candidate's EXISTING resume so they fit this role better.
Rules: only rework lines that are already in the resume. Never invent experience, employers, numbers, tools or results. If a line has no metric, do not add one. Keep each rewritten bullet under 30 words, start with a strong verb, and keep it truthful to the original.
You cannot see the full job description, only the listing facts below.

LISTING
${find_jobBrief(job)}

RESUME
${profile.resume.slice(0, 8000)}

Return JSON: {"bullets": [3-5 items of {"from": "the original resume line, quoted exactly or nearly", "to": "the rewritten bullet", "why": "under 12 words on why it fits this role"}]}`;
    return askClaudeJSON(prompt, { signal, modelTier: "default" });
  });
  const bl = st.out?.bullets || [];
  return html`<div class="stack-sm">
    ${st.busy ? html`<${find_Thinking} onStop=${stop} />` : html`<div><${Btn} icon="doc" onClick=${go}>${st.out ? "Suggest again" : "Tailor my resume"}</${Btn}></div>`}
    ${st.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${st.err}</span></div>`}
    ${bl.length > 0 && html`<div class="stack-sm">
      ${bl.map((b, i) => html`<div class="find-bullet" key=${i}>
        <div class="find-bullet-from"><span class="faint">From</span> ${b.from}</div>
        <div class="row" style="align-items:flex-start"><div class="find-bullet-to">${b.to}</div><${Btn} kind="ghost" size="sm" icon="copy" aria-label="Copy bullet" onClick=${() => copyText(b.to, "Bullet copied")} /></div>
        ${b.why && html`<div class="hint">${b.why}</div>`}
      </div>`)}
      <span class="ai-label"><${Icon} name="spark" />Drafted by Claude. Review before sending. Keep only what's true.</span>
    </div>`}
  </div>`;
}

/* ---------- DRAWERS.job ---------- */
function find_FitRow({ p }) {
  const ico = p.ok === true ? html`<span class="find-fit-ico ok"><${Icon} name="check" size=${14} /></span>` : p.ok === false ? html`<span class="find-fit-ico bad"><${Icon} name="x" size=${14} /></span>` : html`<span class="find-fit-ico none" aria-hidden="true">–</span>`;
  return html`<li>${ico}<span class="find-fit-k">${p.k}</span><span class="muted">${p.text}</span></li>`;
}

DRAWERS.job = ({ id }) => {
  const jobs = useJobs();
  const capsNow = useCaps();
  const profile = useStore((s) => s.profile);
  const byJob = find_useAppsByJob();
  const [allLocs, setAllLocs] = useState(false);
  const [clicked, setClicked] = useState(false);
  const job = jobs.byId.get(id);

  if (!job) {
    const loading = jobs.status !== "ready" && jobs.status !== "error";
    return html`<${Drawer} onClose=${closeDrawer} label="Job" head=${html`<div style="flex:1"><h2 class="find-dtitle">${loading ? "Loading listing…" : "Listing not found"}</h2></div>`}>
      ${loading ? html`<${Skeleton} rows=${4} />` : html`<${Empty} icon="search" title="This listing isn't in the current data" action=${html`<${Btn} onClick=${() => { closeDrawer(); go("find"); }}>Browse open jobs</${Btn}>`}>It may have closed since you saved it. Your application record is unaffected.</${Empty}>`}
    </${Drawer}>`;
  }
  const app = byJob.get(job.id);
  const fit = fitScore(job, profile);
  const cs = jobs.cstats[job.co];
  const days = fmt.days(job.p);
  const locs = job.l || [];
  const showLocs = allLocs ? locs : locs.slice(0, 6);
  const hiddenMore = (job.nl || locs.length) - locs.length;
  const lv = ghostLevel(job.g);

  const head = html`<div class="find-dhead">
    <${Logo} name=${job.co} size="lg" />
    <div class="stack-sm" style="gap:4px; min-width:0">
      <h2 class="find-dtitle">${job.t}</h2>
      <div class="row wrap find-dsub"><a class="find-link find-co" role="button" tabindex="0" onClick=${() => openCompany(job.co)} onKeyDown=${(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCompany(job.co); } }}>${job.co}</a><span class="sep">·</span><${Fresh} ts=${job.p} />${app && html`<${StageBadge} stage=${app.stage} />`}</div>
    </div>
  </div>`;

  const saved = app && app.stage === "saved";
  const foot = html`
    <a class="btn primary find-apply" href=${job.url} target="_blank" rel="noopener" onClick=${() => setClicked(true)}>Apply on company site<${Icon} name="ext" /></a>
    ${(!app || saved) && html`<${Btn} icon=${saved ? "bookmarkOn" : "bookmark"} aria-pressed=${saved ? "true" : "false"} onClick=${() => find_toggleSave(job, app)}>${saved ? "Saved" : "Save"}</${Btn}>`}
    ${(!app || saved) && html`<${Btn} icon="check" onClick=${() => find_markApplied(job, app)}>Mark as applied</${Btn}>`}
    ${app && html`<${Btn} kind="ghost" iconRight="arrowR" onClick=${() => openApp(app.id)}>Open in pipeline</${Btn}>`}`;

  return html`<${Drawer} onClose=${closeDrawer} label=${`${job.t} at ${job.co}`} head=${head} foot=${foot}>
    ${clicked && (!app || saved) && html`<div class="callout info"><${Icon} name="info" /><div class="row wrap" style="flex:1"><span style="flex:1; min-width:160px">Did you submit the application? Log it so Heardback can remind you to follow up.</span><${Btn} size="sm" kind="primary" onClick=${() => { find_markApplied(job, app); setClicked(false); }}>Mark as applied</${Btn}></div></div>`}

    <section class="stack-sm" aria-label="Key facts">
      <dl class="kv find-kv">
        <dt>Level</dt><dd>${FIND_LV[job.lvl]}</dd>
        <dt>Term</dt><dd>${job.term || html`<span class="faint">Not stated</span>`}</dd>
        <dt>Category</dt><dd>${job.cat}</dd>
        <dt>${locs.length > 1 ? `Locations (${job.nl || locs.length})` : "Location"}</dt>
        <dd>${locs.length ? html`<div class="find-locs">${showLocs.map((l) => html`<span key=${l}>${l}</span>`)}</div>
          ${locs.length > 6 && html`<button type="button" class="find-link" onClick=${() => setAllLocs(!allLocs)}>${allLocs ? "Show fewer" : `Show all ${locs.length}`}</button>`}
          ${hiddenMore > 0 && (allLocs || locs.length <= 6) && html`<div class="hint">Plus ${hiddenMore} more on the employer's page.</div>`}` : html`<span class="faint">Not listed</span>`}</dd>
        <dt>Remote</dt><dd>${job.r ? "Remote option listed" : html`<span class="muted">No remote option listed</span>`}</dd>
        ${job.sp && html`<dt>Visa sponsorship</dt><dd>${find_visaText(job.sp)}</dd>`}
        <dt>Degrees</dt><dd>${(job.deg || []).length ? job.deg.map((d) => FIND_DEG[d] || d).join(", ") : html`<span class="faint">Not stated</span>`}</dd>
        <dt>Posted</dt><dd><span class="num">${fmt.dateY(job.p)}</span> <span class="muted">· ${days <= 0 ? "today" : `${pluralize(days, "day")} ago`}</span><div class="hint">Date the listing was added to the source list.</div></dd>
        <dt>Applies via</dt><dd>${find_atsName(job)}</dd>
      </dl>
    </section>

    <section class="card" aria-labelledby="find-gh-h">
      <div class="card-head"><h3 id="find-gh-h">Ghost-job check</h3></div>
      <div class="card-body stack">
        <div class="find-gbig-row">
          <div class=${cx("find-gbig", lv)}><span class="num">${job.g}</span><span class="find-gbig-of">/100</span></div>
          <div class="stack-sm" style="gap:2px">
            <strong>${ghostLabel(job.g)}</strong>
            <span class="muted find-small">${job.g >= 50 ? "Several warning signs. Worth a quick check before you invest time." : job.g >= 25 ? "A warning sign or two. Not unusual for big employers." : "Nothing in the listing data suggests this role is stale."}</span>
          </div>
        </div>
        ${(job.gr || []).length
          ? html`<ul class="reason-list">${job.gr.map((r, i) => html`<li key=${i}><${Icon} name="flag" size=${14} cls="find-r-ico" />${r}</li>`)}</ul>`
          : html`<p class="muted find-small">No warning signs found in the listing data.</p>`}
        ${job.dup ? html`<p class="muted find-small"><${Icon} name="layers" size=${14} /> The same title and location is listed ${pluralize(job.dup, "more time")} right now. We show it once.</p>` : null}
        <p class="hint">Signals we can see in the listing data. Not proof either way.</p>
        <details class="find-details">
          <summary>How this works</summary>
          <ul class="find-rubric">
            <li><b>Age.</b> Days since it was first listed. 30 or more adds points, with more at 60, 90 and 150 days.</li>
            <li><b>Reposts.</b> The company posted and closed the same title before. Several open at once is often volume hiring, so that alone adds nothing.</li>
            <li><b>Location count.</b> Listed in 8 or more cities at once.</li>
            <li><b>Talent-pool wording.</b> Titles like "talent community" or "general application".</li>
            <li><b>Company tempo.</b> Much older than this company's usual time to close a listing.</li>
          </ul>
          <p class="hint">Points add up to a score capped at 100. 50 or more means several signals, not a verdict. Dates are when the community list first added a listing (the data starts Mar 9, 2026), which can be later than the employer's own posting.</p>
        </details>
      </div>
    </section>

    <section class="card" aria-labelledby="find-fit-h">
      <div class="card-head"><h3 id="find-fit-h">Your fit</h3><span class="spacer"></span>${fit && html`<span class=${cx("fit", fit.score >= 75 && "hi")}>Fit ${fit.score}</span>`}</div>
      <div class="card-body stack">
        ${fit
          ? html`<ul class="find-fit-list">${fit.parts.map((p) => html`<${find_FitRow} key=${p.k} p=${p} />`)}</ul>
            ${(profile.skills || []).length > 0 && fit.expected.length > 0 && html`<div class="stack-sm">
              <span class="hint">Skills this kind of role usually asks for, compared with your resume</span>
              <div class="chips">${fit.matched.map((x) => html`<span class="badge ok" key=${"m" + x}><${Icon} name="check" size=${12} />${x}</span>`)}${fit.missing.map((x) => html`<span class="badge outline" key=${"x" + x}>${x}</span>`)}</div>
            </div>`}`
          : html`<p class="muted find-small">Set target roles and locations to see how this job fits.</p><div><${Btn} onClick=${() => { closeDrawer(); go("prefs"); }}>Set preferences</${Btn}></div>`}
        ${!(profile.skills || []).length && html`<div class="callout"><${Icon} name="doc" /><div class="row wrap" style="flex:1"><span style="flex:1;min-width:160px">Add your resume to compare your skills with this role.</span><${Btn} size="sm" onClick=${() => openModal("resume")}>Add your resume</${Btn}></div></div>`}
        <p class="hint">Based on the listing's title, level and location. Listings here don't include full descriptions.</p>
      </div>
    </section>

    ${capsNow.sample && html`<section class="card" aria-labelledby="find-ai-h">
      <div class="card-head"><h3 id="find-ai-h">Ask Claude</h3><span class="spacer"></span><span class="ai-label"><${Icon} name="spark" />Uses your Claude account</span></div>
      <div class="card-body stack">
        ${find_hasResume(profile)
          ? html`<${find_WhyYou} job=${job} profile=${profile} /><div class="divider"></div><${find_Tailor} job=${job} profile=${profile} />`
          : html`<div class="callout"><${Icon} name="doc" /><div class="row wrap" style="flex:1"><span style="flex:1;min-width:160px">Claude needs your resume text to judge fit or suggest bullets. It only rewrites what's already there.</span><${Btn} size="sm" onClick=${() => openModal("resume")}>Add your resume</${Btn}></div></div>`}
      </div>
    </section>`}

    <section class="card" aria-labelledby="find-co-h">
      <div class="card-head"><${Logo} name=${job.co} size="sm" /><h3 id="find-co-h" class="truncate">${job.co}</h3><span class="spacer"></span><${Btn} size="sm" iconRight="chevR" onClick=${() => openCompany(job.co)}>View company</${Btn}></div>
      ${cs ? html`<div class="find-mini">
        <div class="stat"><span class="stat-label">Open roles</span><span class="find-mini-v num">${fmt.num(cs.open)}</span></div>
        <div class="stat"><span class="stat-label">Listing stays open</span><span class="find-mini-v num">${find_daysText(cs.medOpenDays) || html`<span class="faint">Not enough data</span>`}</span>${cs.medOpenDays != null && html`<span class="stat-sub">typical, n=${cs.closedTimed}</span>`}</div>
        <div class="stat"><span class="stat-label">Reposted titles</span><span class="find-mini-v num">${fmt.pct(cs.repostShare)}</span><span class="stat-sub">of open roles</span></div>
      </div>
      ${find_season(cs) && html`<div class="find-season-line"><span><span class="muted">${find_season(cs).term} hiring: </span><span class="num">${find_season(cs).line}</span></span>${find_season(cs).read && html` <span class=${cx("badge", find_season(cs).tone)}>${find_season(cs).read}</span>`}</div>`}` : html`<div class="card-body"><p class="muted find-small">No company stats for this listing yet.</p></div>`}
    </section>
  </${Drawer}>`;
};

/* ---------- Companies ---------- */
const CO_SORTS = [{ id: "open", label: "Most open roles" }, { id: "hiring", label: "Still hiring" }, { id: "fast", label: "Fastest to close" }, { id: "ghost", label: "Fewest ghost signals" }, { id: "az", label: "A–Z" }];
const find_stillShare = (c) => (c.season && c.season.posted ? c.season.open / c.season.posted : null);
const find_ghostShareC = { jobs: null, m: null };
function find_ghostShare(jobsState) {
  if (find_ghostShareC.jobs !== jobsState.jobs) {
    const m = new Map();
    for (const [co, list] of jobsState.byCompany) { let g = 0; for (const j of list) if (j.g >= 50) g++; m.set(co, list.length ? g / list.length : 0); }
    find_ghostShareC.jobs = jobsState.jobs; find_ghostShareC.m = m;
  }
  return find_ghostShareC.m;
}
function find_useAppsByCompany() {
  const s = useStore();
  return useMemo(() => { const m = new Map(); for (const a of Apps.list(s)) { const k = norm(a.company); m.set(k, (m.get(k) || 0) + 1); } return m; }, [s.apps, s.settings.showExamples]);
}

VIEWS.companies = function CompaniesView() {
  const jobs = useJobs();
  const appsBy = find_useAppsByCompany();
  const [qIn, setQIn] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("open");
  const [shown, setShown] = useState(50);
  useEffect(() => { const t = setTimeout(() => setQ(qIn), 120); return () => clearTimeout(t); }, [qIn]);
  const ready = jobs.status === "ready";
  const gs = ready ? find_ghostShare(jobs) : null;
  const list = useMemo(() => {
    if (!ready) return [];
    const words = norm(q).split(" ").filter(Boolean);
    let arr = Object.entries(jobs.cstats).map(([name, c]) => ({ name, c, k: norm(name) }));
    if (words.length) arr = arr.filter((x) => words.every((w) => x.k.includes(w)));
    const by = {
      open: (a, b) => b.c.open - a.c.open || a.name.localeCompare(b.name),
      hiring: (a, b) => (find_stillShare(b.c) ?? -1) - (find_stillShare(a.c) ?? -1) || (b.c.season?.open || 0) - (a.c.season?.open || 0),
      fast: (a, b) => (a.c.medOpenDays ?? 1e9) - (b.c.medOpenDays ?? 1e9) || b.c.open - a.c.open,
      ghost: (a, b) => (gs.get(a.name) ?? 0) - (gs.get(b.name) ?? 0) || a.c.avgGhost - b.c.avgGhost || b.c.open - a.c.open,
      az: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    }[sort];
    return arr.sort(by);
  }, [ready, jobs.cstats, q, sort]);
  useEffect(() => setShown(50), [q, sort]);

  const head = html`<div class="page-head"><div><h1>Companies</h1><p>${ready ? html`<span class="num">${fmt.num(Object.keys(jobs.cstats).length)}</span> companies with open internship or new-grad roles. Stats come from public listing history.` : "Companies hiring interns and new grads, with how long their listings usually stay open."}</p></div></div>`;
  if (!ready) {
    return html`<div class="page">${head}${jobs.status === "error"
      ? html`<div class="card"><${Empty} icon="alert" title="Couldn't load company data" action=${html`<${Btn} kind="primary" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}>`}>The listings file didn't load (${jobs.error || "unknown error"}). Check your connection and try again.</${Empty}></div>`
      : html`<div class="card"><${Skeleton} rows=${10} /></div>`}</div>`;
  }
  const rows = list.slice(0, shown);
  const lifetime = (c) => find_daysText(c.medOpenDays) || html`<span class="faint">Not enough data</span>`;
  return html`<div class="page">
    ${head}
    <div class="find-toolbar find-co-toolbar">
      <div class="input-icon find-search"><${Icon} name="search" /><input id="co-q" class="input" type="search" placeholder="Search companies" value=${qIn} onInput=${(e) => setQIn(e.currentTarget.value)} aria-label="Search companies" autocomplete="off" /></div>
      <div class="hide-sm"><${Seg} label="Sort companies" value=${sort} options=${CO_SORTS} onChange=${setSort} /></div>
      <select id="co-sort-sm" class="select show-sm find-sort-sm" aria-label="Sort companies" value=${sort} onChange=${(e) => setSort(e.currentTarget.value)}>${CO_SORTS.map((o) => html`<option key=${o.id} value=${o.id}>${o.label}</option>`)}</select>
    </div>
    ${!list.length ? html`<div class="card"><${Empty} icon="companies" title=${`No companies match “${q}”`} action=${html`<${Btn} onClick=${() => { setQIn(""); setQ(""); }}>Clear search</${Btn}>`}>Only companies with at least one open internship or new-grad listing are here.</${Empty}></div>` : html`
    <div class="card hide-sm">
      <table class="table find-cotable">
        <thead><tr>
          <th>Company</th><th class="r">Open roles</th><th>Intern / new grad</th><th class="r" title="Median days a closed listing stayed open">Typical listing lifetime</th><th class="r" title="Share of this season's internship postings still open">Still hiring</th><th class="r" title="Share of open roles with strong ghost signals">Ghost signals</th><th class="r">Your apps</th>
        </tr></thead>
        <tbody>${rows.map((x) => {
          const n = appsBy.get(x.k) || 0;
          const g = gs.get(x.name) ?? 0;
          return html`<tr key=${x.name} tabindex="0" onClick=${() => openCompany(x.name)} onKeyDown=${(e) => { if (e.key === "Enter") openCompany(x.name); }}>
            <td><div class="row"><${Logo} name=${x.name} size="sm" /><span class="truncate find-coname">${x.name}</span></div></td>
            <td class="r num">${fmt.num(x.c.open)}</td>
            <td><div class="find-split" title=${`${x.c.intern} internships · ${x.c.newgrad} new grad`}><span class="find-split-bar"><i style=${`width:${x.c.open ? (x.c.intern / x.c.open) * 100 : 0}%`}></i></span><span class="num muted">${x.c.intern} / ${x.c.newgrad}</span></div></td>
            <td class="r num">${lifetime(x.c)}</td>
            <td class="r num">${find_stillShare(x.c) != null ? html`<span title=${`${x.c.season.open} of ${x.c.season.posted} ${x.c.season.term} postings open`}>${fmt.pct(find_stillShare(x.c))}</span>` : html`<span class="faint">–</span>`}</td>
            <td class="r num"><span class=${cx("find-gshare", g >= 0.5 ? "high" : g >= 0.2 ? "mid" : "")}>${fmt.pct(g)}</span></td>
            <td class="r num">${n ? html`<span class="badge accent">${n}</span>` : html`<span class="faint">–</span>`}</td>
          </tr>`;
        })}</tbody>
      </table>
    </div>
    <div class="card show-sm"><div class="list">${rows.map((x) => {
      const n = appsBy.get(x.k) || 0;
      return html`<button type="button" class="find-corow" key=${x.name} onClick=${() => openCompany(x.name)}>
        <${Logo} name=${x.name} />
        <div class="find-row-main"><span class="find-row-title">${x.name}</span><span class="find-row-meta">${pluralize(x.c.open, "open role")} · ${x.c.medOpenDays != null ? `${find_daysText(x.c.medOpenDays)} open` : "lifetime n/a"} · ${fmt.pct(gs.get(x.name) ?? 0)} with ghost signals</span></div>
        ${n ? html`<span class="badge accent">${n}</span>` : html`<${Icon} name="chevR" cls="faint" />`}
      </button>`;
    })}</div></div>
    <div class="find-more">
      ${shown < list.length && html`<${Btn} onClick=${() => setShown((n) => n + 50)}>Show ${Math.min(50, list.length - shown)} more</${Btn}>`}
      <span class="faint num">Showing ${fmt.num(Math.min(shown, list.length))} of ${fmt.num(list.length)}</span>
    </div>`}
    <p class="footer-note">Lifetime is the median days a closed listing stayed open, from closed listings that stayed up at least a day. Still hiring is the share of this season's internship postings that are still open. Ghost signals is the share of open roles scoring 50 or more.</p>
  </div>`;
};

/* ---------- DRAWERS.company ---------- */
function find_Stat({ label, value, sub, n }) {
  return html`<div class="find-stat">
    <span class="stat-label">${label}</span>
    <span class="find-stat-v num">${value}</span>
    <span class="stat-sub">${sub}${n != null && html` <span class="find-n">n=${fmt.num(n)}</span>`}</span>
  </div>`;
}
function find_Brief({ name, cs }) {
  const key = `heardback:find:brief:${name}`;
  const cached = storage.get(key, null);
  const fresh = cached && now() - cached.at < DAY ? cached : null;
  const [st, run, stop] = find_useAI();
  const text = st.out || st.partial || (fresh && fresh.text) || "";
  const go = () => run(async (signal, onPartial) => {
    const cats = Object.entries(cs?.cats || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ");
    const prompt = `Write a short, neutral overview of the company "${name}" for a student weighing an internship or new-grad role there.
Use 4 to 6 bullets starting with "- ": what the company does, rough size or stage, main products, and anything useful to know as an early-career applicant.
Only state things you are confident about from general knowledge. If you don't know this company well, or the name is ambiguous, say so in one sentence and stop. Do not guess about hiring practices, culture or response rates. Plain text, no headings, no bold.
For context, public listing data currently shows ${cs?.open || 0} open roles${cats ? ` in ${cats}` : ""}${(cs?.locs || []).length ? `, mostly in ${cs.locs.slice(0, 3).join("; ")}` : ""}.`;
    const r = await askClaude(prompt, { signal, modelTier: "quick", onText: ({ text }) => onPartial(text) });
    const out = (r?.text || "").trim();
    if (out) storage.set(key, { at: now(), text: out });
    return out;
  });
  return html`<section class="card" aria-labelledby="find-brief-h">
    <div class="card-head"><h3 id="find-brief-h">Company overview</h3><span class="spacer"></span>${!st.busy && html`<${Btn} size="sm" icon="spark" onClick=${go}>${text ? "Refresh" : "Brief me on this company"}</${Btn}>`}</div>
    <div class="card-body stack-sm">
      ${st.busy && html`<${find_Thinking} onStop=${stop} text=${st.partial ? "Writing…" : "Thinking…"} />`}
      ${text ? html`<div class="ai-box">${text}</div>` : !st.busy && html`<p class="muted find-small">Claude can write a quick overview from its general knowledge.</p>`}
      ${st.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${st.err}</span></div>`}
      ${text && html`<span class="ai-label"><${Icon} name="spark" />AI-generated from Claude's general knowledge. May be out of date. Verify before relying on it.${fresh && !st.out && !st.busy ? ` Saved ${fmt.ago(fresh.at)}.` : ""}</span>`}
    </div>
  </section>`;
}

DRAWERS.company = ({ id }) => {
  const jobs = useJobs();
  const capsNow = useCaps();
  const s = useStore();
  const byJob = find_useAppsByJob();
  const [allRoles, setAllRoles] = useState(false);
  const name = id;
  const cs = jobs.cstats[name];
  const open = jobs.byCompany.get(name) || [];
  const myApps = Apps.list(s).filter((a) => norm(a.company) === norm(name)).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  const loading = jobs.status !== "ready" && jobs.status !== "error";

  const head = html`<div class="find-dhead">
    <${Logo} name=${name} size="lg" />
    <div class="stack-sm" style="gap:4px; min-width:0">
      <h2 class="find-dtitle">${name}</h2>
      <div class="row wrap find-dsub find-dsub-co">
        ${cs ? html`<span class="muted">${pluralize(cs.open, "open role")}</span>` : html`<span class="muted">${loading ? "Loading…" : "No open listings right now"}</span>`}
        ${cs?.site && html`<a href=${cs.site} target="_blank" rel="noopener" class="find-ext">Profile on Simplify<${Icon} name="ext" size=${13} /></a>`}
      </div>
    </div>
  </div>`;

  const roles = allRoles ? open : open.slice(0, 8);
  const season = find_season(cs);
  return html`<${Drawer} onClose=${closeDrawer} label=${name} head=${head}>
    ${loading && html`<${Skeleton} rows=${4} />`}
    ${cs && html`<section aria-labelledby="find-cs-h" class="stack-sm">
      <h3 id="find-cs-h" class="section-title">From public listing history</h3>
      <div class="find-stats">
        <${find_Stat} label="Open roles" value=${fmt.num(cs.open)} sub=${`${cs.intern} internship · ${cs.newgrad} new grad`} />
        <${find_Stat} label="Listed since" value=${cs.first ? fmt.date(cs.first * 1000, { month: "short", year: "numeric" }) : "—"} sub="Earliest listing in the dataset, which starts Mar 2026." n=${cs.seen} />
        <${find_Stat} label="Typical time open" value=${find_daysText(cs.medOpenDays) || html`<span class="faint find-nd">Not enough data</span>`} sub=${cs.medOpenDays != null ? "Median for closed listings." : "Needs 5+ closed listings with dates."} n=${cs.closedTimed} />
        <${find_Stat} label="Closed within 14 days" value=${cs.fastClose != null ? fmt.pct(cs.fastClose) : html`<span class="faint find-nd">Not enough data</span>`} sub="Share of closed listings." n=${cs.closedTimed} />
        <${find_Stat} label="Repost share" value=${fmt.pct(cs.repostShare)} sub="Open roles whose title was listed before." n=${cs.open} />
        <${find_Stat} label="New in last 30 days" value=${cs.new30 != null ? fmt.num(cs.new30) : "—"} sub="Postings added, open or closed." />
      </div>
      <p class="hint">Closed-listing dates are only counted when a listing stayed up at least a day, and still-open listings aren't in the sample, so typical times lean short.</p>
    </section>`}

    ${season && html`<section class="card" aria-labelledby="find-season-h">
      <div class="card-head"><h3 id="find-season-h">${season.term} hiring</h3><span class="spacer"></span>${season.read && html`<span class=${cx("badge", season.tone)}>${season.read}</span>`}</div>
      <div class="card-body stack-sm">
        <div class="find-season-nums">
          <span><strong class="num">${fmt.num(season.posted)}</strong> <span class="muted">internship postings this season</span></span>
          <span><strong class="num">${fmt.num(season.open)}</strong> <span class="muted">still open</span></span>
          ${season.lastNew && html`<span><span class="muted">last new posting</span> <strong class="num">${fmt.ago(season.lastNew * 1000)}</strong></span>`}
        </div>
        <${Meter} value=${season.open} max=${season.posted} />
        <p class="hint">${season.read === "Still adding roles" ? `${name} added a ${season.term} posting in the last week.` : season.read ? `Only ${fmt.pct(season.share)} of this season's postings are still open and nothing new has been added in three weeks.` : `${fmt.pct(season.share)} of this season's postings are still open.`}</p>
      </div>
    </section>`}

    ${typeof PoolCompanyCard === "function" ? html`<${PoolCompanyCard} company=${name} />` : null}

    <section class="stack-sm" aria-labelledby="find-my-h">
      <h3 id="find-my-h" class="section-title">Your applications here <span class="count">${myApps.length}</span></h3>
      ${myApps.length
        ? html`<div class="card"><div class="list">${myApps.map((a) => html`<button type="button" class="find-applink" key=${a.id} onClick=${() => openApp(a.id)}>
            <div class="find-row-main"><span class="find-row-title">${a.title || "Untitled role"}</span><span class="find-row-meta">${a.appliedAt ? `Applied ${fmt.date(a.appliedAt)}` : `Saved ${fmt.date(a.createdAt)}`}${a.location ? ` · ${a.location}` : ""}</span></div>
            ${a.example && html`<${ExampleTag} />`}<${StageBadge} stage=${a.stage} />
          </button>`)}</div></div>`
        : html`<p class="muted find-small">You haven't saved or applied to anything at ${name} yet.</p>`}
    </section>

    ${capsNow.sample && html`<${find_Brief} name=${name} cs=${cs} />`}

    <section class="stack-sm" aria-labelledby="find-open-h">
      <h3 id="find-open-h" class="section-title">Open roles <span class="count">${open.length}</span></h3>
      ${open.length
        ? html`<div class="card find-results find-results-tight"><div class="list" role="list">${roles.map((j, i) => html`<${find_Row} key=${j.id} job=${j} app=${byJob.get(j.id)} profile=${s.profile} i=${i} inCompany />`)}</div></div>
          ${open.length > 8 && html`<div><${Btn} size="sm" onClick=${() => setAllRoles(!allRoles)}>${allRoles ? "Show fewer" : `Show all ${open.length}`}</${Btn}></div>`}`
        : !loading && html`<p class="muted find-small">No open internship or new-grad listings right now.</p>`}
    </section>
  </${Drawer}>`;
};
