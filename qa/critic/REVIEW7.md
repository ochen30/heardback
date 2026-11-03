# Heardback: principal design review 7 (v11, usability test 3 follow-up)

Reviewed 2026-11-03 against `dist/index.html`, freshly built with `tools/build.py`. No source was edited.

**State:** a 5-week power user seeded with `qa/ux3/seed.js` (42 applications, 23 tasks). One state change was made for review: Point72's HackerRank round was set to `type: "assessment"` so the new Online assessment UI renders. Also captured: `SETUP=examples` and `SETUP=fresh`.

**Captures** are in `qa/out-critic7/`:
- `d-*`: 1440, light and dark. Today, Today with J/K focus, board, board with J/K focus, table, table with J/K focus, the Figma drawer (Applied, taken down), the Ramp drawer (Screen, taken down), the Point72 drawer (online assessment), Find, Insights, Prep, and the CSV preview.
- `m-*`: 375, light and dark. The same routes and drawers, plus the CSV preview and the quick-add sheet.
- `x-*`: 1440 light, `y-*`: 375 light and dark. Quick wins header with outcomes, "Show 8 more", expanded group plus "When you have time", Settings.
- `ex/`: examples at 1440 light and 375 dark. `fresh/`: first run at 1440 light and 375 dark.

No console errors and no horizontal overflow on any run. Full-page captures (`*-full-*`) clip at the workspace scroller, so use the `x-` and `y-` scroll captures instead.

**Overall: 8.8 / 10** (down from 9.0). History: v2 6.3, v3 7.4, v5 8.1, v6 8.6, v7 8.9, v10 9.0.

The usability fixes are the right fixes. A 42-application Today is finally manageable, and J/K works everywhere. But the new UI was bolted on without the restraint the rest of the app has:
- three different focus treatments;
- a three-button outcome cluster that breaks the action column;
- a batch action that points at rows you can't see;
- a drawer that asks you to draft the same follow-up three times.

None of it is hard to fix. All of it shows at the Linear/Things bar.

| Area | Score | Notes |
|---|---|---|
| Visual craft | 9.0 | Base system unchanged and still excellent. New UI is clean pixel by pixel, but it is louder than its neighbours. |
| Hierarchy / focus | 8.4 | Today's primary button goes to the 14h task, not the 5h one. The drawer has 3 "Draft follow-up" CTAs and 2 "Mark as ghosted". |
| Consistency | 8.4 | Three focus rings, plus three time formats for the same round ("in 14h", "Due today, 11 PM", "11:00 PM"). |
| Copy | 8.7 | Problem strings: "Within 24 hours" two days later; "in 24h"; "Online assessment with Point72"; lower-case "this listing shows…". |
| Keyboard / a11y | 8.9 | J/K is fast and focus never drops. `.td-more` is 28px wide on phones, and the key legend is permanent chrome. |
| Mobile (375) | 8.8 | Outcome buttons fit on one line, which is good. The callout actions stack ragged in the drawer. |
| Dark | 9.1 | Holds up. The focused Today row is nearly invisible in dark apart from the 2px bar. The Interviews dot is still amber. |
| First run / examples | 9.1 | Onboarding unchanged and fine. Examples Today shows three group headers for 5 tasks. |
| New UI specifically | 8.2 | See the fixes below. |

---

## 1. Top 8 fixes (new UI first)

### Fix 1: Collapse the taken-down callout and the Next step into one block (drawer)

**Files:** `src/js/views/pipeline.js` (`PlRemoved` at 815, `PlOverview`, footer at 725) and `src/css/pipeline.css:446`.

**The problem (Figma, `d-08`):** four things say the same thing.
- the `.callout.pl-removed` box ("Draft a last follow-up", "Mark as ghosted", "See Figma's 7 open roles");
- the grey Next step card ("Send a follow-up") under it;
- the footer primary "Draft follow-up";
- a disabled footer `.btn.pl-removed-btn` "Posting removed".

Add the amber "Removed" pill and the header "Mark as ghosted" and you get **3 follow-up CTAs, 2 ghost CTAs and 3 removed signals**. The callout actions also wrap ragged: a bordered button, a ghost button, then a third ghost button on its own line, indented 10px differently. At 375 (`m-05`) they stack as three widths.

