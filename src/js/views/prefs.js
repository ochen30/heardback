/* ===== Settings ===== */
const PF_VERSION = "1.0";

function pfSetProfile(patch) { store.set((s) => ({ ...s, profile: { ...s.profile, ...patch } })); }
function pfSetSettings(patch) { store.set((s) => ({ ...s, settings: { ...s.settings, ...patch } })); }

function PfRow({ label, hint, id, children, top }) {
  return html`<div class=${cx("pf-row", top && "top")}>
    <div class="pf-label">${id ? html`<label class="label" for=${id}>${label}</label>` : html`<span class="label">${label}</span>`}${hint && html`<span class="hint">${hint}</span>`}</div>
    <div class="pf-control">${children}</div>
  </div>`;
}
function PfCard({ title, children, aside, sub }) {
  return html`<section class="card pf-card" aria-label=${title}>
    <div class="card-head"><h2>${title}</h2><span class="spacer"></span>${aside}</div>
    ${sub && html`<p class="pf-sub">${sub}</p>`}
    <div class="pf-rows">${children}</div>
  </section>`;
}
function PfNumber({ id, value, min, max, onChange, suffix }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = (raw) => { const n = parseInt(raw, 10); if (!isNaN(n)) onChange(clamp(n, min, max)); else setV(String(value)); };
  return html`<div class="row pf-num"><input id=${id} class="input num" type="number" inputmode="numeric" min=${min} max=${max} value=${v}
    onInput=${(e) => { setV(e.currentTarget.value); const n = parseInt(e.currentTarget.value, 10); if (!isNaN(n) && n >= min && n <= max) onChange(n); }}
    onBlur=${(e) => commit(e.currentTarget.value)} />${suffix && html`<span class="muted" style="font-size:var(--fs-sm)">${suffix}</span>`}</div>`;
}

