# Heardback: principal design review 10 (v14, launch day)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `python3 tools/build.py`. The clock was frozen at Tue Nov 3, 8:30 AM PT. No source was edited.

**State:**
- `s-*`: the power user from `qa/ux3/seed.js`. This is the **raw** seed, so Point72's HackerRank round has `type: "other"`, which is the case v14 claims to fix.
- `e-*`: `SETUP=examples`.
- `f-*`: `SETUP=fresh`. Onboarding steps 1–3 and the "Just browse jobs" path. The 375 runs use `isMobile`, touch and DPR 2.

**Captures:** about 330 PNGs in `qa/out-critic10/<set>-<width>-<theme>/`.
- Every route at 1440, 768 and 375, in light and dark. Routes at 1440 and 375 also have scrolled frames.
- Drawers: Point72 (overview and rounds), Netflix, Snowflake, Scale AI, Figma and Intel, plus Find job drawers (top and ghost) and the TikTok company drawer.
- Overlays: palette (empty and "netf"), shortcuts, method sheet, Add, Log an email, share card, follow-up and thank-you drafts, and the phone More sheet.
- Driver: a scratch copy of `qa/shot.js`/`qa/ux3/h.js` that adds a doctype and viewport wrapper.

**Zero console errors and zero page-level horizontal overflow on all 15 runs.**

## Overall: 9.1 / 10 (flat; ship, after Fix 1)

History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9, v10 9.0, v11 8.8, v12 8.9, v13 9.1.

v14 fixed most of review 9's list:
- Today's sentences now read "How did the Two Sigma technical interview go?"
- The Netflix second follow-up reads "check in once more".
- The onboarding footer fits at 375 (Back / Skip this step / Continue sits inside the 16px gutter).
- Intel shows "Review", not "Apply".

But the **"Other" leak only moved**. The Point72 application drawer's Next step card now reads **"Other in 14h · Tue, Nov 3 · 11:00 PM · with HackerRank"**. The CHANGELOG claims "never 'Other with…'", so this is the one thing a careful LinkedIn visitor clicking through the sample could screenshot. Two of review 9's Fix 6 items did not land: the rail goal card for browse-only users, and Companies' "~2 days" / "Not enough data".

| Area | Score | Notes |
|---|---|---|
| Visual craft | 9.3 | Quiet and consistent in both themes. Dark board, drawers and share card are clean. The Interviews dot is still the same amber as "Outcome?", "Silent 10d" and "Posting taken down" on the same board. |
| First run | 9.2 | Step 1 pitch and the "Free. Your data stays in this browser." promise are right. The step 2 footer is fixed. Step 3 is honest ("3,163 of these 7,600 show ghost-job signals"). Browse-only users still get "This week 0 / 10 applied · 10 more to hit your goal" in the rail (f-1440 `06-browse-find`). |
| Today | 9.1 | The subtitle is still the best line in the app. Two copy seams: "Your **onsite / final** was 2 days ago" (Scale AI), and "your recruiter call with Maya Chen **(Recruiter)**" (Hex). |
| Pipeline | 8.9 | Board, table and drawers are solid. **The drawer prints "Other in 14h … with HackerRank"** (Bug 1). |
| Find / Companies | 9.0 | Degree-aware fit holds: Meta PhD role reads "Fit 35 · ✕ Degree · Asks for a PhD". Companies still has RTX "~2 days" at 7% still hiring, NVIDIA "~2 days", HPE "~1 day", and "Not enough data" (ByteDance, Meta) vs "—" in the drawer. |
| Copy | 8.9 | The second follow-up's subject still says "Checking in on my…", the same as the first. Job drawer says "Posted today" where the list says "1h ago". "Degree by graduation". |
| Responsive / dark | 9.3 | 768 (Today: one primary per row) and 375 (board peek, share sheet, drawers) all hold. No contrast holes in dark. |
| Overlays | 9.3 | The share card and caption are LinkedIn-ready ("6 weeks into internship recruiting: 40 applications, 19 replies, 11 interviews and 2 offers so far."). The palette, method sheet and Log an email are calm. |

---

## Would embarrass you on launch day

1. **"Other in 14h"** in the application drawer's Next step card, and "Point72 · Other" in Today › Upcoming and Prep. This is the bug v14 announced as fixed, and it shows on a real-looking round. Fix 1.
2. **A goal the visitor never set.** A cold LinkedIn visitor who taps "Just browse jobs" sees "0 / 10 applied · 10 more to hit your goal" in the rail on Find. That is the first screen they see. Fix 2.

Nothing else is launch-blocking: no errors, no overflow, no broken layouts.

---

## Top 6 polish fixes (all safe in 45 minutes total)

### Fix 1: Round labels in sentences, everywhere (10 min, must do)

Use the existing helpers, `roundTitle(r)` and `roundNoun(r)` in `src/js/00-core.js:96–98`. Do not use `ROUND[r.type].label` anywhere a round appears in a sentence.

