# Heardback: principal design review 6 (v9 plus the accessibility pass)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `tools/build.py`. No source was edited.

**Captures** are in `qa/out-critic6/`:
- **Routes:** every route at 1440 light and dark, 768 light, and 375 light and dark.
- **First run** (`fresh/`): 1440 and 375, onboarding step 2 in dark.
- **Overlays** (`ov/`):
  - CSV preview at 1440 and 375, plus the result after import;
  - the Find count bar at 375, with ghost listings hidden and shown;
  - job drawer (light and dark), ghost job, Salesforce ghost list, company drawer (light and dark);
  - method modal, palette context actions (light and dark), mobile filters;
  - app drawer (light and dark) and the mobile drawer;
  - add (dark), paste and draft modals;
  - board selection, Closed expanded, the table at 1440 and 375;
  - the mobile quick-add sheet (dark), the snooze menu, the share modal with real data (light and dark);
  - Practice.

No console errors and no horizontal overflow on any run.

**Overall: 9.0 / 10.** History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9.

### What landed since REVIEW5

**Usability round:**
- **CSV import preview.** "6 rows found. Check the stages" with "Sheet says “OA”" provenance is calm and honest.
- **Stage-aware Today.** "What's next with Zillow? … Add a round" replaces the false ghost nudge.
- **Strong ghosts hidden by default**, with a count and a way back.
- **Phone count bar.** Every target is 44px.
- **Quick-add sheet.**
- **Mobile table stage** is now text ("Saved · Apply").

**REVIEW5 fixes:**
- Separators no longer start lines at 375 or 768.
- Outcomes sum to 100%, the swatches are circles, and the chart top is 2.
- The ghost-score copy reads "Ghost-signal score 80 of 100 (lower is better)".
- "Mark as ghosted" is used everywhere.
- The job drawer says "About Meta".
- Company-drawer rows show the glyph only and wrap titles to 2 lines.
- Companies split bars are grey, and the Practice card outline is neutral.
- Age dots align in a column.

### Still open from REVIEW5

| REVIEW5 fix | Status |
|---|---|
| #2 Fit highlight in the company drawer | Ghost-gated, but not context-gated. |
| #4 Apostrophes | Partly done. |
| #5 Mobile "+" | Not done. |
| #7 Share card | Not done. |
| #8 Skill chips | Not done. |
| #10 Settings locations and rail badges | Not done. |

---

## 1. Scores (1–10)