/* ---------- Export / import ---------- */
function pfExportJSON() {
  const s = store.get();
  const data = { app: "Heardback", kind: "backup", exportedAt: new Date().toISOString(), v: s.v || 1, profile: s.profile, settings: s.settings, apps: s.apps, dismissed: s.dismissed };
  saveFile("heardback-backup.json", JSON.stringify(data, null, 2), "application/json");
}
function pfExportCSV() {
  const apps = Object.values(store.get().apps).sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0));
  const head = ["company", "title", "location", "stage", "applied", "last activity", "url", "rounds", "example"];
  const iso = (t) => (t ? fmt.toDateInput(t) : "");
  const rows = apps.map((a) => [a.company, a.title, a.location, STAGE[a.stage]?.label || a.stage, iso(a.appliedAt), iso(a.lastActivityAt), a.url, (a.rounds || []).length, a.example ? "yes" : ""]);
  saveFile("heardback-applications.csv", [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv");
}
/* Spreadsheet status words → stage. Checked in order, so "Rejected after onsite" is rejected and
   "Phone screen" is a screen. Anything unrecognized is Applied (or Saved when there's no date either). */
const PF_STAGE_WORDS = [
  [/offer|accepted/i, "offer"], [/reject|declin|no longer|not selected|turned down/i, "rejected"], [/ghost|no response|no reply|silent/i, "ghosted"],
  [/\boa\b|online assessment|assessment|take[- ]?home|hirevue|phone screen|recruiter|\bscreen/i, "screen"],
  [/interview|onsite|on-site|final|technical|superday/i, "interview"], [/appl|submitted|sent|waiting/i, "applied"], [/save|wish|bookmark|interested|to apply/i, "saved"],
];
function pfStage(raw, hasDate) {
  const t = (raw || "").trim();
  if (t) { const id = t.toLowerCase(); if (STAGE[id]) return id; const hit = PF_STAGE_WORDS.find(([re]) => re.test(t)); return hit ? hit[1] : "applied"; }
  return hasDate ? "applied" : "saved";
}
function pfDate(raw) {
  const t = (raw || "").trim(); if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const ts = m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : Date.parse(t);
  return isNaN(ts) || ts > now() + 30 * DAY || ts < Date.UTC(2000, 0, 1) ? null : ts;
}
function pfAppKey(a) { return norm(`${a.company}|${a.title}`); }
function pfBuildApp(o) {
  const t = now();
  const stage = o.stage;
  const created = o.appliedAt || t;
  const ev = [{ id: uid("e_"), at: created, kind: "created", text: "Imported from CSV" }];
  if (stage !== "saved" && stage !== "applied") ev.push({ id: uid("e_"), at: created, kind: "stage", from: "applied", to: stage, text: `Moved to ${STAGE[stage].label}` });
  return {
    id: uid("a_"), company: o.company, title: o.title, location: o.location || "", url: o.url || "", jobId: null, stage,
    createdAt: created, appliedAt: stage === "saved" ? null : created, lastActivityAt: created, lastReplyAt: ["screen", "interview", "offer", "rejected"].includes(stage) ? created : null,
    notes: "", contacts: [], rounds: [], events: ev, salary: "", source: o.example ? "example" : "import", example: !!o.example,
  };
}
function pfParseCSV(text) {
  const rows = parseCSV(text.replace(/^﻿/, ""));
  if (rows.length < 2) return { error: "That CSV has no data rows. The first row should be headers like company, title, stage." };
  const head = rows[0].map((h) => norm(h));
  const col = (...names) => head.findIndex((h) => names.some((n) => h === n || h.replace(/ /g, "") === n.replace(/ /g, "")));
  const colLike = (re) => head.findIndex((h) => re.test(h));
  const ix = {
    company: col("company", "company name", "employer", "organization"),
    title: col("title", "job title", "role", "position", "job"),
    stage: col("stage", "status"),
    applied: col("applied date", "applied", "date applied", "applied at", "applied on", "date"),
    url: col("url", "link", "job url", "posting url", "job link"),
    location: col("location", "city"),
    example: col("example"),
  };
  if (ix.applied < 0) ix.applied = colLike(/appl.*date|date.*appl/);
  if (ix.company < 0 && ix.title < 0) return { error: "Couldn’t find a company or title column. Name the first row’s columns company, title, stage, applied date, url, location." };
  const get = (r, k) => (ix[k] >= 0 ? (r[ix[k]] || "").trim() : "");
  const apps = []; let skipped = 0;
  for (const r of rows.slice(1)) {
    const company = get(r, "company").slice(0, 120), title = get(r, "title").slice(0, 200);
    if (!company && !title) { skipped++; continue; }
    const appliedAt = pfDate(get(r, "applied"));
    apps.push({ key: "r" + apps.length, company: company || "Unknown company", title: title || "Untitled role", location: get(r, "location").slice(0, 120), url: /^https?:\/\//i.test(get(r, "url")) ? get(r, "url") : "", appliedAt, rawStage: get(r, "stage").slice(0, 60), stage: pfStage(get(r, "stage"), !!appliedAt), example: /^(yes|true|1)$/i.test(get(r, "example")) });
  }
  return { apps, skipped };
}
function pfImportFile(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast("That file is over 8 MB. Import a smaller backup or CSV."); return; }
  const r = new FileReader();
  r.onerror = () => toast(`Couldn’t read ${file.name}. Try again.`);
  r.onload = () => {
    const text = String(r.result || "");
    if (/\.json$/i.test(file.name) || /^\s*[{[]/.test(text)) {
      let data; try { data = JSON.parse(text); } catch { toast("That JSON file couldn’t be read. Use a backup exported from Heardback.", { ms: 6000 }); return; }
      const isBackup = data && typeof data === "object" && !Array.isArray(data) && (data.app === "Heardback" || data.apps && typeof data.apps === "object");
      if (!isBackup && !Array.isArray(data)) { toast("That file isn’t a Heardback backup. Export one from Settings and import that.", { ms: 6000 }); return; }
      const rawApps = Array.isArray(data) ? data : Array.isArray(data.apps) ? data.apps : data.apps && typeof data.apps === "object" ? Object.values(data.apps) : [];
      const apps = Object.values(cleanApps(rawApps));
      const bad = rawApps.length - apps.length;
      const hasProfile = !Array.isArray(data) && data.profile && typeof data.profile === "object" && !Array.isArray(data.profile);
      const hasSettings = !Array.isArray(data) && data.settings && typeof data.settings === "object" && !Array.isArray(data.settings);
      if (!apps.length && !hasProfile) { toast("That backup has no applications or profile that could be read.", { ms: 6000 }); return; }
      const cur = store.get().apps;
      const replace = apps.filter((a) => cur[a.id]).length;
      askConfirm({
        title: `Import ${pluralize(apps.length, "application")}?`,
        body: `They’ll be merged with what’s here${replace ? `; ${pluralize(replace, "application")} with the same ID will be replaced by the backup’s version` : ""}.${hasProfile ? " Your profile and settings will be updated from the backup." : ""}${bad ? ` ${pluralize(bad, "entry", "entries")} couldn’t be read and will be skipped.` : ""}`,
        confirmLabel: "Import and merge",
        onConfirm: () => {
          store.set((s) => ({
            ...s,
            apps: { ...s.apps, ...Object.fromEntries(apps.map((a) => [a.id, a])) },
            profile: hasProfile ? cleanProfile({ ...s.profile, ...data.profile, onboarded: true }) : s.profile,
            settings: hasSettings ? cleanSettings({ ...s.settings, ...data.settings }) : s.settings,
            dismissed: { ...s.dismissed, ...(data.dismissed && typeof data.dismissed === "object" && !Array.isArray(data.dismissed) ? data.dismissed : {}) },
          }));
          toast(`Imported ${pluralize(apps.length, "application")}`);
        },
      });
      return;
    }
    const res = pfParseCSV(text);
    if (res.error) { toast(res.error, { ms: 6000 }); return; }
    const existing = new Set(Object.values(store.get().apps).map(pfAppKey));
    const fresh = []; let dup = 0;
    for (const a of res.apps) { const k = pfAppKey(a); if (existing.has(k)) { dup++; continue; } existing.add(k); fresh.push(a); }
    if (!fresh.length) { toast(dup ? `Nothing new to import. All ${pluralize(dup, "row")} are already tracked.` : "No rows with a company or title were found."); return; }
    openModal("pfImport", { rows: fresh, dup, skipped: res.skipped, name: file.name });
  };
  r.readAsText(file);
}
/* CSV import preview: one row per application, with the stage we read and a select to fix it. */
MODALS.pfImport = function PfImport({ rows, dup, skipped }) {
  const [stages, setStages] = useState(() => Object.fromEntries(rows.map((r) => [r.key, r.stage])));
  const n = rows.length;
  const doImport = () => {
    const apps = rows.map((r) => pfBuildApp({ ...r, stage: stages[r.key] || r.stage }));
    store.set((s) => ({ ...s, apps: { ...s.apps, ...Object.fromEntries(apps.map((a) => [a.id, a])) } }));
    closeModal();
    const extra = [dup && `${dup} already tracked`, skipped && `${skipped} without a company or title`].filter(Boolean).join(", ");
    toast(`Imported ${pluralize(apps.length, "application")}${extra ? `. Skipped ${extra}.` : ""}`, { ms: 6000, undo: () => store.set((s) => { const next = { ...s.apps }; apps.forEach((a) => delete next[a.id]); return { ...s, apps: next }; }) });
  };
  const extra = [dup && `${dup} already tracked`, skipped && `${skipped} without a company or title`].filter(Boolean).join(" and ");
  return html`<${Modal} title="Import from spreadsheet" size="lg" onClose=${closeModal}
    foot=${html`<${Btn} onClick=${closeModal}>Cancel</${Btn}><${Btn} kind="primary" id="pf-imp-go" onClick=${doImport}>Import ${n}</${Btn}>`}>
    <p class="pf-imp-lead"><b>${pluralize(n, "row")} found.</b> Check the stages:${extra ? html` <span class="muted">Skipping ${extra}.</span>` : null}</p>
    <div class="pf-imp" role="list" aria-label="Rows to import">
      ${rows.map((r, i) => html`<div class="pf-imp-row" role="listitem" key=${r.key}>
        <div class="pf-imp-main">
          <span class="pf-imp-co truncate">${r.company}</span>
          <span class="pf-imp-sub truncate">${r.title}</span>
          <span class="pf-imp-meta">${r.appliedAt ? `Applied ${fmt.date(r.appliedAt, { month: "short", day: "numeric", year: "numeric" })}` : "No applied date"}${r.rawStage && norm(r.rawStage) !== norm(STAGE[r.stage]?.label || "") && norm(r.rawStage) !== r.stage ? html`<span class="faint"> · Sheet says “${r.rawStage}”</span>` : null}</span>
        </div>
        <label class="sr" for=${"pf-imp-st-" + i}>Stage for ${r.company}</label>
        <select id=${"pf-imp-st-" + i} class="select pf-imp-sel" value=${stages[r.key]} onChange=${(e) => { const v = e.currentTarget.value; setStages((m) => ({ ...m, [r.key]: v })); }}>
          ${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}
        </select>
      </div>`)}
    </div>
  </${Modal}>`;
};
function pfDeleteAll() {
  const shared = !!store.get().settings.shareAnon && typeof poolUnshare === "function";
  askConfirm({
    title: "Delete all your data?",
    body: `This removes every application, round, note, your resume and your settings from this browser.${shared ? " Your shared anonymous reply data is removed too." : ""} It can’t be undone. Export a backup first if you might want it later.`,
    confirmLabel: "Delete everything",
    danger: true,
    onConfirm: async () => {
      if (shared) { try { await poolUnshare(); } catch {} }
      try { Object.keys(localStorage).filter((k) => k.startsWith("heardback:")).forEach((k) => storage.del(k)); } catch {}
      storage.corrupt = false;
      store.set(() => defaultState());
      toast("All data deleted from this browser");
    },
  });
}

/* ---------- Sections ---------- */
function PfProfile() {
  const p = useStore((s) => s.profile);
  const locs = p.locations || [];
  return html`<${PfCard} title="Profile" sub="Your targets shape fit scores, the jobs you see first, and Today’s suggestions.">
    <${PfRow} label="Name" hint="Only used to greet you." id="pf-name">
      <input id="pf-name" class="input pf-input" autocomplete="name" maxlength="40" placeholder="Your name" value=${p.name || ""} onInput=${(e) => pfSetProfile({ name: e.currentTarget.value })} />
    </${PfRow}>
    <${PfRow} label="Weekly goal" hint="Applications per week." id="pf-goal">
      <${PfNumber} id="pf-goal" value=${p.weeklyGoal || 10} min=${1} max=${100} onChange=${(n) => pfSetProfile({ weeklyGoal: n })} suffix="applications" />
    </${PfRow}>
    <${PfRow} label="Level">
      <div class="chips">${LEVELS.map((l) => html`<${Chip} key=${l.id} on=${(p.levels || []).includes(l.id)} onClick=${() => pfSetProfile({ levels: onbToggle(p.levels || [], l.id) })}>${l.label}</${Chip}>`)}</div>
    </${PfRow}>
    <${PfRow} label="Roles" hint="None selected means all roles.">
      <div class="chips">${CATS.map((c) => html`<${Chip} key=${c} on=${(p.roles || []).includes(c)} onClick=${() => pfSetProfile({ roles: onbToggle(p.roles || [], c) })}>${c}</${Chip}>`)}</div>
    </${PfRow}>
    <${PfRow} label="Locations" hint="None selected means anywhere." top=${true}>
      <${OnbLocChecklist} idp="pf" value=${locs} roles=${p.roles || []} levels=${p.levels || []} onChange=${(v) => pfSetProfile({ locations: v })} />
    </${PfRow}>
    <${PfRow} label="Remote">
      <${Switch} id="pf-remote" checked=${!!p.remote} onChange=${(v) => pfSetProfile({ remote: v, locations: v ? (locs.includes("remote") ? locs : [...locs, "remote"]) : locs.filter((x) => x !== "remote") })} label="Open to remote" />
    </${PfRow}>
    <${PfRow} label="Visa sponsorship" hint="Flags roles that say they don’t sponsor.">
      <${Switch} id="pf-sponsor" checked=${!!p.needsSponsor} onChange=${(v) => pfSetProfile({ needsSponsor: v })} label="I’ll need sponsorship" />
    </${PfRow}>
  </${PfCard}>`;
}
function PfResume() {
  const p = useStore((s) => s.profile);
  const words = ((p.resume || "").trim().match(/\S+/g) || []).length;
  const sk = p.skills || [];
  return html`<${PfCard} title="Resume" aside=${html`<${Btn} size="sm" icon="edit" onClick=${() => openModal("resume")} id="pf-edit-resume">${p.resume || sk.length ? "Edit resume" : "Add resume"}</${Btn}>`}>
    <${PfRow} label="Resume text">
      <span class=${cx("pf-value num", !words && "faint")}>${words ? `${pluralize(words, "word")} saved in this browser` : "Not added yet"}</span>
    </${PfRow}>
    <${PfRow} label="Skills" hint=${sk.length ? `${sk.length} used for fit scores` : "Used for fit scores and prep"} top=${true}>
      ${sk.length ? html`<div class="chips">${sk.slice(0, 16).map((s) => html`<span class="badge outline" key=${s}>${s}</span>`)}${sk.length > 16 && html`<span class="badge">+${sk.length - 16} more</span>`}</div>` : html`<span class="pf-value faint">None yet</span>`}
    </${PfRow}>
  </${PfCard}>`;
}
function PfReminders() {
  const st = useStore((s) => s.settings);
  return html`<${PfCard} title="Reminders" sub="Today uses these to suggest follow-ups and flag applications that went quiet.">
    <${PfRow} label="Suggest a follow-up" hint="After this many days without a reply." id="pf-follow">
      <${PfNumber} id="pf-follow" value=${st.followUpDays ?? 7} min=${1} max=${60} onChange=${(n) => pfSetSettings({ followUpDays: n, ghostDays: Math.max(st.ghostDays ?? 21, n + 1) })} suffix="days" />
    </${PfRow}>
    <${PfRow} label="Mark as likely ghosted" hint=${`Days of silence. At least ${(st.followUpDays ?? 7) + 1}.`} id="pf-ghost">
      <${PfNumber} id="pf-ghost" value=${st.ghostDays ?? 21} min=${Math.max(3, (st.followUpDays ?? 7) + 1)} max=${120} onChange=${(n) => pfSetSettings({ ghostDays: n })} suffix="days" />
    </${PfRow}>
  </${PfCard}>`;
}
function PfAppearance() {
  const theme = useStore((s) => s.settings.theme);
  return html`<${PfCard} title="Appearance">
    <${PfRow} label="Theme" hint="System follows your device setting.">
      <${Seg} label="Theme" value=${theme || "system"} onChange=${(v) => pfSetSettings({ theme: v })} options=${[{ id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]} />
    </${PfRow}>
  </${PfCard}>`;
}
function PfExamples() {
  const s = useStore();
  const has = hasExamples(s);
  const n = Object.values(s.apps).filter((a) => a.example).length;
  return html`<${PfCard} title="Example data" sub="Fictional applications that show how Heardback works. They never count toward your stats.">
    <${PfRow} label="Show examples" hint=${has ? `${pluralize(n, "example application")} loaded` : "None loaded"}>
      <${Switch} id="pf-show-ex" checked=${!!s.settings.showExamples} onChange=${(v) => pfSetSettings({ showExamples: v })} label=${s.settings.showExamples ? "Shown" : "Hidden"} />
    </${PfRow}>
    <${PfRow} label="Manage">
      ${has ? html`<${Btn} icon="trash" onClick=${clearExamples} id="pf-clear-ex">Clear examples</${Btn}>` : html`<${Btn} icon="plus" onClick=${loadExamples} id="pf-load-ex">Load examples</${Btn}>`}
    </${PfRow}>
  </${PfCard}>`;
}
function PfData() {
  const n = useStore((s) => Object.keys(s.apps).length);
  return html`<${PfCard} title="Your data" sub="Everything lives in this browser. Export a backup to move it to another device.">
    <${PfRow} label="Backup" hint="Applications, rounds, notes, profile and settings.">
      <${Btn} icon="download" onClick=${pfExportJSON} id="pf-export-json">Export JSON backup</${Btn}>
    </${PfRow}>
    <${PfRow} label="Spreadsheet" hint=${`${pluralize(n, "application")}, one per row.`}>
      <${Btn} icon="download" onClick=${pfExportCSV} disabled=${!n} id="pf-export-csv">Export CSV</${Btn}>
    </${PfRow}>
    <${PfRow} label="Import" hint="A Heardback backup (.json), or a spreadsheet (.csv) with company, title and stage columns." top=${true}>
      <div class="stack-sm">
        <label class="btn pf-file"><${Icon} name="upload" />Choose file to import<input id="pf-import" class="sr" type="file" accept=".json,.csv,application/json,text/csv" onChange=${(e) => { const f = e.currentTarget.files && e.currentTarget.files[0]; e.currentTarget.value = ""; pfImportFile(f); }} /></label>
      </div>
    </${PfRow}>
    <${PfRow} label="Delete all data" hint="Removes everything from this browser. Can’t be undone.">
      <${Btn} cls="danger" icon="trash" onClick=${pfDeleteAll} id="pf-delete">Delete all data</${Btn}>
    </${PfRow}>
  </${PfCard}>`;
}
function PfPrivacy() {
  return html`<section class="card pf-card" aria-label="Privacy">
    <div class="card-head"><h2>Privacy</h2></div>
    <div class="card-body stack">
      <p class="pf-statement"><b>Stored only in this browser.</b> Your applications, notes and resume stay on this device. Nothing is shared unless you turn on anonymous reply data below.</p>
      <p class="pf-statement"><b>Claude runs on your own account,</b> and only when you click a Claude feature.</p>
      <ul class="pf-facts">
        <li>No account and no ads.</li>
        <li>Clearing browser data deletes Heardback data. Export a backup occasionally.</li>
      </ul>
    </div>
  </section>`;
}
function PfSource() {
  const J = useJobs();
  const ts = onbGenTs(J.meta);
  const st = J.meta?.stats;
  return html`<section class="card pf-card" aria-label="Data source">
    <div class="card-head"><h2>Where listings come from</h2></div>
    <div class="card-body stack">
      <p class="muted pf-text">Listings come from the <a href="https://github.com/SimplifyJobs" target="_blank" rel="noopener">SimplifyJobs community lists on GitHub</a>. Every listing links to the employer’s own application page. Ghost-job signals are estimates from posting history, not facts about any company.</p>
      <div class="row wrap pf-meta">
        <span class="hint num">${J.status === "ready" ? `${fmt.num(st?.active ?? J.jobs.length)} open listings${st?.companies ? ` from ${fmt.num(st.companies)} companies` : ""}` : J.status === "error" ? "Listings couldn’t load" : "Loading listings…"}</span>
        ${ts && html`<span class="hint num">Last refreshed ${fmt.dateY(ts)}, ${fmt.time(ts)}</span>`}
      </div>
    </div>
  </section>`;
}

VIEWS.prefs = function PrefsView() {
  return html`<div class="page pf-page">
    <div class="page-head"><div><h1>Settings</h1><p>Your profile, reminders, and data. Changes save automatically.</p></div></div>
    ${storage.corrupt && html`<div class="callout wait pf-corrupt" role="alert"><${Icon} name="alert" /><span class="pf-corrupt-text">Your saved data couldn’t be read. A copy was kept in this browser. Import a backup file to restore it.</span><${Btn} size="sm" icon="upload" onClick=${() => document.getElementById("pf-import")?.click()} id="pf-restore">Restore from backup</${Btn}></div>`}
    <div class="pf-layout">
      <div class="stack pf-col">
        <${PfProfile} />
        <${PfResume} />
        <${PfReminders} />
        <${PfAppearance} />
        <${PfExamples} />
        <${PfData} />
      </div>
      <div class="stack pf-col pf-aside">
        <${PfPrivacy} />
        ${typeof PoolSettingsCard === "function" && html`<${PoolSettingsCard} />`}
        <${PfSource} />
        <section class="card pf-card hide-sm" aria-label="Help">
          <div class="card-head"><h2>Shortcuts</h2></div>
          <div class="card-body stack">
            <p class="muted pf-text">Press <${Kbd}>?</${Kbd}> anywhere, or <${Kbd}>${/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"} K</${Kbd}> to search and run commands.</p>
            <div><${Btn} onClick=${() => openModal("shortcuts")} id="pf-shortcuts">Show all shortcuts</${Btn}></div>
          </div>
        </section>
        <p class="pf-version num">Heardback ${PF_VERSION}</p>
      </div>
    </div>
  </div>`;
};
