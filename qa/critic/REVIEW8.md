# Heardback: principal design review 8 (v12, pre-launch)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `tools/build.py`. No source was edited.

**State:**
- `s-*`: the power user from `qa/ux3/seed.js` (42 applications), with Point72's HackerRank round set to `type: "assessment"`.
- `e-*`: `SETUP=examples`.
- `f-*`: `SETUP=fresh`.

**Captures** are in `qa/out-critic8/<set>-<width>-<theme>/`. There are 222 in total:
- every route at 1440 (light and dark), 768 (light) and 375 (light and dark);
- Today scrolled and with J/K focus;
- board, board with J/K focus, and table;
- drawers for Figma (taken down, Applied), Ramp (taken down, Screen), Point72 (online assessment), Scale AI (outcome pending) and Snowflake (offer);
- a Find job drawer and a company drawer;
- palette, contextual palette (`ctx2`), method sheet (`m`), shortcuts, quick add, Log an email, the follow-up draft and the share card.

Captures were driven by `qa/shot.js` with a scratch actions file that reuses `qa/actions-today.js` `seed`, `qa/tmp/method.js` `m` and `qa/tmp/pal.js` `ctx`. `ctx` needs the example app Lumen Robotics, so the seeded runs use Hex Technologies instead.

**Zero console errors and zero page-level horizontal overflow on all 13 runs.**

**Overall: 8.9 / 10** (up from 8.8). History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9, v10 9.0, v11 8.8.

v12 did what review 7 asked:
- **One focus treatment.** A 2px accent edge and a soft fill, the same on Today rows, board cards and table rows.
- **The taken-down drawer is one block.** No footer impostor button. Screen-stage Ramp says "Draft a follow-up" and drops "Mark as ghosted".
- **Today is sorted by time.** The batch ghost row exists.
- **Outcome buttons are joined.** "Passed | Didn't pass" are two joined buttons.
- **Days agree.** Figma reads 12 days everywhere and Ramp reads 10.

The power-user Today is now genuinely calm at 1440. What holds it below 9 is a short list:
- **One trust bug** a LinkedIn audience will find in the first 30 seconds: a PhD-only role at **Fit 92** heads "New for you" for an undergrad.
- **Two layout holes off the 1440 happy path:**
  - At 768, the table clips "Last act…" and hides Next step.
  - At 375, the method sheet pushes "Why it matters" off-screen and leaves 150px blank rows.
- **Review 7 carry-overs not taken:** the Interviews dot is still amber, "with HackerRank", and Apply nudged on a strong-ghost listing.

| Area | Score | Notes |
|---|---|---|
| Visual craft | 9.1 | System is consistent and quiet. Board foots truncate on 3 of 5 interview-stage cards ("Send thanks · Recruiter, 2…"). |
| Hierarchy / focus | 9.0 | One primary per screen, sorted by urgency. The drawer header still leads with two destructive buttons on every stage, including Offer. |
| Consistency | 8.7 | Assessment copy still says "with" in 2 places. Interviews, Outcome?, Silent and Send thanks are all the same amber. |
| Copy | 8.8 | Mostly crisp. Problems: "How did the Scale AI onsite / final go?"; "Within 24 hours of your recruiter call with Maya Chen (Recruiter)"; Figma's Today row ignores the takedown. |
| Trust / data honesty | 8.3 | Fit ignores degree requirements. Companies shows "~2 days typical" next to "64% still hiring" with no sample size. |
| Keyboard / a11y | 9.2 | J/K, ↵, S and D work. The legend only appears on focus, and focus never drops. |
| Mobile (375) | 8.7 | Today rows are 110px each (4 per screen). The method sheet is broken. The drawer opens on two full-width "Mark as…" buttons. |
| Tablet (768) | 8.3 | The table scrolls inside its card and hides Next step and Days silent. Everything else is fine. |
| Dark | 9.1 | Holds up. The amber collision is more visible in dark. |
| First run / examples | 9.1 | Onboarding unchanged and good. Examples Today is a clean 5 rows. |

