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
  get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

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
  { id: "technical", label: "Technical" },
  { id: "behavioral", label: "Behavioral" },
  { id: "case", label: "Case" },
  { id: "onsite", label: "Onsite / Final" },
  { id: "other", label: "Other" },
];
const ROUND = Object.fromEntries(ROUND_TYPES.map((r) => [r.id, r]));
const CATS = ["Software", "Data & AI", "Product", "Quant", "Hardware"];
const LEVELS = [{ id: "intern", label: "Internship" }, { id: "newgrad", label: "New grad" }];

/* ---------- Store ---------- */
const STORE_KEY = "heardback:v1";
const defaultState = () => ({
  v: 1,
  profile: { roles: [], levels: ["intern", "newgrad"], locations: [], remote: true, needsSponsor: false, resume: "", skills: [], onboarded: false, name: "", weeklyGoal: 10 },
  apps: {},
  settings: { theme: "system", followUpDays: 7, ghostDays: 21, shareAnon: false, showExamples: true, hideGhostAbove: 0 },
  dismissed: {},
  ui: { pipelineView: "board", findSort: "new" },
});

function loadState() {
  const s = storage.get(STORE_KEY, null);
  const d = defaultState();
  if (!s || typeof s !== "object") return d;
  return {
    ...d, ...s,
    profile: { ...d.profile, ...(s.profile || {}) },
    settings: { ...d.settings, ...(s.settings || {}) },
    ui: { ...d.ui, ...(s.ui || {}) },
    apps: s.apps || {},
    dismissed: s.dismissed || {},
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
    this.saveTimer = setTimeout(() => storage.set(STORE_KEY, this.state), 150);
  },
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
};
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
    if (!opts.silent) toast(`${a.company} moved to ${STAGE[stage].label}`, { undo: () => Apps.update(id, a) });
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
  daysSilent(a) { const ref = Math.max(a.lastReplyAt || 0, a.appliedAt || 0, a.lastActivityAt || 0); return ref ? Math.floor((now() - ref) / DAY) : 0; },
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
  ui.set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, ...opts }] }));
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
function useCaps() { const [v, setV] = useState({ ...caps }); useEffect(() => { const f = () => setV({ ...caps }); capSubs.add(f); return () => capSubs.delete(f); }, []); return v; }
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
  return copyText(typeof data === "string" ? data : "", "File downloads aren't available here, so the contents were copied instead");
}

/* ---------- Text helpers ---------- */
function initials(name = "") {
  const w = name.replace(/[^A-Za-z0-9 &]/g, " ").split(/\s+/).filter(Boolean);
  if (!w.length) return "·";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
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
