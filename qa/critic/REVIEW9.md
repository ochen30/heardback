# Heardback: principal design review 9 (v13, final pre-launch)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `tools/build.py`. No source was edited.

**State:**
- `s-*`: the power user from `qa/ux3/seed.js` (42 applications).
  - In the main captures, Point72's HackerRank round is set to `type: "assessment"`, as in review 8.
  - The DOM probes also ran the raw seed, where that round is `type: "other"`. This exposed Bug 1.
- `e-*`: `SETUP=examples`.
- `f-*`: `SETUP=fresh`. The 375 runs use `isMobile` and `hasTouch` at DPR 2, and include onboarding steps 1–3 and the "Just browse jobs" path.

**Captures:** 294, in `qa/out-critic9/<set>-<width>-<theme>/`.
- Every route at 1440 (light and dark), 768 (light) and 375 (light and dark).
- Drawers: Figma, Ramp, Point72, Scale AI, Snowflake and Hex, plus a Find job drawer and a company drawer.
- Overlays: palette, shortcuts, method sheet, Add, Log an email, the follow-up draft and the share card.

The runs used a scratch copy of `qa/shot.js` with `isMobile` and an optional document wrapper (see the note under Bugs). **Zero console errors and zero page-level horizontal overflow on every run.**

**Overall: 9.1 / 10** (up from 8.9). History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9, v10 9.0, v11 8.8, v12 8.9.

Review 8's ship conditions all landed:

| Review 8 fix | Result in v13 |
|---|---|
| Fit is degree-aware | Meta's PhD-only "Research Scientist Intern" now reads **Fit 35** with "✕ Degree · Asks for a PhD". The drawer explains why. |
| Tablet table | The table at 768 is clean. The Applied column is dropped, and Next step wraps instead of clipping. |
| Phone method sheet | The method sheet at 375 stacks into cards. No blank rows and no inner scroll. |
| Card footers | Board footers fit at 1440: "Send thanks · 1d ago" and "Outcome? · 3d ago". |
| Snowflake offer (from Fix 7) | Now shows "Close offer" and no ghost option. |

| Area | Score | Notes |
|---|---|---|
| Visual craft | 9.3 | One quiet system in both themes. The focus edge reads in dark. Stage dots are the only seam: Interviews is still the same amber as "Outcome?" and "Silent 11d". |
| First run | 9.1 | Onboarding is calm. "Free. Your data stays in this browser." is the right first promise. Step 3 shows 1,494 matches and names the 579 flagged ones honestly. **At 375 on step 2, Continue runs 10px past the gutter.** |
| Today | 9.0 | The subtitle "5 for today · 17 more this week · Next: Notion technical at 7:46 PM" is still the best line in the app. Grammar slips remain: "With HackerRank", "Apply to Intel · Strong ghost signals [Apply]", and the batch ghost row hidden behind "Show 5 more". |
| Pipeline | 9.2 | Board, table and drawers are all good. "Last reply" still disagrees with rounds (Hex, Scale AI). |
| Find / Companies | 9.0 | Fit is trustworthy now. Companies still shows "~2 days" typical time open next to 7% still hiring (RTX, NVIDIA). |
| Copy | 8.8 | **The `other` round type leaks into sentences**, as Bug 1. Netflix's draft ignores the follow-up already sent. |
| Responsive / dark | 9.2 | 768 and 375 hold. Dark has no contrast holes. |

---

## 1. Ship verdict

**Ship.** Land Fixes 1–3 first. They take about 45 minutes and are each a few lines.

- **Fix 1** is the only thing a LinkedIn visitor can plausibly hit in a first session that reads as broken English.
- **Fix 2** is the only thing a power user will screenshot as a contradiction.
- **Fix 3** is a 375 polish tell on the first-run path, which is exactly where LinkedIn traffic lands.

Fixes 4–6 can go out in the next point release without embarrassment.

---

## 2. Top 6 fixes (ranked, about 90 minutes in total)

### Fix 1: The `other` round type leaks into copy (15 min, bug)

