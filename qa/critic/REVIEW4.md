# Heardback: principal design review (v6, final polish)

Reviewed 2026-11-03 against `dist/index.html` freshly built with `tools/build.py`.

**Captures** are in `qa/out-critic4/` (first run in `qa/out-critic4/fresh/`, 2x crops in `qa/out-critic4/zoom/`):
- 1440 light and dark, every route;
- 768 light, every route;
- 375 light and dark, every route;
- first run at 1440 light and dark and at 375 (onboarding steps 1 to 3);
- overlays:
  - job drawer, ghost drawer and Ask Claude (light and dark);
  - company drawer;
  - app drawer (light and dark), draft modal, paste, add;
  - board and table bulk selection, Closed expanded;
  - mobile drawer and mobile table;
  - snooze menu;
  - Practice and mock interview: start, turn (light and dark), scorecard;
  - share modal (light and dark);
  - method modal;
  - palette context actions (light and dark);
  - Find filter sheet at 375.

The harness reported no console errors and no horizontal overflow.

**Overall: 8.6 / 10** (v2 6.3 · v3 7.4 · v5 8.1)

REVIEW3's list is mostly closed:
- the palette now dims the drawer;
- the company drawer sorts by best fit;
- Prep at 768 has its icon actions back;
- the Find mobile search and sort row is fixed;
- the mobile table checkboxes are centred;
- the method legend and footnote use the same labels;
- the Prep subtitle uses "·".

The product now reads calm and coherent at rest, and the new surfaces (mock scorecard, filter sheet, bulk bar) are on-system.

The gap to 9.5 is no longer structural. It is about thirty small signals that a Linear or Things reviewer reads as "assembled, not authored":
- a blue Fit pill and a green age on every single row;
- two-letter monograms like "TI", "TE" and "H&";
- separators orphaned at line ends;
- straight and curly quotes mixed in the same modal;
- three different value columns inside one drawer;
- solid 26px dashboard bars;
- in dark mode, overlays with no lift over the page.

There is also one real CSS bug, on the mobile table stage control, and one data-formatting bug in initials.

---

## 1. Scores (1–10)

