/* ===== Pooled reply data ("who actually replies") =====
   Storage: shared db, one document per contributor at pool/<viewer id> (rules: everyone reads, each writes only their own).
   Contents are coarse and anonymous: company, role category, level, week applied, furthest stage, outcome, days to first reply.
   No names, emails, titles, notes or resume text ever leave the browser. */
const POOL_MIN_APPS = 5, POOL_MIN_PEOPLE = 3;
const pool = { status: "idle", byCompany: {}, people: 0, apps: 0, canWrite: null, myId: null, lastShared: null, error: null };
const poolSubs = new Set();
function usePool() { const [v, setV] = useState({ ...pool }); useEffect(() => { const f = () => setV({ ...pool }); poolSubs.add(f); f(); return () => poolSubs.delete(f); }, []); return v; }
const poolEmit = () => poolSubs.forEach((f) => f());

function poolWeek(ts) { const d = new Date(ts); const y = d.getUTCFullYear(); const start = Date.UTC(y, 0, 1); return `${y}-W${String(Math.ceil(((ts - start) / DAY + 1) / 7)).padStart(2, "0")}`; }
function poolEntries(s = store.get()) {
  return Object.values(s.apps)
    .filter((a) => !a.example && a.appliedAt && a.stage !== "saved" && a.company)
    .map((a) => {
      const job = a.jobId ? jobsStore.byId.get(a.jobId) : null;
      const fr = firstReplyAt(a);
      const furthest = (a.events || []).reduce((m, e) => (e.to && STAGE[e.to] && STAGE[e.to].i > m && !["rejected", "ghosted"].includes(e.to) ? STAGE[e.to].i : m), STAGE.applied.i);
      return {
        co: a.company.trim().slice(0, 80), cat: job?.cat || "", lvl: job?.lvl || "", wk: poolWeek(a.appliedAt),
        reached: STAGES[Math.max(furthest, ["screen", "interview", "offer"].includes(a.stage) ? STAGE[a.stage].i : 0)].id,
        out: ["offer", "rejected", "ghosted"].includes(a.stage) ? a.stage : "open",
        rd: fr && fr > a.appliedAt ? Math.round((fr - a.appliedAt) / DAY) : null,
      };
    }).slice(0, 400);
}

