/* ===== Share your progress: a 1200x630 card drawn on <canvas>, real applications only ===== */

const SHARE_W = 1200, SHARE_H = 630, SHARE_DPR = 2;
const SHARE_PERIODS = [{ id: "week", label: "This week" }, { id: "month", label: "This month" }, { id: "all", label: "All time" }];
const SHARE_THEMES = [{ id: "light", label: "Light", icon: "sun" }, { id: "dark", label: "Dark", icon: "moon" }];
const SHARE_TOKENS = ["--bg", "--surface", "--surface-2", "--line", "--line-strong", "--fg", "--fg-2", "--fg-3", "--accent", "--accent-fg", "--accent-soft", "--ok"];

/* Read the light and dark token sets straight from styles.css, so the card always matches the app.
   Falls back to the currently computed tokens if the rules can’t be read. */
let share_tokenCache = null;
function share_tokens(theme) {
  if (!share_tokenCache) {
    const found = { light: null, dark: null };
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const r of Array.from(rules || [])) {
          if (!r.style || !r.selectorText) continue;
          const sel = r.selectorText.replace(/\s+/g, "").replace(/'/g, '"');
          if (!found.light && sel === ":root" && r.style.getPropertyValue("--bg")) found.light = r.style;
          if (!found.dark && sel === ':root[data-theme="dark"]' && r.style.getPropertyValue("--bg")) found.dark = r.style;
        }
      }
    } catch {}
    const live = getComputedStyle(document.documentElement);
    const pick = (style) => Object.fromEntries(SHARE_TOKENS.concat(["--font"]).map((k) => [k, ((style && style.getPropertyValue(k)) || live.getPropertyValue(k) || "").trim()]));
    share_tokenCache = { light: pick(found.light), dark: pick(found.dark) };
    if (!share_tokenCache.dark["--font"]) share_tokenCache.dark["--font"] = share_tokenCache.light["--font"];
  }
  return share_tokenCache[theme] || share_tokenCache.light;
}

function share_periodStart(period, t = now()) {
  if (period === "week") return startOfWeek(t);
  if (period === "month") { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); }
  return -Infinity;
}
function share_searchLabel(profile) {
  const lv = (profile && profile.levels) || [];
  if (lv.length === 1 && lv[0] === "intern") return "internship recruiting";
  if (lv.length === 1 && lv[0] === "newgrad") return "new grad recruiting";
  return "my job search";
}

/* All numbers come from computeStats() over the user's own applications. Examples are never included. */
function share_data(s, period) {
  const real = Object.values(s.apps || {}).filter((a) => !a.example);
  const all = computeStats(s, real);
  const start = share_periodStart(period);
  const cohort = real.filter((a) => a.stage !== "saved" && a.appliedAt && a.appliedAt >= start);
  const st = period === "all" ? all : computeStats(s, cohort);
  const firstApplied = real.filter((a) => a.appliedAt && a.stage !== "saved").reduce((m, a) => Math.min(m, a.appliedAt), Infinity);
  const weekN = isFinite(firstApplied) ? Math.floor((startOfWeek(now()) - startOfWeek(firstApplied)) / (7 * DAY)) + 1 : 0;
  const offerApps = (period === "all" ? real : cohort).filter((a) => a.stage !== "saved" && a.appliedAt && (a.stage === "offer" || (a.events || []).some((e) => e.to === "offer")));
  return { st, all, weekN, offerCompanies: offerApps.map((a) => (a.company || "").trim()).filter(Boolean), hasReal: all.applied > 0 };
}

function share_periodLabel(period, d) {
  const t = new Date(now());
  if (period === "week") return `Week of ${fmt.date(startOfWeek(now()))}`;
  if (period === "month") return t.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return d.weekN > 1 ? `${d.weekN} weeks so far` : "First week";
}
function share_eyebrow(period, d, profile) {
  const search = share_searchLabel(profile);
  const S = search.charAt(0).toUpperCase() + search.slice(1);
  if (period === "week") return d.weekN ? `Week ${d.weekN} of ${search}` : S;
  if (period === "month") return `${S} this month`;
  return `${S} so far`;
}

