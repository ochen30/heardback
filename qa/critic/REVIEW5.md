# Heardback: principal design review 5 (v7)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `tools/build.py`.

**Captures** are in `qa/out-critic5/`. First-run shots are in `fresh/`, the share modal with real data is in `share/`, and 2x crops are in `zoom/`.
- 1440 light and dark, 768 light, 375 light and dark, for every route.
- First run at 1440 and 375, plus onboarding steps 1–3.
- Overlays:
  - job drawer, ghost job, Ask Claude;
  - company drawer (light and dark), and its filter sheet at 375;
  - app drawer (light and dark), the draft, paste and add modals;
  - board and table bulk selection, Closed expanded;
  - the mobile drawer and the mobile table;
  - the snooze menu;
  - Practice, plus mock interview start, turn (light and dark) and scorecard (1440 and 375);
  - the share modal, both empty and with real data, in light and dark;
  - the method modal;
  - palette context actions (light and dark).

No console errors and no horizontal overflow on any run.

**Overall: 8.9 / 10.** History: v2 6.3, v3 7.4, v5 8.1, v6 8.6.

REVIEW4's list is mostly closed:
- Fit is plain text and the age has a green dot;
- "H&" is gone;
- dark overlays are raised;
- the funnel and weekly bars are calm;
- the mock interview shows "Question 2 of 5" with segmented ticks;
- the onboarding locations are in two columns and the switches are no longer washed out;
- the method legend sums to 100;
- the Insights header aligns at 1440;
- the mobile stage control is clean.

What is left is mostly about **rules that were applied at one width or in one context**:
- The separator fix works at 1440, but at 375 the dots now start lines.
- The ≥95 Fit rule is right for Find, but turns the company drawer into wallpaper and highlights ghost listings.
- The location grid was fixed in onboarding but not in Settings.
- Copy is curly in one place and straight in the next.

---

## 1. Scores (1–10)

