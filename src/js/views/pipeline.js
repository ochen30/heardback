/* ===== Pipeline: board + table, application drawer, add / paste-email / draft modals ===== */

const PL_MAIN = ["saved", "applied", "screen", "interview", "offer"];
const PL_CLOSED = ["rejected", "ghosted"];
const PL_OUTCOMES = [{ id: "pending", label: "Pending" }, { id: "passed", label: "Passed" }, { id: "failed", label: "Didn’t pass" }, { id: "cancelled", label: "Cancelled" }];

/* ---------- helpers ---------- */
function plUi(patch) { store.set((s) => ({ ...s, ui: { ...s.ui, ...patch } })); }
function plClosedOpen(s) { return !!s.ui.pipelineClosedOpen; }
function plSetClosedOpen(v) { plUi({ pipelineClosedOpen: v }); }
/* A move into Rejected/Ghosted opens Closed for that moment only ("auto"); it folds back on the next
   move into an active stage and whenever you come back to the page. Opening it yourself sticks. */
function plAutoOpenClosed(to) {
  const cur = store.get().ui.pipelineClosedOpen;
  if (PL_CLOSED.includes(to)) { if (!cur) plSetClosedOpen("auto"); }
  else if (cur === "auto") plSetClosedOpen(false);
}
function plUpcoming(a, t = now()) {
  return (a.rounds || []).filter((r) => r.at && r.at > t && r.outcome !== "cancelled").sort((x, y) => x.at - y.at)[0] || null;
}
function plWhen(ts) {
  const d0 = fmt.startOfDay(now()), d1 = fmt.startOfDay(ts);
  const diff = Math.round((d1 - d0) / DAY);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff > 1 && diff < 7 ? new Date(ts).toLocaleDateString(undefined, { weekday: "short" }) : fmt.date(ts);
  return `${day}, ${plTime(ts)}`;
}
/* "1 PM" on the hour, "1:30 PM" otherwise */
function plTime(ts) { const d = new Date(ts); return d.getMinutes() ? fmt.time(ts) : d.toLocaleTimeString(undefined, { hour: "numeric" }); }
function plLongWhen(ts) { return `${new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${fmt.time(ts)}`; }
function plStageAt(a, stage) {
  const ev = [...(a.events || [])].reverse().find((e) => e.kind === "stage" && e.to === stage);
  return ev ? ev.at : null;
}
/* Whole calendar days since ts (an applied date stored as noon yesterday is 1 day ago at 3 AM) */
function plDaysSince(ts) { return Math.max(0, Math.round((fmt.startOfDay(now()) - fmt.startOfDay(ts)) / DAY)); }
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

function plRoundLabel(r) { return ROUND[r?.type]?.label || "Round"; }
/* "Today, 11 PM" -> "today, 11 PM" (weekday and month names keep their capital) */
function plLower(w) { return w.replace(/^(Today|Tomorrow)\b/, (m) => m.toLowerCase()); }
function plPastPending(a, t = now()) { return (a.rounds || []).filter((r) => r.at && r.at <= t && r.outcome === "pending").sort((x, y) => y.at - x.at)[0] || null; }
function plFirstName(s) { return (s || "").replace(/\([^)]*\)/g, "").split(/[,&;]| and /)[0].trim(); }