---

## 1. Top 8 fixes (launch-blocking first)

### Fix 1: Fit must respect degree requirements (launch blocker)

**Files:** `src/js/20-data.js` `fitScore` (line 114), and the Find drawer "Your fit" list in `src/js/views/find.js` (around line 653).

**The problem:** Meta's "Research Scientist Intern – PAR Safety Evals" lists **Degrees: PhD**.
- It shows **Fit 92** with four green checks to Jordan (B.S., class of 2028) and to Alex in examples.
- It is the first row of Find (Newest), the first row of Today › New for you, and a saved card on the board.
- The drawer shows "PhD" two inches above "Fit 92".

A student screenshotting this for LinkedIn is the first comment on the post.

**The fix:**
- Add a 5th fit part.
  - When `job.deg` exists and lacks BS (and the profile has no `degree: "ms"|"phd"`), push `{ k: "Degree", ok: false, text: "Asks for a PhD" }` and cap the score: `score = Math.min(score, 0.55 * max)`.
  - When `deg` includes BS, push `ok: true, text: "Bachelor's accepted"`.
- Add an optional "Degree in progress" segmented control (Bachelor's / Master's / PhD) to Settings › Profile, below Level. Default to Bachelor's.
- Exclude `fit < 70` from "New for you" (`today.js:461`).

### Fix 2: Design the table at 521–1100px

**File:** `src/css/pipeline.css:107` (`.pl-table { min-width: 860px; }`).

**The problem:** at 768 the table scrolls *inside* `.pl-table-card` (`overflow: hidden` on the card, `overflow-x: auto` on `.table-wrap`). The header clips at "Last act…", and **Next step and Days silent are invisible**. Next step is the column the table exists for. There is no visible scroll affordance.

**The fix:** drop the two least useful columns instead of scrolling. Columns: 1 checkbox, 2 company, 3 stage, 4 applied, 5 last activity, 6 next step, 7 days silent.
```css
@media (max-width: 1100px) and (min-width: 521px) {
  .pl-table { min-width: 0; table-layout: fixed; }
  .pl-table th:nth-child(4), .pl-table td:nth-child(4),   /* Applied */
  .pl-table th:nth-child(7), .pl-table td:nth-child(7) { display: none; } /* Days silent: shown as "Silent 11d" in Next step already */
  .pl-table th:nth-child(3) { width: 110px; }
  .pl-table th:nth-child(5) { width: 104px; }
}
```

### Fix 3: Method sheet at ≤520: stack the table

**Files:** `src/styles.css:585–587` and `src/js/views/zz-method.js:32`.

**The problem:** at 375, `.meth-table` measures 413px inside a 303px `.table-wrap`. "Why it matters" sits off-screen and wraps to ~107px. That makes every row 150px tall, with a blank right half (`s-375-*/today-m`).

"How we score listings" is the page a sceptical LinkedIn visitor opens on a phone.

**The fix:**
```css
@media (max-width: 520px) {
  .meth-table thead { display: none; }
  .meth-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; padding: 12px 14px; border-top: 1px solid var(--line); }
  .meth-table td { padding: 0; border: 0; }
  .meth-table td:nth-child(3) { grid-column: 1 / -1; margin-top: 6px; }
  .meth-pts { min-width: 0; text-align: right; }
}
```

### Fix 4: Board card foot never truncates

**File:** `src/js/views/pipeline.js:58` (`plShortRound`) and `:574` (`.pl-status-extra`).

**The problem:** on a 194px card, three of five Interviews and Screen cards end in an ellipsis:
- "Send thanks · Recruiter, 2…"
- "Outcome? · Technical, 3d …"
- "Outcome? · Recruiter, 5d …"

The round type is the part that doesn't matter on a card.

**The fix:** the extra text becomes the age only: `Send thanks · 23h ago`, `Outcome? · 3d ago`. Put the round type in the `title` attribute.
```css
.pl-status-extra { white-space: nowrap; }
.pl-status .truncate { overflow: visible; }  /* the content is now guaranteed to fit */
```