| Surface | Prof. | Clarity | Hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 9 | 9 | 9 | 8 | Calm. "New for you" meta uses wide faint "·" and "+1". Find uses a tight "·" and "+1 more". The rail badges "Today 5" and "Pipeline 5" still mean different things. |
| Find | 9 | 9 | 9 | 8 | The Fit change landed. Age dots jag on the x axis ("9h ago" vs "11h ago"), because `.find-c-fresh` is right-aligned with a leading dot. `.fit.hi` (Fit 96) is inset 7px from the plain Fit values above and below it. |
| Find at 375 | 7 | 8 | 7 | 7 | **Separators now start lines:** "· updated 10m ago", "· Using your preferences", "· Show all", "· Internship". Every result card has a 20px dead band above the age/Fit row. |
| Job drawer | 8 | 8 | 9 | 9 | One value column now. "Scored 0/100" next to "Fit 92" reads as a failing grade. A Strong-ghost listing (Salesforce, open 179 days) still shows the blue **Fit 96** pill. |
| Companies | 9 | 9 | 9 | 9 | Still the best table. The 13 saturated accent intern/new-grad bars are the loudest ink on the page. At 375, "· 39% reposted" starts a line. |
| Company drawer | 7 | 7 | 7 | 7 | **Every** role row shows a blue "Fit 96" pill, and 6 of 8 rows add an amber "Some ghost signals". Titles truncate exactly where they differ ("Software Engineer Intern – …", "Sum…", "Fall …"). |
| Pipeline board | 9 | 9 | 9 | 9 | Clean. Silent states share one icon, and the Closed rail works. |
| Table and bulk | 9 | 9 | 9 | 8 | The ghost action has 3 wordings on one screen: "Mark as ghosted?" (next step), "Mark ghosted" (bulk bar), and "Mark as ghosted" (drawer footer). |
| App drawer | 9 | 9 | 9 | 9 | The best drawer. The "View rounds" link renders as fg while hovered at 1440 (`.pl-next-card .pl-linkbtn:hover`); that is fine. |
| Prep and mock | 9 | 9 | 9 | 9 | The segmented progress and the scorecard are excellent. In Practice, the whole card is outlined in accent (`.prep-practice`), and the grey timer box looks bolted on. |
| Insights | 8 | 9 | 8 | 8 | **Outcomes percentages sum to 102%.** Legend swatches are rounded squares, while Today's and every stage marker are circles. The y axis is forced to 4 when the max is 2, so the 284px chart is half air. At 768, the subtitle sits 7px below the centre of the toggle row. |
| Share card | 7 | 8 | 8 | 8 | It defaults to "This month". On Nov 3 that renders 1 · 0 · 0 · 0 and a large accent **0%**, which is shaming rather than shareable. The graph-paper grid is the one Canva-ish texture left. |
| Settings | 8 | 9 | 8 | 8 | The Privacy card is fixed. The locations list is still one column, with counts ending at x=809 inside a 510px value column (onboarding is 2-col). |
| Onboarding | 9 | 9 | 9 | 9 | Good. In step 2, the 13 skill chips are all accent, which is a wall of blue in dark mode. Accent should mean "selected toggle", not "item exists". |
| Dark mode | 9 | – | 8 | 9 | Overlays lift and the scrims are right. The weekly bars at 55% mix go muddy navy. |
| Mobile (375) | 8 | 9 | 8 | 8 | The filter sheet, sticky drawer foot and Today cards are solid. **The topbar "+" is still a 42×32 filled accent block** (REVIEW4 #10). In dark mode it is the brightest object on the screen. |

---

## 2. Top 10 fixes, ranked by impact

### 1. Separators must never start a line (375 and 768)

**Files:** `styles.css:386, 606`, `find.css:42–44, 187–220`, `today.css`, plus the emitters in `find.js`, `stats.js` and `zz-pool.js`.

**Problem:** `.sep-item { white-space: nowrap }` makes the "·" travel with the next item, so wrapped lines now **begin** with "·". This shows up on:
- the Find header and `.find-prefs`;
- `.job-meta` ("· Internship");
- the Companies meta ("· 39% reposted");
- the Insights KPI sub ("· 0 this week").

**Fix:** use the clip-at-line-start pattern once, as a utility, and use it for every dotted meta line.

```css
.meta-list { display: flex; flex-wrap: wrap; overflow: hidden; margin-left: -14px; }
.meta-list > * { position: relative; margin-left: 14px; white-space: nowrap; }
.meta-list > * + *::before,
.meta-list > :first-child::before { content: "·"; position: absolute; left: -10px; color: var(--fg-3); }
```

The separator on the first item of every visual line falls into the clipped −14px gutter, so wrapped lines start clean.

**Markup:** emit `<span class="meta-list"><span>Meta</span><span>Menlo Park, CA +1 more</span><span>Internship</span></span>` and delete the `.sep` nodes.

**At ≤767:** split the Find subtitle into two deliberate lines:
- "7,600 open roles (8,245 postings) from 1,966 companies"
- a `--fg-3` line: "Updated 10m ago · How we score listings"

### 2. Fit highlight has to respect context and ghost level

**Files:** `find.js:165–168`, `styles.css:390–391, 594–595`, `find.css:65`.

**Problem:**
- In the company drawer, every row is ≥95, so the pill becomes wallpaper again.
- On the ghost job, a Strong-ghost listing gets the only accent element in the row. We are promoting the listing we warn against.

**Fix:**
```js
const find_fitHi = (score, job, ctx) => score >= 95 && !ctx?.inCompany && (job?.gLevel ?? 0) === 0;
```

Pass `inCompany` (already a prop on `find_Row`) and the ghost level.

**Alignment:** the plain and highlighted values should share a right edge.
```css
.fit.hi { padding: 2px 7px; margin-right: -7px; } /* text right edge matches the plain .fit values */
```

**Tech debt:** fold the override layer at `styles.css:594–606` back into `:388–391`. Two `.fit` and two `.fresh` definitions 200 lines apart is how this regressed.

### 3. Company drawer role list: show what differs

**Files:** `find.css:77, 218–219`, `find.js:879–881`.

**Problem:** the drawer is always 560px, but `.find-g-l` only hides below a 767px **viewport**. At 1440 the amber label steals about 130px, and the titles truncate at the distinguishing suffix.

**Fix:**
```css
.drawer-body { container-type: inline-size; }
@container (max-width: 620px) {
  .find-results-tight .find-g-l { display: none; }   /* glyph only; label lives in title= */
  .find-results-tight .find-row-title { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .find-results-tight .find-side { grid-template-columns: auto 56px 52px 32px; }
}
```

### 4. Copy pass: one verb, one apostrophe, honest score wording

**Problem and fix:**

1. **The ghost action** (`pipeline.js:89`, `pipeline.js` bulk bar, `25-logic.js:35`, drawer header). Use **"Mark as ghosted"** everywhere. Keep the question form only in the next-step card title: "No reply in 25 days. Mark as ghosted?". Use "Mark as rejected" to match.

2. **Apostrophes.** There are 43 straight and 46 curly in UI strings. Visible straight ones:
   - "haven't heard back" (Today, `25-logic.js`);
   - "doesn't point to specific skills" (job drawer, `find.js`);
   - "they're interested" (`pipeline.js:89`);
   - `zz-pool.js` ×4, `00-core.js` ×5, `20-data.js` ×5.

   Normalise all of them to `’`. Leave the draft email bodies straight, because those get pasted into Gmail.

3. **The ghost score** (`find.js:625`). Change "Scored 0/100 from public listing data…" to "**Ghost-signal score 0 of 100** (lower is better), from public listing data…". Beside "Fit 92", "0/100" reads as a fail.

4. **"+1" vs "+1 more".** Today and onboarding say "Menlo Park, CA +1". Find says "+1 more". Use "+1 more" everywhere, with the same tight separator (this falls out of Fix 1).

### 5. Mobile topbar "+" (carry-over from REVIEW4 #10)

**File:** `styles.css` `@media (max-width: 760px)` block (~:500).

```css
.top-actions .btn.primary { width: 36px; height: 36px; min-height: 36px; padding: 0; justify-content: center; border-radius: var(--r-md); }
```

If it still dominates, make it `background: var(--accent-soft); color: var(--accent-text); border-color: transparent;`. The page's own primary CTA should be the loudest thing on screen, not the global add.

### 6. Insights: correct percentages, one marker shape, honest chart scale

**Files:** `stats.js:7–10, 116, 192–212`, `today.css:173–178`.

**Fixes:**
- **Outcomes:** use the largest-remainder rounding the method legend already uses. 63 + 13 + 13 + 13 = 102% today, and 99% with the share seed.
- **Marker shape:** `.st-out-sw { width: 8px; height: 8px; border-radius: 50%; }` matches `.dot` (`styles.css:247`) and Today's `.td-legend`.
- **Chart scale:** `stats_niceScale`: `if (max <= 4) return { step: 1, top: Math.max(2, max) };`. Bars then use the plot height.
- **Chart height:** when `max <= 4`, set `H = 220`.
- **Dark bars:** `.st-chart .st-bar { fill: color-mix(in srgb, var(--accent) 70%, var(--surface)); }`, because 55% goes muddy on #14171c.
- **≤767 header:** `.page-head { align-items: center; }`, so the subtitle and the toggle and button share a centre.

### 7. Share card: never lead with zeros

**File:** `zz-share.js:174–180, 231`, and `:119` for the grid.

**Problem:** the card defaults to "This month", which on the 3rd of the month renders 1 · 0 · 0 · 0 and a large accent "0%".

**Fixes:**
- **Default period:** the shortest period with ≥3 applications, falling back to `"all"`:
  ```js
  const [period, setPeriod] = useState(() => ["week", "month"].find((p) => shareStats(p).sent >= 3) || "all");
  ```
- **No replies yet:** when `replies === 0`, replace the rate block with "Waiting on first replies" in `--fg-2`. Never show an accent 0%.
- **Background:** drop the graph-paper grid. A flat `--surface` with the sparkline is more Things than Canva.

**Empty state:** at 760px wide, the share modal is a void around a 3-line message. Use `.modal` (560) when empty, not `.modal.lg`.

### 8. Accent means "selected", nothing else

**Files:**
- `styles.css:230, 527–529`: `.chip`;
- the `.onb-skill` chip markup (in `onboarding.js:85`);
- `prep.css:186`: `.prep-practice`;
- `find.css:170–171`: `.find-split-bar`, the Companies intern/new-grad bar.

**Problem:** three places use accent for things that are not a selected state:
- skill chips are all accent;
- the Practice card has a full accent outline;
- the Companies ratio bars are solid accent on every row.

**Fix:**
```css
.chip.onb-skill[aria-pressed="true"] { background: var(--surface-2); border-color: var(--line); color: var(--fg); }
.chip.onb-skill .ico { color: var(--fg-3); }
.prep-practice { border-color: var(--line); }                 /* active state is already obvious from content */
.prep-timer { background: transparent; border: 0; padding-top: 0; }  /* timer is a sidebar, not a second card */
/* Companies intern/new-grad mini bar (find.css:170–171) */
.find-split-bar { background: var(--surface-3); } .find-split-bar i { background: var(--fg-3); }
```

### 9. Find row rhythm (1440 and 375)

**Files:** `find.css:62–66, 77, 187–220`.

**1440 fix:** pin the age dot, so dots align in a column:
```css
.find-c-fresh { justify-content: flex-start; }
.find-side { grid-template-columns: auto 68px 60px 36px; }
```

**375 fix:** pull age · Fit onto the meta line's baseline row, so cards lose the 20px dead band:
```css
@media (max-width: 520px) {
  .find-side { margin-top: 2px; }
  .find-row { row-gap: 2px; padding-block: 12px; }
}
```
That gives 4 results per screen instead of 3.

### 10. Settings: finish the location grid, plus small leftovers

**Settings locations** (`prep.css:253–255`): the checklist renders single-column inside `.pf-row`. Remove the width cap so `.onb-opts` resolves to two columns, as in onboarding:
```css
.pf-row .onb-locs { max-width: none; width: 100%; }
```

**Rail badges** (`30-shell.js:28`): keep the Today count as the badge and render Pipeline's count as plain `--fg-3` text. Better still, drop it. Two identical "5" pills with different meanings still look generated (carry-over).

**Job drawer section label:** the company section heading is the bare company name. For Meta it reads "**Meta**", like a metadata section. Use "About Meta", or the logo plus the name.

**Mobile table stage** (`pipeline.css` ≤520): the stage is a colour-only dot. Make sure it has a `title` and an `aria-label`, and add a 2-letter text fallback at ≥360px, or put the stage name before the next step: "Applied · Wait for a reply".

---

## 3. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Insights › Outcomes | Percentages sum to 102% (5/8 = 62.5 → 63; 1/8 = 12.5 → 13, three times). | Largest-remainder rounding (Fix 6). |
| 2 | Find, Companies, Insights at 375 and 768 | "·" begins wrapped lines. This regressed from the `.sep-item` nowrap fix. | Fix 1. |
| 3 | Find › ghost job and company drawer | `.fit.hi` is applied to Strong-ghost listings and to every row in a company. | Fix 2. |
| 4 | Company drawer at 1440 | `.find-g-l` hides on a viewport query, but the drawer is a fixed 560px, so titles truncate at the differentiator. | Container query (Fix 3). |
| 5 | Copy | Mixed `'` and `’` (43 vs 46). The ghost action has 3 wordings. | Fix 4. |
| 6 | Share card | The default "This month" period shows 0% in accent early in a month. | Fix 7. |
| 7 | QA harness | Chaining `prep:mockEnd prep:prepPractice` in one run times out at `shot.js:54`. Run `prepPractice` alone. | Reset the mock state in `prepPractice`, the way `resetMock` does for the mock actions. |
| 8 | CSS architecture | `.fit` and `.fresh` are defined twice (`styles.css:388–391` and `:594–597`), and `.chip` twice (`:224–230` and `:527–529`). | Fold the overrides into the originals before the next pass. |

Not a bug: the palette over the drawer does dim it. Sampled pixels are drawer #fff → #b3b4b6 with the palette open.

---

## 4. What already feels world-class (do not touch)

- **The mock interview:**
  - the segmented "Question 2 of 5" ticks;
  - the calm composer with the `Ctrl Enter` chips;
  - the scorecard ("4/5 Strong", What worked / Work on, "A stronger answer to").
- **The app drawer:** the stepper, the next-step card, the 136px kv column, and the sticky footer with a single primary.
- **The Companies table:** tabular numerals, info-icon headers, and colour used only on outliers (39%, 57%).
- **The method modal:**
  - the stacked points;
  - curly quotes;
  - a legend that sums to 100;
  - the honest "Limits we know about".
- **The Pipeline table and bulk bar:**
  - the soft selected fill;
  - "Next step" as a sentence;
  - urgency carried only by amber text and "Days silent".
- **The Today snooze menu**, with real weekday hints ("Wed / Fri / Tue").
- **Dark-mode overlay lift and scrim balance.** The drawer, modal and palette all read as raised.
- **The empty-state and privacy voice:**
  - "Your card only counts applications you’ve added yourself. Example data is never included."
  - "Stored only in this browser."

Fixes 1–4 are about 30 minutes of CSS and copy, and should move this to ~9.2. Fixes 5–10 remove the last places where one rule was applied in one context only, which is the remaining "assembled, not authored" signal.