/* Card / table status line */
function plStatus(a, st) {
  const t = now();
  const up = plUpcoming(a, t);
  if (up && !PL_CLOSED.includes(a.stage)) {
    const oa = up.type === "assessment", when = plWhen(up.at);
    return { icon: oa ? "clock" : "cal", tone: "accent", main: oa ? `Due ${plLower(when)}` : when, text: `${plRoundLabel(up)} · ${oa ? "due " + plLower(when) : when}`, title: `${plRoundLabel(up)} · ${oa ? "due " : ""}${fmt.dateTime(up.at)}` };
  }
  /* A past round still waiting on its outcome says so, instead of "Replied 21d ago" */
  const past = ["screen", "interview"].includes(a.stage) ? plPastPending(a, t) : null;
  if (past) return { icon: "flag", tone: "wait", lead: "Log outcome", rest: `${plRoundLabel(past)}, ${fmt.ago(past.at)}`, text: `Log outcome · ${plRoundLabel(past)}, ${fmt.ago(past.at)}`, title: `${plRoundLabel(past)} on ${fmt.dateTime(past.at)}: outcome not logged yet` };
  if (listingRemoved(a) && ["saved", "applied", "screen"].includes(a.stage)) return { icon: "flag", tone: "wait", text: "Posting taken down", title: "This listing is no longer live" };
  if (a.stage === "saved") return { icon: "bookmark", text: `Saved ${fmt.ago(a.createdAt)}` };
  if (a.stage === "offer") return { icon: "trophy", tone: "ok", text: `Offer ${fmt.ago(plStageAt(a, "offer") || a.lastReplyAt || a.lastActivityAt)}` };
  if (a.stage === "rejected") return { icon: "x", text: `Rejected ${fmt.ago(plStageAt(a, "rejected") || a.lastActivityAt)}` };
  if (a.stage === "ghosted") return { icon: "ghost", text: `Ghosted ${fmt.ago(plStageAt(a, "ghosted") || a.lastActivityAt)}` };
  const silent = Apps.daysSilent(a);
  if (silent >= st.followUpDays) return { icon: "clock", tone: "wait", text: `Silent ${silent}d`, title: `No reply in ${silent} days` };
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
    ? { kind: "closed", icon: "flag", short: "Closed", title: "This one is closed", sub: "If you had interviews, it’s fair to ask for brief feedback. Otherwise, let it go." }
    : { kind: "closed", icon: "ghost", short: "Closed", title: "Marked as ghosted", sub: "If they reply after all, move it back to the right stage." };
  if (a.stage === "offer") return { kind: "offer", icon: "trophy", tone: "ok", short: "Get the offer in writing", title: "You have an offer", sub: "Ask for the offer in writing and the decision deadline before you reply." };
  if (up && up.type === "assessment") return { kind: "upcoming", icon: "clock", tone: "info", round: up, short: `Assessment due ${fmt.until(up.at)}`, title: `Online assessment due ${fmt.until(up.at)}`, sub: `Due ${fmt.dateTime(up.at)}${up.interviewers ? " · on " + up.interviewers : ""}` };
  if (up) return { kind: "upcoming", icon: "cal", tone: "info", round: up, short: `${label(up)} ${fmt.until(up.at)}`, title: `${label(up)} ${fmt.until(up.at)}`, sub: `${fmt.dateTime(up.at)}${up.interviewers ? " · with " + up.interviewers : ""}` };
  const past = plPastPending(a, t);
  if (past && past.type === "assessment") return { kind: "outcome", icon: "flag", round: past, short: "Log the result", title: "Did you pass the online assessment?", sub: `It was due ${fmt.ago(past.at)}. Log the result when you hear back.` };
  if (past && !past.thanked && t - past.at < 2 * DAY) return { kind: "thanks", icon: "send", tone: "info", round: past, short: "Send a thank-you", title: "Send a thank-you note", sub: `Your ${label(past).toLowerCase()} was ${fmt.ago(past.at)}. A short note within 24 hours helps.` };
  if (past) return { kind: "outcome", icon: "flag", round: past, short: "Log the outcome", title: `How did the ${label(past).toLowerCase()} go?`, sub: `It was ${fmt.ago(past.at)}. Log the outcome and a few notes while you remember.` };
  if (listingRemoved(a) && a.stage === "saved") return { kind: "removed", icon: "flag", tone: "wait", short: "Posting taken down", title: "The posting was taken down", sub: "It’s no longer in the live listings. Check the company’s careers page, or remove it from your board." };
  if (a.stage === "saved") return { kind: "saved", icon: "bolt", short: "Apply", title: "Apply, then mark it applied", sub: `You saved this ${fmt.ago(a.createdAt)}. Early applicants tend to hear back more often.` };
  if (silent >= st.ghostDays) return { kind: "ghost", icon: "ghost", tone: "wait", short: "Mark as ghosted?", title: `No reply in ${silent} days. Mark as ghosted?`, sub: "Most companies reply within 3 weeks if they’re interested. Marking it keeps your board honest. You can move it back any time." };
  if (a.stage === "applied" && silent >= st.followUpDays && !a.followedUpAt) return { kind: "follow", icon: "reply", tone: "wait", short: "Follow up", title: "Send a follow-up", sub: `You applied ${silent} days ago and haven’t heard back. A short, specific note is fine.` };
  if (a.stage === "applied") {
    const due = (a.followedUpAt || a.appliedAt || t) + st.followUpDays * DAY;
    return { kind: "wait", icon: "clock", short: a.followedUpAt ? "Waiting after follow-up" : "Wait for a reply", title: "Waiting for a reply", sub: a.followedUpAt ? `You followed up ${fmt.ago(a.followedUpAt)}.` : `Heardback will suggest a follow-up on ${fmt.date(due)} if you haven’t heard back.` };
  }
  return { kind: "schedule", icon: "cal", short: "Add next round", title: "Add the next round when it’s scheduled", sub: "Log the date, type and interviewers so Heardback can remind you to prep and send a thank-you." };
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
  if (!p.title) { const m = (raw || "").match(/\btake the (.+?) (?:coding |online |technical )?(?:assessment|challenge|test)\b/i); if (m && m[1].length <= 90) p.title = m[1].trim(); }
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
  const savedN = all.filter((a) => a.stage === "saved").length;
  const sub = [`${all.length} tracked`, savedN ? `${savedN} saved` : null, `${active} active`, offers ? pluralize(offers, "offer") : null].filter(Boolean).join(" · ");
  const examples = hasExamples(s) && s.settings.showExamples;
  const closedOpen = plClosedOpen(s);
  /* Closed opened by a move folds back when you return to the page */
  useEffect(() => { if (store.get().ui.pipelineClosedOpen === "auto") plSetClosedOpen(false); }, []);
  /* Only items on screen can be selected: filtered out (or in the collapsed Closed rail) drops them */
  const visible = view === "board" && !closedOpen ? apps.filter((a) => !PL_CLOSED.includes(a.stage)) : apps;
  const sel = plUseSelection(visible.map((a) => a.id).join(","), view);
  const keepFocus = plUseKeys();
  /* Any re-render (a move, an undo, a delete) can drop the focused card: put focus back on it */
  useEffect(() => { keepFocus(); });

  if (!all.length) return html`<div class="page pl-page">
    <div class="page-head"><div><h1>Pipeline</h1><p>Track applications and what to do next.</p></div></div>
    <${PlEmpty} />
  </div>`;

  return html`<div class=${cx("page wide pl-page", view === "board" && "pl-page-board", sel.size && "pl-selecting")}>
    <div class="page-head pl-head">
      <div class="pl-head-title"><h1>Pipeline</h1>${plSepText(sub, "num", "p")}</div>
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
      <${Icon} name="info" />
      <span class="pl-banner-text"><b>Example data.</b><span class="pl-banner-more"> Clear it when you add your first application.</span></span>
      <span class="spacer"></span>
      <${Btn} size="sm" onClick=${() => clearExamples()}>Clear examples</${Btn}>
    </div>`}
    ${n && !apps.length && html`<div class="callout"><${Icon} name="search" /><span>No applications match “${q}”. <button type="button" class="pl-linkbtn" onClick=${() => setQ("")}>Clear the filter</button></span></div>`}
    ${view === "board" ? html`<${PlBoard} apps=${apps} settings=${s.settings} closedOpen=${closedOpen} hint=${!s.ui.pipelineHintDone} filtering=${!!n} sel=${sel} />` : html`<${PlTable} apps=${apps} settings=${s.settings} sort=${s.ui.pipelineSort || { k: "activity", dir: -1 }} sel=${sel} />`}
    ${sel.size > 0 && html`<${PlBulkBar} sel=${sel} view=${view} />`}
  </div>`;
};

/* ---------- Keyboard: J/K across cards (board: column by column) and rows (table); focus never drops to <body> ---------- */
function plItems() { return [...document.querySelectorAll(".pl-page [data-card], .pl-page tr[data-row]")]; }
function plItemId(el) { const c = el && el.closest ? el.closest("[data-card], tr[data-row]") : null; return c && c.closest(".pl-page") ? c.dataset.card || c.dataset.row : null; }
function plFocusItem(el) { if (!el) return; el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest", inline: "nearest" }); }
function plUseKeys() {
  const last = useRef({ id: null, i: 0 });
  /* Restore focus to the last card/row when it was lost (removed from the DOM, or a drawer/menu closed onto <body>) */
  const restore = useCallback((force) => {
    const st = ui.state;
    if (st.drawer || st.modal || st.palette || document.querySelector(".pl-menu")) return;
    const ae = document.activeElement;
    if (ae && ae !== document.body && ae.isConnected && !(force && plItemId(ae) && plItemId(ae) !== force)) return;
    const { i } = last.current, id = force || last.current.id; if (!id) return;
    const els = plItems(); if (!els.length) return;
    plFocusItem(els.find((el) => (el.dataset.card || el.dataset.row) === id) || els[Math.min(i, els.length - 1)]);
  }, []);
  useEffect(() => {
    let lastG = 0;
    const onIn = (e) => { const id = plItemId(e.target); if (id) last.current = { id, i: Math.max(0, plItems().findIndex((el) => (el.dataset.card || el.dataset.row) === id)) }; };
    /* A click on empty space is a deliberate blur: don't pull focus back after it */
    const onPtr = (e) => { if (!e.target.closest?.("[data-card], tr[data-row], .pl-menu, .pl-bulk, .drawer, .modal, .toasts, .scrim")) last.current = { id: null, i: 0 }; };
    const onOut = () => setTimeout(restore, 0);
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || plEditable(e.target)) return;
      if (ui.state.drawer || ui.state.modal || ui.state.palette || document.querySelector(".pl-menu")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "g") { lastG = now(); return; }
      if (now() - lastG < 1200) return; /* "G then …" belongs to the shell */
      const onItem = !!plItemId(e.target) && e.target.matches("[data-card], tr[data-row]");
      const d = k === "j" || (onItem && k === "ArrowDown") ? 1 : k === "k" || (onItem && k === "ArrowUp") ? -1 : 0;
      if (!d) return;
      const els = plItems(); if (!els.length) return;
      e.preventDefault();
      const cur = plItemId(document.activeElement) || last.current.id;
      const i = cur ? els.findIndex((el) => (el.dataset.card || el.dataset.row) === cur) : -1;
      plFocusItem(els[i < 0 ? (d > 0 ? 0 : els.length - 1) : clamp(i + d, 0, els.length - 1)]);
    };
    /* A drawer opened on an application (from a card, a row or the palette) hands focus back to that card */
    let prev = ui.state;
    const offUi = ui.sub((st) => {
      const closed = (prev.drawer && !st.drawer) || (prev.modal && !st.modal) || (prev.palette && !st.palette);
      const app = prev.drawer && !st.drawer && prev.drawer.kind === "app" && plItems().some((el) => (el.dataset.card || el.dataset.row) === prev.drawer.id) ? prev.drawer.id : null;
      if (app) last.current = { ...last.current, id: app };
      prev = st;
      if (closed) setTimeout(() => restore(app), 40);
    });
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    document.addEventListener("pointerdown", onPtr, true);
    window.addEventListener("keydown", onKey);
    return () => { offUi(); document.removeEventListener("focusin", onIn); document.removeEventListener("focusout", onOut); document.removeEventListener("pointerdown", onPtr, true); window.removeEventListener("keydown", onKey); };
  }, []);
  return () => setTimeout(restore, 0);
}

/* ---------- Selection + bulk actions ---------- */
/* Selection lives in the view. Range order is the on-screen order (board: column by column; table: row order). */
function plOrder() { return [...document.querySelectorAll(".pl-page [data-card], .pl-page tr[data-row]")].map((el) => el.dataset.card || el.dataset.row); }
/* "a · b · c" as a dotted meta line (today_meta): a wrapped line never starts or ends with "·" */
function plSepText(str, cls, tag) {
  const parts = String(str ?? "").split(" · ");
  return parts.length < 2 ? parts[0] : today_meta(parts, cls, tag);
}
/* Keys typed into a field are text, never shortcuts */
function plEditable(el) { return !!el && (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "reset"].includes(el.type))); }
function plTouch() { return window.matchMedia("(hover: none)").matches; }
function plUseSelection(visKey, view) {
  const [ids, setIds] = useState(() => new Set());
  const anchor = useRef(null);
  /* Keep only still-visible items when the filter or data changes */
  useEffect(() => {
    setIds((prev) => { if (!prev.size) return prev; const v = new Set(visKey.split(",")); const nx = new Set([...prev].filter((id) => v.has(id))); return nx.size === prev.size ? prev : nx; });
  }, [visKey]);
  /* Switching board/table starts fresh */
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setIds(new Set()); anchor.current = null; }, [view]);
  const clear = useCallback(() => { setIds(new Set()); anchor.current = null; }, []);
  /* Escape clears, but only when nothing else (drawer, modal, menu, filter) handled it first */
  useEffect(() => {
    if (!ids.size) return;
    const k = (e) => { if (e.key === "Escape" && !e.defaultPrevented && !ui.state.drawer && !ui.state.modal) clear(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ids.size > 0]);
  const toggle = (id, range) => {
    const nx = new Set(ids);
    const order = range && anchor.current && anchor.current !== id ? plOrder() : null;
    let i = order ? order.indexOf(anchor.current) : -1, j = order ? order.indexOf(id) : -1;
    if (i >= 0 && j >= 0) { if (i > j) [i, j] = [j, i]; order.slice(i, j + 1).forEach((x) => nx.add(x)); }
    else if (nx.has(id)) nx.delete(id); else nx.add(id);
    anchor.current = id;
    setIds(nx);
  };
  const setMany = (list, on) => { const nx = new Set(ids); list.forEach((id) => (on ? nx.add(id) : nx.delete(id))); setIds(nx); };
  return { ids, size: ids.size, has: (id) => ids.has(id), toggle, setMany, clear, list: () => plOrder().filter((id) => ids.has(id)) };
}

function plRestore(list) { store.set((s) => { const apps = { ...s.apps }; list.forEach((a) => (apps[a.id] = a)); return { ...s, apps }; }); }
function plCount(list) { return list.length === 1 ? list[0].company : pluralize(list.length, "application"); }
/* One store write for the whole batch, one toast, one Undo that restores every card */
function plBulkMove(ids, to) {
  const before = ids.map((id) => Apps.get(id)).filter((a) => a && a.stage !== to);
  if (!before.length) { toast(`Already in ${STAGE[to].label}`); return 0; }
  const t = now();
  store.set((s) => {
    const apps = { ...s.apps };
    for (const a of before) {
      const cur = apps[a.id]; if (!cur) continue;
      const ev = { id: uid("e_"), at: t, kind: "stage", from: cur.stage, to, text: `Moved to ${STAGE[to].label}` };
      const patch = { stage: to, lastActivityAt: t, events: [...(cur.events || []), ev] };
      if (to !== "saved" && !cur.appliedAt) patch.appliedAt = t;
      if (["screen", "interview", "offer", "rejected"].includes(to) && STAGE[cur.stage].i < STAGE[to].i) patch.lastReplyAt = t;
      apps[a.id] = { ...cur, ...patch };
    }
    return { ...s, apps };
  });
  plAutoOpenClosed(to);
  if (to === "offer") celebrate(before[0]);
  toast(to === "ghosted" ? `Marked ${plCount(before)} as ghosted` : `Moved ${plCount(before)} to ${STAGE[to].label}`, { undo: () => plRestore(before) });
  return before.length;
}
function plBulkDelete(ids, done) {
  const list = ids.map((id) => Apps.get(id)).filter(Boolean);
  if (!list.length) return;
  const one = list.length === 1;
  askConfirm({
    title: one ? `Delete ${list[0].company}?` : `Delete ${list.length} applications?`,
    body: `This removes ${one ? list[0].title || "this application" : `these ${list.length} applications`} with ${one ? "its" : "their"} rounds, notes and timeline from this device. You can undo right after.`,
    confirmLabel: one ? "Delete application" : `Delete ${list.length} applications`, danger: true,
    onConfirm: () => {
      store.set((s) => { const apps = { ...s.apps }; list.forEach((a) => delete apps[a.id]); return { ...s, apps }; });
      done();
      toast(`Deleted ${plCount(list)}`, { undo: () => plRestore(list) });
    },
  });
}
/* Same columns as Settings > Export CSV, so the file imports back cleanly */
function plExportCSV(ids) {
  const list = ids.map((id) => Apps.get(id)).filter(Boolean);
  const head = ["company", "title", "location", "stage", "applied", "last activity", "url", "rounds", "example"];
  const iso = (t) => (t ? fmt.toDateInput(t) : "");
  const rows = list.map((a) => [a.company, a.title, a.location, STAGE[a.stage]?.label || a.stage, iso(a.appliedAt), iso(a.lastActivityAt), a.url, (a.rounds || []).length, a.example ? "yes" : ""]);
  saveFile(`heardback-${list.length}-applications-${fmt.toDateInput(now())}.csv`, [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv");
}

function PlBulkBar({ sel, view }) {
  const [menu, setMenu] = useState(null);
  const ids = sel.list();
  const list = ids.map((id) => Apps.get(id)).filter(Boolean);
  const stages = new Set(list.map((a) => a.stage));
  const cur = stages.size === 1 ? [...stages][0] : null;
  const after = () => { const first = ids[0]; sel.clear(); if (view === "board" && first && Apps.get(first)) plFocusCard(first); };
  const move = (to) => { if (plBulkMove(ids, to)) after(); };
  return html`<${Fragment}><div class="pl-bulk" role="toolbar" aria-label="Actions for selected applications">
    <span class="pl-bulk-count num" aria-live="polite">${sel.size} selected</span>
    <span class="pl-bulk-sep" aria-hidden="true"></span>
    <${Btn} kind="ghost" size="sm" iconRight="chevD" cls="pl-bulk-move" aria-haspopup="menu" aria-expanded=${menu ? "true" : "false"} onClick=${(e) => { const el = e.currentTarget; setMenu((m) => (m ? null : el)); }}>Move to…</${Btn}>
    <${Btn} kind="ghost" size="sm" icon="ghost" cls="pl-bulk-ic" disabled=${cur === "ghosted"} aria-label="Mark as ghosted" title="Mark as ghosted" onClick=${() => move("ghosted")}><span class="pl-bulk-lbl">Mark as ghosted</span></${Btn}>
    <${Btn} kind="ghost" size="sm" icon="download" cls="pl-bulk-ic" aria-label="Export CSV" title="Export the selection as CSV" onClick=${() => plExportCSV(ids)}><span class="pl-bulk-lbl">Export CSV</span></${Btn}>
    <${Btn} kind="ghost" size="sm" icon="trash" cls="pl-bulk-ic danger" aria-label="Delete" title="Delete selected applications" onClick=${() => plBulkDelete(ids, after)}><span class="pl-bulk-lbl">Delete</span></${Btn}>
    <span class="pl-bulk-sep" aria-hidden="true"></span>
    <${Btn} kind="ghost" size="sm" icon="x" cls="pl-bulk-x" aria-label="Clear selection" title="Clear selection (Esc)" onClick=${sel.clear} />
  </div>
  ${menu && html`<${PlMoveMenu} label=${`Move ${pluralize(list.length, "application")}`} current=${cur} anchor=${menu} onPick=${move} onClose=${() => setMenu(null)} />`}
  </${Fragment}>`;
}

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
      <button type="button" class="pl-linkbtn" onClick=${() => go("find")}>Find jobs</button>
      <button type="button" class="pl-linkbtn" onClick=${loadExamples}>Load an example pipeline</button>
    </div>
  </div>`;
}