### Fix 5: Online-assessment grammar (carry-over from review 7, Fix 8)

**Files:** `src/js/25-logic.js:24`, `src/js/views/today.js:416`.

| Surface | Now | Should be |
|---|---|---|
| Today title | "Online assessment with Point72 in 9h" | "Point72 online assessment due tonight, 11 PM" |
| Today sub | "Tue, Nov 3 · 11:00 PM · HackerRank" | "on HackerRank" |
| Upcoming sub (`.td-up-sub`) | "With HackerRank" | "on HackerRank" |

**The fix:**
- In `today.js:416`:
  ```js
  r.type === "assessment" ? `on ${r.interviewers}` : `With ${r.interviewers}`
  ```
- **Scale AI:** "How did the Scale AI onsite / final go?" should read "How did the Scale AI onsite go?". Use `plShortRound` (already written) for every sentence-case use of a round label, and keep "Onsite / Final" only in pickers.
- **Hex:** "…recruiter call with Maya Chen (Recruiter)" should read "…recruiter call with Maya Chen". Strip a trailing `\s*\(.*recruiter.*\)` from `interviewers` when the round type is recruiter.

### Fix 6: Interviews gets its own colour (carry-over from reviews 6 and 7)

**File:** `src/styles.css:251` (`.dot.interview { background: var(--wait); }`), and the Pipeline-at-a-glance bar segment.

**The problem:** Interviews (column dot, glance bar, stage pill) uses `--wait`. That is the same amber as "Outcome?", "Silent 11d", "Send thanks", "Posting taken down" and "No reply in 12 days". So the one *good* stage reads as a warning, especially in dark.

**The fix:**
```css
:root { --st-interview: #7c5cff; }
:root[data-theme="dark"] { --st-interview: #a08bff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --st-interview: #a08bff; } }
.dot.interview, .pl-glance .seg.interview { background: var(--st-interview); }
```

### Fix 7: Drawer header actions by stage

**Files:** `src/js/views/pipeline.js:774–777` (`.pl-close-btn` × `PL_CLOSED`), and `pipeline.css` 520px rules.

**The problems:**
- **Snowflake (Offer):** "Mark as rejected" and "Mark as ghosted" are the only header actions. Ghosting an offer you hold is meaningless.
- **Figma:** "Mark as ghosted" appears twice (header and the takedown block).
- **At 375:** the two `.pl-close-btn` stretch full width (`flex: 1`) and sit *above* the tabs. They are the first thing you read in every drawer.

**The fix:**
- Render `.pl-close-btn` as `kind="ghost" size="sm"` icon+label at ≥521px.
- At ≤520, collapse them into one `…` button with a menu ("Mark as rejected", "Mark as ghosted").
- When `a.stage === "offer"`, show a single "Close…" menu: "Declined the offer" → rejected (with note), "Offer rescinded" → rejected. Do not show ghosted.
- When the takedown block (`PlRemoved`) is rendered, omit the header ghost button.

### Fix 8: Today tells the same story as the drawer

**Files:** `src/js/25-logic.js:47` (follow), `:65–68` (apply), and `src/js/views/today.js:260` (`shown`).

**Three problems:**
- **Figma.** Today says "Follow up with Figma · You applied 12 days ago and haven't heard back. [Draft follow-up]". The drawer says "This posting was taken down". When `jobGone(a)`, the sub should be "Applied 12 days ago · posting taken down" and the action "Draft a last follow-up".
- **Intel.** "Later · Apply to Intel · Saved 5 days ago · Strong ghost signals [Apply]". Don't create an `apply` task when `ghost >= 50`. If you must keep it, the action is "Review", which opens the job drawer at the Listing check.
- **The batch row.** "5 applications with no reply in 21+ days", with "Mark all as ghosted", is the *last* row of "This week". It hides behind "Show 5 more", the same pattern review 7 flagged. Pin `.td-batch-row` into `shown` regardless of position:
  ```js
  shown: open[g.id] ? items : [...items.slice(0, TODAY_GROUP_MAX), ...items.slice(TODAY_GROUP_MAX).filter((i) => i.batch)]
  ```
  Then decrement `more` accordingly.