When a round is typed **Other**, which is the default fallback for unknown types and the natural choice for a HackerRank or Codesignal link, the app prints:
- Today: "**Other with Point72 in 9h**"
- Upcoming: "Point72 · **Other** · With HackerRank"
- Outcome: "How did the Point72 **other** go?"
- Confirm: "Confirm your **other** with…"
- Thank-you draft: "Subject: Thank you, **Other** for…"

**Files:** `src/js/00-core.js:92`, `src/js/25-logic.js:20,24,28,32,154`, `src/js/views/today.js` (`.td-up-row` title), and `src/js/views/pipeline.js:57,97`.

1. Give each round type a noun:
   ```js
   { id: "other", label: "Other", noun: "Interview" },
   const roundNoun = (r) => ROUND[r?.type]?.noun || ROUND[r?.type]?.label || "Interview";
   ```
2. Use `roundNoun(r)` everywhere a label sits inside a sentence. Keep `label` only for the type picker and the `.pl-round-sum` chip.
3. The thank-you subject should not carry the round at all: `Subject: Thank you for your time on the ${a.title || "role"} interview`.

### Fix 2: "Last reply" contradicts the rounds (20 min, trust bug, carried from review 8)

Two drawers disagree with their own rounds:
- **Hex:** "Last reply · 4 days ago · Oct 30", with "Send a thank-you · your recruiter call was 1d ago" directly above it.
- **Scale AI:** "Last reply · 22 days ago · Oct 12" next to "Interviews since Oct 19" and an onsite 2 days ago.

**File:** `src/js/views/pipeline.js:853` (`replyTxt`).

1. Add a helper `lastHeardAt(a)`:
   ```js
   Math.max(a.lastReplyAt || 0,
     ...a.rounds.filter((r) => r.at && r.at <= now()).map((r) => r.at),
     ...a.events.filter((e) => e.kind === "stage" && STAGE[e.to]?.i > STAGE.applied.i).map((e) => e.at)) || null
   ```
2. Use the helper for `replyTxt` and for the silent-days math in the table, `:110` and `25-logic.js:45`, so the numbers agree everywhere.

### Fix 3: Onboarding step 2 footer overflows at 375 (5 min)

`.onb-foot` with Back, "Skip this step" and Continue measures `scrollWidth 353` in a 343px box. Continue's right edge sits at 369px, leaving a 6px gutter instead of 16px, so it looks cropped on an iPhone SE or 13 mini. At 390 it fits exactly.

**File:** `src/css/prep.css` (after `:253`):
```css
@media (max-width: 400px) {
  .onb-foot { gap: 4px; }
  .onb-foot .btn { padding: 0 12px; }
  .onb-foot .btn.ghost { padding: 0 8px; }
}
```
Also shorten the ghost label to "Skip" at ≤400. Either change alone fixes it.

### Fix 4: Today speaks with one grammar (20 min, carried from review 8, Fixes 5 and 8)

**File:** `src/js/views/today.js` and `src/js/25-logic.js`.

1. **Upcoming sub-line** (`today.js:416`). "With HackerRank" is wrong for an assessment. When `r.type === "assessment"` (or the interviewers string matches `/hackerrank|codesignal|codility|hirevue/i`), render "on HackerRank", matching the drawer's "Due … · on HackerRank".
2. **Intel** (`25-logic.js:66–68`). When `job && job.g >= 50`, do not push an `apply` task. If the task is kept, set `action: "Review"` and open the job drawer instead. Today should never nudge someone to apply to a listing it just called a strong ghost.
3. **Batch row** (`today.js:260`). The "5 applications with no reply in 21+ days · Mark all as ghosted" row is still the 6th hidden item behind "Show 5 more". Pin it into `shown` and adjust `more`:
   ```js
   shown: open[g.id] ? items : [...items.slice(0, TODAY_GROUP_MAX), ...items.slice(TODAY_GROUP_MAX).filter((i) => i.batch)]
   ```

### Fix 5: The second follow-up reads like the first (10 min, copy bug)

Netflix shows "Followed up · Oct 28, 2026" in the drawer, yet the draft opens "I applied … on Oct 20 and wanted to follow up."