/* ---------- Board ---------- */
function PlBoard({ apps, settings, closedOpen, hint, filtering, sel }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [menu, setMenu] = useState(null);
  const by = useMemo(() => { const m = {}; STAGES.forEach((x) => (m[x.id] = [])); apps.forEach((a) => (m[a.stage] || m.applied).push(a)); for (const k in m) m[k] = plSortInCol(m[k]); return m; }, [apps]);
  const closedList = useMemo(() => plSortInCol([...by.rejected, ...by.ghosted]), [by]);
  /* Edge fades only on the side that has more board to scroll to */
  const boardRef = useRef(null);
  const [edge, setEdge] = useState("");
  useLayoutEffect(() => {
    const el = boardRef.current; if (!el) return;
    const upd = () => {
      const max = el.scrollWidth - el.clientWidth;
      const v = max <= 2 ? "" : [el.scrollLeft > 2 && "fade-l", el.scrollLeft < max - 2 && "fade-r"].filter(Boolean).join(" ");
      setEdge((p) => (p === v ? p : v));
    };
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    return () => { el.removeEventListener("scroll", upd); window.removeEventListener("resize", upd); };
  }, [closedOpen, !!drag, apps.length]);

  const dropOn = (stage) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const id = e.dataTransfer?.getData("text/plain") || drag;
    setOver(null); setDrag(null);
    if (id && Apps.get(id) && Apps.get(id).stage !== stage) { plAutoOpenClosed(stage); Apps.move(id, stage); }
  };
  const dragOver = (stage) => (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; if (over !== stage) setOver(stage); };
  const dragLeave = (stage) => (e) => { if (!e.currentTarget.contains(e.relatedTarget) && over === stage) setOver(null); };
  const dropProps = (stage) => ({ onDragOver: dragOver(stage), onDragLeave: dragLeave(stage), onDrop: dropOn(stage) });

  const move = (a, to) => {
    if (!to || to === a.stage) return;
    plAutoOpenClosed(to);
    Apps.move(a.id, to); plFocusCard(a.id);
    if (hint) plUi({ pipelineHintDone: true });
  };
  const onKey = (a) => (e) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key;
    if ((k === "x" || k === "X") && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); sel.toggle(a.id, e.shiftKey); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); openApp(a.id); }
    else if (k === "ArrowRight" || k === "]" || k === "ArrowLeft" || k === "[") {
      e.preventDefault();
      /* Steps only within the main flow; closing an application is always explicit */
      const j = PL_MAIN.indexOf(a.stage);
      const to = j < 0 ? null : PL_MAIN[j + (k === "ArrowRight" || k === "]" ? 1 : -1)];
      if (to) move(a, to);
    }
  };
  const card = (a) => html`<${PlCard} key=${a.id} a=${a} settings=${settings} dragging=${drag === a.id}
    selected=${sel.has(a.id)} selecting=${sel.size > 0} onSelect=${(range) => sel.toggle(a.id, range)}
    onDragStart=${(e) => { e.dataTransfer.setData("text/plain", a.id); e.dataTransfer.effectAllowed = "move"; setDrag(a.id); }}
    onDragEnd=${() => { setDrag(null); setOver(null); }}
    onKeyDown=${onKey(a)}
    onMenu=${(el) => setMenu({ id: a.id, el })} />`;
  /* While dragging, the Closed area offers two targets: Rejected and Ghosted */
  const closedTargets = html`<div class="pl-drop-pair">${PL_CLOSED.map((id) => html`<div key=${id} class=${cx("pl-drop", over === id && "on")} data-col=${id} ...${dropProps(id)}><span class=${cx("dot", id)}></span>${STAGE[id].label}</div>`)}</div>`;

  return html`<${Fragment}>
    <div ref=${boardRef} class=${cx("board pl-board", sel.size && "selecting", edge)} role="list" aria-label="Pipeline board">
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
    <p class="sr" id="pl-kbd-hint">Press the left and right arrow keys to move a card to another stage, J and K or up and down to go to the next or previous card, Enter to open, X to select.</p>
    ${hint && html`<div class="pl-tip hide-sm" role="note">
      <${Icon} name="keyboard" size=${14} />
      <span>Tip: drag cards between columns, or focus a card and press <${Kbd}>←</${Kbd}> <${Kbd}>→</${Kbd}> to move it.</span>
      <button type="button" class="pl-tip-x" aria-label="Dismiss tip" title="Dismiss" onClick=${() => plUi({ pipelineHintDone: true })}><${Icon} name="x" size=${14} /></button>
    </div>`}
    ${menu && Apps.get(menu.id) && html`<${PlMoveMenu} label=${`Move ${Apps.get(menu.id).company}`} current=${Apps.get(menu.id).stage} anchor=${menu.el} onPick=${(to) => move(Apps.get(menu.id), to)} onClose=${() => setMenu(null)}
      extra=${[{ icon: "check", label: sel.has(menu.id) ? "Deselect" : "Select", run: () => sel.toggle(menu.id) }, { icon: "arrowR", label: "Open details", run: () => openApp(menu.id) }]} />`}
  </${Fragment}>`;
}