| Surface | Prof. | Clarity | Hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 9 | 9 | 8 | 8 | Calm and well ordered. Problems: "New for you" puts age **before** Fit, the reverse of Find. The "This week" card is a bare sentence ("No applications yet. Your goal is 10."), while the rail on every other page shows a meter ("0 / 10 applied"), so the same goal has two treatments. The rail badges "Today 5" and "Pipeline 5" mean different things. |
| Find | 8 | 9 | 8 | 8 | Dense and well aligned. Problems: `.fit.hi` is blue on 100% of default rows (scores 88–96), and "New · Nh ago" is green on every row, so neither carries signal. Raw " - " hyphens in titles sit next to "–" en dashes ("Software Engineer 2 – Early Career"). The header wraps with an orphan "·" at 768. |
| Job drawer | 8 | 9 | 8 | 7 | Three value columns: `.kv` values at 136px, the `.find-fit-list` reason at 100px, and the company stats grid at 0. "Typical time open" shows "Not enough data" in small faint text beside "87" and "11%" at stat size, so baselines jump. "Summer 2027 hiring:" reads as a label-colon pair, inconsistent with every other kv. |
| Companies | 9 | 9 | 9 | 8 | Still the strongest table. Monograms "TI", "TE", "RT", "AP" read as abbreviations of other companies (TI = Texas Instruments). At 375 the meta wraps with an orphan "·" ("~46 days ·"). |
| Company drawer | 8 | 8 | 8 | 8 | Best-fit sort is right. Now every row is "Fit 96" in blue (zero information), and the bare amber `.gbars` glyph has no label. |
| Pipeline board | 9 | 9 | 8 | 8 | Good. Problems: the "H&" monogram for Harbor & Finch (a bug). Widows ("Frontend Engineer, New / Grad"). "Silent 10d" and "Silent 25d" use different icons (clock vs ghost) for the same label. |
| Bulk selection | 8 | 9 | 8 | 8 | Fixed: `.pl-card.sel` is now a soft fill. The focused selected card still stacks border, focus ring and fill (three signals). |
| App drawer | 9 | 9 | 9 | 8 | The best drawer. "Add link" and "Add salary" are text-2, but placeholders and values should differ more. "View rounds" is styled as body text, not a link. |
| Table at 375 | 7 | 8 | 7 | 7 | **Bug:** on hover or focus, the stage control's caret gradient smears over the centred dot (see §3). |
| Prep | 9 | 9 | 9 | 9 | Mock turn and scorecard are clean. The 2px progress bar reads as a lone tab underline under "Mock interview", because its track is invisible. |
| Insights | 8 | 9 | 8 | 8 | The "Include examples" toggle sits 7px off-centre from "Share progress". Bars are template-heavy: funnel `.funnel-bar` is 26px of solid accent, and the weekly bars are full-saturation accent. In dark mode the funnel track is invisible. |
| Settings | 9 | 9 | 8 | 9 | Fine. The Privacy card is a wall of five sentences; split it into two short paragraphs with a bolded lead. |
| Onboarding | 8 | 9 | 8 | 8 | At 1440×900 the sticky-footer fade covers the Remote and Visa switches, which look disabled. In the location list, counts end at 360px inside a 600px card, leaving a large dead gutter. At 375, `.onb-value` has a widow ("every / reply."). |
| Dark mode | 8 | – | 7 | 8 | Tokens are good. But `.drawer`, `.modal` and `.palette` use the same `--surface` as page cards (#14171c), so overlays have no lift. The funnel and progress tracks disappear. |
| Mobile (375) | 9 | 9 | 8 | 8 | Good ergonomics: bottom nav, filter sheet with "Show 1,816 matches", sticky drawer footer. The topbar "+" is a 42×32 filled accent block that out-shouts the page title. |

---

## 2. Top 10 fixes, ranked

### 1. Make Fit and freshness carry signal again
**Files:** `styles.css:389–390`, `find.js:159`, `today.js:231`, `onboarding.js:246`

**Problem:**
- `find_fitHi = score >= 85`. With preferences on, every visible row qualifies, so the accent pill becomes wallpaper.
- The green age repeats on every row.
- Today orders the two items Fresh then Fit; Find orders them Fit then Fresh.

**Fix:**
```css
.fit { background: transparent; padding: 2px 0; min-width: 0; color: var(--fg-2); }   /* plain tabular text */
.fit.hi { background: var(--accent-soft); color: var(--accent-text); padding: 2px 7px; } /* only top tier */
.fresh { color: var(--fg-3); }            /* age is metadata */
.fresh.new::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--ok); display: inline-block; margin-right: 6px; vertical-align: 1px; }
```
- Set `find_fitHi = (s) => s >= 95` (or the top 10% of the current result set), and reuse `find_fitHi` in `today.js` and `onboarding.js` instead of the duplicated `>= 85`.
- Render `.job-side` in one order everywhere: **age · Fit · bookmark**.

### 2. Monograms: fix the "&" bug and stop the two-letter abbreviations
**Files:** `00-core.js:339`, `styles.css:254`

**Problem:**
- "Harbor & Finch" renders "H&".
- One-word names render "TI", "TE", "RT", "AP" and "ON", which read like tickers or other companies.

**Fix:**
```js
function initials(name = "") {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((x) => /^[A-Za-z0-9]/.test(x));
  if (!w.length) return "·";
  return (w.length === 1 ? w[0][0] : w[0][0] + w[1][0]).toUpperCase();
}
```
- Set `.logo` to `font-size: 12px; font-weight: 600; color: var(--fg-2);` so a single letter does not look oversized.
- Keep `.logo.lg` at 17px.

### 3. Mobile table stage control: caret smears over the dot (bug)
**File:** `pipeline.css:350` vs `:427`

**Problem:** `tr:hover .pl-stage-sel .select` (specificity 0,3,1) beats the 520px rule `.pl-stage-sel .select { background-size: 0 0 }`. On hover or focus, the 5px caret paints over the centred `.dot`.

**Fix:** add inside `@media (max-width: 520px)`:
```css
tr:hover .pl-stage-sel .select, .pl-stage-sel .select:focus { background-size: 0 0; border-color: transparent; }
.pl-stage-sel .select:focus-visible { box-shadow: var(--focus); }
```

### 4. Kill orphan separators and widows
**Files:** `styles.css`, `find.css`, `pipeline.css`, `prep.css`

**Problem:**
- Trailing "·" at line ends: the Find header at 768 and 375, and Companies meta at 375.
- Widows: `.pl-card-title` ("New / Grad"), `.onb-value`, and the job-drawer h2.

**Fix:**
```css
.pl-card-title, .find-row-title, .drawer-head h2, .page-head p, .onb-value, .prep-mock-turn p { text-wrap: pretty; }
.page-head h1, .modal-head h2, .onboard h1 { text-wrap: balance; }
.sep-item { white-space: nowrap; } /* wrap "· 39% reposted" as one unit: separator travels with the item after it */
```
In the JS, emit `<span class="sep-item">· ${x}</span>` instead of separate `.sep` and text nodes.

### 5. Micro-typography: quotes, dashes, ellipses
**Files:** `zz-method.js:19,28`, title display

**Problem:** the method intro and footnote use straight quotes (`"check before you invest hours"`, `"Looks active"`), while the table below uses “curly” ones.

**Fix:**
- Use curly quotes throughout: “check before you invest hours”, not “don’t apply”. Under 25 shows as “Looks active”.
- Normalise listing titles for display: `title.replace(/\s-\s/g, " – ")`, so "Intern - PAR Safety Evals" matches "Software Engineer 2 – Early Career".
- Use `’` in "you’ve", "don’t" and "haven’t" in UI copy (Today rows, Patterns).

### 6. Give dark-mode overlays depth
**File:** `styles.css:52–75`, `.drawer` `.modal` `.palette` (`:327–353`)

**Problem:** in dark mode, overlays share `--surface` with page cards and sit on a 66% black scrim, so they look cut out rather than raised.

**Fix:**
```css
/* in both dark blocks */
--surface-raised: #181b21;
.drawer, .modal, .palette { background: var(--surface-raised, var(--surface)); box-shadow: var(--shadow-pop), inset 0 1px 0 rgba(255,255,255,.04); }
.funnel-bar, .prep-mock-progress { background: var(--surface-3); }  /* tracks are invisible on #14171c today */
```
Also lighten the scrim to `rgba(0,0,0,.56)`, so the page remains legible as context.

### 7. Insights: calmer data ink, and header alignment
**Files:** `styles.css:446–447`, `today.css:134,141`

**Problem:**
- The funnel bars are 26px solid accent blocks, and the weekly bars are fully saturated. This is the most "dashboard template" moment left in the app.
- The toggle centre sits at y=130 while the button centre sits at y=123.

**Fix:**
```css
.funnel-bar { height: 8px; border-radius: 4px; }
.funnel-bar > i { border-radius: 4px; }
.funnel-row { min-height: 32px; }
.st-chart .st-bar { fill: color-mix(in srgb, var(--accent) 55%, var(--surface)); }
.st-chart .st-bar.now { fill: var(--accent); }      /* only this week at full strength */
.st-head-note { min-height: 34px; }                  /* matches .btn height, so centres line up under .page-head align-items:flex-end */
```

### 8. Job drawer: one value column, one stat baseline
**File:** `find.css:105–106`, `find.js:635,758`

**Problem:**
- `.find-fit-list li` uses `20px 72px 1fr`, while the drawer `.kv` above uses a 136px label column.
- "Not enough data" (`.find-nd`) renders at body-xs size inside a stat.

**Fix:**
- `.find-fit-list li { grid-template-columns: 20px 108px minmax(0,1fr); }`. The value then starts at 136px, like `.kv`.
- In stats, show `—` at stat size with the existing `title` tooltip, plus `<span class="sr-only">Not enough data</span>`.
- Copy for the season line: render it as a `.kv` row ("Summer 2027 · 2 of 2 postings still open"), not a "label:" pair.

### 9. Mock interview progress, and the focused selected card
**Files:** `prep.css:262`, `pipeline.css:374`

**Problem:**
- The 20%-wide accent sliver under the "Mock interview" heading reads as a single-tab underline.
- On a selected card, focus adds a ring on top of the accent border and the fill.

**Fix:**
```css
.prep-mock-progress { height: 3px; background: var(--surface-3); }
.pl-card.sel:focus-visible { border-color: var(--line); box-shadow: var(--focus); }  /* fill + ring, no tinted border */
```
Alternatively, drop the progress bar and render 5 segment ticks next to "Question 2 of 5", in the same style as the scorecard's `4/5` meter. That unifies the two.

### 10. Small consistency and copy pass
**Today "This week"** (`today.css:65`): reuse the rail's `.goal-card` meter (bar plus "0 / 10 applied" plus "10 more to hit your goal"). Then hide the rail goal on Today (already done) and the two treatments become one.

**Rail badges:** make the Today count the badge, and show Pipeline's active count as `--fg-3` text, not a badge. Or drop the Pipeline count. Two identical "5" badges with different meanings look generated.

**`.pl-status`:**
- Use one icon for "Silent Nd" (the clock).
- Reserve the ghost icon for "Ghosted" or for the "Mark as ghosted?" prompt.

**Pipeline table at 375:** "Mark as ghosted? · 25d silent". Use the Today wording instead: "No reply in 25 days".

**App drawer:**
- `.kv` placeholders ("Add link", "Add salary") use `color: var(--fg-3)`, so they read as affordances, not data.
- "View rounds" uses `color: var(--accent-text)`.

**Company drawer roles:** next to `.gbars`, add the label text at ≥768 ("Some signals"), as the Find rows do. A bare amber glyph is cryptic.

**Onboarding:**
- Give `.onb-foot::before` a height of 16px, not 32px. At 1440×900 it currently washes out the Remote and Visa switches.
- Lay out the location list as `grid-template-columns: repeat(2, minmax(0,1fr)); column-gap: 32px` at ≥600px, so counts are not stranded mid-card.

**Mobile topbar "+":** make it `.btn.icon.primary` at 36×36, `border-radius: var(--r-md)`. It is currently 42×32 and dominates the title.

**Settings › Privacy:** use two paragraphs.
1. **"Stored only in this browser."** Nothing is shared unless you turn on anonymous reply data.
2. **"Claude runs on your account,"** only when you click.

---

## 3. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | All monograms | `initials()` keeps "&", so "Harbor & Finch" shows "H&" on the board, table, drawer and Prep. | Fix 2. |
| 2 | Pipeline table at ≤520, hover or focus | The caret background paints over the centred stage dot (cascade: `pipeline.css:350` beats `:427`). | Fix 3. |
| 3 | Find header at 768 and 375, Companies meta at 375 | The "·" separator wraps to line end, orphaned. | Fix 4. |
| 4 | Method modal | Mixed straight and curly quotes. The legend percentages sum to 101% (59 + 32 + 10). | Fix 5. Use largest-remainder rounding for the legend. |
| 5 | Insights header | The toggle and button are 7px off-centre. | Fix 7. |
| 6 | QA harness | `ACTIONS=qa/actions-find.js W=1440 … find:mobileFilters` times out, because `.find-fbtn` is hidden above 760px. Chaining `today:onbStep1 onbStep2 onbStep3` in one run fails on step 3, because Software is already toggled. | Guard on viewport. Reset onboarding state at the start of each `onb*` action. |

---

## 4. What is already 9.5-level (do not touch)

- The Companies table: alignment, tabular numerals, and info-icon headers.
- The app drawer's stepper, next-step card and sticky footer.
- The mock scorecard: score meter, What worked / Work on, and the "A stronger answer to" block.
- The Find filter sheet at 375, with the "Show 1,816 matches" CTA.
- The palette's context group ("Lumen Robotics · …"), with grouped "Go to" and kbd hints.
- The copy voice in empty states ("Your card only counts applications you've added yourself. Example data is never included.").

Shipping fixes 1–5 alone should move this to roughly 9.1. Fixes 6–10 are what make it read as authored at 9.5.