**The fix:**
- **One block.** When `removed`, render `PlRemoved` *instead of* the Next step card. Delete the footer `pl-removed-btn` (the pill on the Posting row already says it).
- **Actions in the callout:**
  - one bordered "Draft a follow-up", which drops "last" for Screen-stage apps;
  - "Mark as ghosted" for `applied` only, because the Screen copy says the process "can still go on";
  - "See open roles" moved into the sentence as a `.pl-linkbtn`.
- **CSS:**
  ```css
  .pl-removed-actions { flex-wrap: nowrap; gap: 8px; margin-left: 0; }
  .pl-removed-body > span .pl-linkbtn { margin-left: 4px; }
  @media (max-width: 520px) { .pl-removed-actions { flex-wrap: wrap; } .pl-removed-actions .btn { flex: 0 0 auto; } }
  ```
- **Copy:**
  - Applied: "**This posting was taken down.** It may be filled. [See Figma's 7 open roles →]"
  - Screen: "**This posting was taken down.** Your process with Ramp can still go on."

### Fix 2: One keyboard-focus treatment for rows and cards

**Files:** `src/css/today.css` (`.td-task:focus-visible`), `src/css/pipeline.css:60, 123, 378`, and `src/styles.css` (token).

**The problem:** there are three different treatments.
- Today rows get a 2px inset left bar, a 1px `--line-strong` inset frame and `--surface-2` (`d-02`). The frame doubles up with the row separators and the card edge.
- Board cards get an accent border plus the global outer ring: a double blue frame (`d-05`), the heaviest thing on the screen.
- Table rows get a 2px inset accent rectangle (`d-07`).

**The fix:** one token, used by all three.
```css
:root { --kb-row: inset 2px 0 0 var(--accent); }
.td-task:focus-visible { box-shadow: var(--kb-row); background: var(--surface-2); }
.pl-table tbody tr:focus-visible { box-shadow: var(--kb-row); background: var(--surface-2); }
.pl-card:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.pl-card.sel:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
```
In dark, `--surface-2` on a focused Today row is nearly invisible (`d-02-dark`). Add this:
```css
:root[data-theme="dark"] .td-task:focus-visible { background: var(--surface-3); }
```
Also add it to the `prefers-color-scheme` twin.

### Fix 3: Ghost batch: one row, not five rows plus an orphaned header button

**Files:** `src/js/views/today.js:192` (`today_groups`), `:310` (`.td-batch`), and `src/css/today.css` (`.td-group-h .td-batch`).

**The problem:** "Mark all 5 as ghosted" sits in the Quick wins header. All five ghost rows are below the fold and hidden behind "Show 8 more" (`x-02`). You're asked to batch-act on rows you can't see. Expanded, the result is five identical "No reply from X in N days / Most replies come within 3 weeks. / Mark as ghosted" rows (`y-03`, 545px on a phone).

**The fix:** with 3 or more ghost tasks, fold them into **one** task row (kind `ghostBatch`, icon `ghost`) and drop the header button.
- **Title:** "5 applications with no reply in 3+ weeks"
- **Sub:** `.td-meta` with "Tanium 22d · Talos 25d · American Express 28d · CACI 30d · Plaid 33d"
- **Actions:**
  - primary-weight "Mark all as ghosted", which keeps today's confirm dialog;
  - "Review", which expands the five rows inline.

Quick wins drops from 16 to 12, and the action finally sits next to its content.

The `ghost` icon (`10-ui.js:19`) also reads as a **padlock** at 14px (`.task-ico`, `.td-batch`, the drawer header). Deepen the hem zig-zag (`v10l-3-2.5-3 2.5-3-2.5-3 2.5`) or raise the eye radius to `.9`.

### Fix 4: Outcome buttons as a two-up segmented control

**Files:** `src/css/today.css` (`.td-outcome`) and the outcome row in `today.js`.

**The problem:** "Passed | Didn't pass | Still waiting" is three bordered buttons, about 240px wide (`d-02`). It is the only multi-button row and breaks the clean 96px right action column. "Still waiting" is really a snooze: it competes with the `…` menu, which already holds Snooze.

**The fix:**
- **Remove "Still waiting"** from the row and keep it in the `.td-more` menu as "Still waiting (ask again in 3 days)".
- **Join the remaining two:**
  ```css
  .td-outcome { gap: 0; }
  .td-outcome .btn { border-radius: 0; }
  .td-outcome .btn + .btn { margin-left: -1px; }
  .td-outcome .btn:first-child { border-radius: var(--r-sm) 0 0 var(--r-sm); }
  .td-outcome .btn:last-child { border-radius: 0 var(--r-sm) var(--r-sm) 0; }
  .td-outcome .btn:hover { position: relative; z-index: 1; }
  ```