function PlCard({ a, settings, dragging, onMenu, selected, selecting, onSelect, ...rest }) {
  const stt = plStatus(a, settings);
  const click = (e) => {
    if (e.target.closest("button")) return;
    /* Checkbox, Cmd/Ctrl-click, Shift-click while selecting, or a tap on touch while selecting: toggle selection */
    if (e.target.closest(".pl-chk") || e.metaKey || e.ctrlKey || (selecting && (e.shiftKey || plTouch()))) { onSelect(e.shiftKey); return; }
    openApp(a.id);
  };
  return html`<article class=${cx("app-card pl-card", dragging && "dragging", PL_CLOSED.includes(a.stage) && "closed", selected && "sel")} tabindex="0" draggable="true" data-card=${a.id}
    aria-label=${`${a.title} at ${a.company}. ${STAGE[a.stage].label}. ${stt.text}.${selected ? " Selected." : ""}`} aria-describedby="pl-kbd-hint"
    onClick=${click} onMouseDown=${(e) => { if (e.shiftKey && selecting) e.preventDefault(); }} ...${rest}>
    <div class="pl-card-top">
      <span class="pl-card-lead"><${Logo} name=${a.company} size="sm" /><span class="pl-chk" draggable="false"><input type="checkbox" id=${"pl-cs-" + a.id} tabindex="-1" checked=${!!selected} aria-label=${`Select ${a.company}, ${a.title || "untitled role"}`} /></span></span>
      <span class="pl-card-co truncate">${a.company}</span>
      <button type="button" class="pl-more" aria-label=${`Move ${a.company} to another stage`} aria-haspopup="menu" title="Move to…" onClick=${(e) => { e.stopPropagation(); onMenu(e.currentTarget); }}><${Icon} name="more" /></button>
    </div>
    <div class="app-card-title pl-card-title">${a.title || "Untitled role"}</div>
    ${a.location && html`<div class="pl-card-loc truncate">${a.location}</div>`}
    <div class="app-card-foot pl-card-foot">
      <span class=${cx("pl-status", stt.tone, stt.lead && "pl-status-2l")} title=${stt.title}><${Icon} name=${stt.icon} size=${13} />${stt.main ? html`<span class="pl-status-main">${stt.main}</span>` : stt.lead ? html`<span>${stt.lead}<span class="pl-status-extra"> · ${stt.rest}</span></span>` : html`<span class="truncate">${stt.text}</span>`}</span>
    </div>
  </article>`;
}

