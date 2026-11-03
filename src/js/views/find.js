/* ===== Find jobs · Job drawer · Companies · Company drawer =====
   Area-private helpers are prefixed find_. Filters live in store.ui.findFilters
   (null = follow the profile's preferences). */

const FIND_PAGE = 60;
const FIND_POSTED = [
  { id: "any", label: "Any", title: "Any time" }, { id: "1", label: "24h", title: "Last 24 hours" },
  { id: "3", label: "3d", title: "Last 3 days" }, { id: "7", label: "7d", title: "Last 7 days" }, { id: "30", label: "30d", title: "Last 30 days" },
];
const FIND_VISA = [{ id: "any", label: "Any" }, { id: "yes", label: "Offers sponsorship" }, { id: "nocit", label: "Hide citizenship-required" }];
const FIND_SORTS = [{ id: "new", label: "Newest" }, { id: "fit", label: "Best fit" }, { id: "ghost", label: "Most likely real" }];
const FIND_ATS = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", workday: "Workday" };
const FIND_DEG = { BS: "Bachelor’s", MS: "Master’s", PhD: "PhD", AS: "Associate’s", MBA: "MBA", Cert: "Certificate" };
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
function find_metaParts(job) { return [job.co, find_locText(job), FIND_LV[job.lvl] || "", job.term].filter(Boolean); }
function find_metaText(job) { return find_metaParts(job).join(" · "); }
/* Display title: raw " - " separators read as en dashes, like the rest of the UI. */
const find_title = (t) => String(t || "").replace(/\s+-\s+/g, " – ");
/* "a · b · c" as a .meta-list (find.css): each item carries its own leading dot, and the dot of the first item
   on every visual line is clipped, so a line never starts or ends with "·". */