| Surface | Prof. | Clarity | Hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 9 | 9 | 9 | 8 | The stage-aware tasks are excellent. "haven't heard back" is still a straight `'`. After an import, the subtitle falls back to "0 of 10 applications sent this week". Rail badges "Today 5" and "Pipeline 5" are still two pills with different meanings. |
| Find (1440) | 9 | 9 | 9 | 8 | Fit is calm and the dots are a clean column. The count line is now 5 clauses with 2 links ("Using your preferences · Show all · Hiding 220 with strong ghost signals · Show them"), and it duplicates the sidebar switch directly to its left. |
| Find (768) | 8 | 9 | 7 | 8 | The "Newest" `select` sits alone on its own row under the count line, a stranded control on a 768 canvas. |
| Find (375) | 9 | 8 | 9 | 7 | The two-line bar is tidy, but the copy differs from desktop: "Hiding 220 **likely stale** · Show" vs "with **strong ghost signals** · Show them". There are 3 wordings for preferences: "Using your preferences", "Your preferences" and "Use my preferences". |
| Job drawer | 9 | 9 | 9 | 9 | The ghost job is now honest: plain Fit 96, a red glyph, and score copy that explains itself. |
| Companies | 9 | 9 | 9 | 9 | Grey split bars. At 375, "39% reposted" loses the amber or red outlier tint that 1440 has. |
| Company drawer | 8 | 8 | 8 | 7 | The titles breathe now. Two of the seven "Fit 96" rows still get the accent pill (the fresh, clean ones), so the highlight looks random inside a company. |
| Pipeline board | 9 | 9 | 9 | 8 | Interviews uses the same amber as "Silent 10d", so the warning colour doubles as a stage colour. |
| Table | 8 | 8 | 9 | 8 | **Northwind (interview tomorrow) shows amber "8" in Days silent**, and "8d silent" on mobile. The drawer says "9 days ago" in amber. Each is a contradiction (see the Bugs table). |
| App drawer | 9 | 9 | 9 | 9 | Still the best surface. The mobile footer with the icon-only trash is right. |
| CSV preview | 9 | 9 | 9 | 8 | The first `select` gets a focus ring on open, so it reads as "this one is wrong". At 375, the 128px select truncates every role ("Data Scientist I, New …"). Imported titles keep ASCII " - " while the rest of the app uses en dashes. |
| Prep | 9 | 9 | 9 | 9 | The neutral Practice card landed. On mobile, "Technical" wraps onto its own line under the title with no separator. |
| Insights | 9 | 9 | 9 | 9 | Fixed. After an import, **"Time to first reply 0 days"** is back (see the Bugs table). |
| Share card | 7 | 8 | 8 | 8 | Unchanged. It defaults to "This month" and shows 1 · 0 · 0 · 0, a large accent **0%**, the caption "1 application and 0 replies", and the graph-paper grid. |
| Settings | 8 | 9 | 8 | 8 | **Locations are still one column.** `.onb-locs` shrink-wraps to 288px inside the 510px cell (measured). The privacy copy rag is uneven ("Nothing / is shared"). |
| Onboarding | 9 | 9 | 9 | 8 | Step 2 in dark is still a wall of 13 accent skill chips. |
| Dark mode | 9 | – | 9 | 9 | The overlays and scrims are right. The chart bars are fine now. |
| Mobile (375) | 8 | 9 | 8 | 8 | **The topbar "+" is still a filled accent 36×36**, the brightest object in dark mode (third review running). Its `aria-label` is "Add application", but it opens a two-option chooser. Toasts sit on top of bottom sheets: "Added 10 examples" covers "Add an application" in quick add and the last CSV row. |

---

## 2. Top 8 remaining fixes, ranked by impact

### 1. Import must not fabricate a reply time (bug, data trust)

**File:** `src/js/25-logic.js:82` (`computeStats`), and the import commit in `src/js/views/prefs.js`.

**Problem:** the CSV preview now writes a `stage` event dated at `appliedAt`, so the guard `!(a.events||[]).some(e => e.kind === "stage")` no longer excludes imported rows.
- Snowflake, Zillow and Expedia get `firstReplyAt === appliedAt`, which is 0 days.
- Today shows "First reply **0** days, median of 4 replies", and Insights does the same.
- This is the exact regression v9's changelog says was fixed.

**Fix:** tag import-created events, and skip them for reply timing.
```js
// prefs.js import: events: [{ kind: "stage", to, at: appliedAt, imported: true }]
function firstReplyAt(a) {
  const e = (a.events || []).find((e) => e.kind === "stage" && !e.imported && ["screen","interview","offer","rejected"].includes(e.to));
  return e ? e.at : (a.source === "import" && a.lastReplyAt === a.appliedAt ? null : a.lastReplyAt);
}
```
When `replyN === 0`, the stat already renders "—" and "No replies yet". That is the honest state for a fresh import.

### 2. No silence warnings when a round is scheduled

**File:** `src/js/views/pipeline.js:590` (table), `:69/79` (card), `:780` (drawer "Last reply").

**Problem:**
- Northwind has "Technical tomorrow", yet Days silent shows amber **8**.
- The mobile row adds "8d silent".
- The drawer shows "Last reply 9 days ago" in `--wait`.
- The table and the drawer disagree by a day: `Apps.daysSilent` floors a millisecond delta, while `fmt.ago` counts calendar days.

**Fix:**
```js
const busy = ns.kind === "upcoming" || (a.rounds || []).some((r) => r.at > now() && r.outcome === "pending");
const silent = ACTIVE_STAGES.includes(a.stage) && !busy ? Apps.daysSilent(a) : null;
```
- In the drawer, drop the `.wait` tone on `.pl-kv` "Last reply" when `busy`.
- Make `daysSilent` calendar-based: `Math.round((startOfDay(now()) - startOfDay(ref)) / DAY)`.

### 3. Mobile topbar "+": quiet it, and name it honestly (third time)

