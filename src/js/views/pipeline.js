/* ===== Pipeline: board + table, application drawer, add / paste-email / draft modals ===== */

const PL_MAIN = ["saved", "applied", "screen", "interview", "offer"];
const PL_CLOSED = ["rejected", "ghosted"];
const PL_OUTCOMES = [{ id: "pending", label: "Pending" }, { id: "passed", label: "Passed" }, { id: "failed", label: "Didn't pass" }, { id: "cancelled", label: "Cancelled" }];
const PL_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/* ---------- helpers ---------- */
function plUi(patch) { store.set((s) => ({ ...s, ui: { ...s.ui, ...patch } })); }
function plCollapsed(s) { return s.ui.pipelineCollapsed || { rejected: true, ghosted: true }; }
function plSetCollapsed(stage, v) { const c = plCollapsed(store.get()); plUi({ pipelineCollapsed: { ...c, [stage]: v } }); }
function plUpcoming(a, t = now()) {
  return (a.rounds || []).filter((r) => r.at && r.at > t && r.outcome !== "cancelled").sort((x, y) => x.at - y.at)[0] || null;
}
function plWhen(ts) {
  const d0 = fmt.startOfDay(now()), d1 = fmt.startOfDay(ts);
  const diff = Math.round((d1 - d0) / DAY);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff > 1 && diff < 7 ? new Date(ts).toLocaleDateString(undefined, { weekday: "short" }) : fmt.date(ts);
  return `${day} ${fmt.time(ts)}`;
}
function plStageAt(a, stage) {
  const ev = [...(a.events || [])].reverse().find((e) => e.kind === "stage" && e.to === stage);
  return ev ? ev.at : null;
}
function plHref(u) { const x = (u || "").trim(); if (!x) return ""; return /^https?:\/\//i.test(x) ? x : `https://${x}`; }
function plFromDate(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : null; }
function plFurthest(a) {
  let i = PL_MAIN.includes(a.stage) ? STAGE[a.stage].i : STAGE.applied.i;
  for (const e of a.events || []) if (e.to && PL_MAIN.includes(e.to)) i = Math.max(i, STAGE[e.to].i);
  if (!a.appliedAt && !PL_MAIN.includes(a.stage)) i = Math.max(i, 0);
  return i;
}
function plFocusCard(id) {
  setTimeout(() => { const el = document.querySelector(`[data-card="${id}"]`); if (el) { el.focus(); el.scrollIntoView({ block: "nearest", inline: "nearest" }); } }, 40);
}
function plSortInCol(list) {
  const t = now();
  return [...list].sort((x, y) => {
    const ux = plUpcoming(x, t), uy = plUpcoming(y, t);
    if (ux && uy) return ux.at - uy.at;
    if (ux) return -1; if (uy) return 1;
    return (y.lastActivityAt || 0) - (x.lastActivityAt || 0);
  });
}

function plFirstName(s) { return (s || "").replace(/\([^)]*\)/g, "").split(/[,&;]| and /)[0].trim(); }

/* Card / table status line */
function plStatus(a, st) {
  const t = now();
  const up = plUpcoming(a, t);
  if (up && !PL_CLOSED.includes(a.stage)) return { icon: "cal", tone: "accent", text: `${ROUND[up.type]?.label || "Round"} · ${plWhen(up.at)}`, title: fmt.dateTime(up.at) };
  if (a.stage === "saved") return { icon: "bookmark", text: `Saved ${fmt.ago(a.createdAt)}` };
  if (a.stage === "offer") return { icon: "trophy", tone: "ok", text: `Offer ${fmt.ago(plStageAt(a, "offer") || a.lastReplyAt || a.lastActivityAt)}` };
  if (a.stage === "rejected") return { icon: "x", text: `Closed ${fmt.ago(plStageAt(a, "rejected") || a.lastActivityAt)}` };
  if (a.stage === "ghosted") return { icon: "ghost", text: `Ghosted ${fmt.ago(plStageAt(a, "ghosted") || a.lastActivityAt)}` };
  const silent = Apps.daysSilent(a);
  if (silent >= st.followUpDays) return { icon: silent >= st.ghostDays ? "ghost" : "clock", tone: "wait", text: `Silent ${silent}d`, title: `No reply in ${silent} days` };
  if (a.stage === "applied") return { icon: "send", text: `Applied ${fmt.ago(a.appliedAt)}` };
  return { icon: "reply", text: `Replied ${fmt.ago(a.lastReplyAt || a.lastActivityAt)}` };
}

/* What to do next, used by the table (short) and the drawer callout */
function plNextStep(a, st) {
  const t = now();
  const up = plUpcoming(a, t);
  const silent = Apps.daysSilent(a);
  const label = (r) => ROUND[r.type]?.label || "Interview";
  if (PL_CLOSED.includes(a.stage)) return a.stage === "rejected"
    ? { kind: "closed", icon: "flag", short: "Closed", title: "This one is closed", sub: "If you had interviews, it's fair to ask for brief feedback. Otherwise, let it go." }
    : { kind: "closed", icon: "ghost", short: "Closed", title: "Marked as ghosted", sub: "If they reply after all, move it back to the right stage." };
  if (a.stage === "offer") return { kind: "offer", icon: "trophy", tone: "ok", short: "Get the offer in writing", title: "You have an offer", sub: "Ask for the offer in writing and the decision deadline before you reply." };
  if (up) return { kind: "upcoming", icon: "cal", tone: "info", round: up, short: `${label(up)} ${fmt.until(up.at)}`, title: `${label(up)} ${fmt.until(up.at)}`, sub: `${fmt.dateTime(up.at)}${up.interviewers ? " · with " + up.interviewers : ""}` };
  const past = (a.rounds || []).filter((r) => r.at && r.at <= t && r.outcome === "pending").sort((x, y) => y.at - x.at)[0];
  if (past && !past.thanked && t - past.at < 2 * DAY) return { kind: "thanks", icon: "send", tone: "info", round: past, short: "Send a thank-you", title: "Send a thank-you note", sub: `Your ${label(past).toLowerCase()} was ${fmt.ago(past.at)}. A short note within 24 hours helps.` };
  if (past) return { kind: "outcome", icon: "flag", round: past, short: "Log the outcome", title: `How did the ${label(past).toLowerCase()} go?`, sub: `It was ${fmt.ago(past.at)}. Log the outcome and a few notes while you remember.` };
  if (a.stage === "saved") return { kind: "saved", icon: "bolt", short: "Apply", title: "Apply, then mark it applied", sub: `You saved this ${fmt.ago(a.createdAt)}. Early applicants tend to hear back more often.` };
  if (silent >= st.ghostDays) return { kind: "ghost", icon: "ghost", tone: "wait", short: "Mark as ghosted?", title: `No reply in ${silent} days. Mark as ghosted?`, sub: "Most companies reply within 3 weeks if they're interested. Marking it keeps your board honest. You can move it back any time." };
  if (a.stage === "applied" && silent >= st.followUpDays && !a.followedUpAt) return { kind: "follow", icon: "reply", tone: "wait", short: "Follow up", title: "Send a follow-up", sub: `You applied ${silent} days ago and haven't heard back. A short, specific note is fine.` };
  if (a.stage === "applied") {
    const due = (a.followedUpAt || a.appliedAt || t) + st.followUpDays * DAY;
    return { kind: "wait", icon: "clock", short: a.followedUpAt ? "Waiting after follow-up" : "Wait for a reply", title: "Waiting for a reply", sub: a.followedUpAt ? `You followed up ${fmt.ago(a.followedUpAt)}.` : `Heardback will suggest a follow-up on ${fmt.date(due)} if you haven't heard back.` };
  }
  return { kind: "schedule", icon: "cal", short: "Add next round", title: "Add the next round when it's scheduled", sub: "Log the date, type and interviewers so Heardback can remind you to prep and send a thank-you." };
}