function find_Meta({ parts, cls, title, tag }) {
  const xs = (parts || []).filter((x) => x != null && x !== false && x !== "");
  const T = tag || "span";
  return html`<${T} class=${cx("meta-list", cls)} title=${title}>${xs.map((x, i) => html`<span key=${i}>${x}</span>`)}</${T}>`;
}
/* UI copy uses curly apostrophes; some strings come from shared data/logic with straight ones. */
const find_curly = (t) => (typeof t === "string" ? t.replace(/(\w)'(\w)/g, "$1’$2") : t);
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
  else if (share < 0.15 && since != null && since > 21) { read = "Most of this season’s roles have closed"; tone = "wait"; }
  const line = `${pluralize(se.posted, "internship posting")} this season · ${fmt.num(se.open)} still open${se.lastNew ? ` · last new posting ${fmt.ago(se.lastNew * 1000)}` : ""}`;
  return { ...se, share, since, read, tone, line };
}
const find_daysText = (d) => (d == null ? null : `~${Math.max(1, Math.round(d))} ${Math.round(d) === 1 ? "day" : "days"}`);
const find_typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

/* ---------- shared bits ---------- */
/* Accent only for a standout fit: never on a listing with ghost signals (we would be promoting what we warn
   about), and in a company's role list only for its top few (hiMin), so the pill never becomes wallpaper. */
const find_fitHi = (score, job, hiMin) => score >= Math.max(95, hiMin ?? 0) && (!job || ghostLevel(job.g || 0) === "low");
function find_hiMin(jobsArr, profile) {
  const sc = jobsArr.filter((j) => ghostLevel(j.g || 0) === "low").map((j) => find_fit(j, profile)?.score ?? -1).sort((a, b) => b - a);
  const k = Math.min(3, Math.max(1, Math.floor(jobsArr.length / 4)));
  if (!sc.length) return 101;
  const t = sc[Math.min(k, sc.length) - 1];
  // ties at the cut-off would spread the accent across the list, so a tie raises the bar
  return sc.filter((x) => x >= t).length > k ? t + 1 : t;
}
function find_FitPill({ fit, sponsor, job, hiMin }) {
  if (!fit) return null;
  return html`<span class=${cx("fit", find_fitHi(fit.score, job, hiMin) && "hi")} title=${`Fit ${fit.score} out of 100, from role, level, location${sponsor ? ", visa" : ""} and skills`}>Fit ${fit.score}</span>`;
}
/* Row-level stale-listing hint: nothing when the risk is low. */
function find_GhostHint({ g }) {
  const lv = ghostLevel(g || 0);
  if (lv === "low") return null;
  return html`<span class=${cx("gscore", lv)} title=${`${ghostLabel(g)} (${g}/100). Not proof either way. Open the listing to see why.`}><span class="gbars" aria-hidden="true"><i></i><i></i><i></i></span><span class="find-g-l">${ghostLabel(g)}</span></span>`;
}

/* true at phone width (≤520px); follows resizes */
function find_useNarrow() {
  const mq = useMemo(() => (window.matchMedia ? window.matchMedia("(max-width: 520px)") : null), []);
  const [n, setN] = useState(() => !!(mq && mq.matches));
  useEffect(() => { if (!mq) return; const f = () => setN(mq.matches); mq.addEventListener ? mq.addEventListener("change", f) : mq.addListener(f); return () => (mq.removeEventListener ? mq.removeEventListener("change", f) : mq.removeListener(f)); }, [mq]);
  return n;
}

/* ---------- shared row ---------- */
function find_Row({ job, app, profile, i, sel, onSelect, inCompany, hiMin }) {
  const fit = profile ? find_fit(job, profile) : null;
  const open = () => { onSelect && onSelect(i); openJob(job.id); };
  const saved = app && app.stage === "saved";
  const metaP = inCompany ? [find_locText(job), FIND_LV[job.lvl], job.term].filter(Boolean) : find_metaParts(job);
  const metaT = metaP.join(" · ");
  const title = find_title(job.t);
  return html`<div class=${cx("job-row find-row", inCompany && "find-row-co")} role="listitem" data-find-i=${i} aria-selected=${sel ? "true" : "false"} onClick=${open}>
    ${!inCompany && html`<${Logo} name=${job.co} />`}
    <div class="find-row-main">
      <button type="button" class="find-row-title" onClick=${(e) => { e.stopPropagation(); open(); }} title=${title}>${title}</button>
      <${find_Meta} tag="div" cls="find-row-meta" title=${metaT} parts=${metaP} />
    </div>
    <div class="find-side">
      <span class="find-c-ghost"><${find_GhostHint} g=${job.g} /></span>
      <span class="find-c-fresh"><${Fresh} ts=${job.p} /></span>
      <span class="find-c-fit"><${find_FitPill} fit=${fit} sponsor=${profile && profile.needsSponsor} job=${job} hiMin=${hiMin} /></span>
      <span class="find-c-act" onClick=${(e) => e.stopPropagation()}>
        ${app && !saved
          ? html`<button type="button" class="find-stage" onClick=${() => openApp(app.id)} title="Open in pipeline"><${StageBadge} stage=${app.stage} /></button>`
          : html`<${Btn} kind="ghost" size="sm" icon=${saved ? "bookmarkOn" : "bookmark"} cls=${cx("find-save", saved && "on")} aria-pressed=${saved ? "true" : "false"} aria-label=${saved ? `Remove ${job.t} at ${job.co} from saved` : `Save ${job.t} at ${job.co}`} title=${saved ? "Saved. Click to remove" : "Save to pipeline (S)"} onClick=${() => find_toggleSave(job, app)} />`}
      </span>
    </div>
  </div>`;
}

/* ---------- filter controls (sidebar and mobile modal) ---------- */
const FIND_LOC_TOP = 6;
/* Stable location order: by listing count across the whole dataset, so rows don't jump as other filters change. */
const find_locOrdC = { jobs: null, ord: null };
function find_locOrder(jobs) {
  if (!jobs) return LOC_OPTIONS.map((o, i) => i);
  if (find_locOrdC.jobs !== jobs) {
    const c = new Array(LOC_OPTIONS.length).fill(0);
    for (const m of find_locMasks(jobs).values()) for (let i = 0; i < c.length; i++) if (m & (1 << i)) c[i]++;
    find_locOrdC.jobs = jobs; find_locOrdC.ord = c.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  }
  return find_locOrdC.ord;
}
function find_CheckRow({ id, type = "checkbox", name, checked, onChange, label, n }) {
  return html`<label class="find-opt" for=${id}>
    <input id=${id} type=${type} name=${name} checked=${checked} onChange=${onChange} />
    <span class="find-opt-l">${label}</span>
    ${n != null && html`<span class="find-opt-n">${fmt.num(n)}</span>`}
  </label>`;
}
/* Facet chip: a zero-count option that isn't selected can't add anything, so it's disabled. */
function find_FacetChip({ on, n, onClick, children }) {
  const dead = !on && !n;
  return html`<button type="button" class="chip find-chip" aria-pressed=${on ? "true" : "false"} disabled=${dead} title=${dead ? "No matches with the current search and filters" : null} onClick=${onClick}>${on && html`<${Icon} name="check" size=${13} />`}${children}<span class="find-chip-n">${fmt.num(n || 0)}</span></button>`;
}
function find_FilterControls({ px, f, counts, jobs }) {
  const [moreLocs, setMoreLocs] = useState(false);
  const roles = CATS.concat(counts.cRole.Other ? ["Other"] : []);
  // Locations by count; the top few always show, plus anything selected.
  // Sorted by the current count. Location counts ignore the location filter itself, so ticking a box never reorders the list.
  const locs = find_locOrder(jobs).map((i) => ({ ...LOC_OPTIONS[i], n: counts.cLoc[i] || 0 })).sort((a, b) => b.n - a.n);
  const top = locs.slice(0, FIND_LOC_TOP);
  const rest = locs.slice(FIND_LOC_TOP);
  const shownLocs = moreLocs ? locs : top.concat(rest.filter((o) => f.locs.includes(o.id)));
  const hidden = locs.length - shownLocs.length;
  return html`<div class="find-fgroups">
    <div class="filter-group" role="group" aria-labelledby=${px + "-lv"}>
      <h4 id=${px + "-lv"}>Level</h4>
      <div class="chips">${LEVELS.map((l) => html`<${find_FacetChip} key=${l.id} on=${f.lv.includes(l.id)} n=${counts.cLv[l.id]} onClick=${() => find_setFilters({ lv: find_toggle(f.lv, l.id) })}>${l.label}</${find_FacetChip}>`)}</div>
    </div>
    <div class="filter-group" role="group" aria-labelledby=${px + "-role"}>
      <h4 id=${px + "-role"}>Role</h4>
      <div class="chips">${roles.map((r) => html`<${find_FacetChip} key=${r} on=${f.roles.includes(r)} n=${counts.cRole[r]} onClick=${() => find_setFilters({ roles: find_toggle(f.roles, r) })}>${r}</${find_FacetChip}>`)}</div>
    </div>
    <div class="filter-group" role="group" aria-labelledby=${px + "-loc"}>
      <h4 id=${px + "-loc"}>Location${f.locs.length > 0 && html` <button type="button" class="find-link find-h-clear" onClick=${() => find_setFilters({ locs: [] })}>Clear</button>`}</h4>
      <div class="find-opts">${shownLocs.map((o) => html`<${find_CheckRow} key=${o.id} id=${`${px}-loc-${o.id.replace(/\W+/g, "-")}`} checked=${f.locs.includes(o.id)} onChange=${() => find_setFilters({ locs: find_toggle(f.locs, o.id) })} label=${o.label} n=${o.n} />`)}</div>
      ${(hidden > 0 || moreLocs) && html`<button type="button" class="find-link find-more-link" aria-expanded=${moreLocs ? "true" : "false"} onClick=${() => setMoreLocs(!moreLocs)}>${moreLocs ? "Show fewer" : `Show ${hidden} more`}</button>`}
    </div>
    <div class="filter-group">
      <h4>Posted</h4>
      <${Seg} label="Posted within" value=${f.posted === "since" ? "" : f.posted} options=${FIND_POSTED} onChange=${(v) => find_setFilters({ posted: v })} />
      ${visit.since && html`<div class="chips"><${Chip} on=${f.posted === "since"} icon="bolt" onClick=${() => find_setFilters({ posted: f.posted === "since" ? "any" : "since" })}>New since your last visit</${Chip}></div>`}
    </div>
    <div class="filter-group" role="radiogroup" aria-labelledby=${px + "-visa"}>
      <h4 id=${px + "-visa"}>Visa</h4>
      <div class="find-opts">${FIND_VISA.map((v) => html`<${find_CheckRow} key=${v.id} type="radio" name=${px + "-visa"} id=${`${px}-visa-${v.id}`} checked=${f.visa === v.id} onChange=${() => find_setFilters({ visa: v.id })} label=${v.label} />`)}</div>
      ${f.visa === "yes" && html`<span class="hint">Few listings say either way, so this hides most jobs.</span>`}
    </div>
    <div class="filter-group">
      <h4>Ghost signals</h4>
      <${Switch} id=${px + "-ghost"} checked=${f.hideGhost} onChange=${(v) => find_setFilters({ hideGhost: v })} label="Hide strong ghost signals" />
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
    <${find_FilterControls} px="find-m" f=${f} counts=${counts} jobs=${jobs.jobs} />
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
  const narrow = find_useNarrow();
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
        // Focus the row's title button, so closing the drawer returns focus here (the drawer restores the prior focus).
        setTimeout(() => { const r = document.querySelector(`.find-results [data-find-i="${next}"]`); if (!r) return; r.scrollIntoView({ block: "nearest" }); r.querySelector(".find-row-title")?.focus({ preventScroll: true }); }, 0);
      } else if (e.key === "Enter" && sel >= 0) {
        if (e.target && e.target.closest && e.target.closest(".find-row button, .find-row a")) return; // native activation opens the focused row
        e.preventDefault();
        document.querySelector(`.find-results [data-find-i="${sel}"] .find-row-title`)?.focus({ preventScroll: true }); // restore target for the drawer
        openJob(list[sel].id);
      }
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
      ${ready
        ? html`<p class="meta-list find-sub"><span class="find-sub-main"><span class="num">${fmt.num(jobs.jobs.length)}</span> open internship and new-grad roles${st.active > jobs.jobs.length ? html` <span class="faint find-raw" title="Identical repeats of the same listing are shown once">(<span class="num">${fmt.num(st.active)}</span> postings)</span>` : null} from <span class="num">${fmt.num(st.companies || jobs.byCompany.size)}</span> companies</span>${genAt ? html`<span class="find-sub-x">Updated ${fmt.ago(genAt)}</span>` : null}<span class="find-sub-x"><button type="button" class="find-link" onClick=${() => openModal("method")}>How we score listings</button></span></p>`
        : html`<p>Open internship and new-grad roles, checked for ghost-job signals.</p>`}
    </div>
  </div>`;

  if (!ready) {
    return html`<div class="page find-page">${head}
      <div class="find-layout">
        <aside class="filters find-aside" aria-label="Filters">${[0, 1, 2].map((i) => html`<div class="filter-group" key=${i}><div class="skel" style="height:10px;width:60px"></div><div class="skel" style="height:30px;width:100%"></div></div>`)}</aside>
        <div class="stack">
          ${jobs.status === "error"
            ? html`<div class="card"><${Empty} icon="alert" title="Couldn’t load job listings" action=${html`<${Btn} kind="primary" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}>`}>The listings file didn’t load (${jobs.error || "unknown error"}). Check your connection and try again.</${Empty}></div>`
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
        <${find_FilterControls} px="find-f" f=${f} counts=${counts} jobs=${jobs.jobs} />
      </aside>
      <div class="stack find-main">
        <div class="find-toolbar">
          <div class="input-icon find-search">
            <${Icon} name="search" />
            <input id="find-q" class="input" type="search" placeholder=${narrow ? "Search jobs" : "Search title, company or location"} value=${qIn} onInput=${(e) => setQIn(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === "Escape" && qIn) { e.stopPropagation(); setQIn(""); } else if (e.key === "Enter") { setQ(qIn); find_state.q = qIn; } }} aria-label="Search jobs" autocomplete="off" />
            ${qIn ? html`<${Btn} kind="ghost" size="sm" icon="x" cls="find-qclear" aria-label="Clear search" onClick=${() => { setQIn(""); setQ(""); find_state.q = ""; document.getElementById("find-q")?.focus(); }} />` : html`<span class="kbd find-kbd hide-sm">/</span>`}
          </div>
          <${Btn} cls="find-fbtn" icon="filter" onClick=${() => openModal("findFilters")} aria-label=${`Filters${nActive ? `, ${nActive} active` : ""}`}>Filters${nActive ? html`<span class="find-fcount num">${nActive}</span>` : null}</${Btn}>
        </div>
        <div class="find-bar">
          <div class="find-count meta-list">
            <span class="find-n"><strong class="num">${fmt.num(list.length)}</strong> ${list.length === 1 ? "match" : "matches"}</span>
            ${visit.since && f.posted !== "since" && (() => { const n = list.filter((j) => j.p > visit.since).length; return n ? html`<span class="find-prefs"><button type="button" class="find-link" onClick=${() => find_setFilters({ posted: "since" })}>${fmt.num(n)} new since your last visit</button></span>` : null; })()}
            ${find_hasPrefs(profile) && (usingPrefs
              ? [html`<span class="find-prefs" key="up">Using your preferences</span>`, html`<span class="find-prefs" key="sa"><button type="button" class="find-link" onClick=${find_clearAll}>Show all</button></span>`]
              : html`<span class="find-prefs"><button type="button" class="find-link" onClick=${() => find_setFilters(null)}>Use my preferences</button></span>`)}
          </div>
          <span class="spacer"></span>
          <div class="find-sort hide-sm"><${Seg} label="Sort by" value=${sort} options=${FIND_SORTS} onChange=${(v) => store.set((x) => ({ ...x, ui: { ...x.ui, findSort: v } }))} /></div>
          <select id="find-sort-sm" class="select find-sort-sm show-sm" aria-label="Sort by" value=${sort} onChange=${(e) => { const v = e.currentTarget.value; store.set((x) => ({ ...x, ui: { ...x.ui, findSort: v } })); }}>
            ${FIND_SORTS.map((o) => html`<option key=${o.id} value=${o.id}>${o.label}</option>`)}
          </select>
        </div>
        ${list.length
          ? html`<div class=${cx("card find-results", rows.some((j) => { const a = byJob.get(j.id); return a && a.stage !== "saved"; }) && "find-has-stage")}><div class="list" role="list" aria-label="Job results">
              ${rows.map((j, i) => html`<${find_Row} key=${j.id} job=${j} app=${byJob.get(j.id)} profile=${profile} i=${i} sel=${i === sel} onSelect=${setSel} />`)}
            </div></div>
            ${shown < list.length && html`<div class="find-more" ref=${sentinel}><${Btn} onClick=${() => setShown((n) => n + FIND_PAGE)}>Show ${Math.min(FIND_PAGE, list.length - shown)} more</${Btn}><span class="faint num">Showing ${fmt.num(shown)} of ${fmt.num(list.length)}</span></div>`}
            <div class="find-keys hide-sm"><${Kbd}>J</${Kbd}><${Kbd}>K</${Kbd}> move <${Kbd}>↵</${Kbd}> open <${Kbd}>S</${Kbd}> save</div>`
          : html`<div class="card"><${Empty} icon="search" title="No jobs match these filters"
              action=${html`<div class="row wrap" style="justify-content:center">${suggestion && html`<${Btn} kind="primary" onClick=${suggestion.run}>${suggestion.label} (${fmt.num(suggestion.n)})</${Btn}>`}${(nActive > 0 || q) && html`<${Btn} onClick=${() => { find_clearAll(); setQIn(""); setQ(""); find_state.q = ""; }}>Clear search and filters</${Btn}>`}</div>`}>
              ${suggestion ? `${suggestion.desc} brings back ${pluralize(suggestion.n, "job")}.` : "Try a shorter search or fewer filters."}
            </${Empty}></div>`}
        <p class="footer-note find-foot">Listings from ${meta.source?.url ? html`<a href=${meta.source.url} target="_blank" rel="noopener">SimplifyJobs community listings</a>` : "SimplifyJobs community listings"}${genAt ? `, refreshed ${fmt.ago(genAt)}` : ""}. Listings link to each employer’s own application page.</p>
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

const FIND_AI_NOTE = "Drafted by Claude · review before using.";
function find_whyPrompt(job, profile, jd) {
  return `You help a student or new grad decide whether a job is worth applying to.
You can see ONLY their resume and the basic listing facts below. ${jd ? "The candidate also pasted the job description below." : "You cannot see the full job description, so judge only from the title, level and location, and say so when a point depends on details you can't see."}
Never invent experience, skills or facts that aren't in the resume. Be specific and brief (each item under 20 words). Refer to resume content, not the person's name.

LISTING
${find_jobBrief(job)}
${jd ? `\nJOB DESCRIPTION (pasted by the candidate)\n${jd.slice(0, 6000)}\n` : ""}
RESUME
${profile.resume.slice(0, 8000)}

Return JSON: {"why": [2-4 strings: reasons this resume fits], "whyNot": [2-4 strings: gaps or risks], "note": "one sentence on what would sharpen this read"}`;
}
function find_tailorPrompt(job, profile, jd) {
  return `Rewrite lines from a candidate's EXISTING resume so they fit this role better.
Rules: only rework lines that are already in the resume. Never invent experience, employers, numbers, tools or results. If a line has no metric, do not add one. Keep each rewritten bullet under 30 words, start with a strong verb, and keep it truthful to the original.
${jd ? "The candidate pasted the job description below; use its wording where the resume truthfully supports it." : "You cannot see the full job description, only the listing facts below."}

LISTING
${find_jobBrief(job)}
${jd ? `\nJOB DESCRIPTION (pasted by the candidate)\n${jd.slice(0, 6000)}\n` : ""}
RESUME
${profile.resume.slice(0, 8000)}

Return JSON: {"bullets": [3-5 items of {"from": "the original resume line, quoted exactly or nearly", "to": "the rewritten bullet", "why": "under 12 words on why it fits this role"}]}`;
}

/* Both Claude actions share one job-description box and sit side by side until used. */
function find_AskClaude({ job, profile }) {
  const [stA, runA, stopA] = find_useAI();
  const [stB, runB, stopB] = find_useAI();
  const [jd, setJd] = useState("");
  const hasResume = find_hasResume(profile);
  const goA = () => runA((signal) => askClaudeJSON(find_whyPrompt(job, profile, jd.trim()), { signal, modelTier: "quick" }));
  const goB = () => runB((signal) => askClaudeJSON(find_tailorPrompt(job, profile, jd.trim()), { signal, modelTier: "default" }));
  const o = stA.out;
  const bl = stB.out?.bullets || [];
  const anyOut = !!o || bl.length > 0;
  const busy = stA.busy || stB.busy;
  const again = () => { if (o) goA(); if (bl.length) goB(); };
  const showA = !stA.busy && !o, showB = !stB.busy && !bl.length;
  return html`<section class="dsec" aria-labelledby="find-ai-h">
    <h3 id="find-ai-h">Ask Claude<span class="spacer"></span>${anyOut && !busy
      ? html`<${Btn} kind="ghost" size="sm" icon="refresh" cls="find-h-btn" onClick=${again}>Regenerate</${Btn}>`
      : html`<span class="ai-label find-h-meta"><${Icon} name="spark" />Uses your Claude account</span>`}</h3>
    ${hasResume
      ? html`<div class="field">
          <label for="find-jd">Job description <span class="faint">(optional)</span></label>
          <textarea id="find-jd" class="textarea find-jd" placeholder="Paste the job description for a sharper read." value=${jd} onInput=${(e) => setJd(e.currentTarget.value)}></textarea>
        </div>
        ${(showA || showB) && html`<div class="row wrap find-ai-btns">
          ${showA && html`<${Btn} icon="spark" onClick=${goA}>Weigh my strengths and gaps</${Btn}>`}
          ${showB && html`<${Btn} icon="doc" onClick=${goB}>Tailor my resume</${Btn}>`}
        </div>`}
        ${stA.busy && html`<${find_Thinking} onStop=${stopA} text="Weighing your fit…" />`}
        ${stA.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${stA.err} The fit check above works without Claude.</span></div>`}
        ${o && html`<div class="find-ai-out">
          <div class="grid cols-2 find-yn">
            <div><div class="find-yn-h">Strengths</div><ul class="reason-list">${(o.why || []).map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>
            <div><div class="find-yn-h">Gaps</div><ul class="reason-list">${(o.whyNot || []).map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>
          </div>
          ${o.note && html`<p class="hint">${o.note}</p>`}
        </div>`}
        ${stB.busy && html`<${find_Thinking} onStop=${stopB} text="Tailoring bullets…" />`}
        ${stB.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${stB.err}</span></div>`}
        ${bl.length > 0 && html`<div class="find-bullets">
          ${bl.map((b, i) => html`<div class="find-bullet" key=${i}>
            <div class="find-bullet-from">From “${String(b.from || "").replace(/^["“”']+|["“”']+$/g, "")}”</div>
            <div class="find-bullet-row"><div class="find-bullet-to">${b.to}</div><${Btn} kind="ghost" size="sm" icon="copy" aria-label="Copy bullet" title="Copy" onClick=${() => copyText(b.to, "Bullet copied")} /></div>
            ${b.why && html`<div class="hint">${b.why}</div>`}
          </div>`)}
        </div>`}
        ${anyOut && html`<span class="ai-label"><${Icon} name="spark" />${FIND_AI_NOTE}</span>`}`
      : html`<p class="muted find-small">Add your resume and Claude can weigh your fit or suggest stronger bullets from what’s already there. <button type="button" class="find-link" onClick=${() => openModal("resume")}>Add your resume</button></p>`}
  </section>`;
}

/* ---------- DRAWERS.job ---------- */
function find_FitRow({ p }) {
  const ico = p.ok === true ? html`<span class="find-fit-ico ok"><${Icon} name="check" size=${14} /></span>` : p.ok === false ? html`<span class="find-fit-ico bad"><${Icon} name="x" size=${14} /></span>` : html`<span class="find-fit-ico none" aria-hidden="true">–</span>`;
  return html`<li>${ico}<span class="find-fit-k">${p.k}</span><span class="muted">${find_curly(p.text)}</span></li>`;
}
function find_postedText(ts) {
  const d = fmt.days(ts);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
}
function find_ghostLine(job) {
  const lv = ghostLevel(job.g);
  const nr = (job.gr || []).length;
  if (lv === "low") return nr ? `${ghostLabel(job.g)} · ${pluralize(nr, "minor signal")}` : `${ghostLabel(job.g)} · no signals`;
  return `${ghostLabel(job.g)} · worth a quick check`;
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
      ${loading ? html`<${Skeleton} rows=${4} />` : html`<${Empty} icon="search" title="This listing isn’t in the current data" action=${html`<${Btn} onClick=${() => { closeDrawer(); go("find"); }}>Browse open jobs</${Btn}>`}>It may have closed since you saved it. Your application record is unaffected.</${Empty}>`}
    </${Drawer}>`;
  }
  const app = byJob.get(job.id);
  const fit = fitScore(job, profile);
  const cs = jobs.cstats[job.co];
  const coOpen = (jobs.byCompany.get(job.co) || []).length;
  const locs = job.l || [];
  const showLocs = allLocs ? locs : locs.slice(0, 5);
  const hiddenMore = (job.nl || locs.length) - locs.length;
  const lv = ghostLevel(job.g);
  const season = find_season(cs);
  const deg = (job.deg || []).map((d) => FIND_DEG[d] || d).join(", ");

  const head = html`<div class="find-dhead">
    <${Logo} name=${job.co} size="lg" />
    <div class="stack-sm" style="gap:4px; min-width:0">
      <h2 class="find-dtitle">${find_title(job.t)}</h2>
      <div class="row wrap find-dsub"><${find_Meta} parts=${[html`<button type="button" class="find-link find-co" onClick=${() => openCompany(job.co)}>${job.co}</button>`, html`<span class="muted" title=${fmt.dateY(job.p)}>Posted ${find_postedText(job.p).toLowerCase()}</span>`]} />${app && html`<${StageBadge} stage=${app.stage} />`}</div>
    </div>
  </div>`;

  const saved = app && app.stage === "saved";
  const foot = html`
    <a class="btn primary find-apply" href=${job.url} target="_blank" rel="noopener" aria-label=${`Apply on ${job.co}’s site (opens in a new tab)`} onClick=${() => setClicked(true)}><span>Apply<span class="hide-sm"> on company site</span></span><${Icon} name="ext" /></a>
    ${(!app || saved) && html`<${Btn} icon=${saved ? "bookmarkOn" : "bookmark"} cls=${cx(saved && "find-save on")} aria-pressed=${saved ? "true" : "false"} onClick=${() => find_toggleSave(job, app)}>${saved ? "Saved" : "Save"}</${Btn}>`}
    ${(!app || saved) && html`<${Btn} kind="ghost" icon="check" onClick=${() => find_markApplied(job, app)}>Mark as applied</${Btn}>`}
    ${app && !saved && html`<${Btn} iconRight="arrowR" onClick=${() => openApp(app.id)}>Open in pipeline</${Btn}>`}`;

  return html`<${Drawer} onClose=${closeDrawer} label=${`${find_title(job.t)} at ${job.co}`} head=${head} foot=${foot}>
    ${clicked && (!app || saved) && html`<div class="callout info find-applied-q"><${Icon} name="info" /><div class="row wrap" style="flex:1"><span style="flex:1; min-width:160px">Did you apply? Log it and Heardback will remind you to follow up.</span><${Btn} size="sm" onClick=${() => { find_markApplied(job, app); setClicked(false); }}>Mark as applied</${Btn}></div></div>`}

    <section class="dsec" aria-label="Key facts">
      <dl class="kv find-kv">
        <dt>Level</dt><dd>${FIND_LV[job.lvl]}${job.term ? html` <span class="muted">· ${job.term}</span>` : null}</dd>
        <dt>Role</dt><dd>${job.cat}</dd>
        ${locs.length > 0 && html`<dt>${locs.length > 1 ? "Locations" : "Location"}</dt>
          <dd><div class="find-locs">${showLocs.map((l) => html`<span key=${l}>${l}</span>`)}</div>
          ${locs.length > 5 && html`<button type="button" class="find-link find-small" onClick=${() => setAllLocs(!allLocs)}>${allLocs ? "Show fewer" : `Show all ${job.nl || locs.length}`}</button>`}
          ${hiddenMore > 0 && (allLocs || locs.length <= 5) && html`<div class="hint">Plus ${hiddenMore} more on the employer’s page.</div>`}</dd>`}
        ${job.r ? html`<dt>Remote</dt><dd>Remote option listed</dd>` : null}
        ${job.sp && html`<dt>Visa</dt><dd>${find_visaText(job.sp)}</dd>`}
        ${deg && html`<dt>Degrees</dt><dd>${deg}</dd>`}
        <dt>Applies via</dt><dd>${find_atsName(job)}</dd>
      </dl>
    </section>

    <section class="dsec" aria-labelledby="find-gh-h">
      <h3 id="find-gh-h">Listing check</h3>
      <div class=${cx("find-gline", lv)} title=${`${job.g}/100`}><span class=${cx("gscore", lv)} aria-hidden="true"><span class="gbars"><i></i><i></i><i></i></span></span><span>${find_ghostLine(job)}</span></div>
      ${(job.gr || []).length > 0 && html`<ul class="reason-list find-reasons">${job.gr.map((r, i) => html`<li key=${i}>${find_curly(r)}</li>`)}</ul>`}
      ${job.dup ? html`<p class="muted find-small">Also posted ${job.dup === 1 ? "once more" : job.dup === 2 ? "twice more" : `${fmt.num(job.dup)} more times`} with the same title. Shown once.</p>` : null}
      <p class="hint">${job.g ? `Ghost-signal score ${job.g} of 100 (lower is better), from public listing data such as age, reposts and location count.` : "No ghost signals in the public listing data we check, such as age, reposts and location count."} More signals means worth a check, not that the job isn’t real. <button type="button" class="find-link" onClick=${() => openModal("method")}>How we score listings</button></p>
    </section>

    <section class="dsec" aria-labelledby="find-fit-h">
      <h3 id="find-fit-h">Your fit<span class="spacer"></span><${find_FitPill} fit=${fit} sponsor=${profile.needsSponsor} job=${job} /></h3>
      ${fit
        ? html`<ul class="find-fit-list">${fit.parts.map((p) => html`<${find_FitRow} key=${p.k} p=${p} />`)}</ul>
          ${(profile.skills || []).length > 0 && fit.expected.length > 0 && html`<div class="stack-sm">
            <span class="hint">Skills this kind of role usually asks for</span>
            <div class="chips">${fit.matched.map((x) => html`<span class="badge ok" key=${"m" + x}><${Icon} name="check" size=${12} />${x}</span>`)}${fit.missing.map((x) => html`<span class="badge outline" key=${"x" + x}>${x}</span>`)}</div>
          </div>`}
          <p class="hint">From the listing’s title, level and location${!(profile.skills || []).length ? html`. <button type="button" class="find-link" onClick=${() => openModal("resume")}>Add your resume</button> to compare skills.` : "."}</p>`
        : html`<p class="muted find-small">Set target roles and locations to see how this job fits. <button type="button" class="find-link" onClick=${() => { closeDrawer(); go("prefs"); }}>Set preferences</button></p>`}
    </section>

    ${capsNow.sample && html`<${find_AskClaude} job=${job} profile=${profile} />`}

    <section class="dsec" aria-labelledby="find-co-h">
      <h3 id="find-co-h"><span class="truncate">About ${job.co}</span><span class="spacer"></span><button type="button" class="find-link find-h-meta" onClick=${() => openCompany(job.co)}>View company</button></h3>
      ${cs ? html`<div class="find-stats">
        <${find_Stat} label="Open roles" value=${fmt.num(coOpen || cs.open)} />
        <${find_TimeOpenStat} cs=${cs} />
        <${find_Stat} label="Reposted" value=${fmt.pct(find_repostShare(jobs, job.co))} title=${FIND_REPOST_HELP} />
      </div>
      ${season && html`<dl class="kv find-kv find-season-kv"><dt>${season.term}</dt><dd><span><span class="num">${fmt.num(season.open)} of ${fmt.num(season.posted)}</span> postings still open</span>${season.read && html` <span class=${cx("badge", season.tone)}>${season.read}</span>`}</dd></dl>`}` : html`<p class="muted find-small">No company history for this listing yet.</p>`}
    </section>
  </${Drawer}>`;
};

/* ---------- Companies ---------- */
const CO_SORTS = [{ id: "open", label: "Most open roles" }, { id: "hiring", label: "Still hiring" }, { id: "fast", label: "Fastest to close" }, { id: "ghost", label: "Most likely real" }, { id: "az", label: "A–Z" }];
const find_openN = (jobsState, name, c) => (jobsState.byCompany.get(name) || []).length || c.open || 0;
const find_stillShare = (c) => (c.season && c.season.posted ? c.season.open / c.season.posted : null);
/* One definition of "Reposted", used by the Companies table and both drawers:
   share of a company's open roles (as listed in Find) whose title it posted and closed before. */
const FIND_REPOST_HELP = "Share of this company’s open roles whose title it posted and closed at least once before. Grey under 20%, amber from 20%, red from 50%. Not proof either way.";
/* Per-company figures from the listings Find shows (deduped), so every count on screen agrees. */
const find_aggC = { jobs: null, m: null };
function find_coAgg(jobsState) {
  if (find_aggC.jobs !== jobsState.jobs) {
    const m = new Map();
    for (const [co, list] of jobsState.byCompany) {
      let r = 0, ni = 0; for (const j of list) { if (j.rp >= 1) r++; if (j.lvl === "intern") ni++; }
      m.set(co, { n: list.length, rep: list.length ? r / list.length : 0, ni, ng: list.length - ni });
    }
    find_aggC.jobs = jobsState.jobs; find_aggC.m = m;
  }
  return find_aggC.m;
}
const find_repostShare = (jobsState, name) => find_coAgg(jobsState).get(name)?.rep ?? jobsState.cstats[name]?.repostShare ?? 0;
const find_repTone = (r) => (r >= 0.5 ? "high" : r >= 0.2 ? "mid" : "");
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
  const agg = ready ? find_coAgg(jobs) : null;
  const rs = { get: (name) => agg?.get(name)?.rep };
  const list = useMemo(() => {
    if (!ready) return [];
    const words = norm(q).split(" ").filter(Boolean);
    let arr = Object.entries(jobs.cstats).map(([name, c]) => ({ name, c, k: norm(name), open: find_openN(jobs, name, c) }));
    if (words.length) arr = arr.filter((x) => words.every((w) => x.k.includes(w)));
    const by = {
      open: (a, b) => b.open - a.open || a.name.localeCompare(b.name),
      hiring: (a, b) => (find_stillShare(b.c) ?? -1) - (find_stillShare(a.c) ?? -1) || (b.c.season?.open || 0) - (a.c.season?.open || 0),
      fast: (a, b) => (a.c.medOpenDays ?? 1e9) - (b.c.medOpenDays ?? 1e9) || b.open - a.open,
      ghost: (a, b) => (rs.get(a.name) ?? 0) - (rs.get(b.name) ?? 0) || a.c.avgGhost - b.c.avgGhost || b.open - a.open,
      az: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    }[sort];
    return arr.sort(by);
  }, [ready, jobs.cstats, q, sort]);
  useEffect(() => setShown(50), [q, sort]);

  const head = html`<div class="page-head"><div><h1>Companies</h1><p>${ready ? html`<span class="num">${fmt.num(Object.keys(jobs.cstats).length)}</span> companies with open internship or new-grad roles, and how their listings usually behave.` : "Companies hiring interns and new grads, with how long their listings usually stay open."}</p></div></div>`;
  if (!ready) {
    return html`<div class="page">${head}${jobs.status === "error"
      ? html`<div class="card"><${Empty} icon="alert" title="Couldn’t load company data" action=${html`<${Btn} kind="primary" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}>`}>The listings file didn’t load (${jobs.error || "unknown error"}). Check your connection and try again.</${Empty}></div>`
      : html`<div class="card"><${Skeleton} rows=${10} /></div>`}</div>`;
  }
  const rows = list.slice(0, shown);
  const anyApps = list.some((x) => appsBy.get(x.k));
  const lifetime = (c) => find_daysText(c.medOpenDays) || html`<span class="faint">Not enough data</span>`;
  return html`<div class="page">
    ${head}
    <div class="find-toolbar find-co-toolbar">
      <div class="input-icon find-search"><${Icon} name="search" /><input id="co-q" class="input" type="search" placeholder="Search companies" value=${qIn} onInput=${(e) => setQIn(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === "Escape" && qIn) { e.stopPropagation(); setQIn(""); } }} aria-label="Search companies" autocomplete="off" />${qIn && html`<${Btn} kind="ghost" size="sm" icon="x" cls="find-qclear" aria-label="Clear search" onClick=${() => { setQIn(""); setQ(""); document.getElementById("co-q")?.focus(); }} />`}</div>
      <div class="hide-sm"><${Seg} label="Sort companies" value=${sort} options=${CO_SORTS} onChange=${setSort} /></div>
      <select id="co-sort-sm" class="select show-sm find-sort-sm" aria-label="Sort companies" value=${sort} onChange=${(e) => setSort(e.currentTarget.value)}>${CO_SORTS.map((o) => html`<option key=${o.id} value=${o.id}>${o.label}</option>`)}</select>
    </div>
    ${!list.length ? html`<div class="card"><${Empty} icon="companies" title=${`No companies match “${q}”`} action=${html`<${Btn} onClick=${() => { setQIn(""); setQ(""); }}>Clear search</${Btn}>`}>Only companies with at least one open internship or new-grad listing are here.</${Empty}></div>` : html`
    <div class="card hide-sm">
      <table class="table find-cotable">
        <thead><tr>
          <th>Company</th><th class="r">Open roles</th><th>Intern / new grad</th><th class="r" title="Median days a closed listing stayed open"><span class="find-th-help">Typical time open<${Icon} name="info" size=${12} /></span></th><th class="r" title="Share of this season’s internship postings still open"><span class="find-th-help">Still hiring<${Icon} name="info" size=${12} /></span></th><th class="r" title=${FIND_REPOST_HELP}><span class="find-th-help">Reposted<${Icon} name="info" size=${12} /></span></th>${anyApps && html`<th class="r">Your apps</th>`}
        </tr></thead>
        <tbody>${rows.map((x) => {
          const n = appsBy.get(x.k) || 0;
          const g = rs.get(x.name) ?? 0;
          return html`<tr key=${x.name} tabindex="0" onClick=${() => openCompany(x.name)} onKeyDown=${(e) => { if (e.key === "Enter") openCompany(x.name); }}>
            <td><div class="row"><${Logo} name=${x.name} size="sm" /><span class="truncate find-coname">${x.name}</span></div></td>
            <td class="r num">${fmt.num(x.open)}</td>
            ${(() => { const a = agg.get(x.name) || { n: x.c.open, ni: x.c.intern, ng: x.c.newgrad }; return html`<td><div class="find-split" title=${`${pluralize(a.ni, "internship")} · ${a.ng} new grad`}><span class="find-split-bar"><i style=${`width:${a.n ? (a.ni / a.n) * 100 : 0}%`}></i></span><span class="num muted">${fmt.num(a.ni)} / ${fmt.num(a.ng)}</span></div></td>`; })()}
            <td class="r num">${lifetime(x.c)}</td>
            <td class="r num">${find_stillShare(x.c) != null ? html`<span title=${`${x.c.season.open} of ${x.c.season.posted} ${x.c.season.term} postings open`}>${fmt.pct(find_stillShare(x.c))}</span>` : html`<span class="faint">–</span>`}</td>
            <td class="r num"><span class=${cx("find-gshare", find_repTone(g))}>${fmt.pct(g)}</span></td>
            ${anyApps && html`<td class="r num">${n ? html`<span class="badge accent" title=${pluralize(n, "application")}>${n}</span>` : null}</td>`}
          </tr>`;
        })}</tbody>
      </table>
    </div>
    <div class="card show-sm"><div class="list">${rows.map((x) => {
      const n = appsBy.get(x.k) || 0;
      return html`<button type="button" class="find-corow" key=${x.name} onClick=${() => openCompany(x.name)}>
        <${Logo} name=${x.name} />
        <div class="find-row-main"><span class="find-row-title">${x.name}</span><${find_Meta} cls="find-row-meta" parts=${[pluralize(x.open, "open role"), x.c.medOpenDays != null ? `usually open ${find_daysText(x.c.medOpenDays)}` : "", (rs.get(x.name) ?? 0) >= 0.2 ? `${fmt.pct(rs.get(x.name))} reposted` : ""]} /></div>
        ${n ? html`<span class="badge accent">${n}</span>` : html`<${Icon} name="chevR" cls="faint" />`}
      </button>`;
    })}</div></div>
    <div class="find-more">
      ${shown < list.length && html`<${Btn} onClick=${() => setShown((n) => n + 50)}>Show ${Math.min(50, list.length - shown)} more</${Btn}>`}
      <span class="faint num">Showing ${fmt.num(Math.min(shown, list.length))} of ${fmt.num(list.length)}</span>
    </div>`}
    <p class="footer-note">From public listing history (SimplifyJobs). Hover a column heading to see how it’s calculated.</p>
  </div>`;
};

