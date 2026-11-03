/* ===== Heardback core: rendering, store, persistence, utilities ===== */
const { h, render, Fragment } = preact;
const { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } = preactHooks;
const html = htm.bind(h);

const DAY = 86400000;
const now = () => Date.now();
const uid = (p = "") => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cx = (...a) => a.filter(Boolean).join(" ");
const pluralize = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;

/* ---------- Dates ---------- */
const fmt = {
  ago(ts) {
    if (!ts) return "";
    const s = Math.max(0, (now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    const d = Math.floor(s / 86400);
    if (d < 30) return `${d}d ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  },
  days(ts) { return Math.floor((now() - ts) / DAY); },
  date(ts, opts) { return ts ? new Date(ts).toLocaleDateString(undefined, opts || { month: "short", day: "numeric" }) : ""; },
  dateY(ts) { return ts ? new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""; },
  time(ts) { return ts ? new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""; },
  dateTime(ts) { return ts ? `${fmt.date(ts, { weekday: "short", month: "short", day: "numeric" })} · ${fmt.time(ts)}` : ""; },
  until(ts) {
    const d = ts - now();
    if (d < 0) return fmt.ago(ts);
    const m = d / 60000;
    if (m < 60) return `in ${Math.max(1, Math.round(m))}m`;
    if (m < 1440) return `in ${Math.round(m / 60)}h`;
    const days = Math.round(m / 1440);
    return days === 1 ? "tomorrow" : `in ${days} days`;
  },
  pct(x, digits = 0) { return x == null || isNaN(x) ? "—" : `${(x * 100).toFixed(digits)}%`; },
  num(n) { return n == null ? "—" : n.toLocaleString(); },
  dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); },
  toInput(ts) { if (!ts) return ""; const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; },
  toDateInput(ts) { if (!ts) return ""; const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; },
  fromInput(v) { const t = new Date(v).getTime(); return isNaN(t) ? null : t; },
};

/* ---------- Safe storage ---------- */
const storage = {
  get(k, fallback) {
    let v = null;
    try { v = localStorage.getItem(k); } catch { return fallback; }
    if (v == null) return fallback;
    try { return JSON.parse(v); }
    catch { try { localStorage.setItem(`${k}:corrupt:${Date.now()}`, v); } catch {} storage.corrupt = true; return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ---------- Visits: "new since your last visit" ---------- */
const visit = (() => {
  const prev = storage.get("heardback:lastVisit", null);
  const t = Date.now();
  // A visit is a session that starts 30+ minutes after the last activity.
  const since = prev && t - prev.last > 30 * 60000 ? prev.last : (prev && prev.since) || null;
  storage.set("heardback:lastVisit", { last: t, since });
  setInterval(() => storage.set("heardback:lastVisit", { last: Date.now(), since }), 60000);
  return { since };
})();

/* ---------- Stages ---------- */
const STAGES = [
  { id: "saved", label: "Saved", short: "Saved" },
  { id: "applied", label: "Applied", short: "Applied" },
  { id: "screen", label: "Screen", short: "Screen" },
  { id: "interview", label: "Interviews", short: "Interview" },
  { id: "offer", label: "Offer", short: "Offer" },
  { id: "rejected", label: "Rejected", short: "Rejected" },
  { id: "ghosted", label: "Ghosted", short: "Ghosted" },
];
const STAGE = Object.fromEntries(STAGES.map((s, i) => [s.id, { ...s, i }]));
const ACTIVE_STAGES = ["applied", "screen", "interview"];
const ROUND_TYPES = [
  { id: "recruiter", label: "Recruiter call" },
  { id: "assessment", label: "Online assessment" },
  { id: "technical", label: "Technical" },
  { id: "behavioral", label: "Behavioral" },
  { id: "case", label: "Case" },
  { id: "onsite", label: "Onsite / Final" },
  { id: "other", label: "Interview" },
];
const ROUND = Object.fromEntries(ROUND_TYPES.map((r) => [r.id, r]));
/* How a round reads inside a sentence: "your technical interview", "the recruiter call", "the online assessment" */
const ROUND_NOUN = { recruiter: "recruiter call", assessment: "online assessment", technical: "technical interview", behavioral: "behavioral interview", case: "case interview", onsite: "final round", other: "interview" };
function roundNoun(r) { return ROUND_NOUN[r?.type] || "interview"; }
function roundPeople(r) { if (!r?.interviewers || r.type === "assessment") return ""; return r.interviewers.replace(/\s*\([^)]*\)/g, "").trim(); }
function roundTitle(r) { const n = roundNoun(r); return n[0].toUpperCase() + n.slice(1); }
const CATS = ["Software", "Data & AI", "Product", "Quant", "Hardware"];
const LEVELS = [{ id: "intern", label: "Internship" }, { id: "newgrad", label: "New grad" }];

/* ---------- Store ---------- */
const STORE_KEY = "heardback:v1";
const defaultState = () => ({
  v: 1,
  profile: { roles: [], levels: ["intern", "newgrad"], locations: [], remote: true, needsSponsor: false, resume: "", skills: [], onboarded: false, name: "", weeklyGoal: 10, degree: "BS" },
  apps: {},
  settings: { theme: "system", followUpDays: 7, ghostDays: 21, shareAnon: false, showExamples: true, hideGhostAbove: 0 },
  dismissed: {},
  ui: { pipelineView: "board", findSort: "new" },
});

/* ---------- Validation: never let a bad record crash the app ---------- */
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const strArr = (x) => (Array.isArray(x) ? x : typeof x === "string" && x ? [x] : []).filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()).slice(0, 200);
const numOr = (x, d) => (typeof x === "number" && isFinite(x) ? x : typeof x === "string" && x.trim() && isFinite(+x) ? +x : d);
const strOr = (x, d = "") => (typeof x === "string" ? x : x == null ? d : String(x));
function cleanProfile(p) {
  const d = defaultState().profile;
  if (!isObj(p)) return d;
  return {
    ...d,
    roles: strArr(p.roles), levels: strArr(p.levels).filter((l) => l === "intern" || l === "newgrad"), locations: strArr(p.locations), skills: strArr(p.skills),
    remote: p.remote == null ? d.remote : !!p.remote, needsSponsor: !!p.needsSponsor, onboarded: !!p.onboarded,
    resume: strOr(p.resume).slice(0, 60000), name: strOr(p.name).slice(0, 80), weeklyGoal: clamp(Math.round(numOr(p.weeklyGoal, d.weeklyGoal)), 1, 100),
    degree: ["AS", "BS", "MS", "PhD"].includes(p.degree) ? p.degree : "BS",
  };
}
function cleanSettings(x) {
  const d = defaultState().settings;
  if (!isObj(x)) return d;
  return { ...d, ...x, theme: ["system", "light", "dark"].includes(x.theme) ? x.theme : "system", followUpDays: clamp(Math.round(numOr(x.followUpDays, 7)), 1, 60), ghostDays: clamp(Math.round(numOr(x.ghostDays, 21)), 2, 120), shareAnon: !!x.shareAnon, showExamples: x.showExamples !== false };
}
function cleanApp(a, id) {
  if (!isObj(a)) return null;
  const company = strOr(a.company).trim(); const title = strOr(a.title).trim();
  if (!company && !title) return null;
  const t = now();
  const ts = (v) => { const n = numOr(v, null); return n && n > 946684800000 && n < t + 5 * 365 * DAY ? n : null; };
  const created = ts(a.createdAt) || t;
  return {
    id: strOr(a.id || id) || uid("a_"), company: company || "Unknown company", title, location: strOr(a.location), url: strOr(a.url), jobId: a.jobId ? strOr(a.jobId) : null,
    stage: STAGE[a.stage] ? a.stage : "applied", createdAt: created, appliedAt: ts(a.appliedAt), lastActivityAt: ts(a.lastActivityAt) || created, lastReplyAt: ts(a.lastReplyAt), followedUpAt: ts(a.followedUpAt),
    notes: strOr(a.notes), salary: strOr(a.salary), source: strOr(a.source || "manual"), example: !!a.example,
    contacts: (Array.isArray(a.contacts) ? a.contacts : []).filter(isObj).map((c) => ({ name: strOr(c.name), role: strOr(c.role), email: strOr(c.email) })),
    rounds: (Array.isArray(a.rounds) ? a.rounds : []).filter(isObj).map((r) => ({ ...r, id: strOr(r.id) || uid("r_"), type: ROUND[r.type] ? r.type : "other", at: ts(r.at), interviewers: strOr(r.interviewers), ...(r.where ? { where: strOr(r.where) } : {}), prep: strOr(r.prep), reflection: strOr(r.reflection), outcome: ["pending", "passed", "failed", "cancelled"].includes(r.outcome) ? r.outcome : "pending", thanked: !!r.thanked })),
    events: (Array.isArray(a.events) ? a.events : []).filter(isObj).map((e) => ({ ...e, id: strOr(e.id) || uid("e_"), at: ts(e.at) || created, kind: strOr(e.kind || "note"), text: strOr(e.text), from: STAGE[e.from] ? e.from : undefined, to: STAGE[e.to] ? e.to : undefined })),
  };
}
function cleanApps(apps) {
  const list = Array.isArray(apps) ? apps : isObj(apps) ? Object.entries(apps).map(([k, a]) => (isObj(a) ? { id: k, ...a } : a)) : [];
  const out = {};
  for (const a of list) { const c = cleanApp(a); if (c) out[c.id] = c; }
  return out;
}
function loadState() {
  const s = storage.get(STORE_KEY, null);
  const d = defaultState();
  if (!isObj(s)) return d;
  return {
    ...d, ...s, v: 1,
    profile: cleanProfile(s.profile),
    settings: cleanSettings(s.settings),
    ui: isObj(s.ui) ? { ...d.ui, ...s.ui } : d.ui,
    apps: cleanApps(s.apps),
    dismissed: isObj(s.dismissed) ? s.dismissed : {},
  };
}

const store = {
  state: loadState(),
  subs: new Set(),
  saveTimer: null,
  get() { return this.state; },
  set(fn) {
    const next = typeof fn === "function" ? fn(this.state) : { ...this.state, ...fn };
    if (next === this.state) return;
    this.state = next;
    this.subs.forEach((f) => f(next));
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 150);
  },
  saveFailedAt: 0,
  save() {
    clearTimeout(this.saveTimer);
    if (!storage.set(STORE_KEY, this.state) && now() - this.saveFailedAt > 60000) {
      this.saveFailedAt = now();
      toast("Couldn't save your changes on this device. Export a backup from Settings.", { ms: 9000 });
    }
  },
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
};
/* Pending edits (debounced inputs) register a flush so nothing is lost on close or reload */
const flushers = new Set();
function onFlush(fn) { flushers.add(fn); return () => flushers.delete(fn); }
function flushAll() { flushers.forEach((f) => { try { f(); } catch {} }); store.save(); }
window.addEventListener("pagehide", flushAll);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushAll(); });
function useStore(sel = (s) => s) {
  const [v, setV] = useState(() => sel(store.get()));
  const selRef = useRef(sel); selRef.current = sel;
  useEffect(() => store.sub((s) => setV(selRef.current(s))), []);
  return v;
}

/* ---------- App (application) operations ---------- */
const Apps = {
  list(s = store.get()) { return Object.values(s.apps).filter((a) => s.settings.showExamples || !a.example); },
  get(id) { return store.get().apps[id]; },
  create(fields) {
    const t = now();
    const a = {
      id: uid("a_"), company: "", title: "", location: "", url: "", jobId: null, stage: "saved",
      createdAt: t, appliedAt: null, lastActivityAt: t, lastReplyAt: null, notes: "", contacts: [], rounds: [],
      events: [], salary: "", source: "manual", example: false, ...fields,
    };
    if (!a.events.length) a.events = [{ id: uid("e_"), at: t, kind: "created", text: a.stage === "saved" ? "Saved" : `Added as ${STAGE[a.stage]?.label || a.stage}` }];
    if (a.stage !== "saved" && !a.appliedAt) a.appliedAt = fields.appliedAt || t;
    if (["screen", "interview", "offer", "rejected"].includes(a.stage) && !a.lastReplyAt) a.lastReplyAt = t;
    store.set((s) => ({ ...s, apps: { ...s.apps, [a.id]: a } }));
    return a;
  },
  update(id, patch) {
    store.set((s) => {
      const a = s.apps[id]; if (!a) return s;
      const p = typeof patch === "function" ? patch(a) : patch;
      return { ...s, apps: { ...s.apps, [id]: { ...a, ...p } } };
    });
  },
  move(id, stage, opts = {}) {
    const a = Apps.get(id); if (!a || a.stage === stage) return;
    const t = opts.at || now();
    const ev = { id: uid("e_"), at: t, kind: "stage", from: a.stage, to: stage, text: `Moved to ${STAGE[stage].label}` };
    const patch = { stage, lastActivityAt: t, events: [...a.events, ev] };
    if (stage !== "saved" && !a.appliedAt) patch.appliedAt = t;
    if (["screen", "interview", "offer", "rejected"].includes(stage) && STAGE[a.stage].i < STAGE[stage].i) patch.lastReplyAt = t;
    Apps.update(id, patch);
    if (stage === "offer" && !opts.silent) celebrate(a);
    if (!opts.silent) toast(`${a.company} moved to ${STAGE[stage].label}${stage === "applied" && !a.appliedAt ? " (applied today)" : ""}`, { undo: () => Apps.update(id, a), ...(stage === "applied" && !a.appliedAt ? { action: { label: "Change date", run: () => openApp(id, "overview") } } : {}) });
  },
  moveMany(ids, stage) {
    const t = now(); const before = {};
    store.set((s) => {
      const apps = { ...s.apps };
      for (const id of ids) {
        const a = apps[id]; if (!a || a.stage === stage) continue;
        before[id] = a;
        const ev = { id: uid("e_"), at: t, kind: "stage", from: a.stage, to: stage, text: `Moved to ${STAGE[stage].label}` };
        apps[id] = { ...a, stage, lastActivityAt: t, events: [...a.events, ev], ...(stage !== "saved" && !a.appliedAt ? { appliedAt: t } : {}) };
      }
      return { ...s, apps };
    });
    const n = Object.keys(before).length;
    if (n) toast(`Moved ${pluralize(n, "application")} to ${STAGE[stage].label}`, { undo: () => store.set((s) => ({ ...s, apps: { ...s.apps, ...before } })) });
    return n;
  },
  remove(id) {
    const a = Apps.get(id);
    store.set((s) => { const apps = { ...s.apps }; delete apps[id]; return { ...s, apps }; });
    toast(`Removed ${a?.company || "application"}`, { undo: () => store.set((s) => ({ ...s, apps: { ...s.apps, [id]: a } })) });
  },
  addEvent(id, ev) { Apps.update(id, (a) => ({ events: [...a.events, { id: uid("e_"), at: now(), ...ev }], lastActivityAt: ev.at || now() })); },
  addRound(id, round) {
    const r = { id: uid("r_"), type: "recruiter", at: null, interviewers: "", prep: "", reflection: "", outcome: "pending", thanked: false, ...round };
    Apps.update(id, (a) => ({ rounds: [...a.rounds, r], lastActivityAt: now(), events: [...a.events, { id: uid("e_"), at: now(), kind: "round", text: `Added ${ROUND[r.type]?.label || "round"}${r.at ? " · " + fmt.dateTime(r.at) : ""}` }] }));
    return r;
  },
  updateRound(id, rid, patch) { Apps.update(id, (a) => ({ rounds: a.rounds.map((r) => (r.id === rid ? { ...r, ...patch } : r)) })); },
  removeRound(id, rid) { Apps.update(id, (a) => ({ rounds: a.rounds.filter((r) => r.id !== rid) })); },
  byJob(jobId) { return Object.values(store.get().apps).find((a) => a.jobId === jobId); },
  daysSilent(a) {
    const t = now();
    if ((a.rounds || []).some((r) => r.at && r.at > t)) return 0;
    const lastRound = (a.rounds || []).reduce((m, r) => (r.at && r.at <= t && r.at > m ? r.at : m), 0);
    const ref = Math.max(a.lastReplyAt || 0, a.appliedAt || 0, lastRound) || a.createdAt || 0;
    return ref ? Math.max(0, Math.floor((t - ref) / DAY)) : 0;
  },
};

/* ---------- Router (plain #name hashes only) ---------- */
const ROUTES = ["today", "find", "pipeline", "companies", "prep", "stats", "prefs"];
function currentRoute() { const h = (location.hash || "").slice(1); return ROUTES.includes(h) ? h : "today"; }
function go(r) { if (location.hash.slice(1) !== r) location.hash = r; else window.dispatchEvent(new HashChangeEvent("hashchange")); }
function useRoute() {
  const [r, setR] = useState(currentRoute());
  useEffect(() => { const f = () => setR(currentRoute()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return r;
}

/* ---------- Global UI bus (drawers, modals, palette) ---------- */
const ui = {
  state: { drawer: null, modal: null, palette: false, toasts: [], celebrate: null, menu: null },
  subs: new Set(),
  set(p) { this.state = { ...this.state, ...(typeof p === "function" ? p(this.state) : p) }; this.subs.forEach((f) => f(this.state)); },
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
};
function useUI() { const [v, setV] = useState(ui.state); useEffect(() => ui.sub(setV), []); return v; }
const openJob = (jobId) => ui.set({ drawer: { kind: "job", id: jobId } });
const openApp = (appId, tab) => ui.set({ drawer: { kind: "app", id: appId, tab } });
const openCompany = (name) => ui.set({ drawer: { kind: "company", id: name } });
const openModal = (kind, props = {}) => ui.set({ modal: { ...props, __kind: kind } });
const closeDrawer = () => ui.set({ drawer: null });
const closeModal = () => ui.set({ modal: null });

function toast(text, opts = {}) {
  const id = uid("t");
  ui.set((s) => ({ toasts: [...s.toasts.slice(-1), { id, text, ...opts }] }));
  setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), opts.ms || 4200);
}
function celebrate(app) {
  ui.set({ celebrate: { company: app.company, title: app.title } });
  setTimeout(() => ui.set({ celebrate: null }), 2600);
}

/* ---------- Theme ---------- */
function applyTheme(t) {
  const root = document.documentElement;
  if (t === "light" || t === "dark") root.setAttribute("data-theme", t); else root.removeAttribute("data-theme");
}

/* ---------- Capabilities (design for absence) ---------- */
const caps = { sample: null, db: null, user: null, downloads: null, mcp: null, ready: false };
const capSubs = new Set();
function useCaps() { const [v, setV] = useState({ ...caps }); useEffect(() => { const f = () => setV({ ...caps }); capSubs.add(f); f(); return () => capSubs.delete(f); }, []); return v; }
async function initCaps() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { caps.ready = true; capSubs.forEach((f) => f()); return; }
  const grab = async (n) => { try { return await c.use(n); } catch { return null; } };
  const [sample, db, user, downloads, mcp] = await Promise.all([grab("sample"), grab("db"), grab("user"), grab("downloads"), grab("mcp")]);
  Object.assign(caps, { sample, db, user, downloads, mcp, ready: true });
  capSubs.forEach((f) => f());
}
const AI_COPY = {
  not_granted: "Claude isn't allowed for this page. You can allow it from the page's permissions menu.",
  sampling_disabled: "Claude isn't available on this account.",
  rate_limited: "Claude is busy or you've hit a usage limit. Try again in a minute.",
  session_expired: "Sign in to claude.ai again to use Claude here.",
  refused: "Claude couldn't help with that text. Try editing it.",
  invalid_json: "Claude's answer came back in an unexpected shape. Try again.",
  upstream_error: "The connection to Claude dropped. Try again.",
};
const aiErr = (e) => AI_COPY[e?.code] || "Claude couldn't finish that. Try again.";
async function askClaude(prompt, opts = {}) {
  if (!caps.sample) throw { code: "unavailable" };
  return caps.sample(prompt, opts);
}
async function askClaudeJSON(prompt, opts = {}) {
  if (!caps.sample) throw { code: "unavailable" };
  return caps.sample.json(prompt, opts);
}

/* ---------- Copy / download helpers ---------- */
async function copyText(text, label = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(label); return true; }
  catch { toast("Couldn't copy automatically. Select the text and copy it."); return false; }
}
async function saveFile(filename, data, mime = "text/plain") {
  if (caps.downloads) {
    try { await caps.downloads.save({ filename, data: typeof data === "string" ? new Blob([data], { type: mime }) : data }); toast(`Saved ${filename}`); return true; }
    catch (e) { if (e?.code === "cancelled" || e?.code === "declined") return false; }
  }
  if (typeof data !== "string") { toast("Saving files isn't available here. Right-click or long-press the image to save it.", { ms: 7000 }); return false; }
  return copyText(data, "Saving files isn't available here, so the contents were copied instead");
}

/* ---------- Text helpers ---------- */
function initials(name = "") {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((x) => /^[A-Za-z0-9]/.test(x));
  if (!w.length) return "·";
  return (w.length === 1 ? w[0][0] : w[0][0] + w[1][0]).toUpperCase();
}
function hashHue(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 360; }
function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ").trim(); }
function csvEscape(v) { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