function PlMoveMenu({ label, current, anchor, onPick, onClose, extra }) {
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
  return html`<div class="menu pl-menu" role="menu" aria-label=${label} ref=${ref} onKeyDown=${nav} style=${pos ? `left:${pos.left}px;top:${pos.top}px` : "visibility:hidden;left:0;top:0"}>
    <div class="pl-menu-label">Move to</div>
    ${STAGES.map((st) => html`<button type="button" role="menuitemradio" key=${st.id} aria-checked=${current === st.id ? "true" : "false"} onClick=${() => { onClose(); onPick(st.id); }}>
      <span class=${cx("dot", st.id)}></span><span style="flex:1">${st.label}</span>${current === st.id && html`<${Icon} name="check" size=${14} />`}
    </button>`)}
    ${extra && extra.length > 0 && html`<div class="pl-menu-sep"></div>`}
    ${(extra || []).map((x) => html`<button type="button" role="menuitem" key=${x.label} onClick=${() => { onClose(); x.run(); setTimeout(() => { if (!ui.state.drawer && !ui.state.modal) anchor.closest?.("[data-card]")?.focus(); }, 0); }}><${Icon} name=${x.icon} size=${14} />${x.label}</button>`)}
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
function PlTable({ apps, settings, sort, sel }) {
  const col = PL_COLS.find((c) => c.k === sort.k) || PL_COLS[3];
  const rows = useMemo(() => [...apps].sort((x, y) => { const a = col.v(x), b = col.v(y); return (a < b ? -1 : a > b ? 1 : 0) * sort.dir; }), [apps, sort.k, sort.dir]);
  const ids = rows.map((a) => a.id);
  const nSel = ids.filter((id) => sel.has(id)).length;
  const allOn = nSel > 0 && nSel === ids.length;
  const headRef = useRef(null);
  useEffect(() => { if (headRef.current) headRef.current.indeterminate = nSel > 0 && !allOn; });
  const onTableKey = (e) => {
    const t = e.target;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "a" && !plEditable(t)) { e.preventDefault(); sel.setMany(ids, true); }
  };
  const rowClick = (a) => (e) => {
    if (e.target.closest("select")) return;
    if (e.target.closest(".pl-chk-cell") || e.metaKey || e.ctrlKey || (sel.size && (e.shiftKey || plTouch()))) { sel.toggle(a.id, e.shiftKey); return; }
    openApp(a.id);
  };
  const setSort = (k) => plUi({ pipelineSort: { k, dir: sort.k === k ? -sort.dir : k === "company" || k === "stage" || k === "next" ? 1 : -1 } });
  return html`<${Fragment}>
  <div class="pl-msort">
    <label for="pl-msort" class="pl-small muted">Sort by</label>
    <select id="pl-msort" class="select" value=${`${col.k}:${sort.dir}`} onChange=${(e) => { const [k, d] = e.currentTarget.value.split(":"); plUi({ pipelineSort: { k, dir: +d } }); }}>
      ${[["activity", -1, "Last activity"], ["next", 1, "Next step"], ["silent", -1, "Days silent"], ["stage", 1, "Stage"], ["applied", -1, "Applied, newest"], ["company", 1, "Company, A–Z"]].map(([k, d, l]) => html`<option key=${k} value=${`${k}:${d}`}>${l}</option>`)}
      ${![["activity", -1], ["next", 1], ["silent", -1], ["stage", 1], ["applied", -1], ["company", 1]].some(([k, d]) => k === col.k && d === sort.dir) && html`<option value=${`${col.k}:${sort.dir}`}>${col.label}${sort.dir > 0 ? ", ascending" : ", descending"}</option>`}
    </select>
  </div>
  <div class="card pl-table-card" onKeyDown=${onTableKey}>
    <div class="table-wrap">
      <table class="table pl-table">
        <thead><tr><th class="pl-chk-cell"><input type="checkbox" id="pl-sel-all" ref=${headRef} checked=${allOn} disabled=${!ids.length} aria-label=${allOn ? "Deselect all" : "Select all visible applications"} title=${allOn ? "Deselect all" : "Select all"}
          onChange=${(e) => sel.setMany(ids, e.currentTarget.checked)} /></th>${PL_COLS.map((c) => html`<th key=${c.k} class=${cx(c.num && "pl-num")} aria-sort=${sort.k === c.k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
          <button type="button" onClick=${() => setSort(c.k)}><span>${c.label}</span>${sort.k === c.k ? html`<${Icon} name=${sort.dir > 0 ? "chevD" : "chevD"} size=${12} cls=${cx("pl-sort", sort.dir < 0 && "desc")} />` : html`<${Icon} name="sort" size=${12} cls="pl-sort-idle" />`}</button>
        </th>`)}</tr></thead>
        <tbody>
          ${rows.map((a) => {
            const ns = plNextStep(a, settings);
            const silent = ACTIVE_STAGES.includes(a.stage) ? Apps.daysSilent(a) : null;
            const due = PL_DUE.includes(ns.kind);
            const dot = due ? "pl-dot-due" : ns.kind === "upcoming" ? "pl-dot-up" : "pl-dot-idle";
            const on = sel.has(a.id);
            return html`<tr key=${a.id} data-row=${a.id} tabindex="0" class=${cx(on && "sel")} onClick=${rowClick(a)} onMouseDown=${(e) => { if (e.shiftKey) e.preventDefault(); }}
              onKeyDown=${(e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter") openApp(a.id); else if ((e.key === "x" || e.key === "X") && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); sel.toggle(a.id, e.shiftKey); } }}>
              <td class="pl-chk-cell"><input type="checkbox" id=${"pl-sel-" + a.id} tabindex="-1" checked=${on} aria-label=${`Select ${a.company}, ${a.title || "untitled role"}`} /></td>
              <td><div class="pl-tcell"><${Logo} name=${a.company} size="sm" /><div class="pl-tname"><span class="pl-ttitle truncate">${a.title || "Untitled role"}</span><span class="pl-tco truncate">${a.company}${a.location ? " · " + a.location : ""}</span><span class=${cx("pl-next pl-tnext-m", due && "due")}><span class=${cx("dot", dot)}></span>${today_meta([STAGE[a.stage]?.label, ...(ns.kind === "closed" ? [] : ns.kind === "ghost" ? [`No reply in ${silent} days`] : [ns.short, silent != null && silent >= settings.followUpDays ? `${silent}d silent` : null])])}</span></div></div></td>
              <td><span class="pl-stage-sel"><span class=${cx("dot", a.stage)}></span><select id=${"pl-st-" + a.id} class="select" value=${a.stage} aria-label=${`Stage for ${a.company}`} title=${`Stage: ${STAGE[a.stage]?.label}`} onChange=${(e) => Apps.move(a.id, e.currentTarget.value)}>${STAGES.map((st) => html`<option key=${st.id} value=${st.id}>${st.label}</option>`)}</select></span></td>
              <td class="num muted">${a.appliedAt ? fmt.date(a.appliedAt) : html`<span class="faint">—</span>`}</td>
              <td class="num muted">${fmt.ago(a.lastActivityAt)}</td>
              <td><span class=${cx("pl-next", due && "due")}><span class=${cx("dot", dot)}></span>${ns.short}</span></td>
              <td class="num pl-num">${silent == null ? html`<span class="faint">—</span>` : html`<span class=${cx(silent >= settings.followUpDays && "pl-warn")}>${silent}</span>`}</td>
            </tr>`;
          })}
          ${!rows.length && html`<tr><td colspan="7" class="faint" style="text-align:center">No applications match the filter.</td></tr>`}
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
    upcoming: { label: ns.round?.type === "assessment" ? "Prep for the assessment" : "Prep for this round", icon: "prep", run: () => plPrep(a, ns.round) },
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
    <${Empty} icon="info" title="This application isn’t here anymore">It may have been deleted, or cleared along with the example data.</${Empty}>
  </${Drawer}>`;
  const hasCo = jobs.status === "ready" && (jobs.byCompany.has(a.company) || jobs.cstats[a.company]);
  const del = () => askConfirm({ title: `Delete ${a.company}?`, body: `This removes ${a.title || "this application"} with its rounds, notes and timeline from this device. You can undo right after.`, confirmLabel: "Delete application", danger: true, onConfirm: () => { closeDrawer(); Apps.remove(a.id); } });
  const ns = plNextStep(a, settings);
  const act = plNextAction(a, ns, setT);
  const removed = listingRemoved(a);
  const head = html`<div class="pl-dhead">
    <${Logo} name=${a.company} size="lg" />
    <div class="pl-dhead-text">
      <h2 class="pl-dtitle">${a.title || "Untitled role"}</h2>
      <div class="pl-dsub">
        ${hasCo ? html`<button type="button" class="pl-linkbtn" onClick=${() => openCompany(a.company)}>${a.company}</button>` : html`<span class="pl-dco">${a.company}</span>`}
        ${a.example && html`<${ExampleTag} />`}
      </div>
    </div>
  </div>`;
  const foot = html`
    ${act && html`<${Btn} kind="primary" icon=${act.icon} onClick=${act.run}>${act.label}</${Btn}>`}
    ${ns.kind === "wait" && html`<${Btn} icon="reply" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft follow-up</${Btn}>`}
    ${a.url && (removed
      ? html`<button type="button" class="btn pl-removed-btn hide-sm" disabled title="This listing is no longer live"><${Icon} name="flag" />Posting removed</button>`
      : html`<a class="btn" href=${plHref(a.url)} target="_blank" rel="noopener"><${Icon} name="ext" />Open posting</a>`)}
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
      ${t === "overview" && html`<${PlOverview} a=${a} ns=${ns} settings=${settings} jobs=${jobs} setTab=${setT} removed=${removed} hasCo=${hasCo} />`}
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
  /* Applied reads the editable applied date, so editing it updates the header */
  const since = a.stage === "applied" && a.appliedAt ? a.appliedAt : plStageAt(a, a.stage) || (a.stage === "saved" ? a.createdAt : a.appliedAt);
  return html`<div class="pl-stepper" role="group" aria-label="Stage">
    <div class="pl-steps">
      ${PL_MAIN.map((id, i) => {
        const st = STAGE[id];
        const state = !closed && i === cur ? "cur" : (!closed && i < cur) || (closed && i <= far) ? "done" : "";
        return html`<button type="button" key=${id} class=${cx("pl-step", state, closed && "muted-done")} aria-pressed=${!closed && i === cur ? "true" : "false"} onClick=${() => Apps.move(a.id, id)} title=${`Move to ${st.label} (press ${i + 1})`}>
          <i></i><span>${st.label}</span>
        </button>`;
      })}
    </div>
    <div class="pl-stage-line">
      <span class="pl-small muted"><span class=${cx("dot", a.stage)}></span>${STAGE[a.stage].label}${since ? ` since ${fmt.date(since)}` : ""}</span>
      <span class="spacer" style="flex:1"></span>
      ${PL_CLOSED.map((id) => html`<button type="button" key=${id} class=${cx("pl-close-btn", id, a.stage === id && "on")} aria-pressed=${a.stage === id ? "true" : "false"} onClick=${() => Apps.move(a.id, id)} title=${`Move to ${STAGE[id].label} (press ${STAGE[id].i + 1})`}>
        <${Icon} name=${id === "ghosted" ? "ghost" : "x"} size=${14} />${a.stage === id ? STAGE[id].label : id === "rejected" ? "Mark as rejected" : "Mark as ghosted"}
      </button>`)}
    </div>
  </div>`;
}

