/* ===== Today: the home screen ===== */

function today_greeting(h = new Date().getHours()) {
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function today_firstName(name) { return (name || "").trim().split(/\s+/)[0] || ""; }
function today_dayLabel(ts) {
  const diff = Math.round((fmt.startOfDay(ts) - fmt.startOfDay(now())) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return fmt.date(ts, { weekday: "short", month: "short", day: "numeric" });
}
/* Dotted meta line ("a · b · c"), shared by Today, Insights, Pipeline and Prep.
   Every item carries its dot in its own left gutter; .td-meta clips the gutter at the start of each
   visual line, so a wrapped line never begins with "·" and a line never ends with one. */
function today_meta(parts, cls, tag = "span") {
  const items = (parts || []).filter((x) => x != null && x !== false && x !== "");
  return html`<${tag} class=${cx("td-meta", cls)}>${items.map((x, i) => html`<span key=${i}>${x}</span>`)}</${tag}>`;
}
function today_setPrepFocus(focus) { store.set((s) => ({ ...s, ui: { ...s.ui, prepFocus: focus } })); }
function today_undismiss(key, prev) {
  store.set((s) => { const d = { ...s.dismissed }; if (prev) d[key] = prev; else delete d[key]; return { ...s, dismissed: d }; });
}

/* The next scheduled rounds, whatever the date (up to 5; anything starting less than an hour ago still
   counts as upcoming). `week` counts the ones in the next 7 days, for the greeting line. */
function today_upcoming(apps) {
  const t = now(), end = fmt.startOfDay(t) + 7 * DAY;
  let items = [];
  for (const a of apps) for (const r of a.rounds || []) {
    if (r.at && r.at >= t - 3600000 && r.outcome !== "cancelled" && !["rejected", "ghosted"].includes(a.stage)) items.push({ a, r });
  }
  items.sort((x, y) => x.r.at - y.r.at);
  const total = items.length, week = items.filter((x) => x.r.at < end).length;
  items = items.slice(0, 5);
  const groups = [];
  for (const it of items) {
    const k = fmt.startOfDay(it.r.at);
    let g = groups[groups.length - 1];
    if (!g || g.day !== k) { g = { day: k, label: today_dayLabel(it.r.at), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  return { items, groups, total, week };
}

/* Run a task's primary action. */
function today_runTask(tk) {
  const a = tk.app;
  if (tk.kind === "prep") { today_setPrepFocus({ appId: a.id, roundId: tk.round.id }); go("prep"); }
  else if (tk.kind === "thanks" || tk.kind === "follow") {
    const props = tk.kind === "thanks" ? { appId: a.id, roundId: tk.round.id, kind: "thanks" } : { appId: a.id, kind: "follow" };
    if (MODALS.draft) openModal("draft", props);
    else {
      const prof = store.get().profile;
      copyText(tk.kind === "thanks" ? thankYouTemplate(a, tk.round, prof) : followUpTemplate(a, prof), "Draft copied to your clipboard");
    }
  }
  else if (tk.kind === "ghost") Apps.move(a.id, "ghosted");
  else if (tk.kind === "outcome" || tk.kind === "nextround") openApp(a.id, "rounds");
  else if (tk.kind === "confirm") {
    if (MODALS.draft) openModal("draft", { appId: a.id, roundId: tk.round?.id, kind: "confirm" });
    else openApp(a.id, "rounds");
  }
  else openApp(a.id);
}

/* Small anchored menu (snooze). Fixed-position so it escapes card overflow; closes on outside click, Esc, scroll. */
function today_Menu({ anchor, items, onClose, label }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const mw = ref.current ? ref.current.offsetWidth : 200, mh = ref.current ? ref.current.offsetHeight : 140;
    let left = r.right - mw; left = clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 4; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    setPos({ left, top });
    setTimeout(() => ref.current?.querySelector("button")?.focus(), 10);
  }, [anchor]);
  useEffect(() => {
    const down = (e) => { if (!ref.current?.contains(e.target) && !anchor.contains(e.target)) onClose(); };
    const key = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); anchor.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const bs = [...ref.current.querySelectorAll("button")]; const i = bs.indexOf(document.activeElement);
        bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
      }
    };
    const scroll = () => onClose();
    document.addEventListener("mousedown", down, true);
    window.addEventListener("keydown", key, true);
    document.getElementById("workspace")?.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("mousedown", down, true); window.removeEventListener("keydown", key, true);
      document.getElementById("workspace")?.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll);
    };
  }, [anchor, onClose]);
  return html`<div class="menu td-menu" role="menu" aria-label=${label} ref=${ref} style=${pos ? `left:${pos.left}px;top:${pos.top}px` : "visibility:hidden;left:0;top:0"}>
    ${items.map((it) => it.sep ? html`<div class="td-menu-sep" key=${it.key} role="separator"></div>` : html`<button type="button" role="menuitem" class=${it.cls} key=${it.key} onClick=${() => { onClose(); it.run(); }}>
      ${it.icon && html`<${Icon} name=${it.icon} />`}<span style="flex:1">${it.label}</span>${it.hint && html`<span class="faint td-menu-hint">${it.hint}</span>`}
    </button>`)}
  </div>`;
}

const TODAY_SNOOZE = [{ d: 1, label: "Snooze 1 day" }, { d: 3, label: "Snooze 3 days" }, { d: 7, label: "Snooze 1 week" }];