/* Honest, modest caption. Counts are always the same ones shown on the card. */
function share_caption(period, d, profile, showCompanies) {
  const st = d.st, search = share_searchLabel(profile);
  const parts = [pluralize(st.applied, "application"), pluralize(st.replied, "reply", "replies")];
  if (st.interviewed) parts.push(pluralize(st.interviewed, "interview"));
  if (st.offers) parts.push(pluralize(st.offers, "offer"));
  const list = parts.length > 2 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join(" and ");
  let lead;
  if (period === "week") lead = d.weekN ? `Week ${d.weekN} of ${search}: ${list} this week.` : `This week in ${search}: ${list}.`;
  else if (period === "month") lead = `${new Date(now()).toLocaleDateString(undefined, { month: "long" })} in ${search}: ${list}.`;
  else lead = d.weekN > 1 ? `${d.weekN} weeks into ${search}: ${list} so far.` : `First week of ${search}: ${list}.`;
  const offer = showCompanies && d.offerCompanies.length ? ` Grateful for the offer${d.offerCompanies.length > 1 ? "s" : ""} from ${d.offerCompanies.join(" and ")}.` : "";
  return `${lead}${offer} Tracking it all in Heardback.`;
}

/* ---------- Drawing ---------- */
function share_font(tk, weight, size) { return `${weight} ${size}px ${tk["--font"] || "ui-sans-serif, system-ui, sans-serif"}`; }
function share_fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}
function share_rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
function share_mark(ctx, tk, x, y, size) {
  const k = size / 32;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = tk["--accent"]; share_rr(ctx, 0, 0, 32, 32, 8); ctx.fill();
  ctx.strokeStyle = tk["--accent-fg"]; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.stroke(new Path2D("M9 11.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-4.5L12 23v-3.5a3 3 0 0 1-3-3z"));
  ctx.stroke(new Path2D("m13 14.2 2 2 4-4"));
  ctx.restore();
}
function share_spacing(ctx, v) { if ("letterSpacing" in ctx) ctx.letterSpacing = v; }