- **`src/js/views/pipeline.js:97`:**
  ```js
  const label = (r) => roundTitle(r);
  ```
  - The card then reads "Interview in 14h", "Technical interview in 6h", "Final round in 2d".
  - Line 106's thank-you sub becomes "Your final round was 2 days ago".
- **`src/js/views/pipeline.js:103`:** match Today, so a platform is not a person:
  ```js
  sub: `${fmt.dateTime(up.at)}${up.interviewers ? (["assessment","other"].includes(up.type) ? " · " : " · with ") + up.interviewers : ""}`
  ```
- **`src/js/views/today.js:117`** (`const rl = …`):
  ```js
  const rl = tk.round && roundNoun(tk.round);
  ```
  - Scale AI then reads "Your final round was 2 days ago. A short note still helps."
- **`src/js/views/today.js:416`, `src/js/views/prep.js:187` and `src/js/views/prep.js:698`:**
  ```js
  roundTitle(r)
  ```
  - Keep `ROUND[...].label` only for the round editor's type picker and `.pl-round-name` (`pipeline.js:993`), where "Other" is a legitimate category label.

### Fix 2: The rail goal card for people with no applications (3 min, must do)

**File:** `src/js/30-shell.js:31`.
```js
${route !== "today" && profile.onboarded && Object.keys(apps).length > 0 && html`<div class="goal-card">…`}
```
Without this, the `.goal-card` scolds browse-only visitors on their first screen.

### Fix 3: Companies "Typical time open" (8 min)

**File:** `src/js/views/find.js`.

1. **Line 792.** One placeholder, gated on sample size:
   ```js
   const lifetime = (c) => (c.closedTimed >= 10 && find_daysText(c.medOpenDays)) || html`<span class="faint" aria-hidden="true">—</span><span class="sr">Not enough data</span>`;
   ```
2. **Line 848** (company drawer `find_Stat`). Apply the same `cs.closedTimed >= 10` gate.
3. **Line 804 `<th title=…>`.** Change the title to `"Median days a closed listing stayed open (companies with 10+ closed listings)"`.

This removes RTX "~2 days" at 7% still hiring and the "Not enough data" / "—" mismatch.

### Fix 4: Interviews gets its own stage colour (5 min)

**File:** `src/styles.css:251`.
```css
:root { --stage-int: #7c5cd6; }
:root[data-theme="dark"] { --stage-int: #a48cf0; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --stage-int: #a48cf0; } }
.dot.interview { background: var(--stage-int); }
```
- Also use it for the Interviews segment of the Today "Pipeline at a glance" bar.
- Then amber means "needs attention" only.

### Fix 5: Today and draft copy seams (8 min)

1. **`src/js/25-logic.js:28`** (thanks sub). Strip a role in parentheses that repeats the round:
   ```js
   (r.interviewers || "").replace(/\s*\((recruiter|hr|talent)\)/i, "")
   ```
   - Hex then reads "…your recruiter call with Maya Chen". The thank-you template already cleans names, so reuse that helper if one is exported.
2. **`src/js/25-logic.js:153`.** When `a.followedUpAt` is set, use the subject `Checking in again on my ${a.title} application`. Today the second follow-up has the same subject as the first.
3. **`src/js/views/find.js:667`** (job drawer `.find-dsub`). Use `fmt.ago(job.p)`, not "Posted today", so it matches the list ("1h ago").

### Fix 6: Onboarding copy and step-3 rows (6 min)

1. **`src/js/views/onboarding.js:225–226`.** Change "Degree by graduation" to **"Degree when you graduate"** in both the `title` and the Seg `label`. Make the same change in Settings ("Degree").
2. **Step 3 preview rows at 375** (`f-375-light/04-onb3.png`). Each row has an empty line between "Paccar · Denton, TX" and "8h ago", which leaves about 20px of dead space per row. It is likely an empty fit or ghost slot rendered while there are no skills. Render that meta line only when it has content, or collapse the row's gap:
   ```css
   .onb-match-row .meta:empty { display: none; }
   ```
   Check the actual class name in `OnbStepMatching` (`onboarding.js:111+`).

---

## Not now (post-launch)

- **Insights chart.** The first two weeks (Sep 14 and Sep 21) are empty columns before the first application. Start the x-axis at the first applied week.
- **Phone Today** is still a stack of full-width secondary buttons. Consider text-link actions for non-primary rows at ≤520.
- **Pipeline at 375.** The board's next-column peek is fine, but the Table toggle could default on phones for 40+ applications.

## What landed well (do not touch)

- Every outcome, confirm and prep sentence on Today uses `roundNoun`.
- The onboarding step 2 footer at 375 is fixed.
- The Netflix second follow-up body.
- Intel shows Review, not Apply.
- Degree-aware fit with an explicit ✕ row.
- The share card and caption.
- The methodology sheet.
- Dark mode across the board and the drawers.