- **Sub copy** (`today.js:117`): "Thu, Oct 29. Log it while it's fresh." becomes "Recruiter call · Thu, Oct 29 (5 days ago)". "While it's fresh" is wrong at 5 days.

### Fix 5: Today group order and the primary button follow time

**Files:** `src/js/views/today.js:192` and `src/js/25-logic.js:71`.

**The problem:** `out.sort((x, y) => x.pri - y.pri)` is stable, so the Today group renders in app-creation order. The result: Point72 OA (14h, primary blue button), Hex thanks, Eudia (6h), Databricks thanks, Notion (5h), Scale AI thanks. Meanwhile the subtitle says "Next: Notion technical at 2:00 PM" and Prep lists Notion first.

Follow-ups are also unsorted (7, 9, 8, 15, 17, 11 days).

**The fix:** in `today_groups`:
```js
if (g.id === "today") all.sort((x, y) => (x.kind === "thanks" ? 0 : 1) - (y.kind === "thanks" ? 0 : 1) || (x.round?.at ?? 0) - (y.round?.at ?? 0));
```
Thanks go first, because they are time-boxed and overdue. Preps follow by start time.

Then sort `follow` and `ghost` within Quick wins by days silent, descending. The primary (`primaryKey`) then lands on the first thanks or the 2:00 PM Notion prep, not an 11 PM assessment.

### Fix 6: Group chrome only when it earns its place

**Files:** `src/css/today.css` (`.td-group-h`, `.td-group-more`) and `today.js:188`.

**The problem:**
- Examples (`ex/today-1440`): 5 tasks under three headers, "Today 2 / Quick wins 2 / When you have time 1". That is 3 headers for 5 rows.
- "Quick wins 16" contains drafting six follow-ups, which is not quick.
- "Show 8 more" has a chevron and "Show fewer" has none.

**The fix:**
- **Hide headers at low counts.** Render `.td-group-h` only when `tasks.length > 6`; otherwise show one flat list.
- **Rename the groups** to "Today", "This week" and "Later". The id stays `quick`, and only the label changes.
- **Make "Show more" honest.** "Show 8 more" becomes "Show 8 more · 5 no-reply". Give "Show fewer" `iconRight="chevU"`.
- **Group header CSS:**
  ```css
  .td-group-h { min-height: 32px; padding: 12px 16px 4px; }
  .td-group-h h3 { color: var(--fg-2); }
  ```
  At `--fg-3`, "Today 6" sits below "Needs you 23" by only a hair. It needs one step more contrast than the meta text inside rows.

### Fix 7: Key legend is chrome, so show it on intent

**File:** `src/css/today.css` (`.td-keys`).

**The problem:** "J K move · Enter do it · S snooze · D dismiss" is permanently in the Needs you header (`d-02`). That is 4 chips plus 4 words, in a header Linear would leave empty. `Enter` renders as a wider monospace chip than the rest.

**The fix:** the `.on` class already exists, so use it.
```css
.td-keys { opacity: 0; }
.card:hover > .card-head .td-keys, .td-keys.on { opacity: 1; }
```
Render `↵` instead of "Enter" so every chip is the same width. The `?` sheet already teaches the rest.

### Fix 8: One time-and-copy grammar for rounds

**Files:** `src/js/25-logic.js:24` and `:28`, `pipeline.js:68` and `:95`, and the `today.js` `today_meta` sub.

**The problem:** the same Point72 assessment reads four different ways:

| Surface | Text |
|---|---|
| Today | "Online assessment with Point72 in 14h" |
| Board | "Due today, 11 PM" |
| Table | "Assessment due in 14h" |
| Drawer | "Online assessment due in 14h" |

"with HackerRank" (Upcoming) treats a platform as an interviewer. Examples say "Technical with Northwind Labs in 24h" for tomorrow at 1:00 PM.

