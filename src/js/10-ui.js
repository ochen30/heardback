/* ===== Icons (simple 24px stroke set drawn for Heardback) ===== */
const ICONS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  find: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  pipeline: '<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10.5" y="4" width="5" height="11" rx="1.5"/><rect x="17.5" y="4" width="3" height="7" rx="1.2"/>',
  companies: '<path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H13a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M14.5 10H18.5A1.5 1.5 0 0 1 20 11.5V20"/><path d="M3 20h18M7.5 9h3M7.5 12.5h3M7.5 16h3"/>',
  prep: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19M9 8h6"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  prefs: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  ext: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  ghost: '<path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><circle cx="10" cy="10.5" r=".6" fill="currentColor"/><circle cx="14" cy="10.5" r=".6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bookmark: '<path d="M6.5 4h11v16l-5.5-4-5.5 4z"/>',
  bookmarkOn: '<path d="M6.5 4h11v16l-5.5-4-5.5 4z" fill="currentColor"/>',
  filter: '<path d="M4 5.5h16l-6.2 7.3V19l-3.6-1.8v-4.4z"/>',
  spark: '<path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  trash: '<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4M12 16.8v.2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  upload: '<path d="M12 16V4.5M7 9l5-5 5 5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  download: '<path d="M12 4v11.5M7 11l5 5 5-5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9"/>',
  list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  board: '<rect x="3.5" y="4" width="7" height="16" rx="1.5"/><rect x="13.5" y="4" width="7" height="10" rx="1.5"/>',
  send: '<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z"/>',
  msg: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H10l-4.5 3.5V17h-1a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>',
  reply: '<path d="M9.5 7 4.5 12l5 5"/><path d="M4.5 12H14a5.5 5.5 0 0 1 5.5 5.5V19"/>',
  flag: '<path d="M5 21V4.5M5 4.5h11.5l-2.2 4 2.2 4H5"/>',
  trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0zM8 6.5H5a3 3 0 0 0 3 4M16 6.5h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20h7M9.5 17h5v3h-5z"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  edit: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="m14 8 3 3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4v5h-5"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  bolt: '<path d="M13 3.5 5.5 13.5H12l-1 7 7.5-10H12z"/>',
  shield: '<path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 8-7.5 9-4.3-1-7.5-4.5-7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  doc: '<path d="M6.5 3.5h7l4 4v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.5 3.5v4h4M9 12.5h6M9 16h6"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sort: '<path d="M7 4.5v15M3.5 16 7 19.5l3.5-3.5M17 19.5v-15M13.5 8 17 4.5 20.5 8"/>',
};
function Icon({ name, size, cls, label }) {
  const s = size || 16;
  return html`<svg class=${cx("ico", cls)} width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden=${label ? undefined : "true"} role=${label ? "img" : undefined} aria-label=${label} dangerouslySetInnerHTML=${{ __html: ICONS[name] || "" }}></svg>`;
}
function BrandMark({ size = 26 }) {
  return html`<svg class="brand-mark" width=${size} height=${size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--accent)"/>
    <path d="M9 11.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-4.5L12 23v-3.5a3 3 0 0 1-3-3z" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linejoin="round"/>
    <path d="m13 14.2 2 2 4-4" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ===== Small components ===== */
function Btn({ kind, size, icon, iconRight, children, cls, ...rest }) {
  return html`<button type="button" class=${cx("btn", kind, size, !children && icon && "icon", cls)} ...${rest}>
    ${icon && html`<${Icon} name=${icon} />`}${children}${iconRight && html`<${Icon} name=${iconRight} />`}
  </button>`;
}
function Kbd({ children }) { return html`<span class="kbd">${children}</span>`; }
function Badge({ kind, children, title, icon }) { return html`<span class=${cx("badge", kind)} title=${title}>${icon && html`<${Icon} name=${icon} size=${12} />`}${children}</span>`; }
function StageBadge({ stage }) {
  const kinds = { saved: "", applied: "accent", screen: "info", interview: "wait", offer: "ok", rejected: "bad", ghosted: "ghost" };
  return html`<span class=${cx("badge", kinds[stage])}><span class=${cx("dot", stage)}></span>${STAGE[stage]?.label}</span>`;
}
function Logo({ name, size }) {
  return html`<span class=${cx("logo", size)} aria-hidden="true"><span class="logo-txt">${initials(name)}</span></span>`;
}
function Switch({ id, checked, onChange, label }) {
  return html`<label class="row" style="gap:10px; cursor:pointer" for=${id}>
    <span class="switch"><input id=${id} type="checkbox" checked=${checked} onChange=${(e) => onChange(e.currentTarget.checked)} /><i></i></span>
    ${label && html`<span style="font-size:var(--fs-sm)">${label}</span>`}
  </label>`;
}
function Seg({ value, options, onChange, label }) {
  return html`<div class="seg" role="group" aria-label=${label}>
    ${options.map((o) => html`<button type="button" aria-pressed=${value === o.id ? "true" : "false"} onClick=${() => onChange(o.id)} title=${o.title}>${o.icon && html`<${Icon} name=${o.icon} />`}${o.label}</button>`)}
  </div>`;
}
function Chip({ on, onClick, children, icon }) {
  return html`<button type="button" class="chip" aria-pressed=${on ? "true" : "false"} onClick=${onClick}>${on ? html`<${Icon} name="check" size=${13} />` : icon && html`<${Icon} name=${icon} size=${14} />`}${children}</button>`;
}
function Empty({ icon = "info", title, children, action }) {
  return html`<div class="empty"><div class="empty-ico"><${Icon} name=${icon} size=${20} /></div><h3>${title}</h3>${children && html`<p>${children}</p>`}${action}</div>`;
}
function Skeleton({ rows = 6 }) {
  return html`<div class="list" aria-busy="true" aria-label="Loading">
    ${Array.from({ length: rows }).map(() => html`<div class="job-row" style="cursor:default"><div class="skel" style="width:32px;height:32px;border-radius:8px"></div><div class="stack-sm"><div class="skel" style="height:12px;width:55%"></div><div class="skel" style="height:10px;width:35%"></div></div><div class="skel" style="height:20px;width:60px"></div></div>`)}
  </div>`;
}
function Meter({ value, max, ok, label = "Progress" }) {
  const w = max ? clamp((value / max) * 100, 0, 100) : 0;
  return html`<div class=${cx("meter", ok && "ok")} role="progressbar" aria-label=${label} aria-valuemin="0" aria-valuenow=${value} aria-valuemax=${max}><i style=${`width:${w}%`}></i></div>`;
}
function Field({ label, hint, children, id }) {
  return html`<div class="field">${label && html`<label for=${id}>${label}</label>`}${children}${hint && html`<span class="hint">${hint}</span>`}</div>`;
}
function ExampleTag() { return html`<span class="badge example" title="Example data. Not real.">Example</span>`; }

/* Modal & drawer shells */
/* Escape closes only the top-most overlay */
const escStack = [];
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && escStack.length) { e.stopPropagation(); e.preventDefault(); escStack[escStack.length - 1].current(); } }, true);
function useEscape(fn) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => { escStack.push(ref); return () => { const i = escStack.indexOf(ref); if (i >= 0) escStack.splice(i, 1); }; }, []);
}
function useFocusTrap(ref, self) {
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onTab = (e) => {
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onTab);
    const prev = document.activeElement;
    if (self) { setTimeout(() => el.focus({ preventScroll: true }), 20); return () => { el.removeEventListener("keydown", onTab); try { prev?.focus?.(); } catch {} }; }
    const first = el.querySelector("[data-autofocus], [autofocus]") || el.querySelector(".modal-body input:not([type=checkbox]):not([type=radio]):not([type=file]), .modal-body textarea, .modal-body select") || el.querySelector("input:not([type=checkbox]):not([type=file]), textarea, select") || el;
    setTimeout(() => (first || el).focus?.(), 20);
    return () => { el.removeEventListener("keydown", onTab); try { prev?.focus?.(); } catch {} };
  }, []);
}
function Modal({ title, onClose, children, foot, size, label }) {
  const ref = useRef(null);
  useEscape(onClose); useFocusTrap(ref);
  return html`<${Fragment}>
    <div class="scrim modal-scrim" onClick=${onClose}></div>
    <div class=${cx("modal", size)} role="dialog" aria-modal="true" aria-label=${label || title} ref=${ref} tabindex="-1">
      ${title && html`<div class="modal-head"><h2>${title}</h2><span class="spacer"></span><${Btn} kind="ghost" icon="x" aria-label="Close" onClick=${onClose} /></div>`}
      <div class="modal-body" tabindex="0">${children}</div>
      ${foot && html`<div class="modal-foot">${foot}</div>`}
    </div>
  </${Fragment}>`;
}
function Drawer({ onClose, head, children, foot, label }) {
  const ref = useRef(null);
  useEscape(onClose); useFocusTrap(ref, true);
  return html`<${Fragment}>
    <div class="scrim" onClick=${onClose}></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label=${label} ref=${ref} tabindex="-1">
      <div class="drawer-head">${head}<${Btn} kind="ghost" icon="x" aria-label="Close" onClick=${onClose} /></div>
      <div class="drawer-body">${children}</div>
      ${foot && html`<div class="drawer-foot">${foot}</div>`}
    </aside>
  </${Fragment}>`;
}
/* In-page confirm (the frame blocks window.confirm) */
function Confirm({ title, body, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  return html`<${Modal} title=${title} onClose=${onClose} foot=${html`<${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind=${danger ? "primary danger-solid" : "primary"} onClick=${() => { onConfirm(); onClose(); }}>${confirmLabel}</${Btn}>`}>
    <p class="muted">${body}</p>
  </${Modal}>`;
}
function askConfirm(opts) { openModal("confirm", opts); }

/* Ghost score display */
function ghostLevel(g) { return g >= 50 ? "high" : g >= 25 ? "mid" : "low"; }
function ghostLabel(g) { return g >= 50 ? "Strong ghost signals" : g >= 25 ? "Some ghost signals" : "Looks active"; }
function GhostScore({ g, compact }) {
  const lv = ghostLevel(g || 0);
  return html`<span class=${cx("gscore", lv)} title=${`${ghostLabel(g || 0)} (${g || 0}/100). Based on listing age, reposts, location count and the company's usual time to close.`}><span class="gbars"><i></i><i></i><i></i></span>${!compact && ghostLabel(g || 0)}</span>`;
}
function Fresh({ ts }) {
  const d = (now() - ts) / DAY;
  return html`<span class=${cx("fresh", d < 2 && "new")} title=${`Posted ${fmt.dateY(ts)}`}>${d < 2 && html`<span class="sr">New, </span>`}${fmt.ago(ts)}</span>`;
}