async function poolLoad() {
  if (!caps.db) { pool.status = "unavailable"; poolEmit(); return; }
  pool.status = "loading"; poolEmit();
  try {
    if (caps.user) {
      try { pool.myId = await caps.user.id(); } catch {}
      try { const w = await caps.user.can("data.write"); pool.canWrite = w; } catch { pool.canWrite = null; }
    }
    const snap = await caps.db.collection("pool").limit(1000).get();
    const by = {}; let people = 0, apps = 0;
    for (const d of snap.docs) {
      const body = d.data(); if (!body || !Array.isArray(body.entries)) continue;
      people++;
      const seenCo = new Set();
      for (const e of body.entries) {
        if (!e || typeof e.co !== "string") continue;
        apps++;
        const k = norm(e.co);
        const c = by[k] || (by[k] = { name: e.co, n: 0, people: 0, replied: 0, ghosted: 0, rejected: 0, offers: 0, interviews: 0, rds: [] });
        c.n++;
        if (!seenCo.has(k)) { c.people++; seenCo.add(k); }
        if (e.rd != null || ["screen", "interview", "offer"].includes(e.reached) || e.out === "rejected") c.replied++;
        if (e.out === "ghosted") c.ghosted++;
        if (e.out === "rejected") c.rejected++;
        if (e.out === "offer") c.offers++;
        if (["interview", "offer"].includes(e.reached)) c.interviews++;
        if (typeof e.rd === "number" && e.rd >= 0 && e.rd < 365) c.rds.push(e.rd);
      }
      if (d.id === pool.myId) pool.lastShared = body.updatedAt || null;
    }
    Object.assign(pool, { status: "ready", byCompany: by, people, apps, error: null });
  } catch (e) {
    pool.status = "error"; pool.error = e?.code || "unavailable";
  }
  poolEmit();
}
function poolFor(company) {
  const c = pool.byCompany[norm(company || "")];
  if (!c) return null;
  const v = [...c.rds].sort((a, b) => a - b);
  const med = v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
  return { ...c, enough: c.n >= POOL_MIN_APPS && c.people >= POOL_MIN_PEOPLE, replyRate: c.n ? c.replied / c.n : null, ghostRate: c.n ? c.ghosted / c.n : null, interviewRate: c.n ? c.interviews / c.n : null, medReply: med };
}
async function poolShare() {
  if (!caps.db || !pool.myId) { toast("Sharing needs a signed-in claude.ai account with access to this page."); return false; }
  const entries = poolEntries();
  try {
    await caps.db.doc(`pool/${pool.myId}`).set({ v: 1, updatedAt: now(), entries });
    store.set((s) => ({ ...s, settings: { ...s.settings, shareAnon: true, lastShared: now() } }));
    toast(`Shared ${pluralize(entries.length, "application")} anonymously. Thank you.`);
    poolLoad();
    return true;
  } catch (e) {
    if (e?.code === "invalid_argument") { pool.canWrite = false; poolEmit(); toast("This page is view-only for your account, so it can't save shared data."); }
    else if (e?.code === "quota_exceeded") toast("The shared data store is full right now. Your data is still safe in this browser.");
    else toast("Couldn't share right now. Try again in a minute.");
    return false;
  }
}
async function poolUnshare() {
  if (!caps.db || !pool.myId) return;
  try { await caps.db.doc(`pool/${pool.myId}`).delete(); store.set((s) => ({ ...s, settings: { ...s.settings, shareAnon: false, lastShared: null } })); toast("Removed your shared data"); poolLoad(); }
  catch { toast("Couldn't remove it right now. Try again in a minute."); }
}
/* Keep a contributor's pooled copy fresh: re-share at most every 6 hours while sharing is on. */
let poolAutoTimer = null;
store.sub((s) => {
  if (!s.settings.shareAnon || !caps.db || !pool.myId || pool.canWrite === false) return;
  if (s.settings.lastShared && now() - s.settings.lastShared < 6 * 3600000) return;
  clearTimeout(poolAutoTimer); poolAutoTimer = setTimeout(() => poolShare(), 4000);
});
capSubs.add(() => { if (caps.ready && pool.status === "idle") poolLoad(); });