**File:** `src/styles.css` (≤760 block, ~:500), `src/js/30-shell.js:53`.

```css
@media (max-width: 760px) {
  .top-actions .btn.primary { width: 36px; height: 36px; min-height: 36px; padding: 0; justify-content: center;
    background: var(--accent-soft); color: var(--accent-text); border-color: transparent; box-shadow: none; }
}
```

- **Label:** `aria-label=${narrow ? "Add or log" : "Add application"}`.
- **Sheet title:** change `MODALS.quickadd`'s title from "Add" to "**Add to your pipeline**".

### 4. Share card: never lead with zeros (carry-over REVIEW5 #7)

**File:** `src/js/views/zz-share.js:231`, the rate block, and the grid background.

**Default period:**
```js
const [period, setPeriod] = useState(() => ["week", "month"].find((p) => shareStats(p).sent >= 3) || "all");
```

**Copy and style:**
- **No replies:** when `replies === 0`, replace the accent `0%` with `<span class="share-wait">Waiting on first replies</span>` (`color: var(--fg-2); font-size: var(--fs-lg)`).
- **Caption:** "November so far: 1 application out, more on the way." Never "0 replies".
- **Background:** delete the graph-paper `background-image`, and use a flat `var(--surface)`.

### 5. Find count line: one wording, one control, no stranded sort

**File:** `src/js/views/find.js:213–222, 477–480`, `src/css/find.css:47, 205–206, 258`.

**Copy:** one vocabulary at every width.
- **Status:** "Hiding 220 with strong ghost signals", shortened at ≤520 to "Hiding 220 likely ghosts". "Likely stale" is a third term for the same thing.
- **Links:** "Show" and "Hide".
- **Preferences:** "Your preferences" for the state, and "Use your preferences" for the action. "Use my" breaks the app's second-person voice.

**Remove the duplication at ≥1024:** the sidebar switch already owns this state, so drop the "· Show them" link from `.find-count` there and keep the `.find-ghost-note` text only:
```css
@media (min-width: 1024px) { .find-count .find-ghost-note + .find-prefs { display: none; } }
```

**768:** put the sort back on the count row, instead of on a row by itself.
```css
@media (min-width: 521px) and (max-width: 1023px) {
  .find-bar { display: flex; align-items: center; gap: 12px; }
  .find-bar .find-count { flex: 1; padding-top: 0; }
  .find-bar .find-sort-sm { margin-left: auto; }
}
```

### 6. Settings locations: actually two columns (carry-over REVIEW5 #10)

**File:** `src/css/prep.css:253`.

The last fix only removed a `max-width`. The real cause is that `.onb-locs` is a shrink-wrapped flex column inside a `.pf-row` grid cell. It measures 288px, so `.onb-opts` resolves to one 304px track.
```css
.pf-row .onb-locs { width: 100%; justify-self: stretch; }
.pf-row .onb-opts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
```

**Ordering:** the counts and order also differ between Find (Canada 334 > Seattle 329, with strong ghosts excluded) and Settings (Seattle 382 > Canada 362). Make the Settings caption say so: "Counts: open Software and Data & AI roles, all levels, including listings with strong ghost signals."

### 7. Accent means "selected": the last three offenders

**Files:**
- `src/css/prep.css:46–48`: `.onb-skill`;
- `src/js/views/find.js` `find_fitHi`;
- `src/js/30-shell.js` rail badges.

**Skill chips:** these items exist; they are not selected toggles.
```css
.chip.onb-skill[aria-pressed="true"] { background: var(--surface-2); border-color: var(--line); color: var(--fg); }
.chip.onb-skill .ico { color: var(--fg-3); opacity: 1; }
```

**Company drawer:** 2 of 7 identical "Fit 96" rows are highlighted, so add the context gate:
```js
const find_fitHi = (score, job, ctx) => score >= 95 && !ctx?.inCompany && (job?.gLevel ?? 0) === 0;
```

**Rail:** keep the Today count as `.badge`. Render Pipeline's as `<span class="nav-count">5</span>`, styled `margin-left: auto; color: var(--fg-3); font-size: var(--fs-xs); font-variant-numeric: tabular-nums`. Or drop it.

