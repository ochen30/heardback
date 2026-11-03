/* ===== Pipeline: board + table, application drawer, add / paste-email / draft modals ===== */

const PL_MAIN = ["saved", "applied", "screen", "interview", "offer"];
const PL_CLOSED = ["rejected", "ghosted"];
const PL_OUTCOMES = [{ id: "pending", label: "Pending" }, { id: "passed", label: "Passed" }, { id: "failed", label: "Didn't pass" }, { id: "cancelled", label: "Cancelled" }];

/* ---------- helpers ---------- */
function plUi(patch) { store.set((s) => ({ ...s, ui: { ...s.ui, ...patch } })); }
function plClosedOpen(s) { return !!s.ui.pipelineClosedOpen; }
function plSetClosedOpen(v) { plUi({ pipelineClosedOpen: v }); }
function plUpcoming(a, t = now()) {
  return (a.rounds || []).filter((r) => r.at && r.at > t && r.outcome !== "cancelled").sort((x, y) => x.at - y.at)[0] || null;
}
function plWhen(ts) {
  const d0 = fmt.startOfDay(now()), d1 = fmt.startOfDay(ts);
  const diff = Math.round((d1 - d0) / DAY);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff > 1 && diff < 7 ? new Date(ts).toLocaleDateString(undefined, { weekday: "short" }) : fmt.date(ts);
  return `${day} ${plTime(ts)}`;
}
/* "1 PM" on the hour, "1:30 PM" otherwise */
function plTime(ts) { const d = new Date(ts); return d.getMinutes() ? fmt.time(ts) : d.toLocaleTimeString(undefined, { hour: "numeric" }); }
function plLongWhen(ts) { return `${new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${fmt.time(ts)}`; }
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
  if (listingRemoved(a) && ["saved", "applied", "screen"].includes(a.stage)) return { icon: "flag", tone: "wait", text: "Posting taken down", title: "This listing is no longer live" };
  if (a.stage === "saved") return { icon: "bookmark", text: `Saved ${fmt.ago(a.createdAt)}` };
  if (a.stage === "offer") return { icon: "trophy", tone: "ok", text: `Offer ${fmt.ago(plStageAt(a, "offer") || a.lastReplyAt || a.lastActivityAt)}` };
  if (a.stage === "rejected") return { icon: "x", text: `Rejected ${fmt.ago(plStageAt(a, "rejected") || a.lastActivityAt)}` };
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
  if (listingRemoved(a) && a.stage === "saved") return { kind: "removed", icon: "flag", tone: "wait", short: "Posting taken down", title: "The posting was taken down", sub: "It's no longer in the live listings. Check the company's careers page, or remove it from your board." };
  if (a.stage === "saved") return { kind: "saved", icon: "bolt", short: "Apply", title: "Apply, then mark it applied", sub: `You saved this ${fmt.ago(a.createdAt)}. Early applicants tend to hear back more often.` };
  if (silent >= st.ghostDays) return { kind: "ghost", icon: "ghost", tone: "wait", short: "Mark as ghosted?", title: `No reply in ${silent} days. Mark as ghosted?`, sub: "Most companies reply within 3 weeks if they're interested. Marking it keeps your board honest. You can move it back any time." };
  if (a.stage === "applied" && silent >= st.followUpDays && !a.followedUpAt) return { kind: "follow", icon: "reply", tone: "wait", short: "Follow up", title: "Send a follow-up", sub: `You applied ${silent} days ago and haven't heard back. A short, specific note is fine.` };
  if (a.stage === "applied") {
    const due = (a.followedUpAt || a.appliedAt || t) + st.followUpDays * DAY;
    return { kind: "wait", icon: "clock", short: a.followedUpAt ? "Waiting after follow-up" : "Wait for a reply", title: "Waiting for a reply", sub: a.followedUpAt ? `You followed up ${fmt.ago(a.followedUpAt)}.` : `Heardback will suggest a follow-up on ${fmt.date(due)} if you haven't heard back.` };
  }
  return { kind: "schedule", icon: "cal", short: "Add next round", title: "Add the next round when it's scheduled", sub: "Log the date, type and interviewers so Heardback can remind you to prep and send a thank-you." };
}

/* Interview time finder: month-name or US numeric dates, skips deadlines, honors a stated time zone */
const PL_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const PL_TZ = { E: -5, C: -6, M: -7, P: -8 };
function plUsDst(y, mon, d, h) {
  /* US daylight time: 2nd Sunday of March 2:00 to 1st Sunday of November 2:00 (local) */
  const nth = (m, n) => { const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); return 1 + ((7 - first) % 7) + 7 * (n - 1); };
  const t = Date.UTC(y, mon, d, h), start = Date.UTC(y, 2, nth(2, 2), 2), end = Date.UTC(y, 10, nth(10, 1), 2);
  return t >= start && t < end;
}
function plTzOffset(tz, y, mon, d, h) {
  const z = tz.toUpperCase();
  if (z === "UTC" || z === "GMT") return 0;
  const base = PL_TZ[z[0]];
  if (base == null) return null;
  if (z.length === 3) return base + (z[1] === "D" ? 1 : 0);
  return base + (plUsDst(y, mon, d, h) ? 1 : 0);
}
function plFindTime(raw) {
  const body = (raw || "").replace(/\r/g, "").replace(/^(?:From|To|Cc|Bcc|Subject|Date|Sent|Reply-To):.*$/gim, "");
  const re = /\b(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b)/gi;
  let m;
  while ((m = re.exec(body))) {
    const before = body.slice(Math.max(0, m.index - 40), m.index);
    if (/\b(?:by|before|deadline|due|until|no later than)\b[^.\n]{0,18}$/i.test(before)) continue;
    const mon = m[1] ? PL_MONTHS.indexOf(m[1].toLowerCase()) : +m[4] - 1;
    const day = m[1] ? +m[2] : +m[5];
    if (mon < 0 || mon > 11 || day < 1 || day > 31) continue;
    let yr = m[3] ? +m[3] : m[6] ? +m[6] : null;
    if (yr && yr < 100) yr += 2000;
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 48);
    const tm = after.match(/^[^\n.]*?\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))?\s*\(?\b(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|UTC|GMT)?\b/i);
    let h = 10, min = 0, tz = "";
    if (tm) { h = +tm[1] % 12; min = +(tm[2] || 0); if (/p/i.test(tm[3])) h += 12; tz = tm[4] ? tm[4].toUpperCase() : ""; }
    const y0 = yr || new Date(now()).getFullYear();
    const at0 = (y) => {
      const off = tz ? plTzOffset(tz, y, mon, day, h) : null;
      return off == null ? new Date(y, mon, day, h, min).getTime() : Date.UTC(y, mon, day, h, min) - off * 3600000;
    };
    let at = at0(y0);
    if (!yr && at < now() - 30 * DAY) at = at0(y0 + 1);
    return { at, tz };
  }
  return null;
}

