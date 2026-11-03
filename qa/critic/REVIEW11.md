# Heardback: principal design review 11 (v15, pre-launch)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `python3 tools/build.py`. The clock was frozen at Tue Nov 3, 8:30 AM PT. No source was edited.

**State:**
- `s-*`: the power user from `qa/ux3/seed.js`, re-seeded against v15. This is the raw seed, so Point72's HackerRank round is still `type: "other"`.
- `e-*`: `SETUP=examples`.
- `f-*`: `SETUP=fresh`. Onboarding steps 1–3 and "Just browse jobs" (Find, Today, Pipeline, Insights).

**Captures:** 341 PNGs in `qa/out-critic11/<set>-<1440|375>-<light|dark>/`.
- Every route, with scrolled frames.
- Drawers: Point72 (overview and rounds), Netflix, Snowflake, Hex, Scale AI, Figma and Intel, plus job, ghost-job and TikTok company drawers.
- Overlays: palette (empty and "netf"), shortcuts, method sheet, Add, Log an email, share card, follow-up and thank-you drafts, and the phone Today task menu.
- DOM text probes for the review 10 items: `qa/out-critic11/probe-*`.

**Zero console errors and zero horizontal overflow on all 12 runs.**

Harness notes (not app bugs):
- The `*-today-s1`, `*-prefs-s1` and phone `find-s1/s2` frames are blank because of the harness. `window.scrollTo` moves the root even though `body{overflow:hidden}`. Real wheel, keyboard and touch scrolling only move `.workspace` (checked: `scrollY` stays 0).
- The phone "more-sheet" frame actually shows the Today task menu.

## Overall: 9.2 / 10 (up 0.1; ship)

History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9, v10 9.0, v11 8.8, v12 8.9, v13 9.1, v14 9.1.

Both launch blockers from review 10 are gone. The Point72 drawer now reads "Interview in 14h · Tue, Nov 3 · 11:00 PM · with HackerRank", and a browse-only visitor's first screen (Find) has no goal card. What remains is a handful of copy seams and one colour that slipped through. None of it is embarrassing on its own, and all of it fits in 30 minutes.

| Area | Score | Notes |
|---|---|---|
| Visual craft | 9.4 | Calm in both themes. Interviews is violet on the board, the drawer stepper and the legend dots. **But the "Pipeline at a glance" bar still paints Interviews amber** (`--wait`), right beside the violet legend dot (Today, `s`/`e` 1440, both themes). |
| First run | 9.2 | Step 1 pitch and the step 3 honesty ("3,163 of these 7,600 show ghost-job signals") hold. The rail goal card is gone for browse-only users. The browse-only **Today** aside still shows "0 / 10 applied · 10 more to hit your goal". The step 3 rows at 375 still have about 12px of dead space above "8h ago". |
| Today | 9.1 | No more "(Recruiter)": it reads "your recruiter call with Maya Chen". "Interview with Point72 in 14h · HackerRank". The Scale AI row still reads **"Your onsite / final was 2 days ago."** |
| Pipeline | 9.2 | "Other" is gone. The Scale AI drawer reads "Your onsite / final was **1d** ago. A short note **within 24 hours** helps." That is a raw label, it disagrees with Today ("2 days ago"), and the advice contradicts itself. |
| Find / Companies | 9.1 | The thin-sample gate landed: medians need 10+ timed closures, so ByteDance and Meta drop out. RTX "~2 days" is now honest (220 timed closures, 57% reposted). The table says "Not enough data" while the drawer says "—". The job drawer says "Posted today" where the list says "14h ago". |
| Copy | 8.9 | The second follow-up body is good, but its subject is still "Checking in on my… application", the same as the first. Onboarding still says "Degree by graduation". |
| Responsive / dark | 9.3 | 375 board peek, drawers, sticky footers, task menu (44px rows) and dark contrast all hold. |
| Overlays | 9.4 | The share card (dark) and caption are LinkedIn-ready. The palette groups applications, jobs and companies cleanly. The method sheet is calm. |

---

## Review 10 items: verified?

| # | Item | Verified | Evidence |
|---|---|---|---|
| 1 | No "Other in 14h … with HackerRank" | **Yes** | Drawer: "Interview in 14h". Today: "Interview with Point72 in 14h · HackerRank". Prep list: "Point72 · Interview". The DOM probe finds no "Other" anywhere. "with HackerRank" remains only because the seed types it as a generic round with HackerRank as the interviewer. A real assessment round drops "with". |
| 2 | No goal card for browse-only visitors | **Yes (rail), No (Today)** | `f-*/06-browse-find`: rail clean. `f-1440-*/07-browse-today`: the aside still shows "0 / 10 applied · 10 more to hit your goal". |
| 3 | Thin-sample company stats | **Yes** (with a nit) | `20-data.js:33` hides medians under 10 timed closures. The table/drawer placeholder mismatch remains ("Not enough data" vs "—"). |
| 4 | Interviews violet | **Partly** | `.dot.interview`, `.badge.int` and board headers are violet. `TODAY_STAGE_COLOR.interview` is still `var(--wait)`, so the glance bar is amber. |
| 5 | Interviewer "(Recruiter)" tags stripped | **Yes** | "your recruiter call with Maya Chen" (`roundPeople`). |
| 6 | Round labels in sentences everywhere (`roundTitle`/`roundNoun`) | **No** (2 sites) | `today.js:117` and `pipeline.js:97` still use `ROUND[type].label`, which gives "onsite / final" and "Onsite / Final in 2d". |
| 7 | Second follow-up subject, "Posted today", "Degree by graduation", step 3 row gap | **No** | All four are unchanged. |