**The fix:**
- **Assessments:** the title is `${a.company} online assessment due ${today ? "tonight" : weekday}, ${time}` and the sub is `on HackerRank`. Never "with".
- **`fmt.until`:** return "tomorrow" or a weekday at 20h or more, and never "in 24h".
- **Thank-you sub** (`25-logic.js:28`): when `-until > DAY`, write "Your onsite was 2 days ago. A short note still helps." Scale AI currently says "Within 24 hours of your onsite" 2 days later (amber icon, wrong copy).
- **Apply sub** (`d-03`): "Saved 4 days ago · this listing shows strong ghost signals" becomes "Saved 4 days ago · Strong ghost signals". Better: don't nudge Apply on a strong-ghost listing at all.
- **Board foot:** "Log outcome · Recruiter call, 18h ago" wraps to 2 lines (`.pl-status-2l`) and makes cards uneven. Use "Outcome? · Recruiter, 18h ago" and drop `.pl-status-2l` for this case.

---

## 2. Bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Today › Today group | Not sorted by time. Primary on Point72 (14h) while Notion is in 5h and the subtitle says "Next: Notion". | Fix 5 |
| 2 | Today › Quick wins | "Mark all 5 as ghosted" shown while all 5 ghost rows are hidden behind "Show 8 more". | Fix 3 |
| 3 | Today thank-you | "Within 24 hours of your onsite" shown 2 days after the onsite (window is `-until < 2*DAY`). | Fix 8 |
| 4 | Hex Technologies | Board says "Log outcome · Recruiter call, 18h ago"; table says "Send a thank-you"; Today says thank-you. Two next steps for one app. | Make `plNext` (board foot) and the table's Next step use the same resolver; thanks before outcome inside 48h |
| 5 | Figma drawer and Today | "You applied 11 days ago" (Today, Next step) vs "No reply in 12 days" (Last reply), Oct 22 → Nov 3. Carry-over of REVIEW6 bug 2: still mixed floor and calendar-day math. | Use calendar days (`startOfDay`) in one helper |
| 6 | Today at ≤640 | `.td-more` measures **28×36**. `.btn.sm.icon { width: 28px }` (0,3,0) beats `.td-more { width: 36px }` in the 640 query. | `@media (max-width: 640px) { .td-task .btn.td-more { width: 36px; } }` |
| 7 | Ramp drawer (Screen) | Taken-down callout offers "Mark as ghosted" and "Draft a *last* follow-up" while saying "your process can still go on". | Fix 1 |
| 8 | Drawer footer | Disabled `button.pl-removed-btn` "Posting removed" is a status masquerading as a control (focus-skipped, still announced as a button). | Delete it (Fix 1) |
| 9 | a11y labels | `aria-label="More options: What's next with …"` uses a straight `'`. The title is built in `25-logic.js:41` with `What's` and `You're`, and only the visible text is curled. | Curl at source |
| 10 | Pipeline colours | `.dot.interview` is still amber, identical to "Silent 10d" in dark (`d-05-dark`). REVIEW6 fix not taken. | Move to violet: `--st-interview: #7c5cff` (light) and `#a08bff` (dark) |
| 11 | CSV import | "Sheet says “OA”" still maps to Screen with no round. Now that Online assessment exists, import should add an `assessment` round (date unknown) so Prep and Insights see it. | `prefs.js:46`: map OA to screen + `rounds: [{ type: "assessment", at: null }]` |

---

## 3. What landed well (do not touch)

- **Online assessment in Prep and the drawer** (`d-10`, `d-13`). "Online assessment due in 14h · Due Tue, Nov 3 · 11:00 PM · on HackerRank" with "Prep for the assessment" as the footer primary. Correctly excluded from interview counts.
- **CSV preview** (`d-14`, `m-11`): no focus ring on the first row now; selects stack full-width at 375; provenance line intact.
- **Mobile quick-add sheet** (`m-12`): two rows with plain sub-labels. This is the right weight.
- **Outcome buttons at 375** (`y-01`) fit on one line with the `…` aligned. Keep that layout when you go to two buttons.
- **J/K focus never drops after an action.** Board and table share item order, and the drawer hands focus back to the card.
- **Settings › Locations** now uses two columns (REVIEW6 bug 3 fixed).
- **Insights** (`d-12`): age-matched pattern copy ("8 of 21 applications sent 21+ days ago never got a reply. 5 are still marked active. See them →") is precise and actionable.

Fixes 1–3 cost about an hour and remove most of the new noise. Fixes 4–8 are CSS and copy, about another hour. With all eight and bugs 4–6 fixed, this returns to about 9.2.