/* Email parsing: the shared rule-based parser, plus our time finder and interviewer names */
function plParse(raw) {
  const p = parseEmail(raw);
  const ft = p.kind === "interview" || p.kind === "screen" ? plFindTime(raw) : null;
  p.interviewAt = ft ? ft.at : null;
  p.tz = ft && ft.tz ? ft.tz : "";
  const body = (raw || "").replace(/^(?:From|To|Cc|Bcc|Subject|Date|Sent|Reply-To):.*$/gim, "");
  const iv = body.match(/\bwith ([A-Z][a-z]+(?: [A-Z][a-z.]+)?(?:,? (?:and|&) [A-Z][a-z]+(?: [A-Z][a-z.]+)?)?)(?=[\s:.,])/);
  p.interviewers = p.interviewAt && iv ? iv[1] : "";
  return p;
}
/* One-line summary of a pasted email: sender name and subject */
function plEmailSummary(raw) {
  const hdr = (n) => ((raw || "").match(new RegExp(`^${n}:\\s*(.+)$`, "im")) || [])[1] || "";
  const from = hdr("From").replace(/\s*<[^>]*>\s*$/, "").replace(/^"|"$/g, "").trim();
  const subj = hdr("Subject").trim();
  const first = (raw || "").split("\n").map((l) => l.trim()).find((l) => l && !/^\w[\w-]*:/.test(l)) || "";
  return [from && `From ${from}`, subj || first].filter(Boolean).join(" · ") || "Pasted email";
}
function plShouldMove(cur, to) {
  if (!to || to === cur) return false;
  if (to === "rejected" || to === "offer") return true;
  if (cur === "rejected" || cur === "ghosted") return to !== "applied";
  return STAGE[to].i > STAGE[cur].i;
}