### 8. Small polish: toasts, CSV preview, apostrophes

**Toasts over sheets** (`src/styles.css:506, 534–535`): the existing `.over-drawer` offset needs a modal twin.
```css
@media (max-width: 760px) { body:has(.modal-scrim) .toasts { bottom: auto; top: calc(12px + env(safe-area-inset-top, 0px)); } }
```

**CSV preview** (`src/css/prep.css:342`):
- **Focus:** on open, focus the dialog title (`tabIndex=-1`), not `#pf-imp-st-0`. A ringed first row reads as flagged.
- **Layout at ≤520:** stack the stage control under the text.
  ```css
  @media (max-width: 520px) { .pf-imp-row { grid-template-columns: minmax(0, 1fr); } .pf-imp-row .pf-imp-sel { width: 100%; } }
  ```
- **Dashes:** normalise `" - "` to `" – "` in imported titles. Find already does this.

**Apostrophes:** these straight `'` are still visible:
- `25-logic.js:47` and `:54`: "haven't heard back";
- `zz-method.js:6`: "there's no", next to curly “talent community”;
- `20-data.js:127`: "you're looking for";
- `00-core.js:307, 334, 335`;
- `zz-pool.js:81, 144`.

Change them to `’`.

**Pipeline colours:** the Interviews stage dot shares `--wait` amber with "Silent". Shift `.dot.interview` to the violet or teal family, so that amber only means "needs attention".

---

## 3. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Today and Insights after a CSV import | "First reply 0 days, median of 4 replies". The import preview adds `stage` events at `appliedAt`, which defeats the guard at `25-logic.js:82`. | Fix 1. |
| 2 | Table, mobile table, app drawer | Amber Days silent "8" and "Last reply 9 days ago" on an app with a technical round tomorrow. The table says 8 days and the drawer says 9. | Fix 2. |
| 3 | Settings › Locations | Still one column. The REVIEW5 fix (`max-width: none`) did not address the shrink-wrap: the element measures 288px inside a 510px cell. | Fix 6. |
| 4 | Mobile quick add and CSV preview | Toasts render above bottom sheets and cover the first option or the last row. | Fix 8. |
| 5 | Mobile "+" | `aria-label="Add application"` opens a chooser, not the add form. | Fix 3. |
| 6 | Company drawer | `.fit.hi` is still applied inside a company list (2 of 7 identical scores). | Fix 7. |
| 7 | Copy | 12+ straight apostrophes remain in visible strings, including the Today follow-up task and the method modal. | Fix 8. |
| 8 | Find copy | The same state is called "strong ghost signals" (1440, 768, filters), "likely stale" (375), and "likely stale or not actively hiring" (tooltip). | Fix 5. |

---

## 4. Regressions vs REVIEW5

1. **"First reply 0 days" after import.** This is new with the CSV preview, and it contradicts the v9 changelog claim. It is the only true regression, and it is a data-trust bug on the two most-read numbers in the app.
2. **Find vocabulary split.** The new phone count bar introduced "likely stale" and "Your preferences / Show / Hide". Desktop says "strong ghost signals" and "Show them".
3. **Mobile "+" semantics.** The quick-add chooser is good UX, but the button's accessible name and the bare "Add" sheet title were not updated with it.

Nothing visual regressed. The separator, Fit, outcome and drawer fixes all hold at every width and in both themes.

---

## 5. Do not touch

- **The CSV preview's provenance line,** "Applied Oct 12, 2026 · Sheet says “Interviewing”". It teaches the mapping without a help page.
- **The stage-aware task copy:**
  - "What's next with Zillow? Interviewing, nothing scheduled yet. Add the next round's date."
  - Fix only the apostrophes.
- **The ghost job drawer:** a red glyph with a plain label, a bulleted why, a self-explaining score sentence, and a plain Fit value.
- **The phone Find bar:** 44px targets and two deliberate lines.
- **The Companies table, the app drawer, the mock interview, and the method modal.** All of these are unchanged and still world-class.

Fixes 1–2 are correctness work (about 30 minutes) and protect trust. Fixes 3–6 are about an hour of CSS and copy, and should land this at ~9.3. Fixes 7–8 close out the "one rule, one context" debt.