/* Email parsing on top of the shared rule-based parser (fixes listed in the pipeline report) */
function plBody(raw) { return (raw || "").replace(/\r/g, "").split("\n").filter((l) => !/^\s*(from|to|cc|bcc|subject|date|sent|reply-to):/i.test(l)).join("\n"); }
function plFindTime(raw) {
  const body = plBody(raw);
  const re = /\b(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/gi;
  let m;
  while ((m = re.exec(body))) {
    const mon = PL_MONTHS.indexOf(m[1].toLowerCase()); const day = +m[2];
    if (mon < 0 || day < 1 || day > 31) continue;
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const tm = after.match(/^[^\n]*?\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
    let h = 10, min = 0;
    if (tm) { h = +tm[1] % 12; min = +(tm[2] || 0); if (/p/i.test(tm[3])) h += 12; }
    const yr = m[3] ? +m[3] : new Date().getFullYear();
    let at = new Date(yr, mon, day, h, min).getTime();
    if (!m[3] && at < now() - 30 * DAY) at = new Date(yr + 1, mon, day, h, min).getTime();
    return at;
  }
  return null;
}
function plParse(raw) {
  const p = parseEmail(raw);
  const low = (raw || "").toLowerCase();
  if (p.kind === "screen" && /technical interview|coding interview|onsite|on-site|final round|superday|system design|panel interview/.test(low)) {
    p.kind = "interview";
    p.roundType = /technical|coding|system design/.test(low) ? "technical" : /onsite|on-site|final|superday/.test(low) ? "onsite" : "other";
  }
  if (!p.company) {
    const m = (raw || "").match(/thank you for (?:applying|your (?:application|interest)) (?:to|at|with) ([A-Z][\w&.'\- ]{1,40}?)(?:[.!,\n]| for | and )/i);
    if (m && /^[A-Z]/.test(m[1])) p.company = m[1].trim();
  }
  p.interviewAt = p.kind === "interview" || p.kind === "screen" ? plFindTime(raw) : null;
  const iv = (raw || "").match(/\bwith ([A-Z][a-z]+(?: [A-Z][a-z.]+)?(?:,? (?:and|&) [A-Z][a-z]+(?: [A-Z][a-z.]+)?)?)(?=[\s:.,])/);
  p.interviewers = p.interviewAt && iv ? iv[1] : "";
  return p;
}
function plShouldMove(cur, to) {
  if (!to || to === cur) return false;
  if (to === "rejected" || to === "offer") return true;
  if (cur === "rejected" || cur === "ghosted") return to !== "applied";
  return STAGE[to].i > STAGE[cur].i;
}

const PL_SAMPLES = {
  confirmation: { label: "Confirmation", text: "From: Northwind Labs Recruiting <no-reply@northwindlabs.example>\nSubject: Thank you for applying to Northwind Labs\nDate: Mon, 2 Nov 2026 09:14:00 -0800\n\nHi Alex,\n\nThank you for applying to Northwind Labs. We have received your application for the Software Engineer Intern, Summer 2027 position, and our team will review it soon.\n\nIf your background is a match, a recruiter will reach out within two weeks.\n\nNorthwind Labs Recruiting Team\n\n(Sample email for trying Heardback. Northwind Labs is a fictional company.)" },
  interview: { label: "Interview", text: "From: Priya Shah <priya.shah@northwindlabs.example>\nSubject: Technical interview for Software Engineer Intern\nDate: Tue, 3 Nov 2026 11:02:00 -0800\n\nHi Alex,\n\nThanks for your time last week. We'd like to invite you to a technical interview for the Software Engineer Intern position at Northwind Labs.\n\nYour interview is scheduled for Thursday, Nov 5 at 2:00 pm PT over video. It will be 60 minutes with Priya Shah and Tom Lee: one coding problem and a short system design discussion.\n\nPlease reply to confirm this time works.\n\nBest,\nPriya Shah\nNorthwind Labs\n\n(Sample email for trying Heardback. Northwind Labs is a fictional company.)" },
  rejection: { label: "Rejection", text: "From: Quarry Analytics Careers <careers@quarryanalytics.example>\nSubject: Update on your application\nDate: Tue, 3 Nov 2026 08:40:00 -0800\n\nHi Alex,\n\nThank you for your application for the Data Science Intern role at Quarry Analytics, and for the time you put into it.\n\nAfter careful review, we have decided not to move forward with your application at this time. We'll keep your details on file for future openings.\n\nQuarry Analytics Talent Team\n\n(Sample email for trying Heardback. Quarry Analytics is a fictional company.)" },
  offer: { label: "Offer", text: "From: Fernhill Capital Talent <talent@fernhillcapital.example>\nSubject: Your offer from Fernhill Capital\nDate: Tue, 3 Nov 2026 16:20:00 -0500\n\nHi Alex,\n\nCongratulations. We are pleased to offer you a place in our summer program for the Quantitative Research Intern position at Fernhill Capital.\n\nYour offer letter with compensation details is attached. Please let us know your decision by Nov 17.\n\nWarm regards,\nFernhill Capital Talent Team\n\n(Sample email for trying Heardback. Fernhill Capital is a fictional company.)" },
};

/* Debounced text input that saves as you type and flushes on blur / unmount */
function PlText({ id, value, onSave, multiline, onStatus, delay = 450, cls, ...rest }) {
  const [v, setV] = useState(value || "");
  const timer = useRef(null), pending = useRef(null);
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const statusRef = useRef(onStatus); statusRef.current = onStatus;
  const flush = (quiet) => {
    clearTimeout(timer.current);
    if (pending.current == null) return;
    const x = pending.current; pending.current = null; saveRef.current(x);
    if (!quiet) statusRef.current?.("saved");
  };
  useEffect(() => () => flush(true), []);
  useEffect(() => { if (pending.current == null && document.activeElement?.id !== id) setV(value || ""); }, [value]);
  const onInput = (e) => { const x = e.currentTarget.value; setV(x); pending.current = x; statusRef.current?.("saving"); clearTimeout(timer.current); timer.current = setTimeout(() => flush(), delay); };
  return multiline
    ? html`<textarea id=${id} class=${cx("textarea", cls)} value=${v} onInput=${onInput} onBlur=${() => flush()} ...${rest}></textarea>`
    : html`<input id=${id} class=${cx("input", cls)} value=${v} onInput=${onInput} onBlur=${() => flush()} ...${rest} />`;
}

/* ---------- Pipeline view ---------- */
VIEWS.pipeline = function PipelineView() {
  const s = useStore();
  const view = s.ui.pipelineView === "table" ? "table" : "board";
  const [q, setQ] = useState("");
  const all = Apps.list(s);
  const n = norm(q);
  const apps = n ? all.filter((a) => norm(`${a.company} ${a.title} ${a.location}`).includes(n)) : all;
  const active = all.filter((a) => ACTIVE_STAGES.includes(a.stage)).length;
  const offers = all.filter((a) => a.stage === "offer").length;
  const sub = [pluralize(all.length, "application"), `${active} active`, offers ? pluralize(offers, "offer") : null].filter(Boolean).join(" · ");
  const examples = hasExamples(s) && s.settings.showExamples;

  if (!all.length) return html`<div class="page pl-page">
    <div class="page-head"><div><h1>Pipeline</h1><p>Every application you send, the stage it's in, and what to do next.</p></div></div>
    <${PlEmpty} />
  </div>`;

  return html`<div class=${cx("page wide pl-page", view === "board" && "pl-page-board")}>
    <div class="page-head pl-head">
      <div class="pl-head-title"><h1>Pipeline</h1><p class="num">${sub}</p></div>
      <span class="spacer"></span>
      <div class="pl-tools">
        <div class="input-icon pl-filter">
          <${Icon} name="filter" />
          <input id="pl-filter" class="input" type="search" placeholder="Filter by company or role" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }} aria-label="Filter applications by company or role" autocomplete="off" />
        </div>
        <${Seg} label="Layout" value=${view} onChange=${(v) => plUi({ pipelineView: v })} options=${[{ id: "board", label: "Board", icon: "board" }, { id: "table", label: "Table", icon: "list" }]} />
        <${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")} cls="pl-add-btn">Add application</${Btn}>
      </div>
    </div>
    ${examples && html`<div class="example-banner" role="note">
      <${Icon} name="info" />
      <span><b>You're looking at example applications.</b> They're labeled Example and don't count toward anything real.</span>
      <span class="spacer"></span>
      <${Btn} size="sm" onClick=${clearExamples}>Clear examples</${Btn}>
    </div>`}
    ${n && !apps.length && html`<div class="callout"><${Icon} name="search" /><span>No applications match “${q}”. <button type="button" class="pl-linkbtn" onClick=${() => setQ("")}>Clear the filter</button></span></div>`}
    ${view === "board" ? html`<${PlBoard} apps=${apps} settings=${s.settings} collapsed=${plCollapsed(s)} filtering=${!!n} />` : html`<${PlTable} apps=${apps} settings=${s.settings} sort=${s.ui.pipelineSort || { k: "activity", dir: -1 }} />`}
  </div>`;
};

function PlEmpty() {
  return html`<div class="card pl-empty">
    <div class="pl-empty-art" aria-hidden="true">
      ${["saved", "applied", "screen", "interview", "offer"].map((st, i) => html`<div class="pl-empty-col" key=${st}><span class=${cx("dot", st)}></span><i style=${`height:${[34, 54, 28, 18, 10][i]}px`}></i></div>`)}
    </div>
    <h2>Track every application in one place</h2>
    <p class="muted">Add jobs as you apply, log replies by pasting the email, and Heardback tells you when to follow up, prep, or let one go.</p>
    <div class="pl-empty-actions">
      <button type="button" class="pl-empty-act" onClick=${() => go("find")}><span class="pl-empty-ico"><${Icon} name="find" /></span><span><b>Find jobs</b><span>Browse live internship and new-grad roles</span></span></button>
      <button type="button" class="pl-empty-act" onClick=${() => openModal("add")}><span class="pl-empty-ico"><${Icon} name="plus" /></span><span><b>Add application</b><span>Log one you've already sent</span></span></button>
      <button type="button" class="pl-empty-act" onClick=${() => openModal("paste")}><span class="pl-empty-ico"><${Icon} name="mail" /></span><span><b>Paste an email</b><span>Turn a confirmation or invite into an entry</span></span></button>
    </div>
    <${Btn} kind="ghost" size="sm" onClick=${loadExamples}>Load example pipeline</${Btn}>
  </div>`;
}

/* ---------- Board ---------- */
function PlBoard({ apps, settings, collapsed, filtering }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [menu, setMenu] = useState(null);
  const by = useMemo(() => { const m = {}; STAGES.forEach((x) => (m[x.id] = [])); apps.forEach((a) => (m[a.stage] || m.applied).push(a)); for (const k in m) m[k] = plSortInCol(m[k]); return m; }, [apps]);

  const dropOn = (stage) => (e) => {
    e.preventDefault();
    const id = e.dataTransfer?.getData("text/plain") || drag;
    setOver(null); setDrag(null);
    if (id && Apps.get(id) && Apps.get(id).stage !== stage) { if (collapsed[stage]) plSetCollapsed(stage, false); Apps.move(id, stage); }
  };
  const dragOver = (stage) => (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; if (over !== stage) setOver(stage); };
  const dragLeave = (stage) => (e) => { if (!e.currentTarget.contains(e.relatedTarget) && over === stage) setOver(null); };

  const move = (a, to) => { if (!to || to === a.stage) return; if (collapsed[to]) plSetCollapsed(to, false); Apps.move(a.id, to); plFocusCard(a.id); };
  const onKey = (a) => (e) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key;
    if (k === "Enter" || k === " ") { e.preventDefault(); openApp(a.id); }
    else if (k === "ArrowRight" || k === "]" || k === "ArrowLeft" || k === "[") {
      e.preventDefault();
      const i = STAGE[a.stage].i + (k === "ArrowRight" || k === "]" ? 1 : -1);
      if (i >= 0 && i < STAGES.length) move(a, STAGES[i].id);
    } else if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      const cards = [...e.currentTarget.closest(".col-body").querySelectorAll(".app-card")];
      cards[cards.indexOf(e.currentTarget) + (k === "ArrowDown" ? 1 : -1)]?.focus();
    }
  };

  return html`<${Fragment}>
    <div class="board pl-board" role="list" aria-label="Pipeline board">
      ${STAGES.map((st) => {
        const list = by[st.id];
        const closed = PL_CLOSED.includes(st.id);
        if (closed && collapsed[st.id]) return html`<button type="button" role="listitem" key=${st.id} class=${cx("pl-rail", over === st.id && "drop")} onClick=${() => plSetCollapsed(st.id, false)} onDragOver=${dragOver(st.id)} onDragLeave=${dragLeave(st.id)} onDrop=${dropOn(st.id)} aria-label=${`Show ${st.label} column, ${pluralize(list.length, "application")}`} title=${`Show ${st.label}`} data-col=${st.id}>
          <span class=${cx("dot", st.id)}></span><span class="pl-rail-count num">${list.length}</span><span class="pl-rail-label">${st.label}</span>
        </button>`;
        return html`<section role="listitem" key=${st.id} class=${cx("col pl-col", closed && "pl-col-closed", over === st.id && "drop")} data-col=${st.id} aria-label=${`${st.label}, ${pluralize(list.length, "application")}`} onDragOver=${dragOver(st.id)} onDragLeave=${dragLeave(st.id)} onDrop=${dropOn(st.id)}>
          <header class="col-head">
            <span class=${cx("dot", st.id)}></span><span>${st.label}</span><span class="count">${list.length}</span>
            <span class="spacer"></span>
            ${closed && html`<${Btn} kind="ghost" size="sm" icon="chevL" cls="pl-col-hide" aria-label=${`Collapse ${st.label} column`} title="Collapse" onClick=${() => plSetCollapsed(st.id, true)} />`}
          </header>
          <div class="col-body">
            ${list.map((a) => html`<${PlCard} key=${a.id} a=${a} settings=${settings} dragging=${drag === a.id}
              onDragStart=${(e) => { e.dataTransfer.setData("text/plain", a.id); e.dataTransfer.effectAllowed = "move"; setDrag(a.id); }}
              onDragEnd=${() => { setDrag(null); setOver(null); }}
              onKeyDown=${onKey(a)}
              onMenu=${(el) => setMenu({ id: a.id, el })} />`)}
            ${!list.length && html`<div class="pl-col-empty">${drag ? "Drop here" : filtering ? "No matches" : st.id === "saved" ? "Jobs you save show up here" : closed ? "None" : "Nothing here yet"}</div>`}
          </div>
        </section>`;
      })}
    </div>
    <p class="pl-tip hide-sm" id="pl-kbd-hint">Drag cards between columns, or focus a card and press <${Kbd}>←</${Kbd}> <${Kbd}>→</${Kbd}> to move it a stage, <${Kbd}>↑</${Kbd}> <${Kbd}>↓</${Kbd}> to switch cards, <${Kbd}>↵</${Kbd}> to open.</p>
    ${menu && Apps.get(menu.id) && html`<${PlMoveMenu} a=${Apps.get(menu.id)} anchor=${menu.el} onPick=${(to) => move(Apps.get(menu.id), to)} onClose=${() => setMenu(null)} />`}
  </${Fragment}>`;
}

function PlCard({ a, settings, dragging, onMenu, ...rest }) {
  const stt = plStatus(a, settings);
  return html`<article class=${cx("app-card pl-card", dragging && "dragging")} tabindex="0" draggable="true" data-card=${a.id}
    aria-label=${`${a.title} at ${a.company}. ${STAGE[a.stage].label}. ${stt.text}.`} aria-describedby="pl-kbd-hint"
    onClick=${(e) => { if (!e.target.closest("button")) openApp(a.id); }} ...${rest}>
    <div class="pl-card-top">
      <${Logo} name=${a.company} size="sm" />
      <span class="pl-card-co truncate">${a.company}</span>
      <button type="button" class="pl-more" aria-label=${`Move ${a.company} to another stage`} aria-haspopup="menu" title="Move to…" onClick=${(e) => { e.stopPropagation(); onMenu(e.currentTarget); }}><${Icon} name="more" /></button>
    </div>
    <div class="app-card-title pl-card-title">${a.title || "Untitled role"}</div>
    ${(a.location || a.example) && html`<div class="pl-card-loc"><span class="truncate">${a.location}</span>${a.example && html`<${ExampleTag} />`}</div>`}
    <div class="app-card-foot pl-card-foot">
      <span class=${cx("pl-status", stt.tone)} title=${stt.title}><${Icon} name=${stt.icon} size=${13} /><span>${stt.text}</span></span>
    </div>
  </article>`;
}

function PlMoveMenu({ a, anchor, onPick, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = 216, h = ref.current ? ref.current.offsetHeight : 320;
    const left = clamp(r.right - w, 8, window.innerWidth - w - 8);
    const top = r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4;
    setPos({ left, top });
  }, []);
  useEffect(() => {
    setTimeout(() => ref.current?.querySelector("button[aria-checked='false']")?.focus(), 10);
    const down = (e) => { if (ref.current && !ref.current.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); anchor.focus?.(); } };
    const scr = () => onClose();
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", scr);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); window.removeEventListener("resize", scr); };
  }, []);
  const nav = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...ref.current.querySelectorAll("button")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return html`<div class="menu pl-menu" role="menu" aria-label=${`Move ${a.company}`} ref=${ref} onKeyDown=${nav} style=${pos ? `left:${pos.left}px;top:${pos.top}px` : "visibility:hidden;left:0;top:0"}>
    <div class="pl-menu-label">Move to</div>
    ${STAGES.map((st) => html`<button type="button" role="menuitemradio" key=${st.id} aria-checked=${a.stage === st.id ? "true" : "false"} onClick=${() => { onClose(); onPick(st.id); }}>
      <span class=${cx("dot", st.id)}></span><span style="flex:1">${st.label}</span>${a.stage === st.id && html`<${Icon} name="check" size=${14} />`}
    </button>`)}
    <div class="pl-menu-sep"></div>
    <button type="button" role="menuitem" onClick=${() => { onClose(); openApp(a.id); }}><${Icon} name="arrowR" size=${14} />Open details</button>
  </div>`;
}

/* ---------- Table ---------- */
const PL_COLS = [
  { k: "company", label: "Company / role", v: (a) => `${a.company} ${a.title}`.toLowerCase() },
  { k: "stage", label: "Stage", v: (a) => STAGE[a.stage].i },
  { k: "applied", label: "Applied", v: (a) => a.appliedAt || 0 },
  { k: "activity", label: "Last activity", v: (a) => a.lastActivityAt || 0 },
  { k: "next", label: "Next step", v: (a) => { const u = plUpcoming(a); return u ? -1e15 + u.at : PL_CLOSED.includes(a.stage) ? 1e15 : 0; } },
  { k: "silent", label: "Days silent", v: (a) => (ACTIVE_STAGES.includes(a.stage) ? Apps.daysSilent(a) : -1), num: true },
];
function PlTable({ apps, settings, sort }) {
  const col = PL_COLS.find((c) => c.k === sort.k) || PL_COLS[3];
  const rows = useMemo(() => [...apps].sort((x, y) => { const a = col.v(x), b = col.v(y); return (a < b ? -1 : a > b ? 1 : 0) * sort.dir; }), [apps, sort.k, sort.dir]);
  const setSort = (k) => plUi({ pipelineSort: { k, dir: sort.k === k ? -sort.dir : k === "company" || k === "stage" || k === "next" ? 1 : -1 } });
  return html`<div class="card pl-table-card">
    <div class="table-wrap">
      <table class="table pl-table">
        <thead><tr>${PL_COLS.map((c) => html`<th key=${c.k} class=${cx(c.num && "pl-num")} aria-sort=${sort.k === c.k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
          <button type="button" onClick=${() => setSort(c.k)}>${c.label}${sort.k === c.k ? html`<${Icon} name=${sort.dir > 0 ? "chevD" : "chevD"} size=${12} cls=${cx("pl-sort", sort.dir < 0 && "desc")} />` : html`<${Icon} name="sort" size=${12} cls="pl-sort-idle" />`}</button>
        </th>`)}</tr></thead>
        <tbody>
          ${rows.map((a) => {
            const ns = plNextStep(a, settings);
            const silent = ACTIVE_STAGES.includes(a.stage) ? Apps.daysSilent(a) : null;
            return html`<tr key=${a.id} tabindex="0" onClick=${(e) => { if (!e.target.closest("select")) openApp(a.id); }} onKeyDown=${(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openApp(a.id); }}>
              <td><div class="pl-tcell"><${Logo} name=${a.company} size="sm" /><div class="pl-tname"><span class="pl-ttitle truncate">${a.title || "Untitled role"}</span><span class="pl-tco truncate">${a.company}${a.location ? " · " + a.location : ""}</span><span class=${cx("pl-next pl-tnext-m", ns.tone)}>${ns.short}${silent != null && silent >= settings.followUpDays ? ` · ${silent}d silent` : ""}</span></div>${a.example && html`<${ExampleTag} />`}</div></td>
              <td><span class="pl-stage-sel"><span class=${cx("dot", a.stage)}></span><select id=${"pl-st-" + a.id} class="select" value=${a.stage} aria-label=${`Stage for ${a.company}`} onChange=${(e) => Apps.move(a.id, e.currentTarget.value)}>${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}</select></span></td>
              <td class="num muted">${a.appliedAt ? fmt.date(a.appliedAt) : html`<span class="faint">—</span>`}</td>
              <td class="num muted">${fmt.ago(a.lastActivityAt)}</td>
              <td><span class=${cx("pl-next", ns.tone)}>${ns.short}</span></td>
              <td class="num pl-num">${silent == null ? html`<span class="faint">—</span>` : html`<span class=${cx(silent >= settings.followUpDays && "pl-warn")}>${silent}</span>`}</td>
            </tr>`;
          })}
          ${!rows.length && html`<tr><td colspan="6" class="faint" style="text-align:center">No applications match the filter.</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---------- Application drawer ---------- */
DRAWERS.app = function PlAppDrawer({ id, tab }) {
  const a = useStore((s) => s.apps[id]);
  const settings = useStore((s) => s.settings);
  const jobs = useJobs();
  const [t, setT] = useState(tab || "overview");
  useEffect(() => { if (tab) setT(tab); }, [tab]);
  if (!a) return html`<${Drawer} onClose=${closeDrawer} label="Application" head=${html`<div class="pl-dhead"><h2 class="pl-dtitle">Application not found</h2></div>`}>
    <${Empty} icon="info" title="This application isn't here anymore">It may have been deleted, or cleared along with the example data.</${Empty}>
  </${Drawer}>`;
  const hasCo = jobs.status === "ready" && (jobs.byCompany.has(a.company) || jobs.cstats[a.company]);
  const del = () => askConfirm({ title: `Delete ${a.company}?`, body: `This removes ${a.title || "this application"} with its rounds, notes and timeline from this device. You can undo right after.`, confirmLabel: "Delete application", danger: true, onConfirm: () => { closeDrawer(); Apps.remove(a.id); } });
  const head = html`<div class="pl-dhead">
    <${Logo} name=${a.company} size="lg" />
    <div class="pl-dhead-text">
      <h2 class="pl-dtitle">${a.title || "Untitled role"}</h2>
      <div class="pl-dsub">
        ${hasCo ? html`<button type="button" class="pl-linkbtn" onClick=${() => openCompany(a.company)}>${a.company}</button>` : html`<span class="pl-dco">${a.company}</span>`}
        ${a.location && html`<span class="pl-sep">·</span><span>${a.location}</span>`}
        ${a.example && html`<${ExampleTag} />`}
      </div>
    </div>
  </div>`;
  const foot = html`
    ${a.url && html`<a class="btn" href=${plHref(a.url)} target="_blank" rel="noopener"><${Icon} name="ext" />Open posting</a>`}
    <${Btn} icon="reply" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft follow-up</${Btn}>
    <span class="spacer" style="flex:1"></span>
    <${Btn} kind="ghost" cls="danger" icon="trash" onClick=${del}>Delete</${Btn}>`;
  const rc = (a.rounds || []).length;
  return html`<${Drawer} onClose=${closeDrawer} label=${`${a.company}: ${a.title}`} head=${head} foot=${foot}>
    <${PlStepper} a=${a} />
    <div class="pl-tabs">
      <${Seg} label="Sections" value=${t} onChange=${setT} options=${[{ id: "overview", label: "Overview" }, { id: "rounds", label: rc ? `Rounds ${rc}` : "Rounds" }, { id: "timeline", label: "Timeline" }, { id: "notes", label: "Notes" }]} />
    </div>
    ${t === "overview" && html`<${PlOverview} a=${a} settings=${settings} jobs=${jobs} setTab=${setT} />`}
    ${t === "rounds" && html`<${PlRounds} a=${a} />`}
    ${t === "timeline" && html`<${PlTimeline} a=${a} />`}
    ${t === "notes" && html`<${PlNotes} a=${a} />`}
  </${Drawer}>`;
};

function PlStepper({ a }) {
  const cur = STAGE[a.stage].i;
  const far = plFurthest(a);
  const closed = PL_CLOSED.includes(a.stage);
  const since = plStageAt(a, a.stage) || (a.stage === "saved" ? a.createdAt : a.appliedAt);
  return html`<div class="pl-stepper" role="group" aria-label="Stage">
    <div class="pl-steps">
      ${PL_MAIN.map((id, i) => {
        const st = STAGE[id];
        const state = !closed && i === cur ? "cur" : (!closed && i < cur) || (closed && i <= far) ? "done" : "";
        return html`<button type="button" key=${id} class=${cx("pl-step", state, closed && "muted-done")} aria-pressed=${!closed && i === cur ? "true" : "false"} onClick=${() => Apps.move(a.id, id)} title=${`Move to ${st.label} (press ${i + 1})`}>
          <i></i><span class="pl-step-l">${st.label}</span><span class="pl-step-s">${st.short}</span>
        </button>`;
      })}
    </div>
    <div class="pl-stage-line">
      <span class="pl-small muted"><span class=${cx("dot", a.stage)}></span>${STAGE[a.stage].label}${since ? ` since ${fmt.date(since)}` : ""}</span>
      <span class="spacer" style="flex:1"></span>
      ${PL_CLOSED.map((id) => html`<button type="button" key=${id} class=${cx("pl-close-btn", id, a.stage === id && "on")} aria-pressed=${a.stage === id ? "true" : "false"} onClick=${() => Apps.move(a.id, id)} title=${`Move to ${STAGE[id].label} (press ${STAGE[id].i + 1})`}>
        <${Icon} name=${id === "ghosted" ? "ghost" : "x"} size=${14} />${a.stage === id ? STAGE[id].label : id === "rejected" ? "Mark rejected" : "Mark ghosted"}
      </button>`)}
    </div>
  </div>`;
}

function PlOverview({ a, settings, jobs, setTab }) {
  const ns = plNextStep(a, settings);
  const job = a.jobId && jobs.status === "ready" ? jobs.byId.get(a.jobId) : null;
  const silent = Apps.daysSilent(a);
  const replyTxt = a.lastReplyAt ? `${pluralize(fmt.days(a.lastReplyAt), "day")} · last reply ${fmt.date(a.lastReplyAt)}` : a.appliedAt ? `No reply yet · applied ${pluralize(fmt.days(a.appliedAt), "day")} ago` : "Not applied yet";
  const actions = {
    upcoming: html`<${Btn} size="sm" kind="primary" icon="prep" onClick=${() => { plPrep(a, ns.round); }}>Prep for this round</${Btn}><${Btn} size="sm" onClick=${() => setTab("rounds")}>View rounds</${Btn}>`,
    thanks: html`<${Btn} size="sm" kind="primary" icon="send" onClick=${() => openModal("draft", { appId: a.id, roundId: ns.round?.id, mode: "thanks" })}>Draft thank-you</${Btn}><${Btn} size="sm" onClick=${() => setTab("rounds")}>Log outcome</${Btn}>`,
    outcome: html`<${Btn} size="sm" kind="primary" onClick=${() => setTab("rounds")}>Log outcome</${Btn}>`,
    saved: html`<${Btn} size="sm" kind="primary" icon="check" onClick=${() => Apps.move(a.id, "applied")}>Mark as applied</${Btn}>${a.url && html`<a class="btn sm" href=${plHref(a.url)} target="_blank" rel="noopener"><${Icon} name="ext" />Open posting</a>`}`,
    ghost: html`<${Btn} size="sm" kind="primary" icon="ghost" onClick=${() => Apps.move(a.id, "ghosted")}>Mark as ghosted</${Btn}><${Btn} size="sm" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft a last follow-up</${Btn}>`,
    follow: html`<${Btn} size="sm" kind="primary" icon="reply" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft follow-up</${Btn}>`,
    schedule: html`<${Btn} size="sm" icon="plus" onClick=${() => { Apps.addRound(a.id, { type: a.stage === "screen" ? "recruiter" : "technical" }); setTab("rounds"); }}>Add round</${Btn}>`,
    offer: html`<${Btn} size="sm" icon="edit" onClick=${() => setTab("notes")}>Note the deadline</${Btn}>`,
  }[ns.kind];
  return html`<div class="pl-ov">
    <div class=${cx("pl-next-card", ns.tone)}>
      <span class="pl-next-ico"><${Icon} name=${ns.icon} /></span>
      <div class="stack-sm" style="flex:1">
        <span class="pl-eyebrow">Next step</span>
        <strong>${ns.title}</strong>
        <span class="muted pl-small">${ns.sub}</span>
        ${actions && html`<div class="row wrap pl-next-actions">${actions}</div>`}
      </div>
    </div>

    <section class="stack">
      <h3 class="section-title">Details</h3>
      <div class="pl-kv">
        <label for="pl-applied">Applied on</label>
        <input id="pl-applied" type="date" class="input" value=${fmt.toDateInput(a.appliedAt)} onChange=${(e) => Apps.update(a.id, { appliedAt: plFromDate(e.currentTarget.value) })} />
        <label for="pl-url">Posting link</label>
        <div class="row pl-url-row">
          <${PlText} id="pl-url" type="url" value=${a.url} placeholder="https://" onSave=${(v) => Apps.update(a.id, { url: v.trim() })} />
          ${a.url && html`<a class="btn icon" href=${plHref(a.url)} target="_blank" rel="noopener" aria-label="Open posting in a new tab" title="Open posting"><${Icon} name="ext" /></a>`}
        </div>
        <label for="pl-loc">Location</label>
        <${PlText} id="pl-loc" value=${a.location} placeholder="City, or Remote" onSave=${(v) => Apps.update(a.id, { location: v })} />
        <label for="pl-salary">Salary</label>
        <${PlText} id="pl-salary" value=${a.salary} placeholder="e.g. $45/hr or $120k base" onSave=${(v) => Apps.update(a.id, { salary: v })} />
        <span class="pl-kv-k">Since last reply</span>
        <span class=${cx("pl-kv-v num", ACTIVE_STAGES.includes(a.stage) && silent >= settings.followUpDays && "pl-warn")}>${replyTxt}</span>
        ${a.followedUpAt && html`<span class="pl-kv-k">Followed up</span><span class="pl-kv-v num">${fmt.dateY(a.followedUpAt)}</span>`}
      </div>
    </section>

    ${job && html`<section class="stack">
      <h3 class="section-title">Posting</h3>
      <div class="pl-job card">
        <div class="stack-sm" style="flex:1;min-width:0">
          <span class="truncate" style="font-weight:500">${job.t}</span>
          <span class="row wrap pl-small muted"><${GhostScore} g=${job.g} /><span class="pl-sep">·</span><span>Posted ${fmt.ago(job.p)}</span></span>
        </div>
        <${Btn} size="sm" iconRight="chevR" onClick=${() => openJob(job.id)}>View listing</${Btn}>
      </div>
    </section>`}

    <${PlContacts} a=${a} />
  </div>`;
}

function plPrep(a, r) {
  store.set((s) => ({ ...s, ui: { ...s.ui, prepFocus: { appId: a.id, roundId: r?.id || null } } }));
  closeDrawer(); go("prep");
}

function PlContacts({ a }) {
  const [f, setF] = useState({ name: "", role: "", email: "" });
  const [err, setErr] = useState("");
  const add = (e) => {
    e?.preventDefault();
    if (!f.name.trim()) { setErr("Add a name first."); document.getElementById("pl-c-name")?.focus(); return; }
    Apps.update(a.id, (x) => ({ contacts: [...(x.contacts || []), { name: f.name.trim(), role: f.role.trim(), email: f.email.trim() }] }));
    setF({ name: "", role: "", email: "" }); setErr("");
    document.getElementById("pl-c-name")?.focus();
  };
  const rm = (i) => { const c = a.contacts[i]; Apps.update(a.id, (x) => ({ contacts: x.contacts.filter((_, j) => j !== i) })); toast(`Removed ${c.name}`, { undo: () => Apps.update(a.id, (x) => { const n = [...x.contacts]; n.splice(i, 0, c); return { contacts: n }; }) }); };
  const contacts = a.contacts || [];
  return html`<section class="stack">
    <h3 class="section-title">Contacts <span class="count">${contacts.length || ""}</span></h3>
    ${contacts.length ? html`<div class="list pl-contacts">${contacts.map((c, i) => html`<div class="pl-contact" key=${c.name + i}>
      <span class="pl-avatar" aria-hidden="true">${initials(c.name)}</span>
      <div class="stack-sm" style="gap:0;flex:1;min-width:0"><span class="truncate" style="font-weight:500">${c.name}</span><span class="truncate muted pl-small">${[c.role, c.email].filter(Boolean).join(" · ") || "No role or email"}</span></div>
      ${c.email && html`<${Btn} kind="ghost" size="sm" icon="copy" aria-label=${`Copy ${c.name}'s email`} title="Copy email" onClick=${() => copyText(c.email, "Email copied")} />`}
      <${Btn} kind="ghost" size="sm" icon="x" aria-label=${`Remove ${c.name}`} title="Remove" onClick=${() => rm(i)} />
    </div>`)}</div>` : html`<p class="muted pl-small">Recruiters and interviewers you talk to. Heardback uses the first name here in follow-up drafts.</p>`}
    <form class="pl-contact-form" onSubmit=${add}>
      <input id="pl-c-name" class="input" placeholder="Name" aria-label="Contact name" value=${f.name} onInput=${(e) => { setF({ ...f, name: e.currentTarget.value }); setErr(""); }} aria-invalid=${err ? "true" : undefined} />
      <input id="pl-c-role" class="input" placeholder="Role (e.g. Recruiter)" aria-label="Contact role" value=${f.role} onInput=${(e) => setF({ ...f, role: e.currentTarget.value })} />
      <input id="pl-c-email" class="input" type="email" placeholder="Email" aria-label="Contact email" value=${f.email} onInput=${(e) => setF({ ...f, email: e.currentTarget.value })} />
      <button type="submit" class="btn"><${Icon} name="plus" />Add</button>
    </form>
    ${err && html`<span class="pl-err" role="alert">${err}</span>`}
  </section>`;
}

/* Rounds */
function PlRounds({ a }) {
  const rounds = [...(a.rounds || [])].sort((x, y) => (x.at || 9e15) - (y.at || 9e15));
  const add = () => {
    const r = Apps.addRound(a.id, { type: a.stage === "screen" || a.stage === "applied" ? "recruiter" : "technical" });
    setTimeout(() => { const el = document.getElementById(`pl-r-${r.id}-type`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus(); }, 60);
  };
  return html`<div class="stack">
    <div class="row"><span class="muted pl-small" style="flex:1">${rounds.length ? "Each round gets a prep reminder before it and a thank-you nudge after it." : ""}</span>${rounds.length > 0 && html`<${Btn} size="sm" icon="plus" onClick=${add}>Add round</${Btn}>`}</div>
    ${!rounds.length && html`<div class="card"><${Empty} icon="cal" title="No rounds yet" action=${html`<${Btn} kind="primary" icon="plus" onClick=${add}>Add round</${Btn}>`}>Log each interview with its date, type and interviewers. Heardback reminds you to prep and to send a thank-you.</${Empty}></div>`}
    ${rounds.map((r) => html`<${PlRound} key=${r.id} a=${a} r=${r} />`)}
  </div>`;
}

function PlRound({ a, r }) {
  const upd = (p) => Apps.updateRound(a.id, r.id, p);
  const pid = `pl-r-${r.id}`;
  const t = now();
  const when = r.at ? (r.at > t ? html`<span class="badge info">${fmt.until(r.at)}</span>` : html`<span class="badge">Past</span>`) : html`<span class="badge outline">No date</span>`;
  const del = () => askConfirm({ title: "Delete this round?", body: `This removes the ${(ROUND[r.type]?.label || "round").toLowerCase()} and its notes. This can't be undone.`, confirmLabel: "Delete round", danger: true, onConfirm: () => { Apps.removeRound(a.id, r.id); toast("Round deleted"); } });
  return html`<div class="round pl-round" data-round=${r.id}>
    <div class="pl-round-head">
      <select id=${pid + "-type"} class="select pl-round-type" value=${r.type} aria-label="Round type" onChange=${(e) => upd({ type: e.currentTarget.value })}>${ROUND_TYPES.map((x) => html`<option key=${x.id} value=${x.id}>${x.label}</option>`)}</select>
      <input id=${pid + "-at"} type="datetime-local" class="input pl-round-at" aria-label="Date and time" value=${fmt.toInput(r.at)} onChange=${(e) => upd({ at: fmt.fromInput(e.currentTarget.value) })} />
      ${when}
    </div>
    <div class="pl-round-out">
      <span class="label" id=${pid + "-out-l"}>Outcome</span>
      <div class="seg pl-outcome" role="group" aria-labelledby=${pid + "-out-l"}>${PL_OUTCOMES.map((o) => html`<button type="button" key=${o.id} class=${"o-" + o.id} aria-pressed=${r.outcome === o.id ? "true" : "false"} onClick=${() => upd({ outcome: o.id })}>${o.label}</button>`)}</div>
    </div>
    <${Field} label="Interviewers" id=${pid + "-who"}><${PlText} id=${pid + "-who"} value=${r.interviewers} placeholder="Names and roles, e.g. Priya S. (Eng manager)" onSave=${(v) => upd({ interviewers: v })} /></${Field}>
    <div class="pl-round-grid">
      <${Field} label="Prep notes" id=${pid + "-prep"}><${PlText} multiline id=${pid + "-prep"} rows="3" value=${r.prep} placeholder="Topics to review, stories to tell, questions to ask" onSave=${(v) => upd({ prep: v })} /></${Field}>
      <${Field} label="How it went" id=${pid + "-refl"}><${PlText} multiline id=${pid + "-refl"} rows="3" value=${r.reflection} placeholder="What they asked, what went well, what to improve" onSave=${(v) => upd({ reflection: v })} /></${Field}>
    </div>
    <div class="pl-round-foot">
      <label class="check" for=${pid + "-thx"}><input id=${pid + "-thx"} type="checkbox" checked=${!!r.thanked} onChange=${(e) => upd({ thanked: e.currentTarget.checked })} />Thank-you sent</label>
      <span class="spacer" style="flex:1"></span>
      <${Btn} kind="ghost" size="sm" icon="trash" aria-label="Delete round" title="Delete round" onClick=${del} />
      <${Btn} size="sm" icon="prep" onClick=${() => plPrep(a, r)}>Prep for this round</${Btn}>
      <${Btn} size="sm" icon="send" onClick=${() => openModal("draft", { appId: a.id, roundId: r.id, mode: "thanks" })}>Draft thank-you</${Btn}>
    </div>
  </div>`;
}

/* Timeline */
const PL_EV_ICON = { created: "plus", round: "cal", email: "mail", note: "edit", followup: "reply", thanks: "send" };
function plEvIcon(e) {
  if (e.kind === "stage") return { offer: "trophy", rejected: "x", ghosted: "ghost", interview: "cal", screen: "reply", applied: "send", saved: "bookmark" }[e.to] || "arrowR";
  return PL_EV_ICON[e.kind] || "info";
}
function PlTimeline({ a }) {
  const [txt, setTxt] = useState("");
  const evs = [...(a.events || [])].sort((x, y) => y.at - x.at);
  const add = (e) => {
    e.preventDefault();
    const v = txt.trim(); if (!v) return;
    Apps.update(a.id, (x) => ({ events: [...x.events, { id: uid("e_"), at: now(), kind: "note", text: v }] }));
    setTxt("");
  };
  return html`<div class="stack">
    <form class="pl-quicknote" onSubmit=${add}>
      <input id="pl-tl-note" class="input" placeholder="Add a quick note, e.g. “Recruiter said decisions by Friday”" value=${txt} onInput=${(e) => setTxt(e.currentTarget.value)} aria-label="Quick note" />
      <button type="submit" class="btn" disabled=${!txt.trim()}>Add note</button>
    </form>
    <div class="timeline pl-tl">
      ${evs.map((e) => html`<div class=${cx("tl-item", "k-" + e.kind, e.to && "to-" + e.to)} key=${e.id}>
        <span class="tl-dot"><${Icon} name=${plEvIcon(e)} size=${12} /></span>
        <div class="stack-sm" style="gap:1px">
          <span class="tl-text">${e.text}</span>
          <span class="tl-when num">${fmt.dateY(e.at)} · ${fmt.time(e.at)}</span>
        </div>
      </div>`)}
    </div>
  </div>`;
}

function PlNotes({ a }) {
  const [st, setSt] = useState("idle");
  return html`<div class="stack">
    <div class="row"><label class="label" for="pl-notes" style="flex:1">Notes</label>
      <span class=${cx("pl-saved", st)} aria-live="polite">${st === "saving" ? "Saving…" : st === "saved" ? html`<${Icon} name="check" size=${13} />Saved` : "Saves automatically on this device"}</span></div>
    <${PlText} multiline id="pl-notes" cls="pl-notes" value=${a.notes} onStatus=${setSt} delay=${600} placeholder="Anything worth remembering: why you applied, referral details, team names, compensation notes, deadlines." onSave=${(v) => Apps.update(a.id, { notes: v })} />
  </div>`;
}

/* ---------- Draft modal (follow-up / thank-you) ----------
   openModal(kind, props) spreads props over {kind}, so a `kind` prop replaces the modal kind.
   Supported: openModal("draft", {appId, roundId, mode: "follow"|"thanks"}) and, for callers that pass
   {kind: "thanks"|"follow"}, the aliases MODALS.thanks / MODALS.follow below. */
MODALS.draft = (p) => html`<${PlDraft} ...${p} kind=${(p.mode || p.kind) === "thanks" ? "thanks" : "follow"} />`;
MODALS.thanks = (p) => html`<${PlDraft} ...${p} kind="thanks" />`;
MODALS.follow = (p) => html`<${PlDraft} ...${p} kind="follow" />`;
function PlDraft({ appId, roundId, kind = "follow" }) {
  const a = Apps.get(appId);
  const profile = useStore((s) => s.profile);
  const c = useCaps();
  const r = a && roundId ? (a.rounds || []).find((x) => x.id === roundId) : null;
  const thanks = kind === "thanks";
  const tpl = a ? (thanks ? thankYouTemplate(a, r ? { ...r, interviewers: plFirstName(r.interviewers), reflection: "" } : r, profile) : followUpTemplate(a, profile)) : "";
  const [text, setText] = useState(tpl);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [err, setErr] = useState("");
  const ctrl = useRef(null);
  const before = useRef(tpl);
  useEffect(() => { setTimeout(() => { const t = document.getElementById("pl-draft"); if (t) { t.focus(); t.setSelectionRange(0, 0); t.scrollTop = 0; } }, 60); return () => ctrl.current?.abort(); }, []);
  if (!a) return html`<${Modal} title="Draft" onClose=${closeModal}><p class="muted">This application isn't here anymore.</p></${Modal}>`;

  const improve = async () => {
    setErr(""); setBusy(true); before.current = text;
    const ac = new AbortController(); ctrl.current = ac;
    const name = profile.name && profile.name.trim();
    const draft = name ? text.split(name).join("[Your name]") : text;
    const facts = [
      `Role: ${a.title || "unknown"} at ${a.company}. Current stage: ${STAGE[a.stage].label}.`,
      a.appliedAt && `Applied on ${fmt.dateY(a.appliedAt)}.`,
      a.contacts?.[0]?.name && `Contact: ${a.contacts[0].name}${a.contacts[0].role ? " (" + a.contacts[0].role + ")" : ""}.`,
      r && `Interview round: ${ROUND[r.type]?.label || "interview"}${r.at ? " on " + fmt.dateY(r.at) : ""}${r.interviewers ? " with " + r.interviewers : ""}.`,
      r?.reflection && `The candidate's notes on how it went: ${r.reflection}`,
    ].filter(Boolean).join("\n");
    const prompt = `Rewrite this ${thanks ? "thank-you email to send after a job interview" : "follow-up email about a job application that hasn't had a reply"}.
Make it concise, specific, warm and not generic. Under 120 words including the subject line. Keep "Subject:" as the first line. Use only the facts below and in the draft; do not invent experience, projects, names or details. Keep "[Your name]" as the sign-off placeholder. Return only the email text, no commentary.

Facts:
${facts}

Draft:
"""
${draft}
"""`;
    try {
      const res = await askClaude(prompt, { signal: ac.signal, onText: (x) => { const v = typeof x === "string" ? x : x?.text; if (v) setText(name ? v.split("[Your name]").join(name) : v); } });
      const out = (res?.text || "").trim();
      if (out) setText(name ? out.split("[Your name]").join(name) : out);
      setAi(true);
    } catch (e) {
      if (ac.signal.aborted || e?.name === "AbortError") { setText(before.current); }
      else { setErr(aiErr(e)); setText(before.current); }
    } finally { setBusy(false); ctrl.current = null; }
  };
  const stop = () => ctrl.current?.abort();
  const sent = () => {
    if (thanks && r) { Apps.updateRound(a.id, r.id, { thanked: true }); Apps.update(a.id, (x) => ({ events: [...x.events, { id: uid("e_"), at: now(), kind: "thanks", text: `Sent thank-you for ${ROUND[r.type]?.label || "interview"}` }] })); toast("Marked the thank-you as sent"); }
    else if (thanks) { Apps.update(a.id, (x) => ({ events: [...x.events, { id: uid("e_"), at: now(), kind: "thanks", text: "Sent a thank-you note" }] })); toast("Marked the thank-you as sent"); }
    else { Apps.update(a.id, { followedUpAt: now() }); Apps.addEvent(a.id, { kind: "followup", text: "Followed up" }); toast(`Logged your follow-up to ${a.company}`); }
    closeModal();
  };
  const title = thanks ? `Thank-you note · ${a.company}` : `Follow-up · ${a.company}`;
  return html`<${Modal} title=${title} onClose=${closeModal} size="lg" foot=${html`
    <${Btn} icon="copy" onClick=${() => copyText(text, "Draft copied")} disabled=${busy}>Copy</${Btn}>
    <${Btn} kind="primary" icon="check" onClick=${sent} disabled=${busy}>Mark as sent</${Btn}>`}>
    <div class="callout"><${Icon} name="info" /><span>Copy this into your own email and send it from your inbox. Then mark it as sent so Heardback ${thanks ? "stops reminding you" : "restarts the reply clock"}.</span></div>
    <div class="field">
      <div class="row"><label for="pl-draft" style="flex:1" class="label">${thanks ? "Thank-you note" : "Follow-up email"}</label>
        ${ai && !busy && html`<span class="ai-label"><${Icon} name="spark" />Drafted by Claude. Review before sending.</span>`}</div>
      <textarea id="pl-draft" class=${cx("textarea pl-draft", busy && "busy")} value=${text} readOnly=${busy} onInput=${(e) => setText(e.currentTarget.value)} aria-busy=${busy ? "true" : "false"}></textarea>
      <span class="hint">${thanks && r && !r.reflection ? "Tip: add a line about how it went in the round's notes and the draft gets more specific." : "Edit freely. Specific beats polished."}</span>
    </div>
    ${err && html`<div class="callout wait" role="alert"><${Icon} name="alert" /><span>${err} Your draft is unchanged.</span></div>`}
    ${c.sample && html`<div class="row wrap">
      ${busy ? html`<span class="pl-thinking"><span class="pl-spin" aria-hidden="true"></span>Thinking…</span><${Btn} size="sm" icon="x" onClick=${stop}>Stop</${Btn}>`
        : html`<${Btn} size="sm" icon="spark" onClick=${improve}>Improve with Claude</${Btn}>${ai && html`<${Btn} size="sm" kind="ghost" onClick=${() => { setText(before.current); setAi(false); }}>Undo rewrite</${Btn}>`}`}
      <span class="hint">${busy ? "" : "Uses your Claude account. Your name stays out of the request."}</span>
    </div>`}
  </${Modal}>`;
}

/* ---------- Add application modal ---------- */
MODALS.add = function PlAdd({ job }) {
  const [f, setF] = useState(() => ({
    company: job?.co || "", title: job?.t || "", location: job ? (job.l || [])[0] || (job.r ? "Remote" : "") : "", url: job?.url || "",
    stage: "applied", date: fmt.toDateInput(now()),
  }));
  const [errs, setErrs] = useState({});
  useEffect(() => { setTimeout(() => document.getElementById(job ? "pl-add-stage" : "pl-add-co")?.focus(), 60); }, []);
  const set = (k) => (e) => { setF({ ...f, [k]: e.currentTarget.value }); if (errs[k]) setErrs({ ...errs, [k]: "" }); };
  const existing = job ? Apps.byJob(job.id) : null;
  const save = (open) => {
    const e = {};
    if (!f.company.trim()) e.company = "Enter the company name.";
    if (!f.title.trim()) e.title = "Enter the role title.";
    setErrs(e);
    if (e.company || e.title) { document.getElementById(e.company ? "pl-add-co" : "pl-add-title")?.focus(); return; }
    const appliedAt = f.stage === "saved" ? null : plFromDate(f.date) || now();
    const a = Apps.create({ company: f.company.trim(), title: f.title.trim(), location: f.location.trim(), url: f.url.trim(), stage: f.stage, appliedAt, jobId: job?.id || null, source: job ? "find" : "manual", lastActivityAt: now() });
    closeModal();
    if (open) openApp(a.id);
    toast(`Added ${a.company} to ${STAGE[a.stage].label}`, { undo: () => store.set((s) => { const apps = { ...s.apps }; delete apps[a.id]; return { ...s, apps }; }) });
  };
  return html`<${Modal} title="Add application" onClose=${closeModal} foot=${html`
    <${Btn} kind="ghost" onClick=${closeModal}>Cancel</${Btn}>
    <span class="spacer" style="flex:1"></span>
    <${Btn} onClick=${() => save(true)}>Add and open</${Btn}>
    <${Btn} kind="primary" onClick=${() => save(false)}>Add application<span class="hide-sm"><${Kbd}>↵</${Kbd}></span></${Btn}>`}>
    ${existing && html`<div class="callout info"><${Icon} name="info" /><span>This job is already in your pipeline as ${STAGE[existing.stage].label}. <button type="button" class="pl-linkbtn" onClick=${() => { closeModal(); openApp(existing.id); }}>Open it</button></span></div>`}
    <form id="pl-add-form" class="pl-form" onSubmit=${(e) => { e.preventDefault(); save(false); }} novalidate>
      <div class="field"><label for="pl-add-co">Company</label><input id="pl-add-co" class="input" value=${f.company} onInput=${set("company")} placeholder="e.g. Northwind Labs" autofocus aria-invalid=${errs.company ? "true" : undefined} aria-describedby=${errs.company ? "pl-add-co-err" : undefined} autocomplete="off" />${errs.company && html`<span class="pl-err" id="pl-add-co-err">${errs.company}</span>`}</div>
      <div class="field"><label for="pl-add-title">Role</label><input id="pl-add-title" class="input" value=${f.title} onInput=${set("title")} placeholder="e.g. Software Engineer Intern" aria-invalid=${errs.title ? "true" : undefined} aria-describedby=${errs.title ? "pl-add-title-err" : undefined} autocomplete="off" />${errs.title && html`<span class="pl-err" id="pl-add-title-err">${errs.title}</span>`}</div>
      <div class="field"><label for="pl-add-loc">Location <span class="faint">optional</span></label><input id="pl-add-loc" class="input" value=${f.location} onInput=${set("location")} placeholder="City, or Remote" /></div>
      <div class="field"><label for="pl-add-url">Posting link <span class="faint">optional</span></label><input id="pl-add-url" class="input" type="url" value=${f.url} onInput=${set("url")} placeholder="https://" /></div>
      <div class="field"><label for="pl-add-stage">Stage</label><select id="pl-add-stage" class="select" value=${f.stage} onChange=${set("stage")}>${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}</select></div>
      <div class="field"><label for="pl-add-date">${f.stage === "saved" ? "Applied on" : "Applied on"}</label><input id="pl-add-date" class="input" type="date" value=${f.stage === "saved" ? "" : f.date} disabled=${f.stage === "saved"} onInput=${set("date")} />${f.stage === "saved" && html`<span class="hint">Set when you move it to Applied.</span>`}</div>
      <button type="submit" class="sr" tabindex="-1">Add application</button>
    </form>
  </${Modal}>`;
};

/* ---------- Paste-an-email modal ---------- */
MODALS.paste = function PlPaste() {
  const c = useCaps();
  const [raw, setRaw] = useState("");
  const [f, setF] = useState(null);
  const [src, setSrc] = useState("rules");
  const [target, setTarget] = useState("new");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ctrl = useRef(null);
  useEffect(() => { setTimeout(() => document.getElementById("pl-p-raw")?.focus(), 60); return () => ctrl.current?.abort(); }, []);
  const apps = useStore((s) => s.apps);
  const appList = useMemo(() => Object.values(apps).sort((x, y) => x.company.localeCompare(y.company)), [apps]);

  const fill = (p, from) => {
    const m = matchApp(p.company, p.title);
    setF({ kind: p.kind, company: p.company || "", title: p.title || "", at: p.at || now(), interviewAt: p.interviewAt || null, roundType: p.roundType || (p.kind === "screen" ? "recruiter" : "other"), interviewers: p.interviewers || "", next: p.next || "" });
    setTarget(m ? m.id : "new"); setTouched(false); setSrc(from); setErr("");
    setTimeout(() => document.getElementById("pl-p-preview")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 40);
  };
  const readRules = () => { if (!raw.trim()) { setErr("Paste an email first, or try one of the samples."); return; } fill(plParse(raw), "rules"); };
  const readAI = async () => {
    if (!raw.trim()) { setErr("Paste an email first, or try one of the samples."); return; }
    setErr(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    const prompt = `Read this job-search email and return JSON only, an object with exactly these keys:
"kind": one of "confirmation", "interview", "screen", "rejection", "offer", "other" ("screen" = a first recruiter or phone call; "interview" = any later interview or assessment),
"company": the hiring company's name, or "",
"title": the job title, or "",
"date": the date the email was sent as ISO 8601, or null,
"interviewAt": the scheduled interview or call time as ISO 8601 local time without a timezone offset (e.g. "2026-11-05T14:00:00"), or null if no specific time is set,
"roundType": one of "recruiter", "technical", "behavioral", "case", "onsite", "other", or null,
"interviewers": names of interviewers mentioned, or "",
"nextStep": one short sentence on what the candidate should do next.
Use only what the email says. Today is ${new Date().toDateString()}.

Email:
"""
${raw.slice(0, 12000)}
"""`;
    try {
      const j = await askClaudeJSON(prompt, { signal: ac.signal });
      const kind = EMAIL_KINDS[j?.kind] ? j.kind : "other";
      const ia = j?.interviewAt ? Date.parse(j.interviewAt) : NaN;
      const d = j?.date ? Date.parse(j.date) : NaN;
      fill({ kind, company: String(j?.company || ""), title: String(j?.title || ""), at: isNaN(d) ? now() : d, interviewAt: isNaN(ia) ? null : ia, roundType: ROUND[j?.roundType] ? j.roundType : null, interviewers: String(j?.interviewers || ""), next: String(j?.nextStep || "") }, "ai");
    } catch (e) {
      if (!ac.signal.aborted) setErr(`${aiErr(e)} You can still use “Read email”, which works without Claude.`);
    } finally { setBusy(false); ctrl.current = null; }
  };
  const sample = (k) => { setRaw(PL_SAMPLES[k].text); setF(null); setErr(""); fill(plParse(PL_SAMPLES[k].text), "rules"); };
  const upd = (k) => (e) => { const v = e.currentTarget.value; setF((x) => { const n = { ...x, [k]: v }; if ((k === "company" || k === "title") && !touched) { const m = matchApp(k === "company" ? v : x.company, k === "title" ? v : x.title); setTarget(m ? m.id : "new"); } return n; }); };

  const tApp = f && target !== "new" ? apps[target] : null;
  const k = f ? EMAIL_KINDS[f.kind] : null;
  const roundOn = f && (f.kind === "interview" || f.kind === "screen");
  const willRound = roundOn && !!f.interviewAt;
  const plan = (() => {
    if (!f) return "";
    const parts = [];
    const stage = k.stage;
    if (tApp) parts.push(plShouldMove(tApp.stage, stage) ? `Move ${tApp.company} · ${tApp.title} from ${STAGE[tApp.stage].label} to ${STAGE[stage].label}` : `Add this email to the timeline of ${tApp.company} · ${tApp.title} (stays in ${STAGE[tApp.stage].label})`);
    else parts.push(`Create a new application for ${f.company || "an unnamed company"}${f.title ? " · " + f.title : ""} in ${STAGE[stage || "applied"].label}`);
    if (willRound) parts.push(`add a ${ROUND[f.roundType]?.label || "Interview"} round on ${fmt.dateTime(f.interviewAt)}`);
    return parts.join(" and ") + ".";
  })();
  const confirm = () => {
    if (!tApp && !f.company.trim()) { setErr("Add the company name so Heardback can create the application."); document.getElementById("pl-p-co")?.focus(); return; }
    const at = Math.min(f.at || now(), now());
    const stage = k.stage;
    let id, done = [];
    if (tApp) {
      id = tApp.id;
      if (plShouldMove(tApp.stage, stage)) { Apps.move(id, stage, { silent: true, at }); done.push(`moved to ${STAGE[stage].label}`); if (stage === "offer") celebrate(tApp); }
    } else {
      const a = Apps.create({ company: f.company.trim(), title: f.title.trim(), stage: stage || "applied", appliedAt: at, lastReplyAt: f.kind !== "confirmation" && stage ? at : null, source: "email" });
      id = a.id; done.push(`added in ${STAGE[a.stage].label}`);
      if (stage === "offer") celebrate(a);
    }
    if (f.kind !== "confirmation" && f.kind !== "other") Apps.update(id, (x) => ({ lastReplyAt: Math.max(x.lastReplyAt || 0, at) }));
    if (willRound) { Apps.addRound(id, { type: f.roundType || "other", at: f.interviewAt, interviewers: f.interviewers || "" }); done.push(`${ROUND[f.roundType]?.label || "Interview"} round added`); }
    Apps.addEvent(id, { kind: "email", text: `Logged email: ${k.label}` });
    const app = Apps.get(id);
    closeModal();
    toast(`${app.company}: ${done.length ? done.join(", ") : "email logged"}`);
  };

  return html`<${Modal} title="Log from an email" onClose=${closeModal} size="lg" foot=${html`
    <span class="pl-foot-note hide-sm">Read on this device. Nothing is sent anywhere${c.sample ? " unless you choose Claude" : ""}.</span>
    <span class="spacer" style="flex:1"></span>
    <${Btn} kind="ghost" onClick=${closeModal}>Cancel</${Btn}>
    ${f ? html`<${Btn} kind="primary" icon="check" onClick=${confirm}>${tApp ? "Update application" : "Create application"}</${Btn}>` : html`<${Btn} kind="primary" onClick=${readRules} disabled=${busy}>Read email</${Btn}>`}`}>
    <div class="field">
      <div class="row"><label for="pl-p-raw" class="label" style="flex:1">Email</label>${raw && html`<button type="button" class="pl-linkbtn pl-small" onClick=${() => { setRaw(""); setF(null); setErr(""); document.getElementById("pl-p-raw")?.focus(); }}>Clear</button>`}</div>
      <textarea id="pl-p-raw" class=${cx("textarea pl-raw", f && "short")} value=${raw} autofocus onInput=${(e) => { setRaw(e.currentTarget.value); setErr(""); }}
        placeholder=${"Paste the whole email here, including the From and Subject lines if you can.\n\nWorks with application confirmations, interview invites, rejections and offers."}></textarea>
      <div class="pl-samples"><span class="hint">Try a sample:</span>${Object.entries(PL_SAMPLES).map(([key, x]) => html`<button type="button" key=${key} class="chip" id=${"pl-sample-" + key} onClick=${() => sample(key)}>${x.label}</button>`)}<span class="hint">Fictional companies.</span></div>
    </div>
    ${!f && c.sample && html`<div class="row wrap pl-ai-row">
      ${busy ? html`<span class="pl-thinking"><span class="pl-spin" aria-hidden="true"></span>Thinking…</span><${Btn} size="sm" icon="x" onClick=${() => ctrl.current?.abort()}>Stop</${Btn}>` : html`<${Btn} size="sm" icon="spark" onClick=${readAI}>Read with Claude instead</${Btn}>`}
      <span class="hint">${busy ? "" : "Better with unusual emails. Uses your Claude account."}</span>
    </div>`}
    ${err && html`<div class="callout wait" role="alert"><${Icon} name="alert" /><span>${err}</span></div>`}
    ${f && html`<div class="pl-preview card" id="pl-p-preview">
      <div class="pl-preview-head">
        <span class=${cx("badge", { confirmation: "accent", interview: "wait", screen: "info", rejection: "bad", offer: "ok", other: "" }[f.kind])}>${k.label}</span>
        ${src === "ai" ? html`<span class="ai-label"><${Icon} name="spark" />Read by Claude. Check the fields.</span>` : html`<span class="hint">Detected on this device. Check the fields.</span>`}
        <span class="spacer" style="flex:1"></span>
        ${c.sample && src !== "ai" && (busy ? html`<span class="pl-thinking"><span class="pl-spin" aria-hidden="true"></span>Thinking…</span><${Btn} size="sm" onClick=${() => ctrl.current?.abort()}>Stop</${Btn}>` : html`<${Btn} size="sm" icon="spark" onClick=${readAI}>Read with Claude</${Btn}>`)}
      </div>
      <div class="pl-plan"><${Icon} name="arrowR" /><div><span class="pl-eyebrow">What happens when you confirm</span><p>${plan}</p></div></div>
      <div class="pl-preview-grid">
        <div class="field"><label for="pl-p-kind">Type</label><select id="pl-p-kind" class="select" value=${f.kind} onChange=${upd("kind")}>${Object.entries(EMAIL_KINDS).map(([id, x]) => html`<option key=${id} value=${id}>${x.label}</option>`)}</select></div>
        <div class="field"><label for="pl-p-date">Email date</label><input id="pl-p-date" class="input" type="date" value=${fmt.toDateInput(f.at)} onChange=${(e) => setF({ ...f, at: plFromDate(e.currentTarget.value) || f.at })} /></div>
        <div class="field"><label for="pl-p-co">Company</label><input id="pl-p-co" class="input" value=${f.company} onInput=${upd("company")} placeholder="Not found. Type it in." /></div>
        <div class="field"><label for="pl-p-title">Role</label><input id="pl-p-title" class="input" value=${f.title} onInput=${upd("title")} placeholder="Not found. Type it in." /></div>
        ${roundOn && html`
          <div class="field"><label for="pl-p-when">Interview time</label><input id="pl-p-when" class="input" type="datetime-local" value=${fmt.toInput(f.interviewAt)} onChange=${(e) => setF({ ...f, interviewAt: fmt.fromInput(e.currentTarget.value) })} />${!f.interviewAt && html`<span class="hint">No time found. Add one to create a round.</span>`}</div>
          <div class="field"><label for="pl-p-rt">Round type</label><select id="pl-p-rt" class="select" value=${f.roundType} onChange=${upd("roundType")}>${ROUND_TYPES.map((x) => html`<option key=${x.id} value=${x.id}>${x.label}</option>`)}</select></div>
          <div class="field pl-span2"><label for="pl-p-who">Interviewers</label><input id="pl-p-who" class="input" value=${f.interviewers} onInput=${upd("interviewers")} placeholder="Optional" /></div>`}
        <div class="field pl-span2"><label for="pl-p-target">Apply to</label>
          <select id="pl-p-target" class="select" value=${target} onChange=${(e) => { setTarget(e.currentTarget.value); setTouched(true); }}>
            <option value="new">New application</option>
            ${appList.map((a) => html`<option key=${a.id} value=${a.id}>${a.company} · ${a.title}${a.example ? " (example)" : ""}</option>`)}
          </select>
          ${tApp && !touched && html`<span class="hint">Matched to an application you already track.</span>`}
        </div>
      </div>
      ${f.next && html`<div class="pl-plan subtle"><${Icon} name="flag" /><div><span class="pl-eyebrow">Suggested next step</span><p>${f.next}</p></div></div>`}
    </div>`}
  </${Modal}>`;
};