---

## Would embarrass you on launch day

Nothing blocks launch: no errors, no overflow, no broken layouts, and no raw "Other".

The two most likely screenshots:
1. **"Your onsite / final was 1d ago. A short note within 24 hours helps."** in the Scale AI drawer. Today says "2 days ago" for the same round, and the sentence contradicts itself. Fix 1.
2. **An amber Interviews bar next to a violet Interviews dot** on Today's first card in the right column. This is the change v15 announced. Fix 2.

---

## Top 5 fixes (all safe in 30 minutes total)

### Fix 1: Last two raw round labels, and one honest thank-you line (8 min)

- **`src/js/views/today.js:117`:**
  ```js
  const rl = tk.round && roundTitle(tk.round);
  ```
  - Line 118 (outcome sub) then reads "Technical interview · Fri, Oct 30 (4 days ago)".
  - Line 119 reads "Your final round was 2 days ago. A short note still helps."
- **`src/js/views/pipeline.js:97`:**
  ```js
  const label = (r) => roundTitle(r);
  ```
  - The card then reads "Final round in 2d" and "Technical interview in 6h".
- **`src/js/views/pipeline.js:106`.** Match Today's day count and drop the self-contradiction:
  ```js
  sub: `Your ${label(past).toLowerCase()} was ${today_daysAgo(past.at)}. ${t - past.at < DAY ? "A short note within 24 hours helps." : "A short note still helps."}`
  ```
  `today_daysAgo` (`today.js:123`) is a global function declaration in the concatenated bundle, so the call is safe.
- Keep `ROUND[...].label` only in the round editor's type picker, `.pl-round-name` and the Prep list's category line.

### Fix 2: Interviews violet in the glance bar (1 min)

**File:** `src/js/views/today.js:575`.
```js
const TODAY_STAGE_COLOR = { saved: "var(--fg-3)", applied: "var(--accent)", screen: "var(--info)", interview: "var(--int)", offer: "var(--ok)", rejected: "var(--bad)", ghosted: "var(--ghost)" };
```
Then amber means only "needs attention" (Outcome?, Silent 10d, Posting taken down).

### Fix 3: No goal nag on Today for people who haven't applied (5 min)

**File:** `src/js/views/today.js:562` (`.td-week-goal .goal-top`). When there are no real applications, state the goal instead of the shortfall:
```js
<span class="hint">${!apps.some((a) => !a.example && a.stage !== "saved") ? `Goal: ${goal} a week` : thisWeek >= goal ? "Goal reached." : `${left} more to hit your goal`}</span>
```
- Also hide the `Meter` under the same condition: `${hasReal && html`<${Meter} …/>`}`.
- The aside stays populated, so the 1440 layout keeps its right column, but a cold visitor isn't told they're behind.

### Fix 4: Draft and listing copy (6 min)

1. **`src/js/25-logic.js:153`** (second follow-up):
   ```js
   `Subject: Checking in again on my ${a.title || "role"} application`
   ```
2. **`src/js/views/find.js:667`** (`.find-dsub`). Use the list's relative time, so the drawer matches the "14h ago" row:
   ```js
   html`<span class="muted" title=${fmt.dateY(job.p)}>Posted ${fmt.ago(job.p)}</span>`
   ```
3. **`src/js/views/find.js:792`.** Use the drawer's placeholder:
   ```js
   const lifetime = (c) => find_daysText(c.medOpenDays) || html`<span class="faint" aria-hidden="true">—</span><span class="sr">Not enough data</span>`;
   ```
4. **`src/js/views/onboarding.js:225–226`.** Change "Degree by graduation" to **"Degree when you graduate"** in both the `title` and the Seg `label`.

### Fix 5: Phone job rows: close the gap above the time (2 min)

**File:** `src/styles.css`, inside `@media (max-width: 520px)` (line 514). Today `.job-row` inherits `gap: 12px`, so the wrapped `.job-side` sits 12px under the meta line. That affects onboarding step 3 (`.onb-job`), Find and Today rows on phones.
```css
.job-row { grid-template-columns: 32px minmax(0, 1fr); row-gap: 4px; }
```

---

## Not now (post-launch)

- **Insights "Applications per week".** It still opens with two empty weeks (Sep 14 and Sep 21). Start at the first applied week.
- **Pipeline table "Next step" for Intel says "Apply".** Today and the card say "Review" for strong-ghost saves. Use the same rule in `plNext`.
- **The thank-you draft for a round that hasn't happened yet** (palette or keyboard path) says "Thank you for taking the time to talk with me". Gate the thanks draft on a past round.
- **Phone Today** is still a stack of full-width secondary buttons. Consider text-link actions for non-primary rows at ≤520.

## What landed well (do not touch)

- The generic round type is "Interview".
- `roundPeople()` strips "(Recruiter)" and never says "with" for assessments.
- The thin-sample gate in the data layer, so the board, table, drawer and row meta all agree.
- The violet `--int` token in both themes.
- No rail goal card for browse-only users.
- The share card and caption.
- The degree-aware fit ("✕ Degree · Asks for a PhD").
- The Today task menu on phones.
- Dark mode throughout.