/* ---------- DRAWERS.company ---------- */
function find_Stat({ label, value, sub, title }) {
  return html`<div class="find-stat" title=${title || null}>
    <span class="stat-label">${label}</span>
    <span class="find-stat-v num">${value}</span>
    ${sub && html`<span class="stat-sub">${sub}</span>`}
  </div>`;
}
function find_TimeOpenStat({ cs }) {
  const nClosed = cs?.closedTimed || 0;
  const fromClosed = nClosed ? `From ${pluralize(nClosed, "closed listing")}` : "";
  return html`<${find_Stat} label="Typical time open" value=${find_daysText(cs.medOpenDays) || html`<span class="faint" aria-hidden="true">—</span><span class="sr">Not enough data</span>`} title=${cs.medOpenDays != null ? `Median days a closed listing stayed open. ${fromClosed}.` : "Needs at least 5 closed listings with dates."} />`;
}
function find_BriefText({ text }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•*]\s+/.test(l));
  if (bullets.length >= 2 && bullets.length >= lines.length - 1) {
    const intro = lines.filter((l) => !/^[-•*]\s+/.test(l));
    return html`<div class="find-brief">${intro.map((l, i) => html`<p key=${"p" + i}>${l}</p>`)}<ul class="reason-list find-reasons">${bullets.map((l, i) => html`<li key=${i}>${l.replace(/^[-•*]\s+/, "")}</li>`)}</ul></div>`;
  }
  return html`<div class="find-brief find-brief-pre">${text}</div>`;
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
  return html`<section class="dsec" aria-labelledby="find-brief-h">
    <h3 id="find-brief-h">Company overview<span class="spacer"></span>${!st.busy && text && html`<${Btn} kind="ghost" size="sm" icon="refresh" onClick=${go}>Refresh</${Btn}>`}</h3>
    ${st.busy && html`<${find_Thinking} onStop=${stop} text=${st.partial ? "Writing…" : "Thinking…"} />`}
    ${text ? html`<${find_BriefText} text=${text} />` : !st.busy && html`<div class="row wrap find-brief-cta"><${Btn} icon="spark" onClick=${go}>Brief me on this company</${Btn}><span class="hint">From Claude’s general knowledge.</span></div>`}
    ${st.err && html`<div class="callout wait"><${Icon} name="alert" /><span>${st.err}</span></div>`}
    ${text && html`<span class="ai-label"><${Icon} name="spark" />Drafted by Claude from general knowledge · may be out of date · verify before relying on it.${fresh && !st.out && !st.busy ? ` Saved ${fmt.ago(fresh.at)}.` : ""}</span>`}
  </section>`;
}