function share_draw(canvas, { theme, period, d, profile, showCompanies }) {
  const tk = share_tokens(theme);
  canvas.width = SHARE_W * SHARE_DPR; canvas.height = SHARE_H * SHARE_DPR;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(SHARE_DPR, 0, 0, SHARE_DPR, 0, 0);
  ctx.textBaseline = "alphabetic";
  const P = 72, R = SHARE_W - P;

  // Background + subtle grid that fades toward the left so the numbers sit on a quiet field
  ctx.fillStyle = theme === "dark" ? tk["--bg"] : tk["--surface"]; ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.save();
  ctx.strokeStyle = tk["--line"]; ctx.lineWidth = 1;
  ctx.globalAlpha = theme === "dark" ? 0.7 : 0.9;
  ctx.beginPath();
  for (let x = 0.5; x < SHARE_W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, SHARE_H); }
  for (let y = 30.5; y < SHARE_H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(SHARE_W, y); }
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-out";
  const mask = ctx.createLinearGradient(0, 0, SHARE_W, SHARE_H * 0.6);
  mask.addColorStop(0, "rgba(0,0,0,1)"); mask.addColorStop(0.55, "rgba(0,0,0,.92)"); mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask; ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.restore();
  // Re-fill the background under the erased area (destination-out made it transparent)
  ctx.save(); ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = theme === "dark" ? tk["--bg"] : tk["--surface"]; ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.restore();

  // Brand row
  share_mark(ctx, tk, P, 60, 40);
  ctx.fillStyle = tk["--fg"]; ctx.font = share_font(tk, 600, 26); share_spacing(ctx, "-0.4px");
  ctx.fillText("Heardback", P + 54, 89);
  share_spacing(ctx, "0px");
  ctx.font = share_font(tk, 500, 22); ctx.fillStyle = tk["--fg-3"]; ctx.textAlign = "right";
  ctx.fillText(share_periodLabel(period, d), R, 88);
  ctx.textAlign = "left";

  // Eyebrow
  ctx.font = share_font(tk, 500, 26); ctx.fillStyle = tk["--fg-2"];
  ctx.fillText(share_eyebrow(period, d, profile), P, 196);

  // Big numbers
  const st = d.st;
  const cols = [
    { n: st.applied, label: st.applied === 1 ? "Application sent" : "Applications sent" },
    { n: st.replied, label: st.replied === 1 ? "Reply" : "Replies" },
    { n: st.interviewed, label: st.interviewed === 1 ? "Interview" : "Interviews" },
    { n: st.offers, label: st.offers === 1 ? "Offer" : "Offers" },
  ];
  const colW = (R - P) / 4;
  cols.forEach((c, i) => {
    const x = P + i * colW;
    if (i) { ctx.fillStyle = tk["--line"]; ctx.fillRect(x - 0.5 - 24, 236, 1, 132); }
    ctx.fillStyle = tk["--fg"]; ctx.font = share_font(tk, 600, 112); share_spacing(ctx, "-4px");
    ctx.fillText(String(c.n), x - 4, 330);
    share_spacing(ctx, "0px");
    ctx.font = share_font(tk, 500, 22); ctx.fillStyle = tk["--fg-3"];
    ctx.fillText(share_fit(ctx, c.label, colW - 48), x, 366);
  });

  // Divider
  ctx.fillStyle = tk["--line"]; ctx.fillRect(P, 414, R - P, 1);

  // Response rate
  const rate = st.responseRate == null ? "—" : `${Math.round(st.responseRate * 100)}%`;
  ctx.fillStyle = tk["--accent"]; ctx.font = share_font(tk, 600, 56); share_spacing(ctx, "-2px");
  ctx.fillText(rate, P - 2, 500);
  const rw = ctx.measureText(rate).width;
  share_spacing(ctx, "0px");
  ctx.font = share_font(tk, 500, 22); ctx.fillStyle = tk["--fg-2"];
  ctx.fillText("response rate", P + rw + 14, 498);
  ctx.fillStyle = tk["--fg-3"];
  ctx.fillText(st.applied ? `${st.replied} of ${pluralize(st.applied, "application")} got a reply` : "No applications in this period yet", P, 536);

  // 8-week sparkline (applications sent per week), always the last 8 weeks
  const wk = d.all.weeks || [];
  const max = Math.max(1, ...wk.map((w) => w.applied));
  const bw = 22, gap = 14, sw = wk.length * bw + (wk.length - 1) * gap, bh = 76;
  const sx = R - sw, base = 506;
  wk.forEach((w, i) => {
    const x = sx + i * (bw + gap);
    const h = w.applied ? Math.max(6, Math.round((w.applied / max) * bh)) : 3;
    ctx.fillStyle = w.applied ? tk["--accent"] : tk["--line-strong"];
    ctx.globalAlpha = w.applied ? (i === wk.length - 1 ? 1 : 0.55) : 1;
    share_rr(ctx, x, base - h, bw, h, Math.min(4, h / 2)); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.font = share_font(tk, 500, 18); ctx.fillStyle = tk["--fg-3"]; ctx.textAlign = "right";
  ctx.fillText("Applications per week, last 8 weeks", R, 536);
  ctx.textAlign = "left";

  // Footer
  ctx.font = share_font(tk, 500, 18); ctx.fillStyle = tk["--fg-3"];
  ctx.fillText("Tracked with Heardback", P, 588);
  if (showCompanies && d.offerCompanies.length) {
    ctx.textAlign = "right"; ctx.fillStyle = tk["--fg-2"];
    ctx.fillText(share_fit(ctx, `Offer${d.offerCompanies.length > 1 ? "s" : ""}: ${d.offerCompanies.join(", ")}`, (R - P) / 2), R, 588);
    ctx.textAlign = "left";
  }
}

async function share_fontsReady(tk) {
  try {
    if (!document.fonts) return;
    await Promise.race([
      Promise.all([document.fonts.ready, document.fonts.load(share_font(tk, 600, 112), "0123456789"), document.fonts.load(share_font(tk, 500, 22), "Heardback")]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
}

/* ---------- Modal ---------- */
function share_initialTheme(s) {
  const t = s.settings && s.settings.theme;
  if (t === "dark" || t === "light") return t;
  try { return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch { return "light"; }
}

MODALS.share = function ShareModal() {
  const s = useStore();
  const caps = useCaps();
  const [period, setPeriod] = useState("month");
  const [theme, setTheme] = useState(() => share_initialTheme(store.get()));
  const [showCompanies, setShowCompanies] = useState(false);
  const [img, setImg] = useState(null); // { url, blob }
  const [fontsOk, setFontsOk] = useState(false);
  const canvasRef = useRef(null);
  const d = useMemo(() => share_data(s, period), [s.apps, period]);
  const caption = share_caption(period, d, s.profile, showCompanies);

  useEffect(() => { let live = true; share_fontsReady(share_tokens("light")).then(() => live && setFontsOk(true)); return () => { live = false; }; }, []);

  useEffect(() => {
    if (!d.hasReal) return;
    const c = canvasRef.current || (canvasRef.current = document.createElement("canvas"));
    share_draw(c, { theme, period, d, profile: s.profile, showCompanies });
    let url = null, cancelled = false;
    c.toBlob((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setImg({ url, blob });
    }, "image/png");
    return () => { cancelled = true; if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); };
  }, [d, theme, showCompanies, fontsOk]);

  const saveImage = async () => {
    if (!img) return;
    if (!caps.downloads) { toast("Downloads aren’t available here. Right-click or long-press the preview to save the image."); return; }
    await saveFile("heardback-progress.png", img.blob, "image/png");
  };

  if (!d.hasReal) {
    return html`<${Modal} title="Share your progress" onClose=${closeModal} size="lg share-modal">
      <${Empty} icon="send" title="Add a real application to make your card" action=${html`<${Btn} kind="primary" icon="plus" onClick=${() => openModal("add")}>Add application</${Btn}>`}>
        Your card only counts applications you’ve added yourself. Example data is never included.
      </${Empty}>
    </${Modal}>`;
  }

  const alt = `Progress card: ${pluralize(d.st.applied, "application")} sent, ${pluralize(d.st.replied, "reply", "replies")}, ${pluralize(d.st.interviewed, "interview")}, ${pluralize(d.st.offers, "offer")}.`;
  return html`<${Modal} title="Share your progress" onClose=${closeModal} size="lg share-modal" foot=${html`
      <span class="hint share-foot-note">Only your own applications. Examples are never included.</span>
      <${Btn} icon="copy" onClick=${() => copyText(caption, "Caption copied")}>Copy caption</${Btn}>
      <${Btn} kind="primary" icon="download" onClick=${saveImage} disabled=${!img}>Save image</${Btn}>`}>
    <div class="share-controls">
      <${Seg} label="Period" value=${period} options=${SHARE_PERIODS} onChange=${setPeriod} />
      <${Seg} label="Card theme" value=${theme} options=${SHARE_THEMES} onChange=${setTheme} />
    </div>
    <div class="share-preview">
      ${img ? html`<img class="share-img" src=${img.url} width=${SHARE_W} height=${SHARE_H} alt=${alt} />` : html`<div class="share-img skel" aria-label="Drawing your card"></div>`}
    </div>
    ${period !== "all" && d.st.applied === 0 && html`<p class="hint">No applications sent ${period === "week" ? "this week" : "this month"} yet. Try All time, or share again after your next one.</p>`}
    <div class="share-opts">
      <${Switch} id="share-show-companies" checked=${showCompanies} onChange=${setShowCompanies} label="Show company names for offers" />
      ${showCompanies && !d.offerCompanies.length && html`<span class="hint">No offers in this period, so no names are shown.</span>`}
    </div>
    <div class="share-caption">
      <div class="share-caption-label">Suggested caption</div>
      <p id="share-caption-text">${caption}</p>
    </div>
  </${Modal}>`;
};