/* Display copy for a task. Core builds the text; Today trims it to one plain line and matches the verb to the task. */
function today_taskCopy(tk) {
  const a = tk.app;
  if (tk.kind === "ghost") return { sub: "Most replies come within 3 weeks.", action: "Mark as ghosted" };
  if (tk.kind === "apply") return { sub: today_typo(typeof tk.sub === "string" ? tk.sub.replace(" · this listing shows strong ghost signals", " · Strong ghost signals") : tk.sub), action: "Apply" };
  if (tk.kind === "nextround") return { sub: `${a.stage === "screen" ? "In screening" : "Interviewing"}, nothing scheduled yet. Add the next round’s date.`, action: "Add a round" };
  const rl = tk.round && (ROUND[tk.round.type]?.label || "Interview");
  if (tk.kind === "outcome") return { sub: `${rl} · ${fmt.date(tk.round.at, { weekday: "short", month: "short", day: "numeric" })} (${today_daysAgo(tk.round.at)})`, action: "Log outcome" };
  if (tk.kind === "thanks" && tk.round?.at && now() - tk.round.at > DAY) return { sub: `Your ${rl.toLowerCase()} was ${today_daysAgo(tk.round.at)}. A short note still helps.`, action: tk.action };
  return { sub: today_typo(tk.sub), action: tk.action };
}
/* Calendar days, so "yesterday" means the previous date, not 24 hours. */
function today_daysAgo(ts) {
  const n = Math.round((fmt.startOfDay(now()) - fmt.startOfDay(ts)) / DAY);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
}
/* Core builds task text with straight apostrophes; display them typographically. */
function today_typo(t) { return typeof t === "string" ? t.replace(/(\w)'(\w)/g, "$1’$2") : t; }

function today_snooze(tk, d) {
  const prev = store.get().dismissed[tk.key];
  dismissTask(tk.key, d);
  toast(`Snoozed until ${fmt.date(now() + d * DAY, { weekday: "short", month: "short", day: "numeric" })}`, { undo: () => today_undismiss(tk.key, prev) });
}
function today_dismiss(tk) {
  const prev = store.get().dismissed[tk.key];
  dismissTask(tk.key);
  toast("Dismissed", { undo: () => today_undismiss(tk.key, prev) });
}
/* Inline outcome for a past round. "Didn't pass" also closes the application as Rejected; one toast undoes all of it. */
function today_logOutcome(tk, outcome) {
  const a = tk.app, r = tk.round, before = Apps.get(a.id);
  const restore = () => store.set((s) => ({ ...s, apps: { ...s.apps, [a.id]: before } }));
  if (outcome === "waiting") {
    const prev = store.get().dismissed[tk.key];
    dismissTask(tk.key, 3);
    toast(`We’ll ask again ${fmt.date(now() + 3 * DAY, { weekday: "short" })}`, { undo: () => today_undismiss(tk.key, prev) });
    return;
  }
  Apps.updateRound(a.id, r.id, { outcome });
  if (outcome === "passed") toast("Logged as passed", { undo: restore, action: { label: "Add next round", run: () => openApp(a.id, "rounds") } });
  else {
    if (!["rejected", "ghosted", "offer"].includes(a.stage)) Apps.move(a.id, "rejected", { silent: true });
    toast(`${a.company} moved to Rejected`, { undo: restore });
  }
}
function today_typing(el) { return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable); }

/* Snooze or dismiss several tasks at once (the ghost batch row); one toast undoes all of them. */
function today_snoozeMany(tks, d) {
  const prev = tks.map((tk) => [tk.key, store.get().dismissed[tk.key]]);
  for (const tk of tks) dismissTask(tk.key, d);
  const undo = () => prev.forEach(([k, p]) => today_undismiss(k, p));
  toast(d ? `Snoozed ${tks.length} until ${fmt.date(now() + d * DAY, { weekday: "short", month: "short", day: "numeric" })}` : `Dismissed ${tks.length}`, { undo });
}

function today_TaskRow({ tk, primary, idx, child }) {
  const [menu, setMenu] = useState(null);
  const close = useCallback(() => setMenu(null), []);
  const a = tk.app;
  const copy = today_taskCopy(tk);
  const cls = cx("btn sm td-act", primary && "primary", child && "ghost");
  let act;
  if (tk.kind === "outcome" && tk.round) act = html`<div class="td-outcome" role="group" aria-label=${"Outcome of the " + a.company + " round"}>
      <button type="button" class="btn sm" onClick=${() => today_logOutcome(tk, "passed")}>Passed</button>
      <button type="button" class="btn sm" onClick=${() => today_logOutcome(tk, "failed")}>Didn’t pass</button>
    </div>`;
  else if (tk.kind === "apply" && a.url) act = html`<a class=${cls} data-primary href=${a.url} target="_blank" rel="noopener" aria-label=${`Apply to ${a.company} (opens the posting in a new tab)`}>Apply<${Icon} name="ext" /></a>`;
  else if (tk.kind === "apply" && a.jobId && typeof openJob === "function") act = html`<button type="button" class=${cls} data-primary onClick=${() => openJob(a.jobId)}>Apply</button>`;
  else act = html`<button type="button" class=${cls} data-primary onClick=${() => today_runTask(tk)}>${copy.action}</button>`;
  const safeKey = tk.key.replace(/[^a-z0-9]/gi, "-");
  const day = (d) => fmt.date(now() + d * DAY, { weekday: "short" });
  const snooze = tk.kind === "outcome"
    ? [{ key: "wait", icon: "clock", label: "Still waiting", hint: "Ask again " + day(3), run: () => today_logOutcome(tk, "waiting") },
       { key: "s1", icon: "clock", label: "Snooze 1 day", hint: "S", run: () => today_snooze(tk, 1) },
       { key: "s7", icon: "clock", label: "Snooze 1 week", hint: day(7), run: () => today_snooze(tk, 7) }]
    : TODAY_SNOOZE.map((o) => ({ key: "s" + o.d, icon: "clock", label: o.label, hint: o.d === 1 ? "S" : day(o.d), run: () => today_snooze(tk, o.d) }));
  const sub = child
    ? today_meta([a.appliedAt ? `Applied ${fmt.date(a.appliedAt, { month: "short", day: "numeric" })}` : null, a.title], "task-sub", "div")
    : typeof copy.sub === "string" && copy.sub.includes(" · ") ? today_meta(copy.sub.split(" · "), "task-sub", "div") : html`<div class="task-sub">${copy.sub}</div>`;
  return html`<div class="task td-task kb-row" data-key=${tk.key} data-fidx=${idx} tabindex="-1" aria-label=${today_typo(tk.title)}>
    <span class=${cx("task-ico", today_tone(tk))}><${Icon} name=${tk.icon} /></span>
    <div class="td-task-text">
      <button type="button" class="td-task-title task-title" onClick=${() => openApp(a.id)} title="Open application">${today_typo(tk.title)}</button>
      ${sub}
    </div>
    <div class=${cx("task-actions td-task-actions", tk.kind === "outcome" && "is-outcome")}>
      ${act}
      <button type="button" class="btn sm ghost icon td-more" id=${"more-" + safeKey} aria-haspopup="menu" aria-expanded=${menu ? "true" : "false"}
        aria-label=${"More options: " + today_typo(tk.title)} title="Snooze or dismiss" onClick=${(e) => setMenu(menu ? null : e.currentTarget)}><${Icon} name="more" /></button>
    </div>
    ${menu && html`<${today_Menu} anchor=${menu} onClose=${close} label="Task options"
      items=${[...snooze, { key: "sep", sep: true }, { key: "dismiss", icon: "x", label: "Dismiss", cls: "td-dismiss", hint: "D", run: () => today_dismiss(tk) }]} />`}
  </div>`;
}

/* Three or more no-reply applications fold into one row: one batch action, with the rows a click away. */
function today_BatchRow({ item, primary, idx, open, onToggle }) {
  const [menu, setMenu] = useState(null);
  const close = useCallback(() => setMenu(null), []);
  const tks = item.tasks, n = tks.length;
  const title = `${n} applications with no reply in ${store.get().settings.ghostDays || 21}+ days`;
  const day = (d) => fmt.date(now() + d * DAY, { weekday: "short" });
  return html`<div class="task td-task td-batch-row kb-row" data-key=${item.key} data-fidx=${idx} tabindex="-1" aria-label=${title}>
    <span class="task-ico ghost"><${Icon} name="ghost" /></span>
    <div class="td-task-text">
      <button type="button" class="td-task-title task-title" aria-expanded=${open ? "true" : "false"} aria-controls=${"td-bl-" + item.group} onClick=${onToggle}>${title}</button>
      ${today_meta(tks.map((tk) => `${tk.app.company} ${Apps.daysSilent(tk.app)}d`), "task-sub", "div")}
    </div>
    <div class="task-actions td-task-actions">
      <button type="button" class="btn sm ghost td-review" aria-expanded=${open ? "true" : "false"} aria-controls=${"td-bl-" + item.group} onClick=${onToggle}>Review<${Icon} name="chevD" /></button>
      <button type="button" class=${cx("btn sm td-act", primary && "primary")} data-primary onClick=${() => today_ghostAll(tks)}>Mark all as ghosted</button>
      <button type="button" class="btn sm ghost icon td-more" id=${"more-" + item.key.replace(/[^a-z0-9]/gi, "-")} aria-haspopup="menu" aria-expanded=${menu ? "true" : "false"}
        aria-label=${"More options: " + title} title="Snooze or dismiss" onClick=${(e) => setMenu(menu ? null : e.currentTarget)}><${Icon} name="more" /></button>
    </div>
    ${menu && html`<${today_Menu} anchor=${menu} onClose=${close} label="Options for all ${n}"
      items=${[...TODAY_SNOOZE.map((o) => ({ key: "s" + o.d, icon: "clock", label: o.label.replace("Snooze", "Snooze all"), hint: o.d === 1 ? "S" : day(o.d), run: () => today_snoozeMany(tks, o.d) })),
        { key: "sep", sep: true }, { key: "dismiss", icon: "x", label: "Dismiss all", cls: "td-dismiss", hint: "D", run: () => today_snoozeMany(tks, 0) }]} />`}
  </div>`;
}

const TODAY_GROUPS = [{ id: "today", label: "Today" }, { id: "quick", label: "This week" }, { id: "later", label: "Later" }];
const TODAY_GROUP_MAX = 8;
const TODAY_BATCH_MIN = 3;
const TODAY_FLAT_MAX = 6; // at or under this many tasks, one flat list (group headers are only for screen readers)
// Within This week: things only you can answer first, then nudges, then cleanup.
const TODAY_QUICK_ORDER = { confirm: 0, thanks: 0, outcome: 1, removed: 2, nextround: 3, follow: 4, ghost: 5 };
/* Sort a group so the first row (and its primary button) is the soonest thing:
   Today: thank-yous first (time-boxed), then rounds by start time. This week: by kind, then longest silence first. */
function today_sortGroup(id, all) {
  const at = new Map(all.map((t, i) => [t.key, i]));
  const ord = (x, y) => at.get(x.key) - at.get(y.key);
  const silent = (t) => (t.kind === "follow" || t.kind === "ghost" ? Apps.daysSilent(t.app) || 0 : 0);
  const time = (t) => (t.round && t.round.at) || Infinity;
  if (id === "today") return all.slice().sort((x, y) => (x.kind === "thanks" ? 0 : 1) - (y.kind === "thanks" ? 0 : 1) || (time(x) - time(y) || 0) || ord(x, y));
  if (id === "quick") return all.slice().sort((x, y) => (TODAY_QUICK_ORDER[x.kind] ?? 9) - (TODAY_QUICK_ORDER[y.kind] ?? 9) || silent(y) - silent(x) || ord(x, y));
  return all;
}
/* Groups of display items: a task, or one ghost batch standing in for 3+ ghost tasks. */
function today_groups(tasks, open) {
  return TODAY_GROUPS.map((g) => {
    const all = today_sortGroup(g.id, tasks.filter((tk) => (tk.group || "later") === g.id));
    const ghosts = all.filter((tk) => tk.kind === "ghost");
    let items = all;
    if (ghosts.length >= TODAY_BATCH_MIN) {
      const at = all.indexOf(ghosts[0]);
      items = all.filter((tk) => tk.kind !== "ghost");
      items.splice(at, 0, { key: "ghost-batch:" + g.id, kind: "ghostBatch", group: g.id, tasks: ghosts });
    }
    return { ...g, all, items, shown: open[g.id] ? items : items.slice(0, TODAY_GROUP_MAX) };
  }).filter((g) => g.all.length);
}

function today_ghostAll(list) {
  const ids = list.map((tk) => tk.app.id);
  const names = list.map((tk) => tk.app.company);
  const named = names.length <= 4 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  askConfirm({
    title: `Mark ${ids.length} applications as ghosted?`,
    body: `${named} haven’t replied in ${store.get().settings.ghostDays || 21}+ days. They move to Ghosted and stop showing up here. You can undo this right after.`,
    confirmLabel: `Mark ${ids.length} as ghosted`,
    onConfirm: () => Apps.moveMany(ids, "ghosted"),
  });
}

function today_NeedsYou({ tasks, fresh, next }) {
  const [open, setOpen] = useState({});
  const [review, setReview] = useState({});
  const [kbd, setKbd] = useState(false);
  const listRef = useRef(null);
  const last = useRef({ key: null, idx: 0 });
  const groups = today_groups(tasks, open);
  // Keyboard order: shown items, with a batch's rows right after it while Review is open.
  const flat = groups.flatMap((g) => g.shown.flatMap((it) => (it.kind === "ghostBatch" && review[g.id] ? [it, ...it.tasks] : [it])));
  const kref = useRef({}); kref.current = { flat, groups, review };
  const primaryKey = flat.find((tk) => tk.kind !== "outcome")?.key;

  // Focus now when the row exists (so fast J J K stays in order), else after the render that adds it.
  const focusRow = (key) => {
    const go = () => {
      const el = listRef.current && [...listRef.current.querySelectorAll(".td-task")].find((r) => r.dataset.key === key);
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); return true; }
    };
    if (!go()) setTimeout(go, 0);
  };
  // After an action removes the focused row (or a modal/drawer it opened closes onto nothing), focus the row that took its place.
  const refocus = () => {
    if (ui.state.modal || ui.state.drawer || ui.state.palette) return;
    const ae = document.activeElement;
    if (ae && ae !== document.body && ae.isConnected) return;
    const { flat } = kref.current, L = last.current;
    if (!L.key || !flat.length) return;
    const at = flat.findIndex((t) => t.key === L.key);
    focusRow((at >= 0 ? flat[at] : flat[Math.min(L.idx, flat.length - 1)]).key);
  };
  const flatSig = flat.map((t) => t.key).join("|");
  useEffect(() => { refocus(); const t = setTimeout(refocus, 120); return () => clearTimeout(t); }, [flatSig]);
  useEffect(() => {
    const off = ui.sub(() => setTimeout(refocus, 60));
    // A click anywhere outside the list means focus left on purpose: stop restoring it.
    const down = (e) => { if (!listRef.current?.contains(e.target) && !e.target.closest?.(".modal, .drawer, .toasts, .td-menu")) last.current = { key: null, idx: 0 }; };
    document.addEventListener("mousedown", down, true);
    return () => { off(); document.removeEventListener("mousedown", down, true); };
  }, []);

  useEffect(() => {
    let lastG = 0;
    const onKey = (e) => {
      if (today_typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (ui.state.modal || ui.state.palette || ui.state.drawer || document.querySelector(".td-menu")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "g") { lastG = now(); return; }
      if (lastG && now() - lastG < 1200) { lastG = 0; return; } // "G then S" etc. belong to the shell
      const { flat, groups, review } = kref.current;
      if (!flat.length) return;
      const row = e.target?.closest?.(".td-task");
      const curKey = row ? row.dataset.key : null;
      const idx = flat.findIndex((t) => t.key === curKey);
      if (k === "j" || k === "k") {
        e.preventDefault();
        if (idx < 0) {
          const at = last.current.key ? flat.findIndex((t) => t.key === last.current.key) : -1;
          return focusRow(flat[at >= 0 ? at : k === "j" ? 0 : flat.length - 1].key);
        }
        if (k === "k") return focusRow(flat[Math.max(0, idx - 1)].key);
        // J past the last shown row of a group with more: show the rest of that group.
        const g = groups.find((x) => x.shown.some((t) => t.key === curKey));
        if (g && g.shown[g.shown.length - 1].key === curKey && g.items.length > g.shown.length && !(review[g.id] && g.shown[g.shown.length - 1].kind === "ghostBatch")) {
          setOpen((o) => ({ ...o, [g.id]: true }));
          return focusRow(g.items[g.shown.length].key);
        }
        return focusRow(flat[Math.min(flat.length - 1, idx + 1)].key);
      }
      if (idx < 0) return;
      const tk = flat[idx];
      if (e.key === "Enter") {
        if (e.target !== row) return; // a focused button inside the row activates natively
        e.preventDefault();
        if (tk.kind === "outcome") return today_runTask(tk);
        row.querySelector("[data-primary]")?.click();
      } else if (k === "d") { e.preventDefault(); tk.kind === "ghostBatch" ? today_snoozeMany(tk.tasks, 0) : today_dismiss(tk); }
      else if (k === "s") { e.preventDefault(); tk.kind === "ghostBatch" ? today_snoozeMany(tk.tasks, 1) : today_snooze(tk, 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onFocusIn = (e) => {
    const el = e.target.closest?.("[data-fidx]");
    if (el) last.current = { key: el.dataset.key || null, idx: +el.dataset.fidx || 0 };
    setKbd(!!e.target.closest?.(".td-task"));
  };
  const onFocusOut = (e) => { if (!listRef.current?.contains(e.relatedTarget)) setKbd(false); };

  let n = 0;
  return html`<section class="card" aria-labelledby="td-needs-h">
    <div class="card-head"><h2 id="td-needs-h">Needs you</h2>${tasks.length ? html`<span class="td-count num">${tasks.length}</span>` : null}
      ${tasks.length ? html`<span class="spacer"></span><span class=${cx("td-keys hide-sm", kbd && "on")} aria-hidden="true"><${Kbd}>J</${Kbd}><${Kbd}>K</${Kbd}> move<${Kbd}>↵</${Kbd}> do it<${Kbd}>S</${Kbd}> snooze<${Kbd}>D</${Kbd}> dismiss</span>` : null}</div>
    ${tasks.length
      ? html`<div class=${cx("td-groups", tasks.length <= TODAY_FLAT_MAX && "td-flat")} ref=${listRef} onfocusin=${onFocusIn} onfocusout=${onFocusOut}>${groups.map((g) => {
          const startIdx = n; n += g.shown.length;
          const more = g.items.length - TODAY_GROUP_MAX;
          const rows = [];
          g.shown.forEach((it, i) => {
            if (it.kind !== "ghostBatch") return rows.push(html`<${today_TaskRow} key=${it.key} tk=${it} idx=${startIdx + i} primary=${it.key === primaryKey} />`);
            rows.push(html`<${today_BatchRow} key=${it.key} item=${it} idx=${startIdx + i} primary=${it.key === primaryKey} open=${!!review[g.id]} onToggle=${() => setReview((o) => ({ ...o, [g.id]: !o[g.id] }))} />`);
            if (review[g.id]) rows.push(html`<div class="list td-batch-list" key=${it.key + ":list"} id=${"td-bl-" + g.id} role="group" aria-label="No-reply applications">
              ${it.tasks.map((tk) => html`<${today_TaskRow} key=${tk.key} tk=${tk} idx=${startIdx + i} child=${true} />`)}</div>`);
          });
          return html`<div class="td-group" key=${g.id} role="group" aria-labelledby=${"td-g-" + g.id}>
            <div class="td-group-h" data-key=${"group:" + g.id} data-fidx=${startIdx}>
              <h3 id=${"td-g-" + g.id}>${g.label}</h3><span class="td-count num">${g.all.length}</span>
            </div>
            <div class="list">${rows}</div>
            ${more > 0 ? html`<div class="td-group-more" data-key=${"more:" + g.id} data-fidx=${startIdx + g.shown.length - 1}><${Btn} size="sm" kind="ghost" iconRight="chevD" cls=${open[g.id] ? "td-less" : ""} onClick=${() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}>${open[g.id] ? "Show fewer" : `Show ${more} more`}</${Btn}></div>` : null}
          </div>`;
        })}</div>`
      : html`<div class="td-caught">
          <span class="td-caught-ico"><${Icon} name="check" size=${18} /></span>
          <div class="stack-sm td-grow">
            <strong>${fresh ? "Nothing to do yet" : next ? "Nothing due before your next round" : "You’re all caught up"}</strong>
            <span class="muted td-small">${fresh
              ? "Follow-ups, interview prep and thank-you notes show up here once you track applications."
              : next ? `${next.a.company} ${(ROUND[next.r.type]?.label || "interview").toLowerCase()}, ${fmt.date(next.r.at, { weekday: "short", month: "short", day: "numeric" })} at ${fmt.time(next.r.at)}. Prep reminders show up here the day before.`
              : "Nothing needs a reply, prep or follow-up right now."}</span>
          </div>
          ${fresh
            ? html`<${Btn} size="sm" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}>`
            : next ? html`<${Btn} size="sm" icon="prep" onClick=${() => { today_setPrepFocus({ appId: next.a.id, roundId: next.r.id }); go("prep"); }}>Prep now</${Btn}>`
            : html`<${Btn} size="sm" icon="find" onClick=${() => go("find")}>Find new roles</${Btn}>`}
        </div>`}
  </section>`;
}

function today_Upcoming({ up }) {
  return html`<section class="card" aria-labelledby="td-up-h">
    <div class="card-head"><h2 id="td-up-h">Upcoming</h2>${up.total ? html`<span class="td-count num">${up.total}</span>` : null}</div>
    ${up.items.length
      ? html`<div class="td-up">${up.groups.map((g) => html`<div class="td-up-day" key=${g.day}>
          <div class=${cx("td-up-label", g.label === "Today" && "is-today")}>${g.label}${g.day >= fmt.startOfDay(now()) + 2 * DAY ? html`<span class="td-up-in"> · ${fmt.until(g.items[0].r.at)}</span>` : null}</div>
          <div class="list">${g.items.map(({ a, r }) => html`<button type="button" class="td-up-row" key=${r.id} onClick=${() => openApp(a.id, "rounds")}>
            <span class="td-up-time num">${fmt.time(r.at)}</span>
            <${Logo} name=${a.company} size="sm" />
            <span class="td-up-main">
              <span class="td-up-title truncate"><b>${a.company}</b><span class="faint" aria-hidden="true"> · </span>${ROUND[r.type]?.label || "Interview"}</span>
              <span class="td-up-sub truncate">${r.interviewers ? `With ${r.interviewers}` : a.title}</span>
            </span>
            ${g.label === "Today" ? html`<span class="faint td-up-until hide-sm">${fmt.until(r.at)}</span>` : html`<span></span>`}
            <${Icon} name="chevR" cls="faint" />
          </button>`)}</div>
        </div>`)}</div>`
      : html`<div class="td-mini-empty">
          <${Icon} name="cal" cls="faint" />
          <span class="muted td-small td-grow">No interviews scheduled. Paste an invite email and the round shows up here.</span>
          <${Btn} size="sm" kind="ghost" icon="mail" onClick=${() => openModal("paste")}>Log an email</${Btn}>
        </div>`}
  </section>`;
}

function today_matches(jobs, profile, apps) {
  if (jobs.status !== "ready") return null;
  const tracked = new Set(Object.values(apps).map((a) => a.jobId).filter(Boolean));
  const cut = now() - 3 * DAY;
  const recent = [], older = [], seen = new Set();
  // Level, role and location are hard filters whenever the profile sets them (as in Find): a new-grad-only
  // profile never sees internships, however well the rest scores.
  const lv = profile.levels || [], roles = profile.roles || [];
  const locs = (profile.locations || []).slice();
  if (profile.remote && locs.length && !locs.includes("remote")) locs.push("remote");
  const okLoc = (j) => !locs.length || locs.some((l) => (l === "remote" ? jobRemoteUS(j) : jobInLoc(j, l)));
  for (const j of jobs.jobs) {
    if (j.g >= 50 || tracked.has(j.id)) continue;
    if (lv.length && !lv.includes(j.lvl)) continue;
    if (roles.length && !roles.includes(j.cat)) continue;
    if (!okLoc(j)) continue;
    const dk = j.co + "|" + norm(j.t);
    if (seen.has(dk)) continue;
    const f = fitScore(j, profile);
    if (!f) return { list: [], recentCount: 0, noProfile: true };
    if (f.score < 60) continue;
    seen.add(dk);
    // Show the location that made it match: a listed city on the profile, else its US-remote entry.
    const city = locs.length ? (j.l || []).find((l) => locs.some((id) => id !== "remote" && jobInLoc({ ...j, l: [l] }, id))) : null;
    const loc = city || (locs.includes("remote") && jobRemoteUS(j) ? (j.l || []).find((l) => /remote/i.test(l)) : null) || (j.r && !(j.l || []).length ? "Remote" : (j.l || [])[0]) || "Location not listed";
    if (j.p >= cut) recent.push({ j, f, loc });
    else { if (recent.length >= 6) break; older.push({ j, f, loc }); if (older.length >= 6) break; }
  }
  // Strongest fits first among the fresh ones, newest first within each band.
  const band = (f) => (f.score >= 80 ? 0 : f.score >= 70 ? 1 : 2);
  const fresh = recent.slice().sort((x, y) => band(x.f) - band(y.f) || y.j.p - x.j.p);
  return { list: fresh.concat(older).slice(0, 6), recentCount: recent.length, noProfile: false };
}

/* Newest listings with no ghost signals, inside whatever targets the profile sets (empty = everything, as in
   onboarding). Used when there is no fit score yet (no skills) and on a first-run Today. `today` counts the ones
   posted since midnight, so the heading never claims "today" for older roles. */
function today_fresh(jobs, profile, apps, n = 5) {
  if (jobs.status !== "ready") return null;
  const tracked = new Set(Object.values(apps || {}).map((a) => a.jobId).filter(Boolean));
  const lv = profile.levels || [], roles = profile.roles || [];
  const locs = (profile.locations || []).slice();
  if (profile.remote && locs.length && !locs.includes("remote")) locs.push("remote");
  const okLoc = (j) => !locs.length || locs.some((l) => (l === "remote" ? jobRemoteUS(j) : jobInLoc(j, l)));
  const day0 = fmt.startOfDay(now());
  const list = [], seen = new Set(), seenCo = new Set();
  for (const j of jobs.jobs) { // newest first
    if ((j.g || 0) >= 25 || tracked.has(j.id)) continue;
    if (lv.length && !lv.includes(j.lvl)) continue;
    if (roles.length && !roles.includes(j.cat)) continue;
    if (!okLoc(j)) continue;
    const dk = j.co + "|" + norm(j.t);
    if (seen.has(dk) || seenCo.has(j.co)) continue; // one per company keeps the list varied
    seen.add(dk); seenCo.add(j.co);
    const city = locs.length ? (j.l || []).find((l) => locs.some((id) => id !== "remote" && jobInLoc({ ...j, l: [l] }, id))) : null;
    const loc = city || (j.r && !(j.l || []).length ? "Remote" : (j.l || [])[0]) || "Location not listed";
    list.push({ j, f: fitScore(j, profile), loc });
    if (list.length >= n) break;
  }
  return { list, today: list.filter((x) => x.j.p >= day0).length, targets: !!(lv.length || roles.length || locs.length) };
}

function today_JobRows({ list }) {
  return html`<div class="list">${list.map(({ j, f, loc }) => html`<div class="job-row td-job" key=${j.id} role="button" tabindex="0" onClick=${() => openJob(j.id)} onKeyDown=${(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJob(j.id); } }}>
      <${Logo} name=${j.co} />
      <div class="stack-sm" style="gap:2px">
        <span class="job-title truncate">${String(j.t || "").replace(/\s+-\s+/g, " – ")}</span>
        ${today_meta([j.co, `${loc}${j.nl > 1 ? ` +${j.nl - 1} more` : ""}`], "job-meta")}
      </div>
      <div class="job-side"><${Fresh} ts=${j.p} />${f && html`<span class=${cx("fit", f.score >= 95 && "hi")} title="Fit with your targets and skills, out of 100">Fit ${f.score}</span>`}</div>
    </div>`)}</div>`;
}

/* First run (nothing tracked yet): real roles up top and the two ways in, so Today is never an empty screen. */
function today_Start({ jobs, fr }) {
  const allToday = fr && fr.list.length && fr.today >= Math.min(3, fr.list.length);
  const title = !fr || allToday ? "Fresh roles posted today" : "Newest roles";
  let body;
  if (jobs.status === "error") body = html`<div class="td-mini-empty"><${Icon} name="alert" cls="faint" /><span class="muted td-small td-grow">Job listings didn’t load. Check your connection, then try again.</span><${Btn} size="sm" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}></div>`;
  else if (!fr) body = html`<${Skeleton} rows=${4} />`;
  else if (!fr.list.length) body = html`<div class="td-mini-empty"><${Icon} name="find" cls="faint" /><span class="muted td-small td-grow">Nothing new inside your targets right now. Find has every open listing.</span></div>`;
  else body = html`<${today_JobRows} list=${fr.list} />`;
  return html`<section class="card td-start" aria-labelledby="td-start-h">
    <div class="card-head"><h2 id="td-start-h">${title}</h2>
      <span class="spacer"></span><a href="#find" class="td-link" onClick=${(e) => { e.preventDefault(); go("find"); }}>See all<${Icon} name="arrowR" size=${14} /></a></div>
    <p class="td-start-sub muted td-small">${fr && fr.targets ? "Newest roles in your targets with no ghost-job signals." : "Showing the newest roles with no ghost signals. Set targets to narrow these."}</p>
    ${body}
    <div class="td-start-foot">
      <span class="muted td-small td-grow">Applied somewhere already? Paste the confirmation email and Heardback starts tracking it.</span>
      <div class="row td-start-acts">
        <${Btn} kind="primary" icon="find" onClick=${() => go("find")}>Find jobs</${Btn}>
        <${Btn} icon="mail" onClick=${() => openModal("paste")}>Log an email</${Btn}>
      </div>
    </div>
  </section>`;
}

function today_NewForYou({ jobs, m, fr }) {
  const head = html`<div class="card-head"><h2 id="td-new-h">New for you</h2>
    <span class="spacer"></span><a href="#find" class="td-link" onClick=${(e) => { e.preventDefault(); go("find"); }}>See all in Find<${Icon} name="arrowR" size=${14} /></a></div>`;
  let body;
  if (jobs.status === "error") body = html`<div class="td-mini-empty"><${Icon} name="alert" cls="faint" /><span class="muted td-small td-grow">Job listings didn’t load. Check your connection, then try again.</span><${Btn} size="sm" icon="refresh" onClick=${() => loadJobs()}>Try again</${Btn}></div>`;
  else if (!m) body = html`<${Skeleton} rows=${4} />`;
  else if (m.noProfile) body = fr && fr.list.length
    ? html`<${today_JobRows} list=${fr.list} />
      <div class="td-card-foot faint td-small">${fr.targets ? "Newest roles in your targets with no ghost signals. Add your resume in Settings to rank them by fit." : "Showing the newest roles with no ghost signals. Set targets to narrow these."}</div>`
    : html`<div class="td-mini-empty"><${Icon} name="find" cls="faint" /><span class="muted td-small td-grow">Nothing new inside your targets right now. Find has every open listing.</span><${Btn} size="sm" onClick=${() => go("find")}>Browse all jobs</${Btn}></div>`;
  else if (!m.list.length) body = html`<div class="td-mini-empty"><${Icon} name="find" cls="faint" /><span class="muted td-small td-grow">No new strong matches right now. Broaden your roles or locations, or browse everything in Find.</span><${Btn} size="sm" onClick=${() => go("find")}>Browse all jobs</${Btn}></div>`;
  else body = html`<${today_JobRows} list=${m.list} />
    <div class="td-card-foot faint td-small">From SimplifyJobs community listings. Each links to the employer’s own page.</div>`;
  return html`<section class="card" aria-labelledby="td-new-h">${head}${body}</section>`;
}

function today_ThisWeek({ apps, goal, thisWeek }) {
  const ws = startOfWeek(now());
  const today = fmt.startOfDay(now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = ws + i * DAY;
    const n = apps.filter((a) => a.stage !== "saved" && a.appliedAt >= d && a.appliedAt < d + DAY).length;
    return { d, n, future: d > today, isToday: d === today, label: new Date(d).toLocaleDateString(undefined, { weekday: "short" }) };
  });
  const max = Math.max(1, ...days.map((x) => x.n));
  const left = Math.max(0, goal - thisWeek);
  // Same treatment as the rail's goal card on every other page: count, meter, what's left.
  return html`<section class="card td-week" aria-labelledby="td-week-h">
    <div class="td-week-top">
      <h2 id="td-week-h">This week</h2>
      <span class="spacer"></span>
      <button type="button" class="btn ghost sm td-goal-edit" onClick=${() => go("prefs")}>Edit goal</button>
    </div>
    <div class="td-week-goal">
      <div class="goal-top"><span class="num td-week-n">${thisWeek} / ${goal} applied</span><span class="hint">${thisWeek >= goal ? "Goal reached." : `${left} more to hit your goal`}</span></div>
      <${Meter} value=${thisWeek} max=${goal} ok=${thisWeek >= goal} />
    </div>
    ${thisWeek > 0 ? html`<div class="td-bars" role="img" aria-label=${"Applications per day this week: " + days.map((x) => `${x.label} ${x.n}`).join(", ")}>
          ${days.map((x) => html`<div class=${cx("td-bar", x.future && "future", x.isToday && "today")} key=${x.d} title=${`${fmt.date(x.d, { weekday: "long", month: "short", day: "numeric" })}: ${pluralize(x.n, "application")}`}>
            <span class="td-bar-val num">${x.n > 0 ? x.n : ""}</span>
            <span class="td-bar-track"><i style=${`height:${x.n ? Math.max(8, (x.n / max) * 100) : 0}%`}></i></span>
            <span class="td-bar-lbl">${x.label.slice(0, 2)}</span>
          </div>`)}
        </div>` : null}
  </section>`;
}

const TODAY_STAGE_COLOR = { saved: "var(--fg-3)", applied: "var(--accent)", screen: "var(--info)", interview: "var(--wait)", offer: "var(--ok)", rejected: "var(--bad)", ghosted: "var(--ghost)" };

function today_Pipeline({ apps }) {
  const counts = STAGES.map((st) => ({ ...st, n: apps.filter((a) => a.stage === st.id).length }));
  const total = apps.length;
  return html`<section class="card" aria-labelledby="td-pipe-h">
    <div class="card-head"><h2 id="td-pipe-h">Pipeline at a glance</h2><span class="spacer"></span><a href="#pipeline" class="td-link" onClick=${(e) => { e.preventDefault(); go("pipeline"); }}>Open<${Icon} name="arrowR" size=${14} /></a></div>
    ${total
      ? html`<div class="card-body stack" style="gap:12px">
          <div class="td-seg" role="img" aria-label=${"Applications by stage: " + counts.filter((c) => c.n).map((c) => `${c.label} ${c.n}`).join(", ")}>
            ${counts.filter((c) => c.n).map((c) => html`<i key=${c.id} style=${`flex:${c.n};background:${TODAY_STAGE_COLOR[c.id]}`} title=${`${c.label}: ${c.n}`}></i>`)}
          </div>
          <div class="td-legend">
            ${counts.map((c) => html`<button type="button" key=${c.id} class=${cx("td-legend-row", !c.n && "zero")} onClick=${() => go("pipeline")}>
              <span class=${cx("dot", c.id)}></span><span style="flex:1">${c.label}</span><span class="num">${c.n}</span>
            </button>`)}
          </div>
        </div>`
      : html`<div class="td-mini-empty"><span class="muted td-small td-grow">Nothing tracked yet. Add a role you applied to, or save one from Find.</span><${Btn} size="sm" icon="plus" onClick=${() => openModal("add")}>Add</${Btn}></div>`}
  </section>`;
}

function today_Response({ st }) {
  const small = st.applied > 0 && st.applied < 5;
  const days = st.medianReplyDays;
  return html`<section class="card" aria-labelledby="td-resp-h">
    <div class="card-head"><h2 id="td-resp-h">Response so far</h2><span class="spacer"></span><a href="#stats" class="td-link" onClick=${(e) => { e.preventDefault(); go("stats"); }}>Insights<${Icon} name="arrowR" size=${14} /></a></div>
    ${st.applied
      ? html`<div class="td-resp">
          <div class="stat"><span class="stat-label">Response rate</span>${st.applied < 5 ? html`<span class="stat-value td-early">Too early to tell</span>` : html`<span class="stat-value">${fmt.pct(st.responseRate)}</span>`}<span class="stat-sub num">${st.replied} of ${st.applied} replied</span></div>
          <div class="stat"><span class="stat-label">First reply</span><span class="stat-value">${days == null ? "—" : html`${days < 10 && days % 1 ? days.toFixed(1) : Math.round(days)}<span class="td-unit">days</span>`}</span><span class="stat-sub num">${days == null ? "No replies yet" : `median of ${pluralize(st.replyN ?? st.replied, "reply", "replies")}`}</span></div>
        </div>
        ${small ? html`<div class="td-card-foot faint td-small">Small sample. Rates settle after about 10 applications.</div>` : null}`
      : html`<div class="td-mini-empty"><span class="muted td-small">Once you apply to a few roles, your reply rate and typical wait show up here.</span></div>`}
  </section>`;
}

// Icons stay neutral; amber only when a task is genuinely late or closing: an intern season that is closing,
// or a thank-you note past the 24-hour window.
function today_tone(tk) {
  if (tk.kind === "apply" && tk.tone === "wait") return "wait";
  if (tk.kind === "thanks" && tk.round?.at && now() - tk.round.at > DAY) return "wait";
  return "";
}

function today_ExampleBanner() {
  return html`<div class="example-banner td-banner" role="note">
    <${Icon} name="info" />
    <span class="td-banner-text"><b>Example data.</b><span class="td-banner-more"> Clear it when you add your first application.</span></span>
    <span class="spacer"></span>
    <${Btn} size="sm" onClick=${() => clearExamples()}>Clear examples</${Btn}>
  </div>`;
}

function today_View() {
  const s = useStore();
  const jobs = useJobs();
  const apps = Apps.list(s);
  const tasks = useMemo(() => computeTasks(s), [s, jobs.status]);
  const st = useMemo(() => computeStats(s, apps), [s]);
  const up = useMemo(() => today_upcoming(apps), [s]);
  const m = useMemo(() => today_matches(jobs, s.profile, s.apps), [jobs.status, s.profile, s.apps]);
  const fr = useMemo(() => (!apps.length || m?.noProfile ? today_fresh(jobs, s.profile, s.apps) : null), [jobs.status, s.profile, s.apps, apps.length, m]);
  const name = today_firstName(s.profile.name);
  const goal = s.profile.weeklyGoal || 10;
  const parts = [];
  if (!apps.length) parts.push("Start with a few roles worth applying to.");
  else {
    const nT = tasks.filter((tk) => tk.group === "today").length, nQ = tasks.filter((tk) => tk.group === "quick").length, nL = tasks.length - nT - nQ;
    if (!tasks.length) parts.push("Nothing needs you right now");
    else {
      if (nT) parts.push(`${nT} for today`);
      if (nQ) parts.push(`${nQ}${nT ? " more" : ""} this week`);
      if (!nT && !nQ) parts.push(`${nL} for later`);
    }
    const nx = up.items[0];
    if (nx && fmt.startOfDay(nx.r.at) === fmt.startOfDay(now())) parts.push(`Next: ${nx.a.company} ${(ROUND[nx.r.type]?.label || "interview").toLowerCase()} at ${fmt.time(nx.r.at)}`);
    else if (up.week) parts.push(pluralize(up.week, "interview") + " in the next 7 days");
    else if (up.items.length) parts.push(`Next interview ${fmt.date(up.items[0].r.at, { weekday: "short", month: "short", day: "numeric" })}`);
    else parts.push(`${st.thisWeek} of ${goal} applications sent this week`);
  }
  return html`<div class="page td-page">
    <header class="greeting td-head">
      <div style="min-width:0">
        <h1>${today_greeting()}${name ? `, ${name}` : ""}</h1>
        ${today_meta(parts, null, "p")}
      </div>
      <span class="spacer"></span>
      <span class="td-date hide-sm">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
    </header>
    ${hasExamples(s) && s.settings.showExamples ? html`<${today_ExampleBanner} />` : null}
    <div class="split">
      <div class="stack td-col">
        ${!apps.length ? html`<${today_Start} jobs=${jobs} fr=${fr} />` : null}
        <${today_NeedsYou} tasks=${tasks} fresh=${!apps.length} next=${up.items[0]} />
        ${apps.length ? html`<${today_Upcoming} up=${up} />` : null}
        ${apps.length || (m && !m.noProfile) ? html`<${today_NewForYou} jobs=${jobs} m=${m} fr=${fr} />` : null}
      </div>
      <aside class="stack td-col" aria-label="Your week">
        <${today_ThisWeek} apps=${apps} goal=${goal} thisWeek=${st.thisWeek} />
        ${apps.length ? html`<${today_Pipeline} apps=${apps} />` : null}
        ${apps.length ? html`<${today_Response} st=${st} />` : null}
      </aside>
    </div>
  </div>`;
}
VIEWS.today = today_View;