const PL_SAMPLES = {
  confirmation: { label: "Confirmation", text: "From: Northwind Labs Recruiting <no-reply@northwindlabs.example>\nSubject: Thank you for applying to Northwind Labs\nDate: Mon, 2 Nov 2026 09:14:00 -0800\n\nHi Alex,\n\nThank you for applying to Northwind Labs. We have received your application for the Software Engineer Intern, Summer 2027 position, and our team will review it soon.\n\nIf your background is a match, a recruiter will reach out within two weeks.\n\nNorthwind Labs Recruiting Team\n\n(Sample email for trying Heardback. Northwind Labs is a fictional company.)" },
  interview: { label: "Interview", text: "From: Priya Shah <priya.shah@northwindlabs.example>\nSubject: Technical interview for Software Engineer Intern\nDate: Tue, 3 Nov 2026 11:02:00 -0800\n\nHi Alex,\n\nThanks for your time last week. We'd like to invite you to a technical interview for the Software Engineer Intern position at Northwind Labs.\n\nYour interview is scheduled for Thursday, Nov 5 at 2:00 pm over video. It will be 60 minutes with Priya Shah and Tom Lee: one coding problem and a short system design discussion.\n\nPlease reply to confirm this time works.\n\nBest,\nPriya Shah\nNorthwind Labs\n\n(Sample email for trying Heardback. Northwind Labs is a fictional company.)" },
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
  useEffect(() => { const off = onFlush(() => flush(true)); return () => { off(); flush(true); }; }, []);
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
    <div class="page-head"><div><h1>Pipeline</h1><p>Track applications and what to do next.</p></div></div>
    <${PlEmpty} />
  </div>`;

  return html`<div class=${cx("page wide pl-page", view === "board" && "pl-page-board")}>
    <div class="page-head pl-head">
      <div class="pl-head-title"><h1>Pipeline</h1><p class="num">${sub}</p></div>
      <span class="spacer"></span>
      <div class="pl-tools">
        <div class="input-icon pl-filter">
          <${Icon} name="filter" />
          <input id="pl-filter" class="input" type="search" placeholder=${window.matchMedia("(max-width: 520px)").matches ? "Filter" : "Filter by company or role"} value=${q} onInput=${(e) => setQ(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }} aria-label="Filter applications by company or role" autocomplete="off" />
        </div>
        <${Seg} label="Layout" value=${view} onChange=${(v) => plUi({ pipelineView: v })} options=${[{ id: "board", label: "Board", icon: "board" }, { id: "table", label: "Table", icon: "list" }]} />
      </div>
    </div>
    ${examples && html`<div class="example-banner pl-banner" role="note">
      <span class="pl-banner-text"><b>Example data.</b><span class="hide-sm"> Clear it when you add your first application.</span></span>
      <span class="spacer"></span>
      <${Btn} size="sm" kind="ghost" onClick=${clearExamples}>Clear examples</${Btn}>
    </div>`}
    ${n && !apps.length && html`<div class="callout"><${Icon} name="search" /><span>No applications match “${q}”. <button type="button" class="pl-linkbtn" onClick=${() => setQ("")}>Clear the filter</button></span></div>`}
    ${view === "board" ? html`<${PlBoard} apps=${apps} settings=${s.settings} closedOpen=${plClosedOpen(s)} hint=${!s.ui.pipelineHintDone} filtering=${!!n} />` : html`<${PlTable} apps=${apps} settings=${s.settings} sort=${s.ui.pipelineSort || { k: "activity", dir: -1 }} />`}
  </div>`;
};

function PlEmpty() {
  return html`<div class="card pl-empty">
    <div class="pl-empty-art" aria-hidden="true">
      ${["saved", "applied", "screen", "interview", "offer"].map((st, i) => html`<div class="pl-empty-col" key=${st}><span class=${cx("dot", st)}></span><i style=${`height:${[34, 54, 28, 18, 10][i]}px`}></i></div>`)}
    </div>
    <h2>Track every application in one place</h2>
    <p class="muted">Add jobs as you apply, log replies from your emails, and Heardback tells you when to follow up, prep, or let one go.</p>
    <div class="pl-empty-main">
      <${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}>
    </div>
    <div class="pl-empty-links">
      <button type="button" class="pl-linkbtn" onClick=${() => openModal("paste")}>Log an email</button>
      <span class="pl-sep">·</span>
      <button type="button" class="pl-linkbtn" onClick=${() => go("find")}>Find jobs</button>
      <span class="pl-sep">·</span>
      <button type="button" class="pl-linkbtn" onClick=${loadExamples}>Load an example pipeline</button>
    </div>
  </div>`;
}

/* ---------- Board ---------- */
function PlBoard({ apps, settings, closedOpen, hint, filtering }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [menu, setMenu] = useState(null);
  const by = useMemo(() => { const m = {}; STAGES.forEach((x) => (m[x.id] = [])); apps.forEach((a) => (m[a.stage] || m.applied).push(a)); for (const k in m) m[k] = plSortInCol(m[k]); return m; }, [apps]);
  const closedList = useMemo(() => plSortInCol([...by.rejected, ...by.ghosted]), [by]);

  const dropOn = (stage) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const id = e.dataTransfer?.getData("text/plain") || drag;
    setOver(null); setDrag(null);
    if (id && Apps.get(id) && Apps.get(id).stage !== stage) { if (PL_CLOSED.includes(stage)) plSetClosedOpen(true); Apps.move(id, stage); }
  };
  const dragOver = (stage) => (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; if (over !== stage) setOver(stage); };
  const dragLeave = (stage) => (e) => { if (!e.currentTarget.contains(e.relatedTarget) && over === stage) setOver(null); };
  const dropProps = (stage) => ({ onDragOver: dragOver(stage), onDragLeave: dragLeave(stage), onDrop: dropOn(stage) });

  const move = (a, to) => {
    if (!to || to === a.stage) return;
    if (PL_CLOSED.includes(to)) plSetClosedOpen(true);
    Apps.move(a.id, to); plFocusCard(a.id);
    if (hint) plUi({ pipelineHintDone: true });
  };
  const onKey = (a) => (e) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key;
    if (k === "Enter" || k === " ") { e.preventDefault(); openApp(a.id); }
    else if (k === "ArrowRight" || k === "]" || k === "ArrowLeft" || k === "[") {
      e.preventDefault();
      /* Steps only within the main flow; closing an application is always explicit */
      const j = PL_MAIN.indexOf(a.stage);
      const to = j < 0 ? null : PL_MAIN[j + (k === "ArrowRight" || k === "]" ? 1 : -1)];
      if (to) move(a, to);
    } else if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      const cards = [...e.currentTarget.closest(".col-body").querySelectorAll(".app-card")];
      cards[cards.indexOf(e.currentTarget) + (k === "ArrowDown" ? 1 : -1)]?.focus();
    }
  };
  const card = (a) => html`<${PlCard} key=${a.id} a=${a} settings=${settings} dragging=${drag === a.id}
    onDragStart=${(e) => { e.dataTransfer.setData("text/plain", a.id); e.dataTransfer.effectAllowed = "move"; setDrag(a.id); }}
    onDragEnd=${() => { setDrag(null); setOver(null); }}
    onKeyDown=${onKey(a)}
    onMenu=${(el) => setMenu({ id: a.id, el })} />`;
  /* While dragging, the Closed area offers two targets: Rejected and Ghosted */
  const closedTargets = html`<div class="pl-drop-pair">${PL_CLOSED.map((id) => html`<div key=${id} class=${cx("pl-drop", over === id && "on")} data-col=${id} ...${dropProps(id)}><span class=${cx("dot", id)}></span>${STAGE[id].label}</div>`)}</div>`;

  return html`<${Fragment}>
    <div class="board pl-board" role="list" aria-label="Pipeline board">
      ${PL_MAIN.map((sid) => {
        const st = STAGE[sid], list = by[sid];
        return html`<section role="listitem" key=${sid} class=${cx("col pl-col", over === sid && "drop")} data-col=${sid} aria-label=${`${st.label}, ${pluralize(list.length, "application")}`} ...${dropProps(sid)}>
          <header class="col-head"><span class=${cx("dot", sid)}></span><span>${st.label}</span><span class="count">${list.length}</span></header>
          <div class="col-body">
            ${list.map(card)}
            ${!list.length && html`<div class=${cx("pl-col-empty", drag && "dz")}>${drag ? "Drop here" : filtering ? "No matches" : sid === "saved" ? "Jobs you save show up here" : "Nothing here yet"}</div>`}
          </div>
        </section>`;
      })}
      ${closedOpen ? html`<section role="listitem" key="closed" class="col pl-col pl-col-closed" data-col="closed" aria-label=${`Closed, ${pluralize(closedList.length, "application")}`}>
          <header class="col-head">
            <span class="dot"></span><span>Closed</span><span class="count">${closedList.length}</span>
            <span class="spacer"></span>
            <${Btn} kind="ghost" size="sm" icon="chevR" cls="pl-col-hide" aria-label="Collapse the Closed column" title="Collapse" onClick=${() => plSetClosedOpen(false)} />
          </header>
          <div class="col-body">
            ${drag ? closedTargets : null}
            ${closedList.map(card)}
            ${!closedList.length && !drag && html`<div class="pl-col-empty">${filtering ? "No matches" : "Rejected and ghosted applications land here"}</div>`}
          </div>
        </section>`
        : drag ? html`<div role="listitem" key="closed" class="pl-rail dragging">${closedTargets}</div>`
        : html`<button type="button" role="listitem" key="closed" class="pl-rail" data-col="closed" onClick=${() => plSetClosedOpen(true)} aria-label=${`Show closed applications: ${by.rejected.length} rejected, ${by.ghosted.length} ghosted`} title="Show closed applications">
          <span class="pl-rail-count num">${closedList.length}</span><span class="pl-rail-label">Closed</span><${Icon} name="chevL" size=${14} />
        </button>`}
    </div>
    <p class="sr" id="pl-kbd-hint">Press the left and right arrow keys to move a card to another stage, up and down to switch cards, Enter to open.</p>
    ${hint && html`<div class="pl-tip hide-sm" role="note">
      <${Icon} name="keyboard" size=${14} />
      <span>Tip: drag cards between columns, or focus a card and press <${Kbd}>←</${Kbd}> <${Kbd}>→</${Kbd}> to move it.</span>
      <button type="button" class="pl-tip-x" aria-label="Dismiss tip" title="Dismiss" onClick=${() => plUi({ pipelineHintDone: true })}><${Icon} name="x" size=${14} /></button>
    </div>`}
    ${menu && Apps.get(menu.id) && html`<${PlMoveMenu} a=${Apps.get(menu.id)} anchor=${menu.el} onPick=${(to) => move(Apps.get(menu.id), to)} onClose=${() => setMenu(null)} />`}
  </${Fragment}>`;
}

function PlCard({ a, settings, dragging, onMenu, ...rest }) {
  const stt = plStatus(a, settings);
  return html`<article class=${cx("app-card pl-card", dragging && "dragging", PL_CLOSED.includes(a.stage) && "closed")} tabindex="0" draggable="true" data-card=${a.id}
    aria-label=${`${a.title} at ${a.company}. ${STAGE[a.stage].label}. ${stt.text}.`} aria-describedby="pl-kbd-hint"
    onClick=${(e) => { if (!e.target.closest("button")) openApp(a.id); }} ...${rest}>
    <div class="pl-card-top">
      <${Logo} name=${a.company} size="sm" />
      <span class="pl-card-co truncate">${a.company}</span>
      <button type="button" class="pl-more" aria-label=${`Move ${a.company} to another stage`} aria-haspopup="menu" title="Move to…" onClick=${(e) => { e.stopPropagation(); onMenu(e.currentTarget); }}><${Icon} name="more" /></button>
    </div>
    <div class="app-card-title pl-card-title">${a.title || "Untitled role"}</div>
    ${a.location && html`<div class="pl-card-loc truncate">${a.location}</div>`}
    <div class="app-card-foot pl-card-foot">
      <span class=${cx("pl-status", stt.tone)} title=${stt.title}><${Icon} name=${stt.icon} size=${13} /><span class="truncate">${stt.text}</span></span>
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
const PL_DUE = ["follow", "ghost", "thanks", "outcome"];
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
  return html`<${Fragment}>
  <div class="pl-msort">
    <label for="pl-msort" class="pl-small muted">Sort by</label>
    <select id="pl-msort" class="select" value=${`${col.k}:${sort.dir}`} onChange=${(e) => { const [k, d] = e.currentTarget.value.split(":"); plUi({ pipelineSort: { k, dir: +d } }); }}>
      ${[["activity", -1, "Last activity"], ["next", 1, "Next step"], ["silent", -1, "Days silent"], ["stage", 1, "Stage"], ["applied", -1, "Applied, newest"], ["company", 1, "Company, A–Z"]].map(([k, d, l]) => html`<option key=${k} value=${`${k}:${d}`}>${l}</option>`)}
      ${![["activity", -1], ["next", 1], ["silent", -1], ["stage", 1], ["applied", -1], ["company", 1]].some(([k, d]) => k === col.k && d === sort.dir) && html`<option value=${`${col.k}:${sort.dir}`}>${col.label}${sort.dir > 0 ? ", ascending" : ", descending"}</option>`}
    </select>
  </div>
  <div class="card pl-table-card">
    <div class="table-wrap">
      <table class="table pl-table">
        <thead><tr>${PL_COLS.map((c) => html`<th key=${c.k} class=${cx(c.num && "pl-num")} aria-sort=${sort.k === c.k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
          <button type="button" onClick=${() => setSort(c.k)}>${c.label}${sort.k === c.k ? html`<${Icon} name=${sort.dir > 0 ? "chevD" : "chevD"} size=${12} cls=${cx("pl-sort", sort.dir < 0 && "desc")} />` : html`<${Icon} name="sort" size=${12} cls="pl-sort-idle" />`}</button>
        </th>`)}</tr></thead>
        <tbody>
          ${rows.map((a) => {
            const ns = plNextStep(a, settings);
            const silent = ACTIVE_STAGES.includes(a.stage) ? Apps.daysSilent(a) : null;
            const due = PL_DUE.includes(ns.kind);
            const dot = due ? "pl-dot-due" : ns.kind === "upcoming" ? "pl-dot-up" : "pl-dot-idle";
            return html`<tr key=${a.id} tabindex="0" onClick=${(e) => { if (!e.target.closest("select")) openApp(a.id); }} onKeyDown=${(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openApp(a.id); }}>
              <td><div class="pl-tcell"><${Logo} name=${a.company} size="sm" /><div class="pl-tname"><span class="pl-ttitle truncate">${a.title || "Untitled role"}</span><span class="pl-tco truncate">${a.company}${a.location ? " · " + a.location : ""}</span><span class=${cx("pl-next pl-tnext-m", due && "due")}><span class=${cx("dot", dot)}></span>${ns.short}${silent != null && silent >= settings.followUpDays ? ` · ${silent}d silent` : ""}</span></div></div></td>
              <td><span class="pl-stage-sel"><span class=${cx("dot", a.stage)}></span><select id=${"pl-st-" + a.id} class="select" value=${a.stage} aria-label=${`Stage for ${a.company}`} onChange=${(e) => Apps.move(a.id, e.currentTarget.value)}>${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}</select></span></td>
              <td class="num muted">${a.appliedAt ? fmt.date(a.appliedAt) : html`<span class="faint">—</span>`}</td>
              <td class="num muted">${fmt.ago(a.lastActivityAt)}</td>
              <td><span class=${cx("pl-next", due && "due")}><span class=${cx("dot", dot)}></span>${ns.short}</span></td>
              <td class="num pl-num">${silent == null ? html`<span class="faint">—</span>` : html`<span class=${cx(silent >= settings.followUpDays && "pl-warn")}>${silent}</span>`}</td>
            </tr>`;
          })}
          ${!rows.length && html`<tr><td colspan="6" class="faint" style="text-align:center">No applications match the filter.</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
  </${Fragment}>`;
}

/* ---------- Application drawer ---------- */
const PL_TABS = [{ id: "overview", label: "Overview" }, { id: "rounds", label: "Rounds" }, { id: "timeline", label: "Timeline" }, { id: "notes", label: "Notes" }];

/* The one action that matches the current next step (shown as the drawer's primary button) */
function plNextAction(a, ns, setTab) {
  const draft = (mode, extra) => () => openModal("draft", { appId: a.id, mode, ...extra });
  return {
    upcoming: { label: "Prep for this round", icon: "prep", run: () => plPrep(a, ns.round) },
    thanks: { label: "Draft thank-you", icon: "send", run: draft("thanks", { roundId: ns.round?.id }) },
    outcome: { label: "Log outcome", icon: "flag", run: () => setTab("rounds") },
    saved: { label: "Mark as applied", icon: "check", run: () => Apps.move(a.id, "applied") },
    ghost: { label: "Mark as ghosted", icon: "ghost", run: () => Apps.move(a.id, "ghosted") },
    follow: { label: "Draft follow-up", icon: "reply", run: draft("follow") },
    schedule: { label: "Add round", icon: "plus", run: () => { Apps.addRound(a.id, { type: a.stage === "screen" ? "recruiter" : "technical" }); setTab("rounds"); } },
    offer: { label: "Note the deadline", icon: "edit", run: () => setTab("notes") },
  }[ns.kind] || null;
}

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
  const ns = plNextStep(a, settings);
  const act = plNextAction(a, ns, setT);
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
    ${act && html`<${Btn} kind="primary" icon=${act.icon} onClick=${act.run}>${act.label}</${Btn}>`}
    ${ns.kind === "wait" && html`<${Btn} icon="reply" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft follow-up</${Btn}>`}
    ${a.url && html`<a class="btn" href=${plHref(a.url)} target="_blank" rel="noopener"><${Icon} name="ext" />Open posting</a>`}
    <span class="spacer" style="flex:1"></span>
    <${Btn} kind="ghost" cls="danger" icon="trash" onClick=${del} aria-label="Delete application" title="Delete application"><span class="hide-sm">Delete</span></${Btn}>`;
  const counts = { rounds: (a.rounds || []).length, timeline: (a.events || []).length };
  const onTabKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault(); e.stopPropagation();
    const i = PL_TABS.findIndex((x) => x.id === t);
    const nx = PL_TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + PL_TABS.length) % PL_TABS.length].id;
    setT(nx); setTimeout(() => document.getElementById(`pl-tab-${nx}`)?.focus(), 0);
  };
  return html`<${Drawer} onClose=${closeDrawer} label=${`${a.company}: ${a.title}`} head=${head} foot=${foot}>
    <${PlStepper} a=${a} />
    <div class="tabs pl-dtabs" role="tablist" aria-label="Sections" onKeyDown=${onTabKey}>
      ${PL_TABS.map((x) => html`<button type="button" role="tab" key=${x.id} id=${`pl-tab-${x.id}`} aria-selected=${t === x.id ? "true" : "false"} aria-controls="pl-tabpanel" tabindex=${t === x.id ? "0" : "-1"} onClick=${() => setT(x.id)}>${x.label}${counts[x.id] ? html`<span class="count">${counts[x.id]}</span>` : null}</button>`)}
    </div>
    <div id="pl-tabpanel" role="tabpanel" aria-labelledby=${`pl-tab-${t}`} class="pl-tabpanel">
      ${t === "overview" && html`<${PlOverview} a=${a} ns=${ns} settings=${settings} jobs=${jobs} setTab=${setT} />`}
      ${t === "rounds" && html`<${PlRounds} a=${a} />`}
      ${t === "timeline" && html`<${PlTimeline} a=${a} />`}
      ${t === "notes" && html`<${PlNotes} a=${a} />`}
    </div>
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

/* Read-mode value that turns into an input on click; saves on blur or Enter, Escape cancels */
function PlInline({ id, label, value, display, type = "text", placeholder, onSave, toInput = (v) => v || "", fromInput = (v) => v }) {
  const [edit, setEdit] = useState(false);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => { if (edit) { done.current = false; setTimeout(() => { ref.current?.focus(); if (type === "text" || type === "url") ref.current?.select?.(); }, 0); } }, [edit]);
  const close = (save) => {
    if (done.current) return; done.current = true;
    if (save && ref.current) { const v = fromInput(ref.current.value); if (v !== value) onSave(v); }
    setEdit(false);
    setTimeout(() => document.getElementById(id + "-v")?.focus(), 0);
  };
  if (!edit) return html`<button type="button" id=${id + "-v"} class=${cx("pl-inline", !display && "is-empty")} onClick=${() => setEdit(true)} aria-label=${`${label}: ${display || "not set"}. Edit`}>
    <span class="truncate">${display || placeholder}</span><${Icon} name="edit" size=${13} />
  </button>`;
  return html`<div class="pl-inline-wrap">
    <input id=${id} ref=${ref} type=${type} class="input pl-inline-input" aria-label=${label} placeholder=${placeholder} value=${toInput(value)}
      onBlur=${() => close(true)} onKeyDown=${(e) => { if (e.key === "Enter") { e.preventDefault(); close(true); } }} />
    <${PlEscape} onEscape=${() => close(false)} />
  </div>`;
}
/* Registers on the shared Escape stack so Escape cancels the edit instead of closing the drawer */
function PlEscape({ onEscape }) { useEscape(onEscape); return null; }

function plHost(u) { try { const x = new URL(plHref(u)); return (x.hostname.replace(/^www\./, "") + (x.pathname.length > 1 ? x.pathname : "")).replace(/\/$/, ""); } catch { return u; } }

function PlOverview({ a, ns, settings, jobs, setTab }) {
  const job = a.jobId && jobs.status === "ready" ? jobs.byId.get(a.jobId) : null;
  const silent = Apps.daysSilent(a);
  const replyTxt = a.lastReplyAt ? `${pluralize(fmt.days(a.lastReplyAt), "day")} · last reply ${fmt.date(a.lastReplyAt)}` : a.appliedAt ? `No reply in ${pluralize(fmt.days(a.appliedAt), "day")}` : "Not applied yet";
  const secondary = {
    upcoming: html`<button type="button" class="pl-linkbtn" onClick=${() => setTab("rounds")}>View rounds</button>`,
    thanks: html`<button type="button" class="pl-linkbtn" onClick=${() => setTab("rounds")}>Log the outcome instead</button>`,
    ghost: html`<button type="button" class="pl-linkbtn" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft a last follow-up</button>`,
  }[ns.kind];
  return html`<div class="pl-ov">
    <div class=${cx("pl-next-card", ns.tone)}>
      <span class="pl-next-ico"><${Icon} name=${ns.icon} /></span>
      <div class="stack-sm" style="flex:1;min-width:0">
        <span class="pl-eyebrow">Next step</span>
        <strong>${ns.title}</strong>
        <span class="muted pl-small">${ns.sub}</span>
        ${secondary && html`<div class="pl-next-actions pl-small">${secondary}</div>`}
      </div>
    </div>

    <section class="dsec">
      <h3>Details</h3>
      <div class="pl-kv">
        <span class="pl-kv-k">Applied</span>
        <${PlInline} id="pl-applied" label="Applied on" type="date" value=${a.appliedAt} display=${a.appliedAt ? fmt.dateY(a.appliedAt) : ""} placeholder="Add date"
          toInput=${(v) => fmt.toDateInput(v)} fromInput=${(v) => plFromDate(v)} onSave=${(v) => Apps.update(a.id, { appliedAt: v })} />
        <span class="pl-kv-k">Posting</span>
        <div class="pl-url-row">
          <${PlInline} id="pl-url" label="Posting link" type="url" value=${a.url || ""} display=${a.url ? plHost(a.url) : ""} placeholder="Add link" fromInput=${(v) => v.trim()} onSave=${(v) => Apps.update(a.id, { url: v })} />
          ${a.url && html`<a class="btn icon sm ghost" href=${plHref(a.url)} target="_blank" rel="noopener" aria-label="Open posting in a new tab" title="Open posting"><${Icon} name="ext" /></a>`}
        </div>
        <span class="pl-kv-k">Location</span>
        <${PlInline} id="pl-loc" label="Location" value=${a.location || ""} display=${a.location} placeholder="Add location" fromInput=${(v) => v.trim()} onSave=${(v) => Apps.update(a.id, { location: v })} />
        <span class="pl-kv-k">Salary</span>
        <${PlInline} id="pl-salary" label="Salary" value=${a.salary || ""} display=${a.salary} placeholder="Add salary" fromInput=${(v) => v.trim()} onSave=${(v) => Apps.update(a.id, { salary: v })} />
        <span class="pl-kv-k">Last reply</span>
        <span class=${cx("pl-kv-v num", ACTIVE_STAGES.includes(a.stage) && silent >= settings.followUpDays && "pl-warn")}>${replyTxt}</span>
        ${a.followedUpAt && html`<span class="pl-kv-k">Followed up</span><span class="pl-kv-v num">${fmt.dateY(a.followedUpAt)}</span>`}
      </div>
    </section>

    ${job && html`<section class="dsec">
      <h3>Listing</h3>
      <div class="pl-job">
        <div class="stack-sm" style="flex:1;min-width:0;gap:2px">
          <span class="truncate" style="font-weight:500">${job.t}</span>
          <span class="row wrap pl-small muted" style="gap:6px"><${GhostScore} g=${job.g} /><span class="pl-sep">·</span><span>Posted ${fmt.ago(job.p)}</span></span>
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
  return html`<section class="dsec">
    <h3>Contacts${contacts.length ? html`<span class="count">${contacts.length}</span>` : null}</h3>
    ${contacts.length > 0 && html`<div class="list pl-contacts">${contacts.map((c, i) => html`<div class="pl-contact" key=${c.name + i}>
      <span class="pl-avatar" aria-hidden="true">${initials(c.name)}</span>
      <div class="stack-sm" style="gap:0;flex:1;min-width:0"><span class="truncate" style="font-weight:500">${c.name}</span><span class="truncate muted pl-small">${[c.role, c.email].filter(Boolean).join(" · ") || "No role or email"}</span></div>
      ${c.email && html`<${Btn} kind="ghost" size="sm" icon="copy" aria-label=${`Copy ${c.name}'s email`} title="Copy email" onClick=${() => copyText(c.email, "Email copied")} />`}
      <${Btn} kind="ghost" size="sm" icon="x" aria-label=${`Remove ${c.name}`} title="Remove" onClick=${() => rm(i)} />
    </div>`)}</div>`}
    <form class="pl-contact-form" onSubmit=${add}>
      <input id="pl-c-name" class="input" placeholder="Name" aria-label="Contact name" value=${f.name} onInput=${(e) => { setF({ ...f, name: e.currentTarget.value }); setErr(""); }} aria-invalid=${err ? "true" : undefined} />
      <input id="pl-c-role" class="input" placeholder="Role" aria-label="Contact role" value=${f.role} onInput=${(e) => setF({ ...f, role: e.currentTarget.value })} />
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
    ${rounds.length > 0 && html`<div class="row"><span class="spacer" style="flex:1"></span><${Btn} size="sm" icon="plus" onClick=${add}>Add round</${Btn}></div>`}
    ${!rounds.length && html`<${Empty} icon="cal" title="No rounds yet" action=${html`<${Btn} icon="plus" onClick=${add}>Add round</${Btn}>`}>Log each interview with its date, type and interviewers.</${Empty}>`}
    ${rounds.map((r) => html`<${PlRound} key=${r.id} a=${a} r=${r} />`)}
  </div>`;
}

function PlRound({ a, r }) {
  const upd = (p) => Apps.updateRound(a.id, r.id, p);
  const pid = `pl-r-${r.id}`;
  const t = now();
  const when = r.at ? (r.at > t ? html`<span class="badge info">${fmt.until(r.at)}</span>` : null) : null;
  const del = () => askConfirm({ title: "Delete this round?", body: `This removes the ${(ROUND[r.type]?.label || "round").toLowerCase()} and its notes. This can't be undone.`, confirmLabel: "Delete round", danger: true, onConfirm: () => { Apps.removeRound(a.id, r.id); toast("Round deleted"); } });
  return html`<div class="round pl-round" data-round=${r.id}>
    <div class="pl-round-head">
      <select id=${pid + "-type"} class="select pl-round-type" value=${r.type} aria-label="Round type" onChange=${(e) => upd({ type: e.currentTarget.value })}>${ROUND_TYPES.map((x) => html`<option key=${x.id} value=${x.id}>${x.label}</option>`)}</select>
      <${PlInline} id=${pid + "-at"} label="Date and time" type="datetime-local" value=${r.at || null} display=${r.at ? `${plLongWhen(r.at)}` : ""} placeholder="Add date and time"
        toInput=${(v) => fmt.toInput(v)} fromInput=${(v) => fmt.fromInput(v) || null} onSave=${(v) => upd({ at: v })} />
      ${when}
    </div>
    <div class="pl-round-out">
      <span class="label" id=${pid + "-out-l"}>Outcome</span>
      <div class="seg pl-outcome" role="group" aria-labelledby=${pid + "-out-l"}>${PL_OUTCOMES.map((o) => html`<button type="button" key=${o.id} class=${"o-" + o.id} aria-pressed=${r.outcome === o.id ? "true" : "false"} onClick=${() => upd({ outcome: o.id })}>${o.label}</button>`)}</div>
    </div>
    <${Field} label="Interviewers" id=${pid + "-who"}><${PlText} id=${pid + "-who"} value=${r.interviewers} placeholder="e.g. Priya S. (Eng manager)" onSave=${(v) => upd({ interviewers: v })} /></${Field}>
    <div class="pl-round-grid">
      <${Field} label="Prep notes" id=${pid + "-prep"}><${PlText} multiline id=${pid + "-prep"} rows="3" value=${r.prep} placeholder="Topics, stories, questions to ask" onSave=${(v) => upd({ prep: v })} /></${Field}>
      <${Field} label="How it went" id=${pid + "-refl"}><${PlText} multiline id=${pid + "-refl"} rows="3" value=${r.reflection} placeholder="What they asked, what to improve" onSave=${(v) => upd({ reflection: v })} /></${Field}>
    </div>
    <div class="pl-round-foot">
      <label class="check" for=${pid + "-thx"}><input id=${pid + "-thx"} type="checkbox" checked=${!!r.thanked} onChange=${(e) => upd({ thanked: e.currentTarget.checked })} />Thank-you sent</label>
      <span class="spacer" style="flex:1"></span>
      <${Btn} kind="ghost" size="sm" icon="trash" aria-label="Delete round" title="Delete round" onClick=${del} />
      <${CalendarButton} appId=${a.id} round=${r} />
      ${r.at && r.at > t ? html`<${Btn} size="sm" icon="prep" onClick=${() => plPrep(a, r)}>Prep</${Btn}>`
        : html`<${Btn} size="sm" icon="send" onClick=${() => openModal("draft", { appId: a.id, roundId: r.id, mode: "thanks" })}>Draft thank-you</${Btn}>`}
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
/* Template text with a real greeting and a complete subject line */
function plDraftText(a, r, thanks, profile) {
  const first = (s) => plFirstName(s).split(/\s+/)[0] || "";
  const who = first(thanks && r?.interviewers) || first(a.contacts?.[0]?.name);
  const greet = `Hi ${who || `${a.company} team`},`;
  let t = thanks ? thankYouTemplate(a, r ? { ...r, interviewers: "", reflection: "" } : r, profile) : followUpTemplate(a, profile);
  t = t.replace(/^Hi [^\n]*,$/m, greet);
  if (!thanks && a.title) t = t.replace(/^(Subject: Following up on my .+?)(?: application)?$/m, "$1 application");
  if (thanks) t = t.replace(/^Subject: .*$/m, `Subject: Thank you for your time${a.title ? ` · ${a.title}` : ""}`);
  return t;
}
function PlDraft({ appId, roundId, kind = "follow" }) {
  const a = Apps.get(appId);
  const profile = useStore((s) => s.profile);
  const c = useCaps();
  const r = a && roundId ? (a.rounds || []).find((x) => x.id === roundId) : null;
  const thanks = kind === "thanks";
  const tpl = a ? plDraftText(a, r, thanks, profile) : "";
  const [text, setText] = useState(tpl);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [err, setErr] = useState("");
  const ctrl = useRef(null);
  const before = useRef(tpl);
  useEffect(() => () => ctrl.current?.abort(), []);
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
    <div class="field">
      <div class="row"><label for="pl-draft" style="flex:1" class="label">${thanks ? "Thank-you note" : "Follow-up email"}</label>
        ${ai && !busy && html`<span class="ai-label"><${Icon} name="spark" />Drafted by Claude. Review before sending.</span>`}</div>
      <textarea id="pl-draft" class=${cx("textarea pl-draft", busy && "busy")} value=${text} readOnly=${busy} onInput=${(e) => setText(e.currentTarget.value)} aria-busy=${busy ? "true" : "false"}></textarea>
      <span class="hint">Send it from your inbox, then mark as sent.</span>
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
      <div class="field"><label for="pl-add-co">Company</label><input id="pl-add-co" class="input" value=${f.company} onInput=${set("company")} placeholder="e.g. Northwind Labs" aria-invalid=${errs.company ? "true" : undefined} aria-describedby=${errs.company ? "pl-add-co-err" : undefined} autocomplete="off" />${errs.company && html`<span class="pl-err" id="pl-add-co-err">${errs.company}</span>`}</div>
      <div class="field"><label for="pl-add-title">Role</label><input id="pl-add-title" class="input" value=${f.title} onInput=${set("title")} placeholder="e.g. Software Engineer Intern" aria-invalid=${errs.title ? "true" : undefined} aria-describedby=${errs.title ? "pl-add-title-err" : undefined} autocomplete="off" />${errs.title && html`<span class="pl-err" id="pl-add-title-err">${errs.title}</span>`}</div>
      <div class="field"><label for="pl-add-loc">Location <span class="faint">optional</span></label><input id="pl-add-loc" class="input" value=${f.location} onInput=${set("location")} placeholder="City, or Remote" /></div>
      <div class="field"><label for="pl-add-url">Posting link <span class="faint">optional</span></label><input id="pl-add-url" class="input" type="url" value=${f.url} onInput=${set("url")} placeholder="https://" /></div>
      <div class="field"><label for="pl-add-stage">Stage</label><select id="pl-add-stage" class="select" value=${f.stage} onChange=${set("stage")}>${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}</select></div>
      <div class="field"><label for="pl-add-date">Applied on</label><input id="pl-add-date" class="input" type="date" value=${f.stage === "saved" ? "" : f.date} disabled=${f.stage === "saved"} onInput=${set("date")} />${f.stage === "saved" && html`<span class="hint">Set when you move it to Applied.</span>`}</div>
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
  const [showRaw, setShowRaw] = useState(false);
  const ctrl = useRef(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const apps = useStore((s) => s.apps);
  const showEx = useStore((s) => s.settings.showExamples);
  const appList = useMemo(() => Apps.list().sort((x, y) => x.company.localeCompare(y.company)), [apps, showEx]);
  const visibleIds = new Set(appList.map((a) => a.id));

  const fill = (p, from) => {
    const m = matchApp(p.company, p.title);
    setF({ kind: p.kind, company: p.company || "", title: p.title || "", at: p.at || now(), interviewAt: p.interviewAt || null, roundType: p.roundType || (p.kind === "screen" ? "recruiter" : "other"), interviewers: p.interviewers || "", next: p.next || "", tz: p.tz || "" });
    setTarget(m && visibleIds.has(m.id) ? m.id : "new"); setTouched(false); setSrc(from); setErr(""); setShowRaw(false);
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
  const upd = (k) => (e) => { const v = e.currentTarget.value; setF((x) => { const n = { ...x, [k]: v }; if ((k === "company" || k === "title") && !touched) { const m = matchApp(k === "company" ? v : x.company, k === "title" ? v : x.title); setTarget(m && visibleIds.has(m.id) ? m.id : "new"); } return n; }); };

  const tApp = f && target !== "new" ? apps[target] : null;
  const k = f ? EMAIL_KINDS[f.kind] : null;
  const roundOn = f && (f.kind === "interview" || f.kind === "screen");
  const dupRound = roundOn && f.interviewAt && tApp ? (tApp.rounds || []).some((r) => r.type === (f.roundType || "other") && r.at && Math.abs(r.at - f.interviewAt) <= 30 * 60 * 1000) : false;
  const willRound = roundOn && !!f.interviewAt && !dupRound;
  const plan = (() => {
    if (!f) return "";
    const stage = k.stage;
    const rt = ROUND[f.roundType]?.label || "Interview";
    const round = willRound ? `adds a ${rt} round on ${plLongWhen(f.interviewAt)}` : "";
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    if (!tApp) return `Creates ${f.company || "a new application"}${f.title ? " · " + f.title : ""} in ${STAGE[stage || "applied"].label}${round ? " and " + round : ""}.`;
    if (plShouldMove(tApp.stage, stage)) return `Moves ${tApp.company} to ${STAGE[stage].label}${round ? " and " + round : " and logs this email"}.`;
    return `${round ? cap(round) + " and logs this email" : `Logs this email on ${tApp.company}`}.${dupRound ? " This round is already logged." : ""} Stage stays ${STAGE[tApp.stage].label}.`;
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
    if (dupRound) done.push("round already logged");
    if (willRound) { Apps.addRound(id, { type: f.roundType || "other", at: f.interviewAt, interviewers: f.interviewers || "" }); done.push(`${ROUND[f.roundType]?.label || "Interview"} round added`); }
    Apps.addEvent(id, { kind: "email", text: `Logged email: ${k.label}` });
    const app = Apps.get(id);
    closeModal();
    toast(`${app.company}: ${done.length ? done.join(", ") : "email logged"}`);
  };

  return html`<${Modal} title="Log an email" onClose=${closeModal} size="lg" foot=${html`
    <span class="pl-foot-note hide-sm">Read on this device.</span>
    <span class="spacer" style="flex:1"></span>
    <${Btn} kind="ghost" onClick=${closeModal}>Cancel</${Btn}>
    ${f ? html`<${Btn} kind="primary" icon="check" onClick=${confirm}>${tApp ? "Update application" : "Create application"}</${Btn}>` : html`<${Btn} kind="primary" onClick=${readRules} disabled=${busy}>Read email</${Btn}>`}`}>
    ${f && !showRaw ? html`<div class="pl-raw-sum">
      <${Icon} name="mail" size=${15} />
      <span class="truncate">${plEmailSummary(raw)}</span>
      <button type="button" class="pl-linkbtn pl-small" onClick=${() => setShowRaw(true)} aria-expanded="false" aria-controls="pl-p-raw">Show</button>
    </div>` : html`<div class="field">
      <div class="row"><label for="pl-p-raw" class="label" style="flex:1">Email</label>
        ${f && html`<button type="button" class="pl-linkbtn pl-small" onClick=${() => setShowRaw(false)} aria-expanded="true">Hide</button>`}
        ${raw && !f && html`<button type="button" class="pl-linkbtn pl-small" onClick=${() => { setRaw(""); setF(null); setErr(""); document.getElementById("pl-p-raw")?.focus(); }}>Clear</button>`}</div>
      <textarea id="pl-p-raw" class=${cx("textarea pl-raw", f && "short")} value=${raw} autofocus onInput=${(e) => { setRaw(e.currentTarget.value); setErr(""); }}
        placeholder=${"Paste the whole email here, including the From and Subject lines if you can.\n\nWorks with application confirmations, interview invites, rejections and offers."}></textarea>
      ${html`<div class="pl-samples"><span class="hint">Try a sample:</span>${Object.entries(PL_SAMPLES).map(([key, x]) => html`<button type="button" key=${key} class="chip" id=${"pl-sample-" + key} onClick=${() => sample(key)}>${x.label}</button>`)}</div>`}
    </div>`}
    ${!f && c.sample && html`<div class="row wrap pl-ai-row">
      ${busy ? html`<span class="pl-thinking"><span class="pl-spin" aria-hidden="true"></span>Thinking…</span><${Btn} size="sm" icon="x" onClick=${() => ctrl.current?.abort()}>Stop</${Btn}>` : html`<${Btn} size="sm" icon="spark" onClick=${readAI}>Read with Claude instead</${Btn}>`}
      <span class="hint">${busy ? "" : "Better with unusual emails. Uses your Claude account."}</span>
    </div>`}
    ${err && html`<div class="callout wait" role="alert"><${Icon} name="alert" /><span>${err}</span></div>`}
    ${f && html`<div class="pl-preview card" id="pl-p-preview">
      <div class="pl-preview-head">
        <span class=${cx("badge", { confirmation: "accent", interview: "wait", screen: "info", rejection: "bad", offer: "ok", other: "" }[f.kind])}>${k.label}</span>
        ${src === "ai" ? html`<span class="ai-label"><${Icon} name="spark" />Read by Claude. Check the fields.</span>` : html`<span class="hint">Check the fields below.</span>`}
        <span class="spacer" style="flex:1"></span>
        ${c.sample && src !== "ai" && (busy ? html`<span class="pl-thinking"><span class="pl-spin" aria-hidden="true"></span>Thinking…</span><${Btn} size="sm" onClick=${() => ctrl.current?.abort()}>Stop</${Btn}>` : html`<${Btn} size="sm" icon="spark" onClick=${readAI}>Read with Claude</${Btn}>`)}
      </div>
      <div class="pl-plan"><${Icon} name="arrowR" /><p>${plan}</p></div>
      <div class="pl-preview-grid">
        <div class="field"><label for="pl-p-kind">Type</label><select id="pl-p-kind" class="select" value=${f.kind} onChange=${upd("kind")}>${Object.entries(EMAIL_KINDS).map(([id, x]) => html`<option key=${id} value=${id}>${x.label}</option>`)}</select></div>
        <div class="field"><label for="pl-p-date">Email date</label><input id="pl-p-date" class="input" type="date" value=${fmt.toDateInput(f.at)} onChange=${(e) => setF({ ...f, at: plFromDate(e.currentTarget.value) || f.at })} /></div>
        <div class="field"><label for="pl-p-co">Company</label><input id="pl-p-co" class="input" value=${f.company} onInput=${upd("company")} placeholder="Not found. Type it in." /></div>
        <div class="field"><label for="pl-p-title">Role</label><input id="pl-p-title" class="input" value=${f.title} onInput=${upd("title")} placeholder="Not found. Type it in." /></div>
        ${roundOn && html`
          <div class="field"><label for="pl-p-when">Interview time</label><input id="pl-p-when" class="input" type="datetime-local" value=${fmt.toInput(f.interviewAt)} onChange=${(e) => setF({ ...f, interviewAt: fmt.fromInput(e.currentTarget.value), tz: "" })} />${!f.interviewAt ? html`<span class="hint">No time found. Add one to create a round.</span>` : f.tz ? html`<span class="hint">Converted from ${f.tz} to your time.</span>` : null}</div>
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