const FIND_CO_ROLE_SORTS = [{ id: "fit", label: "Best fit" }, { id: "new", label: "Newest" }];
DRAWERS.company = ({ id }) => {
  const jobs = useJobs();
  const capsNow = useCaps();
  const s = useStore();
  const byJob = find_useAppsByJob();
  const [allRoles, setAllRoles] = useState(false);
  const [roleSort, setRoleSort] = useState(null);
  const name = id;
  const cs = jobs.cstats[name];
  const open = jobs.byCompany.get(name) || [];
  const myApps = Apps.list(s).filter((a) => norm(a.company) === norm(name)).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  const loading = jobs.status !== "ready" && jobs.status !== "error";
  const nOpen = cs ? find_openN(jobs, name, cs) : open.length;

  const head = html`<div class="find-dhead">
    <${Logo} name=${name} size="lg" />
    <div class="stack-sm" style="gap:4px; min-width:0">
      <h2 class="find-dtitle">${name}</h2>
      <div class="row wrap find-dsub find-dsub-co">
        ${(() => {
          const ni = open.filter((j) => j.lvl === "intern").length, ng = open.length - ni;
          const lead = cs || open.length ? html`<span class="muted">${pluralize(nOpen, "open role")}</span>` : html`<span class="muted">${loading ? "Loading…" : "No open listings right now"}</span>`;
          return html`<${find_Meta} parts=${[lead, ni && ng ? html`<span class="muted">${fmt.num(ni)} internship, ${fmt.num(ng)} new grad</span>` : null, cs?.site ? html`<a href=${cs.site} target="_blank" rel="noopener" class="find-ext">Profile on Simplify<${Icon} name="ext" size=${13} /></a>` : null]} />`;
        })()}
      </div>
    </div>
  </div>`;

  // Best fit first when the profile yields a fit score; the toggle switches to newest.
  const canFit = open.length > 1 && !!find_fit(open[0], s.profile);
  const rSort = canFit ? roleSort || "fit" : "new";
  const sorted = useMemo(() => (rSort === "fit" ? find_sort(open, "fit", s.profile) : [...open].sort((a, b) => b.p - a.p)), [open, rSort, s.profile]);
  const roles = allRoles ? sorted : sorted.slice(0, 8);
  const hiMin = useMemo(() => (canFit ? find_hiMin(open, s.profile) : 101), [open, canFit, s.profile]);
  const season = find_season(cs);
  return html`<${Drawer} onClose=${closeDrawer} label=${name} head=${head}>
    ${loading && html`<${Skeleton} rows=${4} />`}
    ${cs && html`<section class="dsec" aria-labelledby="find-cs-h">
      <h3 id="find-cs-h">Listing history</h3>
      <div class="find-stats">
        <${find_TimeOpenStat} cs=${cs} />
        <${find_Stat} label="Reposted" value=${fmt.pct(find_repostShare(jobs, name))} title=${FIND_REPOST_HELP} />
        <${find_Stat} label="New in 30 days" value=${cs.new30 != null ? fmt.num(cs.new30) : "—"} title="Postings added in the last 30 days, open or closed." />
      </div>
      <details class="find-details">
        <summary>How these are calculated</summary>
        <div class="find-details-body"><p>From public SimplifyJobs listing history. Typical time open is the median for closed listings that stayed up at least a day${cs.closedTimed ? ` (${pluralize(cs.closedTimed, "listing")} here)` : ""}; listings still open aren’t counted, so it may run short. Reposted is the share of open roles whose title was posted and closed before. The data starts in March 2026${cs.first ? `; this company first appears ${fmt.date(cs.first * 1000, { month: "short", year: "numeric" })}` : ""}.</p></div>
      </details>
    </section>`}

    ${season && html`<section class="dsec" aria-labelledby="find-season-h">
      <h3 id="find-season-h">${season.term} hiring<span class="spacer"></span>${season.read && html`<span class=${cx("badge", season.tone)}>${season.read}</span>`}</h3>
      <div class="find-season-nums">
        <span><strong class="num">${fmt.num(season.open)}</strong> <span class="muted">of</span> <strong class="num">${fmt.num(season.posted)}</strong> <span class="muted">internship postings still open</span></span>
        ${season.lastNew && html`<span class="muted">Last new posting <span class="num">${fmt.ago(season.lastNew * 1000)}</span></span>`}
      </div>
      <${Meter} value=${season.open} max=${season.posted} />
    </section>`}

    ${typeof PoolCompanyCard === "function" ? html`<${PoolCompanyCard} company=${name} />` : null}

    ${myApps.length > 0 && html`<section class="dsec" aria-labelledby="find-my-h">
      <h3 id="find-my-h">Your applications <span class="count">${myApps.length}</span></h3>
      <div class="list find-dlist">${myApps.map((a) => html`<button type="button" class="find-applink" key=${a.id} onClick=${() => openApp(a.id)}>
          <div class="find-row-main"><span class="find-row-title">${a.title || "Untitled role"}</span><${find_Meta} cls="find-row-meta" parts=${[a.appliedAt ? `Applied ${fmt.date(a.appliedAt)}` : `Saved ${fmt.date(a.createdAt)}`, a.location]} /></div>
          <${StageBadge} stage=${a.stage} /><${Icon} name="chevR" cls="faint" />
        </button>`)}</div>
    </section>`}

    ${capsNow.sample && html`<${find_Brief} name=${name} cs=${cs} />`}

    ${(open.length > 0 || !loading) && html`<section class="dsec" aria-labelledby="find-open-h">
      <h3 id="find-open-h">Roles <span class="count">${fmt.num(open.length)}</span>${canFit && html`<span class="spacer"></span><${Seg} label="Sort roles" value=${rSort} options=${FIND_CO_ROLE_SORTS} onChange=${setRoleSort} />`}</h3>
      ${open.length
        ? html`<div class="find-dlist find-results-tight"><div class="list" role="list">${roles.map((j, i) => html`<${find_Row} key=${j.id} job=${j} app=${byJob.get(j.id)} profile=${s.profile} i=${i} inCompany hiMin=${hiMin} />`)}</div></div>
          ${open.length > 8 && html`<div><${Btn} size="sm" onClick=${() => setAllRoles(!allRoles)}>${allRoles ? "Show fewer" : `Show all ${fmt.num(open.length)}`}</${Btn}></div>`}`
        : html`<p class="muted find-small">No open internship or new-grad listings right now.</p>`}
    </section>`}
  </${Drawer}>`;
};