---

## 2. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Find, Today › New for you | Fit 92 on a PhD-only role for an undergrad | Fix 1 |
| 2 | Pipeline table at 768 | Next step and Days silent clipped and hidden; header "Last act…" | Fix 2 |
| 3 | Method sheet at 375 | `.meth-table` 413px in a 303px wrapper; 150px rows | Fix 3 |
| 4 | Board foot | `.pl-status-extra` ellipsis on 3+ cards at 1440 | Fix 4 |
| 5 | Upcoming / Today | "With HackerRank", "Online assessment with Point72" | Fix 5 |
| 6 | Snowflake drawer | Offer stage offers "Mark as ghosted" | Fix 7 |
| 7 | Hex drawer | "Last reply 4 days ago · Oct 30", but the recruiter call was 23h ago (the table shows Days silent 0, and rounds count as contact everywhere else) | Last reply = max(lastReplyAt, last past round `at`) |
| 8 | Scale AI drawer | "Interviews since Oct 19" with "Last reply 22 days ago · Oct 12". A stage advance *is* a reply. | Same helper: include stage-advance events past Applied |
| 9 | Ramp | Today says "What's next with Ramp? Add a round", but the drawer's only action is "Draft a follow-up". Two next steps for one app. | Drawer block for Screen-stage takedown: primary "Add a round", secondary link "Draft a follow-up" |
| 10 | Companies | RTX and NVIDIA "Typical time open ~2 days" next to 7% and 64% "Still hiring", with no n | Show "—" under n<10 closed listings; header tooltip "median of closed listings" |
| 11 | Company drawer (Paccar) | "14 open roles" in the header vs "9 of 13 internship postings still open"; the list includes a **Summer 2026** role in Nov 2026 | Exclude past-season roles from "open roles", or tag them "Last season" |
| 12 | Follow-up draft (Netflix) | Netflix was already followed up 6 days ago; the draft reads as a first follow-up | When `followedUpAt`, open with "Following up once more on…" |

---

## 3. What landed well (do not touch)

- **One keyboard focus style** (`d-*-jk`): quiet, identical on rows, cards and table rows, and visible in dark.
- **The taken-down block** (`pipeline-figma`, `pipeline-ramp`): one sentence, one link, at most two actions. Screen-stage copy is honest.
- **Today at 1440, power user:** "5 for today · 17 more this week · Next: Notion technical at 7:14 PM" is the best subtitle in the app. Grouping into Today / This week / Later works, and the joined Passed | Didn't pass is right.
- **Online assessment in the drawer and Prep:** "Online assessment due in 9h · Due Tue, Nov 3 · 11:00 PM · on HackerRank" with "Prep for the assessment". The drawer has the grammar Today should copy.
- **Share card:** "6 weeks into internship recruiting: 40 applications, 19 replies, 11 interviews and 2 offers so far." The caption is LinkedIn-ready, the card is restrained, and examples are never included.
- **Insights patterns:** age-matched and named samples. "6 of 6 rejections came before any interview" is a genuinely useful insight.
- **Onboarding:** unchanged and good in both themes.

---

## 4. Verdict for a public LinkedIn launch

**Don't ship today. Ship after Fixes 1–4, which take about 3 hours (one logic change and three CSS blocks).**

- **Fix 1 is the only true blocker.** A wrong Fit score on the first listing anyone sees undermines the product's core promise ("find real roles"), and the audience is students who will check.
- **Fixes 2–3 are the two screens a LinkedIn click-through lands on most:** a phone opening "How we score listings", and an iPad on the table.
- **Fix 4** is the visible polish tell at 1440.

Fixes 5–8 and bugs 7–12 can follow in the next point release without embarrassment. With 1–8 landed, this is a 9.2.