/* Read-mode value that turns into an input on click; saves on blur or Enter, Escape cancels */
function PlInline({ id, label, value, display, type = "text", placeholder, onSave, toInput = (v) => v || "", fromInput = (v) => v }) {
  const [edit, setEdit] = useState(false);
  const ref = useRef(null);
  const done = useRef(false);
  /* Focus in the commit itself (not after paint), so a key pressed right after the click lands in the input, not on the drawer's shortcuts */
  /* Uncontrolled while editing: the value is seeded once, so a re-render (a toast, a store update) never wipes what was typed */
  useLayoutEffect(() => { if (edit) { done.current = false; if (ref.current) ref.current.value = toInput(value); ref.current?.focus(); if (type === "text" || type === "url") ref.current?.select?.(); } }, [edit]);
  const refocus = useRef(false);
  useLayoutEffect(() => { if (!edit && refocus.current) { refocus.current = false; document.getElementById(id + "-v")?.focus(); } }, [edit]);
  /* Enter and Escape hand focus back to the value; a blur leaves it wherever the person moved it */
  const close = (save, back = true) => {
    if (done.current) return; done.current = true;
    if (save && ref.current) { const v = fromInput(ref.current.value); if (v !== value) onSave(v); }
    refocus.current = back;
    setEdit(false);
  };
  if (!edit) return html`<button type="button" id=${id + "-v"} class=${cx("pl-inline", !display && "is-empty")} onClick=${() => setEdit(true)} aria-label=${`${label}: ${display || "not set"}. Edit`}>
    <span class="truncate">${display || placeholder}</span><${Icon} name="edit" size=${13} />
  </button>`;
  return html`<div class="pl-inline-wrap">
    <input id=${id} ref=${ref} type=${type} class="input pl-inline-input" aria-label=${label} placeholder=${placeholder}
      onBlur=${(e) => close(true, !e.relatedTarget)} onKeyDown=${(e) => { if (e.key === "Enter") { e.preventDefault(); close(true); } }} />
    <${PlEscape} onEscape=${() => close(false)} />
  </div>`;
}
/* Registers on the shared Escape stack so Escape cancels the edit instead of closing the drawer */
function PlEscape({ onEscape }) {
  /* Same contract as useEscape, but registered in a layout effect so it is on the stack before the next key event */
  const ref = useRef(onEscape); ref.current = onEscape;
  useLayoutEffect(() => { escStack.push(ref); return () => { const i = escStack.indexOf(ref); if (i >= 0) escStack.splice(i, 1); }; }, []);
  return null;
}

function plHost(u) { try { const x = new URL(plHref(u)); return (x.hostname.replace(/^www\./, "") + (x.pathname.length > 1 ? x.pathname : "")).replace(/\/$/, ""); } catch { return u; } }

/* B4: an Applied / Screen application whose linked posting is no longer live */
function PlRemoved({ a, jobs, hasCo }) {
  const open = hasCo ? (jobs.byCompany.get(a.company) || []).length : 0;
  const screen = a.stage === "screen";
  return html`<div class="callout pl-removed" role="note">
    <${Icon} name="flag" />
    <div class="stack-sm pl-removed-body">
      <span><b>This posting was taken down.</b> ${screen ? `It may be filled, but your process with ${a.company} can still go on.` : "It may be filled."}</span>
      <div class="pl-removed-actions">
        ${html`<${Btn} size="sm" icon="reply" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft a last follow-up</${Btn}>`}
        ${html`<${Btn} size="sm" kind="ghost" icon="ghost" onClick=${() => Apps.move(a.id, "ghosted")}>Mark as ghosted</${Btn}>`}
        ${hasCo && html`<${Btn} size="sm" kind="ghost" iconRight="chevR" onClick=${() => openCompany(a.company)}>${open ? `See ${a.company}’s ${pluralize(open, "open role")}` : `See ${a.company}’s open roles`}</${Btn}>`}
      </div>
    </div>
  </div>`;
}

function PlOverview({ a, ns, settings, jobs, setTab, removed, hasCo }) {
  const job = a.jobId && jobs.status === "ready" ? jobs.byId.get(a.jobId) : null;
  const silent = Apps.daysSilent(a);
  const replyTxt = a.lastReplyAt ? `${plDaysSince(a.lastReplyAt) < 1 ? "Today" : plDaysSince(a.lastReplyAt) === 1 ? "Yesterday" : `${pluralize(plDaysSince(a.lastReplyAt), "day")} ago`} · ${fmt.date(a.lastReplyAt)}`
    : a.appliedAt ? (plDaysSince(a.appliedAt) < 1 ? "No reply yet · applied today" : `No reply in ${pluralize(plDaysSince(a.appliedAt), "day")}`) : "Not applied yet";
  const secondary = {
    upcoming: html`<button type="button" class="pl-linkbtn" onClick=${() => setTab("rounds")}>View rounds</button>`,
    thanks: html`<button type="button" class="pl-linkbtn" onClick=${() => setTab("rounds")}>Log the outcome instead</button>`,
    ghost: html`<button type="button" class="pl-linkbtn" onClick=${() => openModal("draft", { appId: a.id, mode: "follow" })}>Draft a last follow-up</button>`,
  }[ns.kind];
  return html`<div class="pl-ov">
    ${removed && ["applied", "screen"].includes(a.stage) && html`<${PlRemoved} a=${a} jobs=${jobs} hasCo=${hasCo} />`}
    <div class=${cx("pl-next-card", ns.tone)}>
      <span class="pl-next-ico"><${Icon} name=${ns.icon} /></span>
      <div class="stack-sm" style="flex:1;min-width:0">
        <span class="pl-eyebrow">Next step</span>
        <strong>${ns.title}</strong>
        <span class="muted pl-small">${plSepText(ns.sub)}</span>
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
          ${a.url && (removed ? html`<span class="badge wait pl-removed-tag" title="This listing is no longer live">Removed</span>`
            : html`<a class="btn icon sm ghost" href=${plHref(a.url)} target="_blank" rel="noopener" aria-label="Open posting in a new tab" title="Open posting"><${Icon} name="ext" /></a>`)}
        </div>
        <span class="pl-kv-k">Location</span>
        <${PlInline} id="pl-loc" label="Location" value=${a.location || ""} display=${a.location} placeholder="Add location" fromInput=${(v) => v.trim()} onSave=${(v) => Apps.update(a.id, { location: v })} />
        <span class="pl-kv-k">Salary</span>
        <${PlInline} id="pl-salary" label="Salary" value=${a.salary || ""} display=${a.salary} placeholder="Add salary" fromInput=${(v) => v.trim()} onSave=${(v) => Apps.update(a.id, { salary: v })} />
        <span class="pl-kv-k">Last reply</span>
        <span class=${cx("pl-kv-v num", ACTIVE_STAGES.includes(a.stage) && silent >= settings.followUpDays && "pl-warn")}><span>${plSepText(replyTxt)}</span></span>
        ${a.followedUpAt && html`<span class="pl-kv-k">Followed up</span><span class="pl-kv-v num">${fmt.dateY(a.followedUpAt)}</span>`}
      </div>
    </section>

    ${job && html`<section class="dsec">
      <h3>Listing</h3>
      <div class="pl-job">
        <div class="stack-sm" style="flex:1;min-width:0;gap:2px">
          <span class="truncate" style="font-weight:500">${job.t}</span>
          ${today_meta([html`<${GhostScore} g=${job.g} />`, `Posted ${fmt.ago(job.p)}`], "pl-small muted pl-job-meta")}
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
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", role: "", email: "" });
  const [err, setErr] = useState("");
  const show = () => { setOpen(true); setTimeout(() => document.getElementById("pl-c-name")?.focus(), 0); };
  const hide = () => { setOpen(false); setF({ name: "", role: "", email: "" }); setErr(""); setTimeout(() => document.getElementById("pl-c-add")?.focus(), 0); };
  const add = (e) => {
    e?.preventDefault();
    if (!f.name.trim()) { setErr("Add a name first."); document.getElementById("pl-c-name")?.focus(); return; }
    Apps.update(a.id, (x) => ({ contacts: [...(x.contacts || []), { name: f.name.trim(), role: f.role.trim(), email: f.email.trim() }] }));
    hide();
  };
  const rm = (i) => { const c = a.contacts[i]; Apps.update(a.id, (x) => ({ contacts: x.contacts.filter((_, j) => j !== i) })); toast(`Removed ${c.name}`, { undo: () => Apps.update(a.id, (x) => { const n = [...x.contacts]; n.splice(i, 0, c); return { contacts: n }; }) }); };
  const contacts = a.contacts || [];
  return html`<section class="dsec">
    <h3>Contacts${contacts.length ? html`<span class="count">${contacts.length}</span>` : null}<span class="spacer"></span>
      ${!open && html`<${Btn} kind="ghost" size="sm" icon="plus" id="pl-c-add" onClick=${show}>Add contact</${Btn}>`}</h3>
    ${contacts.length > 0 && html`<div class="list pl-contacts">${contacts.map((c, i) => html`<div class="pl-contact" key=${c.name + i}>
      <span class="pl-avatar" aria-hidden="true">${initials(c.name)}</span>
      <div class="stack-sm" style="gap:0;flex:1;min-width:0"><span class="truncate" style="font-weight:500">${c.name}</span><span class="truncate muted pl-small">${[c.role, c.email].filter(Boolean).join(" · ") || "No role or email"}</span></div>
      ${c.email && html`<${Btn} kind="ghost" size="sm" icon="copy" aria-label=${`Copy ${c.name}'s email`} title="Copy email" onClick=${() => copyText(c.email, "Email copied")} />`}
      <${Btn} kind="ghost" size="sm" icon="x" aria-label=${`Remove ${c.name}`} title="Remove" onClick=${() => rm(i)} />
    </div>`)}</div>`}
    ${!contacts.length && !open && html`<p class="pl-none">No contacts yet. Add the recruiter or interviewers so follow-ups have a name.</p>`}
    ${open && html`<form class="pl-contact-form" onSubmit=${add}>
      <input id="pl-c-name" class="input" placeholder="Name" aria-label="Contact name" value=${f.name} onInput=${(e) => { setF({ ...f, name: e.currentTarget.value }); setErr(""); }} aria-invalid=${err ? "true" : undefined} />
      <input id="pl-c-role" class="input" placeholder="Role, e.g. Recruiter" aria-label="Contact role" value=${f.role} onInput=${(e) => setF({ ...f, role: e.currentTarget.value })} />
      <input id="pl-c-email" class="input pl-span2" type="email" placeholder="Email" aria-label="Contact email" value=${f.email} onInput=${(e) => setF({ ...f, email: e.currentTarget.value })} />
      <div class="pl-contact-actions pl-span2">
        ${err && html`<span class="pl-err" role="alert">${err}</span>`}
        <span class="spacer" style="flex:1"></span>
        <button type="button" class="btn ghost sm" onClick=${hide}>Cancel</button>
        <button type="submit" class="btn sm">Save contact</button>
      </div>
      <${PlEscape} onEscape=${hide} />
    </form>`}
  </section>`;
}

