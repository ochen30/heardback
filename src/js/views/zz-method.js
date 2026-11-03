/* ===== "How we score listings": the ghost-signal methodology, with live numbers ===== */
const METHOD_SIGNALS = [
  { k: "Age", pts: "10 at 30 days · 25 at 60 · 40 at 90 · 55 at 150+", why: "Days since the listing was first seen. Most real openings fill or close within a few weeks." },
  { k: "Closed and reposted", pts: "10 for 1 earlier cycle · 20 for 2–3 · 30 for 4+", why: "The company posted the same title before, closed it, and posted it again. Several identical openings live at the same time is usually volume hiring, so that alone adds nothing." },
  { k: "Location blast", pts: "10 for 8+ cities · 20 for 15+", why: "The same role listed in many cities at once. Remote eligibility and state lists don't count." },
  { k: "Talent-pool title", pts: "35", why: "Titles like “talent community”, “general application” or “future opportunities” usually mean there's no specific opening." },
  { k: "Slow for this company", pts: "15", why: "The company usually closes listings within three weeks, and this one is more than three times older than that." },
];
MODALS.method = () => {
  const jobs = useJobs();
  const b = useMemo(() => {
    if (jobs.status !== "ready") return null;
    const c = [0, 0, 0];
    for (const j of jobs.jobs) c[j.g >= 50 ? 2 : j.g >= 25 ? 1 : 0]++;
    return { c, n: jobs.jobs.length, raw: jobs.meta?.stats?.active };
  }, [jobs.status]);
  const rows = b ? [[ghostLabel(0), b.c[0], "var(--ok)"], [ghostLabel(25), b.c[1], "var(--wait)"], [ghostLabel(50), b.c[2], "var(--bad)"]] : [];
  return html`<${Modal} title="How we score listings" size="lg" onClose=${closeModal}>
    <p class="muted" style="font-size:var(--fs-sm);max-width:68ch">Every listing gets a ghost-signal score from 0 to 100, built only from things we can see in the listing data. We show the reasons on each listing and never call a listing fake. A high score means "check before you invest hours", not "don't apply".</p>
    ${b && html`<div class="stack-sm">
      <span class="label">Across ${fmt.num(b.n)} live listings right now${b.raw && b.raw > b.n ? html` <span class="faint" style="font-weight:400">(${fmt.num(b.raw)} postings, with identical repeats shown once)</span>` : null}</span>
      <div class="meth-bar" role="img" aria-label=${rows.map(([l, n]) => `${l}: ${n}`).join(", ")}>${rows.map(([l, n, col]) => html`<i key=${l} style=${`flex:${n};background:${col}`} title=${`${l}: ${fmt.num(n)}`}></i>`)}</div>
      <div class="meth-legend">${rows.map(([l, n, col]) => html`<span key=${l}><i style=${`background:${col}`}></i>${l} <b class="num">${fmt.pct(n / b.n)}</b></span>`)}</div>
    </div>`}
    <div class="table-wrap card"><table class="table meth-table"><thead><tr><th>Signal</th><th>Points</th><th>Why it matters</th></tr></thead><tbody>
      ${METHOD_SIGNALS.map((s) => html`<tr key=${s.k} style="cursor:default"><td style="font-weight:500;white-space:nowrap">${s.k}</td><td class="num meth-pts">${s.pts.split(" · ").map((x) => html`<div key=${x}>${x}</div>`)}</td><td class="muted">${s.why}</td></tr>`)}
    </tbody></table></div>
    <p class="hint">Scores add up and cap at 100. Under 25 shows as "${ghostLabel(0)}", 25–49 as "${ghostLabel(25)}", 50 and up as "${ghostLabel(50)}".</p>
    <div class="stack-sm">
      <span class="label">Limits we know about</span>
      <ul style="margin:0;padding-left:18px;color:var(--fg-2);font-size:var(--fs-sm);display:flex;flex-direction:column;gap:4px">
        <li>Dates are when the source list first saw a listing (from Mar 9, 2026), which can be later than the employer's own date.</li>
        <li>Reposts are matched by company and title, not by requisition number, so a big employer reusing one title can look like it reposts.</li>
        <li>Company timing uses closed listings only, so "usually closes in" leans short.</li>
      </ul>
    </div>
    <p class="hint">Data: SimplifyJobs community listings on GitHub${jobs.meta?.generatedAt ? `, refreshed ${fmt.ago(Date.parse(jobs.meta.generatedAt))}` : ""}. Every listing links to the employer's own application page.</p>
  </${Modal}>`;
};
