/* ===== Onboarding (first run) + shared resume editor =====
   Three steps: targets -> resume (optional) -> live matching roles. Finishable in under a minute.
   Shared with prefs.js: OnbResumeEditor, onbEditorInit, onbEditorSkills, onbToggle, onbLocChoices. */

const onbToggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const onbLocChoices = () => LOC_OPTIONS.filter((o) => o.id !== "remote");
const ONB_SKILL_NAMES = SKILLS.map((s) => s[0]);

/* ---------- Resume editor state: text + manual adds/removals on top of detected skills ---------- */
function onbEditorInit(profile) {
  const text = profile.resume || "";
  const det = extractSkills(text);
  const skills = profile.skills || [];
  return { text, added: skills.filter((s) => !det.includes(s)), removed: det.filter((s) => !skills.includes(s)) };
}
function onbEditorSkills(v) {
  const det = extractSkills(v.text).filter((s) => !v.removed.includes(s));
  return [...det, ...v.added.filter((s) => !det.includes(s))];
}
function onbCleanSkill(raw) {
  const t = (raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (!t) return "";
  const known = ONB_SKILL_NAMES.find((n) => n.toLowerCase() === t.toLowerCase());
  return known || t;
}

function onbSuggest(raw, skills) {
  const q = (raw || "").trim().toLowerCase();
  if (!q) return [];
  const have = new Set(skills.map((x) => x.toLowerCase()));
  return ONB_SKILL_NAMES
    .filter((n) => !have.has(n.toLowerCase()) && n.toLowerCase().includes(q) && n.toLowerCase() !== q)
    .sort((a, b) => (a.toLowerCase().startsWith(q) ? 0 : 1) - (b.toLowerCase().startsWith(q) ? 0 : 1) || a.length - b.length)
    .slice(0, 6);
}

function OnbResumeEditor({ value, onChange, idp = "res" }) {
  const [add, setAdd] = useState("");
  const [fileNote, setFileNote] = useState(null);
  const skills = onbEditorSkills(value);
  const detected = extractSkills(value.text);
  const setText = (text) => onChange({ ...value, text });
  const remove = (s) => onChange(detected.includes(s) ? { ...value, removed: [...value.removed, s] } : { ...value, added: value.added.filter((x) => x !== s) });
  const addSkill = (name) => {
    const s = onbCleanSkill(typeof name === "string" ? name : add);
    if (!s) return;
    setAdd("");
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    if (detected.includes(s)) onChange({ ...value, removed: value.removed.filter((x) => x !== s) });
    else onChange({ ...value, added: [...value.added, s] });
  };
  const [reading, setReading] = useState(false);
  const onFile = async (e) => {
    const f = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = "";
    if (!f) return;
    setReading(true); setFileNote(null);
    try {
      const { text } = await readResumeFile(f);
      setText(String(text || "").slice(0, 40000));
      setFileNote({ ok: true, text: `Read ${f.name}. Check the text below and fix anything that came through oddly.` });
    } catch (err) {
      setFileNote({ ok: false, text: (err && err.message) || `Couldn’t read ${f.name}. Paste the text instead.` });
    } finally { setReading(false); }
  };
  const words = (value.text.trim().match(/\S+/g) || []).length;
  const sugg = onbSuggest(add, skills);
  const suggRef = useRef(null);
  const hasSugg = sugg.length > 0;
  useEffect(() => { if (hasSugg) suggRef.current?.scrollIntoView?.({ block: "nearest" }); }, [hasSugg]);
  return html`<div class="stack onb-resume">
    <div class="onb-resume-head">
      <label class="label" for=${idp + "-text"}>Resume text</label>
      <span class="spacer"></span>
      <label class=${cx("btn sm onb-file", reading && "is-busy")} aria-disabled=${reading ? "true" : null}><${Icon} name="upload" />${reading ? "Reading…" : "Upload PDF"}<input id=${idp + "-file"} class="sr" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" disabled=${reading} onChange=${onFile} /></label>
    </div>
    <span class="hint onb-resume-hint">Upload a PDF or paste the text. It stays in this browser.</span>
    ${reading && html`<div class="callout info" role="status"><span class="onb-spin" aria-hidden="true"></span><span>Reading your resume…</span></div>`}
    ${fileNote && html`<div class=${cx("callout", fileNote.ok ? "info" : "wait")} role="status"><${Icon} name=${fileNote.ok ? "check" : "info"} /><span>${fileNote.text}</span></div>`}
    <textarea id=${idp + "-text"} class="textarea onb-textarea" placeholder="Paste the text of your resume here. Experience, projects, skills: plain text is fine." value=${value.text} onInput=${(e) => setText(e.currentTarget.value)}></textarea>
    <div class="row onb-meta"><span class="hint num">${words ? pluralize(words, "word") : "Nothing pasted yet"}</span>${value.text && html`<button type="button" class="onb-link" onClick=${() => setText("")}>Clear text</button>`}</div>
    <div class="stack-sm">
      <div class="row"><span class="label">Skills</span><span class="faint num" style="font-size:var(--fs-xs)">${skills.length || ""}</span></div>
      <span class="hint">${value.text ? "Found in your resume. Remove any that don’t fit and add ones we missed." : "We’ll pick these up from your resume. You can also add them by hand."}</span>
      ${skills.length ? html`<div class="chips">${skills.map((s) => html`<button type="button" key=${s} class="chip onb-skill" aria-pressed="true" aria-label=${"Remove " + s} title=${"Remove " + s} onClick=${() => remove(s)}>${s}<${Icon} name="x" size=${12} /></button>`)}</div>` : null}
      <form class="row onb-add" onSubmit=${(e) => { e.preventDefault(); addSkill(); }}>
        <input id=${idp + "-add"} class="input" placeholder="Add a skill, e.g. SQL" value=${add} onInput=${(e) => setAdd(e.currentTarget.value)} aria-label="Add a skill" autocomplete="off" />
        <${Btn} type="submit" disabled=${!add.trim()}>Add</${Btn}>
      </form>
      ${sugg.length > 0 && html`<div class="onb-sugg" ref=${suggRef} role="group" aria-label="Suggested skills">
        <span class="hint">Suggestions</span>
        ${sugg.map((n) => html`<button type="button" key=${n} class="onb-sugg-btn" onClick=${() => addSkill(n)} aria-label=${"Add " + n}><${Icon} name="plus" size=${12} />${n}</button>`)}
      </div>`}
    </div>
    <p class="onb-privacy"><${Icon} name="shield" /><span>Your resume is only sent to Claude when you click an AI action.</span></p>
  </div>`;
}

MODALS.resume = () => {
  const [v, setV] = useState(() => onbEditorInit(store.get().profile));
  const save = () => {
    store.set((s) => ({ ...s, profile: { ...s.profile, resume: v.text.trim(), skills: onbEditorSkills(v) } }));
    closeModal(); toast("Resume saved");
  };
  return html`<${Modal} title="Your resume" size="lg" onClose=${closeModal} foot=${html`<${Btn} onClick=${closeModal}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Save resume</${Btn}>`}>
    <p class="muted" style="font-size:var(--fs-sm)">Used for fit scores, interview talking points, and tailoring. Plain text works best.</p>
    <${OnbResumeEditor} value=${v} onChange=${setV} idp="resm" />
  </${Modal}>`;
};

/* ---------- Matching (step 3) ---------- */
function onbGenTs(meta) {
  const g = meta && meta.generatedAt; if (!g) return null;
  const t = typeof g === "number" ? (g < 1e12 ? g * 1000 : g) : Date.parse(g);
  return isNaN(t) ? null : t;
}
function onbMatches(jobs, p) {
  const lv = p.levels.length ? p.levels : ["intern", "newgrad"];
  const locs = p.locations.filter((l) => l !== "remote");
  const out = [];
  for (const j of jobs) {
    if (!lv.includes(j.lvl)) continue;
    if (p.roles.length && !p.roles.includes(j.cat)) continue;
    if (locs.length && !(locs.some((l) => jobInLoc(j, l)) || (p.remote && jobRemoteUS(j)))) continue;
    if (!locs.length && !p.remote && j.r && j.nl <= 1 && (j.l || []).every((x) => /remote/i.test(x))) continue;
    if (p.needsSponsor && (j.sp === "no" || j.sp === "citizen")) continue;
    out.push(j);
  }
  return out;
}
function onbTop(list, p, n = 5) {
  return list
    .map((j) => ({ j, f: fitScore(j, p) }))
    .sort((a, b) => (b.f?.score || 0) - (a.f?.score || 0) || (ghostLevel(a.j.g || 0) === "low" ? 0 : 1) - (ghostLevel(b.j.g || 0) === "low" ? 0 : 1) || b.j.p - a.j.p)
    .slice(0, n);
}
/* One listing with ghost signals, so the idea is visible before the first search: the newest flagged match
   with a stated reason, preferring "some" signals (a typical case) over "strong". */
function onbFlagged(list, skip) {
  let best = null;
  for (const j of list) {
    if (skip.has(j.id) || (j.g || 0) < 25 || !(j.gr || []).length) continue;
    if (ghostLevel(j.g) === "mid") return j;
    if (!best) best = j;
  }
  return best;
}
/* Location text for a matched row: the city that matched the picked locations first (else Find's default). */
function onbLocText(j, p) {
  const locs = (p.locations || []).filter((l) => l !== "remote");
  if (j.r && !(j.l || []).length) return "Remote";
  const city = locs.length ? (j.l || []).find((l) => locs.some((id) => jobInLoc({ ...j, l: [l] }, id))) : null;
  return city ? `${city}${j.nl > 1 ? ` +${j.nl - 1} more` : ""}` : find_locText(j);
}
function onbSummary(p) {
  const lv = p.levels.length === 1 ? (p.levels[0] === "intern" ? "Internships" : "New grad roles") : "Internships and new grad roles";
  const roles = p.roles.length ? p.roles.join(", ") : "all roles";
  const locs = p.locations.filter((l) => l !== "remote").map((l) => LOC_OPTIONS.find((o) => o.id === l)?.label || l);
  const where = locs.length ? `${locs.slice(0, 3).join(", ")}${locs.length > 3 ? ` +${locs.length - 3}` : ""}${p.remote ? ", or remote" : ""}` : p.remote ? "any location, including remote" : "any location";
  return [lv, roles, where, p.needsSponsor && "sponsorship not ruled out"].filter(Boolean);
}

/* ---------- Location checklist (shared with Settings): same pattern, counts and order as Find. Counts are open roles
   in the picked fields and levels (Find’s default filters follow the profile), ordered by that count, then by the
   whole-dataset count, as Find does. Top 6 show, the rest behind "Show N more". ---------- */
const ONB_LOC_TOP = 6;
const onbLocCountC = { key: null, jobs: null, out: null };
function onbLocCounts(jobs, roles, levels) {
  if (!jobs || !jobs.length) return null;
  const key = `${roles.join("|")}#${levels.join("|")}`;
  if (onbLocCountC.jobs !== jobs || onbLocCountC.key !== key) {
    const opts = onbLocChoices();
    const c = {}, all = {}; for (const o of opts) { c[o.id] = 0; all[o.id] = 0; }
    for (const j of jobs) {
      const hit = (!roles.length || roles.includes(j.cat)) && (!levels.length || levels.includes(j.lvl));
      for (const o of opts) if (jobInLoc(j, o.id)) { all[o.id]++; if (hit) c[o.id]++; }
    }
    Object.assign(onbLocCountC, { key, jobs, out: { c, all } });
  }
  return onbLocCountC.out;
}
function onbLocBasis(roles, levels) {
  const r = roles.length ? `open ${roles.length > 2 ? roles.slice(0, -1).join(", ") + " and " + roles[roles.length - 1] : roles.join(" and ")} roles` : "open roles in every field";
  const lv = levels.length === 1 ? (levels[0] === "intern" ? "internships only" : "new grad only") : "all levels";
  return `Counts: ${r}, ${lv}.`;
}
function OnbLocChecklist({ idp, value, onChange, label, roles = [], levels = [] }) {
  const jobs = useJobs();
  const [more, setMore] = useState(false);
  const counts = jobs.status === "ready" ? onbLocCounts(jobs.jobs, roles, levels) : null;
  const opts = onbLocChoices().map((o, i) => ({ ...o, n: counts ? counts.c[o.id] : null, all: counts ? counts.all[o.id] : 0, i }));
  if (counts) opts.sort((a, b) => b.n - a.n || b.all - a.all || a.i - b.i);
  const top = opts.slice(0, ONB_LOC_TOP);
  const shown = more ? opts : top.concat(opts.slice(ONB_LOC_TOP).filter((o) => value.includes(o.id)));
  const hidden = opts.length - shown.length;
  return html`<div class="onb-locs" role="group" aria-label=${label || "Locations"}>
    <div class="find-opts onb-opts">${shown.map((o) => {
      const id = `${idp}-loc-${o.id.replace(/\W+/g, "-")}`;
      return html`<label class="find-opt onb-opt" for=${id} key=${o.id}>
        <input id=${id} type="checkbox" checked=${value.includes(o.id)} onChange=${() => onChange(onbToggle(value, o.id))} />
        <span class="find-opt-l">${o.label}</span>
        ${o.n != null && html`<span class="find-opt-n">${fmt.num(o.n)}</span>`}
      </label>`;
    })}</div>
    ${(hidden > 0 || more) && html`<button type="button" class="onb-more" aria-expanded=${more ? "true" : "false"} onClick=${() => setMore(!more)}>${more ? "Show fewer" : `Show ${hidden} more`}</button>`}
    ${counts && html`<span class="onb-loc-basis">${onbLocBasis(roles, levels)}</span>`}
  </div>`;
}

/* ---------- Steps ---------- */
const ONB_OTHER_NOTE = "Most listings here are technical roles. You can still track any application.";
function OnbGroup({ title, hint, children, id }) {
  return html`<section class="onb-group" aria-labelledby=${id}>
    <div class="onb-group-head"><h3 id=${id}>${title}</h3>${hint && html`<span class="hint">${hint}</span>`}</div>
    ${children}
  </section>`;
}
function OnbStepTargets({ d, set }) {
  const locs = d.locations;
  return html`<div class="card onb-card">
    <${OnbGroup} id="onb-g-level" title="Level" hint="Leave empty to see both.">
      <div class="chips">${LEVELS.map((l) => html`<${Chip} key=${l.id} on=${d.levels.includes(l.id)} onClick=${() => set({ levels: onbToggle(d.levels, l.id) })}>${l.label}</${Chip}>`)}</div>
    </${OnbGroup}>
    <${OnbGroup} id="onb-g-role" title="Roles" hint="Tech-focused for now: software, data and AI, product, quant and hardware.">
      <div class="chips">${CATS.map((c) => html`<${Chip} key=${c} on=${d.roles.includes(c)} onClick=${() => set({ roles: onbToggle(d.roles, c) })}>${c}</${Chip}>`)}<${Chip} key="other" on=${!!d.other} onClick=${() => set({ other: !d.other })}>Something else</${Chip}></div>
      ${d.other && html`<p class="onb-note" role="status"><${Icon} name="info" size=${14} /><span>${ONB_OTHER_NOTE}</span></p>`}
    </${OnbGroup}>
    <${OnbGroup} id="onb-g-loc" title="Locations" hint="Leave empty to see every location.">
      <${OnbLocChecklist} idp="onb" value=${locs} roles=${d.roles} levels=${d.levels} onChange=${(v) => set({ locations: v })} />
      <div class="onb-switches">
        <${Switch} id="onb-remote" checked=${d.remote} onChange=${(v) => set({ remote: v, locations: v ? (locs.includes("remote") ? locs : [...locs, "remote"]) : locs.filter((x) => x !== "remote") })} label="Open to remote" />
        <${Switch} id="onb-sponsor" checked=${d.needsSponsor} onChange=${(v) => set({ needsSponsor: v })} label="I’ll need visa sponsorship" />
      </div>
    </${OnbGroup}>
    <${OnbGroup} id="onb-g-name" title="Name" hint="Optional. Only used to greet you.">
      <input id="onb-name" class="input onb-name" autocomplete="name" placeholder="e.g. Sam Lee" value=${d.name} maxlength="40" onInput=${(e) => set({ name: e.currentTarget.value })} aria-labelledby="onb-g-name" />
    </${OnbGroup}>
  </div>`;
}

function OnbJobRow({ j, f, p, onOpen, reason }) {
  return html`<button type="button" class="job-row onb-job" onClick=${() => onOpen(j.id)}>
    <${Logo} name=${j.co} />
    <div class="stack-sm" style="gap:2px;min-width:0">
      <span class="job-title truncate">${String(j.t || "").replace(/\s+-\s+/g, " – ")}</span>
      <${find_Meta} cls="job-meta find-row-meta" parts=${[j.co, onbLocText(j, p)]} />
      ${reason && html`<span class="onb-reason">${reason}</span>`}
    </div>
    <div class="job-side">${ghostLevel(j.g || 0) !== "low" && html`<${GhostScore} g=${j.g} />`}<${Fresh} ts=${j.p} />${f && html`<span class=${cx("fit", find_fitHi(f.score, j) && "hi")} title=${`Fit ${f.score} out of 100, from your targets and skills`}>Fit ${f.score}</span>`}</div>
  </button>`;
}

function OnbStepMatches({ d, examples, setExamples, onOpen }) {
  const J = useJobs();
  const list = useMemo(() => (J.status === "ready" ? onbMatches(J.jobs, d) : []), [J.status, J.jobs, d]);
  const top = useMemo(() => onbTop(list, d), [list, d]);
  const flagged = useMemo(() => onbFlagged(list, new Set(top.map((x) => x.j.id))), [list, top]);
  const low = list.filter((j) => (j.g || 0) < 25).length;
  const hasFit = top.some((x) => x.f);
  return html`<div class="stack onb-matches">
    <div class="card">
      ${J.status === "error"
        ? html`<${Empty} icon="alert" title="Couldn’t load job listings" action=${html`<${Btn} icon="refresh" onClick=${loadJobs}>Try again</${Btn}>`}>Your setup is saved either way. You can finish now and browse jobs once they load.</${Empty}>`
        : J.status !== "ready"
          ? html`<div class="onb-count"><div class="skel" style="height:28px;width:120px"></div><div class="skel" style="height:12px;width:70%"></div></div><${Skeleton} rows=${5} />`
          : html`<div class="onb-count">
              <div class="row wrap" style="align-items:baseline;gap:10px"><span class="onb-big num">${fmt.num(list.length)}</span><span class="onb-big-label">${list.length === 1 ? "open role matches" : "open roles match"}</span></div>
              <${find_Meta} cls="hint onb-summary" parts=${onbSummary(d)} />
              ${list.length > 0 && list.length > low && html`<span class="hint num">${fmt.num(list.length - low)} of these ${fmt.num(list.length)} show ghost-job signals, like being reposted again and again or open for months. We flag them so you don’t waste an application.</span>`}
              ${list.length > 0 && list.length === low && html`<span class="hint num">None of these show ghost-job signals right now.</span>`}
            </div>
            ${list.length === 0
              ? html`<div class="callout"><${Icon} name="info" /><span>Nothing open matches all of these right now. Go back and add a role or location, or finish and widen your search in Find jobs.</span></div>`
              : html`<div class="list onb-top" aria-label="Top matches">
                ${top.map(({ j, f }) => html`<${OnbJobRow} key=${j.id} j=${j} f=${f} p=${d} onOpen=${onOpen} />`)}
              </div>
              ${flagged && html`<div class="onb-flag-h"><span class="label">One we flagged</span><span class="hint">Still open, but worth a check before you apply.</span></div>
                <div class="list onb-top" aria-label="Flagged listing"><${OnbJobRow} j=${flagged} f=${fitScore(flagged, d)} p=${d} onOpen=${onOpen} reason=${flagged.gr[0]} /></div>`}`}
            <div class="onb-source"><span class="hint">${onbGenTs(J.meta) ? `Updated ${fmt.ago(onbGenTs(J.meta))} from SimplifyJobs.` : "From SimplifyJobs."} ${hasFit ? "Fit is out of 100." : "Tap a role to see its listing check."}</span></div>`}
    </div>
    ${d.other && html`<p class="onb-note" role="note"><${Icon} name="info" size=${14} /><span>${ONB_OTHER_NOTE}</span></p>`}
    <label class="check onb-ex" for="onb-examples">
      <input id="onb-examples" type="checkbox" checked=${examples} onChange=${(e) => setExamples(e.currentTarget.checked)} />
      <span class="stack-sm" style="gap:0"><span>Add example applications to explore</span><span class="hint">10 fictional applications. Clear them any time in Settings.</span></span>
    </label>
  </div>`;
}

const ONB_STEPS = [
  { title: "What are you looking for?", lede: "Pick what fits. You can change any of this later in Settings." },
  { title: "Add your resume (optional)", lede: "We use it to score fit and suggest interview talking points. Skip it if you’d rather not." },
  { title: "Here’s what’s open for you", lede: "Real listings that match your targets, best fit first.", ledeNoFit: "Real listings that match your targets, newest and most likely real first." },
];

/* Draft of the choices so far, kept in store.ui.onboardDraft so a reload resumes at the same step. */
function onbReadDraft() {
  const x = store.get().ui?.onboardDraft;
  if (!x || typeof x !== "object" || !x.d || !x.res) return null;
  return { step: Math.min(2, Math.max(0, x.step | 0)), d: x.d, res: { text: x.res.text || "", added: x.res.added || [], removed: x.res.removed || [] }, examples: !!x.examples };
}
const onbSaveDraft = (draft) => store.set((s) => ({ ...s, ui: { ...s.ui, onboardDraft: draft } }));

VIEWS.__onboarding = function Onboarding() {
  const start = useMemo(() => store.get().profile, []);
  const saved = useMemo(onbReadDraft, []);
  const [step, setStep] = useState(saved ? saved.step : 0);
  const [d, setD] = useState(() => saved ? { ...saved.d } : ({
    // no level pre-picked: empty means both, like Roles and Locations
    levels: !start.onboarded && (start.levels || []).length === LEVELS.length ? [] : start.levels || [], roles: start.roles || [], locations: start.locations || [],
    remote: start.remote !== false, needsSponsor: !!start.needsSponsor, name: start.name || "",
  }));
  const [res, setRes] = useState(() => (saved ? saved.res : onbEditorInit(start)));
  const [examples, setExamples] = useState(saved ? saved.examples : false);
  // save as the user goes (debounced, since the resume text can be long)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // nothing chosen yet: no draft, no "picking up" line
    const t = setTimeout(() => onbSaveDraft({ step, d, res, examples, at: Date.now() }), 300);
    return () => clearTimeout(t);
  }, [step, d, res, examples]);
  const top = useRef(null);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const draft = useMemo(() => ({ ...d, skills: onbEditorSkills(res) }), [d, res]);
  useEffect(() => { top.current?.scrollTo?.({ top: 0 }); const h = document.getElementById("onb-title"); h && h.focus({ preventScroll: true }); }, [step]);
  const commit = (done) => {
    store.set((s) => {
      const { onboardDraft, ...ui } = s.ui || {};
      const { other, ...dd } = d;
      return { ...s, ui: done ? ui : s.ui, profile: { ...s.profile, ...dd, name: d.name.trim(), resume: res.text.trim(), skills: onbEditorSkills(res), onboarded: done ? true : s.profile.onboarded } };
    });
  };
  const finish = (route = "today") => {
    commit(true);
    if (examples && !hasExamples()) loadExamples();
    go(route);
  };
  // "Just browse jobs": finish with whatever is picked (empty = everything) and land on the full list.
  const browse = () => { commit(true); go("find"); };
  const sample = () => { commit(true); if (!hasExamples()) loadExamples(); go("pipeline"); };
  // Tapping a preview finishes setup and opens that listing over Find (after the route change, which closes drawers).
  const openPreview = (id) => { finish("find"); setTimeout(() => openJob(id), 80); };
  const S = ONB_STEPS[step];
  return html`<div class="onboard-wrap" ref=${top} role="dialog" aria-modal="true" aria-label="Set up Heardback">
    <div class="onboard">
      <header class="onb-brand">
        <div class="row" style="gap:10px"><${BrandMark} size=${30} /><span class="onb-word">Heardback</span></div>
        <span class="spacer"></span>
        <button type="button" class="onb-link onb-browse" onClick=${browse}>Just browse jobs<${Icon} name="arrowR" size=${14} /></button>
      </header>
      ${saved && html`<p class="onb-resumed" role="status"><${Icon} name="check" size=${14} />Picking up where you left off.</p>`}
      ${step === 0 && html`<div class="onb-pitch">
        <p class="onb-value">Internship and new-grad listings, checked for ghost jobs. Track every application and interview in one calm place.</p>
        <p class="onb-trust"><${Icon} name="shield" size=${14} /><span>Free. Your data stays in this browser.</span></p>
      </div>`}
      ${step === 0 && typeof storage !== "undefined" && storage.corrupt && html`<div class="callout wait onb-corrupt" role="alert"><${Icon} name="alert" />
        <span class="onb-corrupt-text">Your saved data couldn’t be read, so setup started over. A copy was kept in this browser. If you exported a backup, restore it now.</span>
        <label class="btn sm onb-restore"><${Icon} name="upload" />Restore from backup<input id="onb-restore" class="sr" type="file" accept=".json,.csv,application/json,text/csv" onChange=${(e) => { const f = e.currentTarget.files && e.currentTarget.files[0]; e.currentTarget.value = ""; if (typeof pfImportFile === "function") pfImportFile(f); }} /></label>
      </div>`}
      <div class="onb-progress">
        <span class="onb-step-label num">Step ${step + 1} of 3</span>
        <div class="onboard-steps" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow=${step + 1} aria-label="Setup progress">${[0, 1, 2].map((i) => html`<i key=${i} class=${i <= step ? "on" : ""}></i>`)}</div>
      </div>
      <div>
        <h1 id="onb-title" tabindex="-1">${S.title}</h1>
        <p class="lede">${step === 2 && !draft.skills.length ? S.ledeNoFit : S.lede}</p>
      </div>
      ${step === 0 && html`<${OnbStepTargets} d=${d} set=${set} />`}
      ${step === 1 && html`<div class="card onb-card onb-card-pad"><${OnbResumeEditor} value=${res} onChange=${setRes} idp="onb-res" /></div>`}
      ${step === 2 && html`<${OnbStepMatches} d=${draft} examples=${examples} setExamples=${setExamples} onOpen=${openPreview} />`}
      <footer class="onb-foot">
        ${step > 0 ? html`<${Btn} icon="chevL" onClick=${() => setStep(step - 1)}>Back</${Btn}>` : html`<button type="button" class="onb-link onb-sample" onClick=${sample}>See a sample tracker first</button>`}
        <span class="spacer"></span>
        ${step === 1 && !res.text.trim() && !res.added.length ? html`<${Btn} kind="ghost" onClick=${() => setStep(2)}>Skip this step</${Btn}>` : null}
        ${step < 2
          ? html`<${Btn} kind="primary" iconRight="arrowR" onClick=${() => setStep(step + 1)} id="onb-next">Continue</${Btn}>`
          : html`<${Btn} kind="primary" iconRight="arrowR" onClick=${() => finish()} id="onb-finish">Start using Heardback</${Btn}>`}
      </footer>
    </div>
  </div>`;
};