**File:** `src/js/25-logic.js:150`. When `a.followedUpAt` is set:
- Subject: `Checking in again on my ${a.title} application`
- Body: `I followed up on ${fmt.date(a.followedUpAt)} about the ${a.title} role and wanted to check in once more. I'm still very interested…`

Also rename the drawer button to "Draft a second follow-up".

### Fix 6: Two small trust leaks on secondary screens (15 min)

1. **The rail goal card for browse-only visitors** (`src/js/30-shell.js:31`). After "Just browse jobs", the rail says "This week · 0 / 10 applied · 10 more to hit your goal" for a goal they never set. Change the guard to:
   ```js
   ${route !== "today" && profile.onboarded && Object.keys(apps).length > 0 && html`<div class="goal-card">…`}
   ```
2. **Companies "Typical time open"**. RTX reads "~2 days" at 7% still hiring, NVIDIA "~2 days" at 64%, and HPE "~1 day". Two placeholders are in use for the same missing value: "Not enough data" (ByteDance, Meta) and the drawer's "—".
   - Under 10 closed listings, render "—" in the table and in the drawer.
   - Use the header tooltip for "Median of N closed listings".

---

## 3. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Today, Upcoming, outcome, thank-you draft | Round type `other` is printed as a noun: "Other with Point72 in 9h", "How did the Point72 other go?" | Fix 1 |
| 2 | Hex and Scale AI drawers | Last reply ignores past rounds and stage advances | Fix 2 |
| 3 | Onboarding step 2 at 375 | `.onb-foot` is 10px wider than its box, and Continue crowds the edge | Fix 3 |
| 4 | Today, Upcoming | "With HackerRank" | Fix 4.1 |
| 5 | Today › Later | "Apply to Intel · Strong ghost signals [Apply]" | Fix 4.2 |
| 6 | Today › This week | The batch ghost row is hidden behind "Show 5 more" | Fix 4.3 |
| 7 | Netflix follow-up draft | Ignores `followedUpAt` | Fix 5 |
| 8 | Rail after "Just browse jobs" | Goal card for a goal never set | Fix 6.1 |
| 9 | Companies | "~2 days" with no n, and "Not enough data" vs "—" | Fix 6.2 |
| 10 | Find job drawer header (Meta) | "Posted today" in the header, "12h ago" in the list | Use `fmt.ago(j.p)` in both |
| 11 | Deploy note, not a code bug | `dist/index.html` has no `<!doctype>` or `<meta name="viewport">`. It relies on the Artifact publish wrapper to add them. Locally, `isMobile` emulation without the wrapper lays out at 980px. | After publishing, open the live URL on a real phone once. If the page is ever hosted outside Artifacts, add both tags to `src/index.template.html`. |

**Not now (post-launch):**
- **Interviews stage dot** (`src/styles.css:251`, `.dot.interview { background: var(--wait) }`). It shares amber with every warning. Give it its own hue, for example `--stage-int: #7c5cd6` (dark: `#a48cf0`).
- **Settings and onboarding copy.** "Degree by graduation" in onboarding vs "Degree" in Settings. Make both "Degree when you graduate".
- **Phone Today.** Five stacked full-width secondary buttons. Consider text-link actions for non-primary rows at ≤520.
- **`text-wrap: balance` on `.pl-dtitle` at 375.** It wraps "Software Engineer / Intern, Summer 2027" at about 170px of a 289px column.

---

## 4. What landed well (do not touch)

- **Degree-aware fit.** "✕ Degree · Asks for a PhD", Fit 35, sorted out of "New for you". This is exactly the honesty the product promises.
- **The method sheet at 375.** Each signal is a card with its thresholds stacked. It reads like documentation, not a spreadsheet.
- **The tablet table.** It drops the right column and wraps "Get the offer in writing" without truncating it.
- **Close offer.** Snowflake now has one sensible header action, and "Note the deadline" is the primary.
- **First run on a phone.** Steps 1–3 are calm, step 3's count-plus-honesty block is excellent, and "Just browse jobs" goes straight to a usable Find.
- **The share card and caption.** Unchanged and LinkedIn-ready.