/* Rounds: each one is a summary row; one is expanded at a time by default */
const PL_OUT_BADGE = { passed: "ok", failed: "bad", cancelled: "" };
function plDefaultOpen(rounds, t = now()) {
  const up = rounds.filter((r) => r.at && r.at > t && r.outcome !== "cancelled").sort((x, y) => x.at - y.at)[0];
  if (up) return up.id;
  const past = rounds.filter((r) => r.at && r.at <= t && r.outcome === "pending").sort((x, y) => y.at - x.at)[0];
  return past ? past.id : null;
}
function PlRounds({ a }) {
  const rounds = [...(a.rounds || [])].sort((x, y) => (x.at || 9e15) - (y.at || 9e15));
  const [open, setOpen] = useState(() => { const d = plDefaultOpen(rounds); return d ? { [d]: true } : {}; });
  const add = () => {
    const r = Apps.addRound(a.id, { type: a.stage === "screen" || a.stage === "applied" ? "recruiter" : "technical" });
    setOpen((o) => ({ ...o, [r.id]: true }));
    setTimeout(() => { const el = document.getElementById(`pl-r-${r.id}-type`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus(); }, 60);
  };
  const toggle = (id, v) => { setOpen((o) => ({ ...o, [id]: v })); if (!v) setTimeout(() => document.getElementById(`pl-r-${id}-sum`)?.focus(), 0); };
  return html`<div class="stack pl-rounds">
    ${rounds.length > 0 && html`<div class="row"><span class="pl-small muted" style="flex:1">${pluralize(rounds.length, "round")}</span><${Btn} size="sm" icon="plus" onClick=${add}>Add round</${Btn}></div>`}
    ${!rounds.length && html`<${Empty} icon="cal" title="No rounds yet" action=${html`<${Btn} icon="plus" onClick=${add}>Add round</${Btn}>`}>Log each interview with its date, type and interviewers.</${Empty}>`}
    ${rounds.length > 0 && html`<div class="pl-round-list">${rounds.map((r) => open[r.id]
      ? html`<${PlRound} key=${r.id} a=${a} r=${r} onDone=${() => toggle(r.id, false)} />`
      : html`<${PlRoundRow} key=${r.id} r=${r} onEdit=${() => toggle(r.id, true)} />`)}</div>`}
  </div>`;
}

function plOutcomeBadge(r, t = now()) {
  if (r.outcome === "pending") {
    if (!r.at) return { kind: "", text: "No date" };
    const u = fmt.until(r.at);
    return r.at > t ? { kind: "info", text: r.type === "assessment" ? `Due ${u}` : u } : { kind: "wait", text: r.type === "assessment" ? "Result pending" : "Outcome pending" };
  }
  return { kind: PL_OUT_BADGE[r.outcome] ?? "", text: PL_OUTCOMES.find((o) => o.id === r.outcome)?.label || "Pending" };
}
function PlRoundRow({ r, onEdit }) {
  const b = plOutcomeBadge(r);
  const who = plFirstName(r.interviewers);
  const when = r.at ? fmt.date(r.at, { weekday: "short", month: "short", day: "numeric" }) : "";
  return html`<div class="pl-round pl-round-row" data-round=${r.id}>
    <button type="button" id=${`pl-r-${r.id}-sum`} class="pl-round-sum" onClick=${onEdit} aria-label=${`${ROUND[r.type]?.label || "Round"}${when ? ", " + when : ""}, ${b.text}${who ? ", with " + who : ""}. Edit`}>
      <span class="pl-round-name">${ROUND[r.type]?.label || "Round"}</span>
      <span class="pl-round-meta num">
        ${when && html`<span>${when}</span>`}
        <span class=${cx("badge", b.kind)}>${b.text}</span>
        ${who && html`<span class="truncate">${who}</span>`}
      </span>
      <span class="pl-round-edit"><${Icon} name="edit" size=${13} />Edit</span>
    </button>
  </div>`;
}

function PlRound({ a, r, onDone }) {
  const upd = (p) => Apps.updateRound(a.id, r.id, p);
  const pid = `pl-r-${r.id}`;
  const t = now();
  const oa = r.type === "assessment";
  const del = () => askConfirm({ title: "Delete this round?", body: `This removes the ${(ROUND[r.type]?.label || "round").toLowerCase()} and its notes. This can’t be undone.`, confirmLabel: "Delete round", danger: true, onConfirm: () => { Apps.removeRound(a.id, r.id); toast("Round deleted"); } });
  return html`<div class="round pl-round pl-round-open" data-round=${r.id}>
    <div class="pl-round-head">
      <select id=${pid + "-type"} class="select pl-round-type" value=${r.type} aria-label="Round type" onChange=${(e) => upd({ type: e.currentTarget.value })}>${ROUND_TYPES.map((x) => html`<option key=${x.id} value=${x.id}>${x.label}</option>`)}</select>
      <span class="spacer" style="flex:1"></span>
      <${Btn} kind="ghost" size="sm" icon="check" onClick=${onDone} aria-label="Collapse this round" title="Collapse">Done</${Btn}>
    </div>
    <div class="pl-round-grid">
      <${Field} label=${oa ? "Due" : "Date and time"} id=${pid + "-at"}><input id=${pid + "-at"} class="input" type="datetime-local" value=${fmt.toInput(r.at)} onChange=${(e) => upd({ at: fmt.fromInput(e.currentTarget.value) || null })} /></${Field}>
      <${Field} label="Outcome" id=${pid + "-out"}><select id=${pid + "-out"} class=${cx("select pl-out-sel", "o-" + r.outcome)} value=${r.outcome || "pending"} onChange=${(e) => upd({ outcome: e.currentTarget.value })}>${PL_OUTCOMES.map((o) => html`<option key=${o.id} value=${o.id}>${o.label}</option>`)}</select></${Field}>
      <div class="pl-span2"><${Field} label=${oa ? "Platform" : "Interviewers"} id=${pid + "-who"}><${PlText} id=${pid + "-who"} value=${r.interviewers} placeholder=${oa ? "e.g. HackerRank, CodeSignal" : "e.g. Priya S. (Eng manager)"} onSave=${(v) => upd({ interviewers: v })} /></${Field}></div>
      <${Field} label="Prep notes" id=${pid + "-prep"}><${PlText} multiline id=${pid + "-prep"} rows="3" value=${r.prep} placeholder="Topics, stories, questions to ask" onSave=${(v) => upd({ prep: v })} /></${Field}>
      <${Field} label="How it went" id=${pid + "-refl"}><${PlText} multiline id=${pid + "-refl"} rows="3" value=${r.reflection} placeholder="What they asked, what to improve" onSave=${(v) => upd({ reflection: v })} /></${Field}>
    </div>
    <div class="pl-round-foot">
      ${!oa && html`<label class="check" for=${pid + "-thx"}><input id=${pid + "-thx"} type="checkbox" checked=${!!r.thanked} onChange=${(e) => upd({ thanked: e.currentTarget.checked })} />Thank-you sent</label>`}
      <span class="spacer" style="flex:1"></span>
      <${Btn} kind="ghost" size="sm" icon="trash" aria-label="Delete round" title="Delete round" onClick=${del} />
      <${CalendarButton} appId=${a.id} round=${r} />
      ${r.at && r.at > t ? html`<${Btn} size="sm" icon="prep" onClick=${() => plPrep(a, r)}>Prep</${Btn}>`
        : oa ? null : html`<${Btn} size="sm" icon="send" onClick=${() => openModal("draft", { appId: a.id, roundId: r.id, mode: "thanks" })}>Draft thank-you</${Btn}>`}
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
          <span class="tl-when num">${plSepText(`${fmt.dateY(e.at)} · ${fmt.time(e.at)}`)}</span>
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
   Supported: openModal("draft", {appId, roundId, mode: "follow"|"thanks"|"confirm"}) and, for callers that pass
   {kind: "thanks"|"follow"|"confirm"}, the aliases MODALS.thanks / MODALS.follow below.
   "confirm" replies to an invite to confirm the round's time; Mark as sent sets round.confirmed = true. */
MODALS.draft = (p) => html`<${PlDraft} ...${p} kind=${["thanks", "confirm"].includes(p.mode || p.kind) ? p.mode || p.kind : "follow"} />`;
MODALS.thanks = (p) => html`<${PlDraft} ...${p} kind="thanks" />`;
MODALS.follow = (p) => html`<${PlDraft} ...${p} kind="follow" />`;
/* Template text with a real greeting and a complete subject line */
function plDraftText(a, r, thanks, profile, confirm) {
  const first = (s) => plFirstName(s).split(/\s+/)[0] || "";
  if (confirm) {
    const who = first(a.contacts?.[0]?.name) || first(r?.interviewers);
    const label = (ROUND[r?.type]?.label || "interview").toLowerCase();
    const when = r?.at ? `${fmt.date(r.at, { weekday: "long", month: "long", day: "numeric" })} at ${fmt.time(r.at)}` : "the proposed time";
    return `Subject: Re: ${ROUND[r?.type]?.label || "Interview"}${a.title ? ` for ${a.title}` : ""}\n\nHi ${who || `${a.company} team`},\n\nThank you for the invitation. ${when[0].toUpperCase() + when.slice(1)} works for me, and I'm looking forward to the ${label}${r?.interviewers ? ` with ${r.interviewers}` : ""}.\n\nPlease let me know if there's anything I should prepare beforehand.\n\nBest,\n${profile.name || "[Your name]"}`;
  }
  const who = first(thanks && r?.interviewers) || first(a.contacts?.[0]?.name);
  const greet = `Hi ${who || `${a.company} team`},`;
  let t = thanks ? thankYouTemplate(a, r ? { ...r, interviewers: "", reflection: "" } : r, profile) : followUpTemplate(a, profile);
  t = t.replace(/^Hi [^\n]*,$/m, greet);
  if (!thanks && a.title) t = t.replace(/^(Subject: Following up on my .+?)(?: application)?$/m, "$1 application");
  if (thanks) t = t.replace(/^Subject: .*$/m, `Subject: Thank you for your time${a.title ? ` · ${a.title}` : ""}`);
  if (a.title && !/\b(role|position)$/i.test(a.title)) t = t.split(`about the ${a.title} at `).join(`about the ${a.title} role at `);
  return t;
}
function PlDraft({ appId, roundId, kind = "follow" }) {
  const a = Apps.get(appId);
  const profile = useStore((s) => s.profile);
  const c = useCaps();
  const r = a && roundId ? (a.rounds || []).find((x) => x.id === roundId) : null;
  const thanks = kind === "thanks", confirm = kind === "confirm";
  const tpl = a ? plDraftText(a, r, thanks, profile, confirm) : "";
  const [text, setText] = useState(tpl);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [err, setErr] = useState("");
  const ctrl = useRef(null);
  const before = useRef(tpl);
  useEffect(() => () => ctrl.current?.abort(), []);
  if (!a) return html`<${Modal} title="Draft" onClose=${closeModal}><p class="muted">This application isn’t here anymore.</p></${Modal}>`;

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
    const prompt = `Rewrite this ${confirm ? "short reply confirming a scheduled job interview time" : thanks ? "thank-you email to send after a job interview" : "follow-up email about a job application that hasn't had a reply"}.
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
    if (confirm && r) { Apps.updateRound(a.id, r.id, { confirmed: true }); Apps.addEvent(a.id, { kind: "note", text: `Confirmed the ${(ROUND[r.type]?.label || "interview").toLowerCase()} time` }); toast(`Marked the ${(ROUND[r.type]?.label || "interview").toLowerCase()} time as confirmed`); }
    else if (confirm) { Apps.addEvent(a.id, { kind: "note", text: "Confirmed the interview time" }); toast("Marked the time as confirmed"); }
    else if (thanks && r) { Apps.updateRound(a.id, r.id, { thanked: true }); Apps.update(a.id, (x) => ({ events: [...x.events, { id: uid("e_"), at: now(), kind: "thanks", text: `Sent thank-you for ${ROUND[r.type]?.label || "interview"}` }] })); toast("Marked the thank-you as sent"); }
    else if (thanks) { Apps.update(a.id, (x) => ({ events: [...x.events, { id: uid("e_"), at: now(), kind: "thanks", text: "Sent a thank-you note" }] })); toast("Marked the thank-you as sent"); }
    else { Apps.update(a.id, { followedUpAt: now() }); Apps.addEvent(a.id, { kind: "followup", text: "Followed up" }); toast(`Logged your follow-up to ${a.company}`); }
    closeModal();
  };
  const title = confirm ? `Confirm the time · ${a.company}` : thanks ? `Thank-you note · ${a.company}` : `Follow-up · ${a.company}`;
  /* "Open in email": a prefilled mailto when the application has a contact email */
  const to = (a.contacts || []).map((x) => x.email).find((e) => e && /@/.test(e));
  const subj = (text.match(/^Subject: *(.*)$/m) || [])[1] || "";
  const body = text.replace(/^Subject:.*\n+/, "");
  const mailto = to ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}` : null;
  return html`<${Modal} title=${title} onClose=${closeModal} size="lg" foot=${html`
    <${Btn} icon="copy" onClick=${() => copyText(text, "Draft copied")} disabled=${busy}>Copy</${Btn}>
    ${mailto && !busy && html`<a class="btn" href=${mailto} target="_blank" rel="noopener" title=${`Opens your email app, addressed to ${to}`}><${Icon} name="mail" />Open in email</a>`}
    <${Btn} kind="primary" icon="check" onClick=${sent} disabled=${busy}>Mark as sent</${Btn}>`}>
    <div class="field">
      <label for="pl-draft" class="sr">${confirm ? "Reply confirming the time" : thanks ? "Thank-you note" : "Follow-up email"}</label>
      ${ai && !busy && html`<span class="ai-label"><${Icon} name="spark" />Drafted by Claude. Review before sending.</span>`}
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
    if (!tApp) return `Creates ${f.company || "a new application"}${f.title ? ` (${f.title})` : ""} in ${STAGE[stage || "applied"].label}${round ? " and " + round : ""}.`;
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
      ${(f || raw) && html`<div class="row pl-raw-tools">
        ${f && html`<button type="button" class="pl-linkbtn pl-small" onClick=${() => setShowRaw(false)} aria-expanded="true">Hide email</button>`}
        ${raw && !f && html`<button type="button" class="pl-linkbtn pl-small" onClick=${() => { setRaw(""); setF(null); setErr(""); document.getElementById("pl-p-raw")?.focus(); }}>Clear</button>`}</div>`}
      <textarea id="pl-p-raw" aria-label="Email text" class=${cx("textarea pl-raw", f && "short")} value=${raw} autofocus onInput=${(e) => { setRaw(e.currentTarget.value); setErr(""); }}
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