/* ----- UI ----- */
function PoolCompanyCard({ company }) {
  const p = usePool();
  const c = poolFor(company);
  const head = html`<div class="card-head"><${Icon} name="reply" /><h3>Reply data from Heardback users</h3></div>`;
  if (p.status === "unavailable" || p.status === "error") {
    return html`<div class="card">${head}<div class="card-body stack-sm"><p class="muted" style="font-size:var(--fs-sm)">Reply data loads when you open Heardback on claude.ai while signed in.</p></div></div>`;
  }
  if (p.status !== "ready") return html`<div class="card">${head}<div class="card-body"><div class="skel" style="height:14px;width:60%"></div></div></div>`;
  if (!c || !c.enough) {
    return html`<div class="card">${head}<div class="card-body stack-sm">
      <p style="font-size:var(--fs-sm)"><strong>Not enough data yet.</strong> <span class="muted">We show reply rates once at least ${POOL_MIN_APPS} applications from ${POOL_MIN_PEOPLE} different people are shared${c ? `. So far: ${pluralize(c.n, "application")} from ${pluralize(c.people, "person", "people")}` : ""}.</span></p>
      <${PoolShareInline} />
    </div></div>`;
  }
  const rows = [["Got any reply", fmt.pct(c.replyRate)], ["Reached interviews", fmt.pct(c.interviewRate)], ["Ghosted", fmt.pct(c.ghostRate)], ["Median days to first reply", c.medReply == null ? "—" : `${Math.round(c.medReply)} days`]];
  return html`<div class="card">${head}<div class="card-body stack">
    <dl class="kv">${rows.map(([k, v]) => html`<dt>${k}</dt><dd class="num" style="font-weight:600">${v}</dd>`)}</dl>
    <span class="hint">Based on ${pluralize(c.n, "application")} shared anonymously by ${pluralize(c.people, "person", "people")}. Small samples can mislead.</span>
  </div></div>`;
}
function PoolShareInline() {
  const p = usePool();
  const s = useStore((s) => s.settings);
  if (p.canWrite === false) return html`<span class="hint">Your access to this page is view-only, so you can't add data here yet.</span>`;
  if (s.shareAnon) return html`<span class="hint">You're sharing anonymously. Thank you.</span>`;
  return html`<div class="row wrap"><${Btn} size="sm" icon="shield" onClick=${() => openModal("pool")}>Share my outcomes anonymously</${Btn}></div>`;
}
MODALS.pool = () => {
  const entries = poolEntries();
  const s = useStore((s) => s.settings);
  const p = usePool();
  return html`<${Modal} title="Share your outcomes anonymously" onClose=${closeModal} foot=${html`
    ${s.shareAnon && html`<${Btn} kind="ghost" cls="danger" onClick=${() => { poolUnshare(); closeModal(); }}>Stop sharing and remove</${Btn}>`}
    <span style="flex:1"></span>
    <${Btn} onClick=${closeModal}>Cancel</${Btn}>
    <${Btn} kind="primary" icon="shield" disabled=${!entries.length || p.canWrite === false || !caps.db} onClick=${async () => { if (await poolShare()) closeModal(); }}>${s.shareAnon ? "Update shared data" : `Share ${pluralize(entries.length, "application")}`}</${Btn}>`}>
    <p class="muted" style="font-size:var(--fs-sm)">Help other job seekers see which companies actually reply. Heardback pools outcomes and only shows a company's numbers once ${POOL_MIN_PEOPLE} or more people have shared.</p>
    <div class="callout"><${Icon} name="shield" /><div class="stack-sm">
      <strong style="color:var(--fg)">What's shared</strong>
      <span>Company name, role area, level, the week you applied, how far you got, the outcome, and days until the first reply.</span>
      <strong style="color:var(--fg); margin-top:6px">Never shared</strong>
      <span>Your name, email, resume, notes, contacts, job titles or exact dates. Example applications are never shared.</span>
    </div></div>
    ${!caps.db && html`<div class="callout wait"><${Icon} name="info" /><span>Sharing works when Heardback is open on claude.ai and you're signed in.</span></div>`}
    ${p.canWrite === false && html`<div class="callout wait"><${Icon} name="info" /><span>Your access to this page is view-only, so it can't save shared data. Your own tracking still works.</span></div>`}
    ${entries.length ? html`<div class="stack-sm"><span class="label">Preview (${entries.length})</span><div class="table-wrap card" style="max-height:220px;overflow:auto"><table class="table"><thead><tr><th>Company</th><th>Week</th><th>Reached</th><th>Outcome</th><th>Reply after</th></tr></thead><tbody>
      ${entries.slice(0, 50).map((e, i) => html`<tr key=${i} style="cursor:default"><td>${e.co}</td><td class="num">${e.wk}</td><td>${STAGE[e.reached]?.label}</td><td>${e.out === "open" ? "In progress" : STAGE[e.out]?.label}</td><td class="num">${e.rd == null ? "—" : e.rd + "d"}</td></tr>`)}
    </tbody></table></div></div>` : html`<p class="hint">You have no real applications to share yet. Example applications are never shared.</p>`}
  </${Modal}>`;
};
function PoolSettingsCard() {
  const p = usePool();
  const s = useStore((s) => s.settings);
  return html`<div class="card"><div class="card-head"><${Icon} name="shield" /><h3>Anonymous reply data</h3><span class="spacer"></span>${s.shareAnon ? html`<${Badge} kind="ok">Sharing</${Badge}>` : html`<${Badge}>Off</${Badge}>`}</div>
    <div class="card-body stack">
      <p class="muted" style="font-size:var(--fs-sm)">Share coarse, anonymous outcomes so everyone can see which companies reply. Nothing is shared unless you turn this on.${p.status === "ready" ? ` So far ${pluralize(p.apps, "application")} from ${pluralize(p.people, "person", "people")} are pooled.` : ""}</p>
      <div class="row wrap"><${Btn} icon="shield" onClick=${() => openModal("pool")}>${s.shareAnon ? "Review what's shared" : "Review and share"}</${Btn}>${s.lastShared && html`<span class="hint">Last updated ${fmt.ago(s.lastShared)}</span>`}</div>
    </div></div>`;
}
