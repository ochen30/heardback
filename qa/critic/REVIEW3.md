# Heardback: principal design re-review (v5)

Reviewed 2026-11-03 against `dist/index.html` built with `tools/build.py`. All captures are in `qa/out-critic/` and `qa/out-critic-fresh/`:
- 1440×900, light and dark, all routes;
- 768×1024;
- 375×812, light, plus dark for Today, Pipeline and Find;
- first run at 1440 and 375;
- drawers, modals and the new features, via `qa/actions-find.js`, `qa/actions-pipeline.js`, `qa/actions-prep.js` (`MOCK=1`), `qa/actions-today.js`, `qa/tmp/method.js`, `qa/tmp/pal.js` and `qa/critic/actions-critic.js`.

The harness reported no console errors and no horizontal overflow.

**Overall: 8.1 / 10** (v2 6.3, v3 7.4).

v4/v5 closed almost every structural item from REVIEW2:
- hover menus no longer reserve space;
- 768 is now designed;
- the toast is bottom-right and correct in dark mode;
- the application drawer reads first instead of opening on forms;
- one "Reposted" metric everywhere;
- neutral AI output and neutral Patterns tiles.

The app now looks like one product at rest.

What keeps it under the 8.5–9 bar is the **new surfaces**. Bulk selection, the mock interview, the method modal and palette context actions all work, and the flows are well thought out. But each one adds its own accent weight, repeats context, or uses its own vocabulary. They have not had the subtractive pass the core screens got. There is also one real CSS cascade bug (the mobile table checkbox) and a few small inconsistencies that a Linear-level reviewer would catch in seconds.

---

## 1. Scores (1–10)

| Screen | Prof. | Clarity | Hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 8 | 9 | 8 | 8 | The duplicate weekly goal is gone and the action column is flush. Remaining: four tinted `.task-ico` tiles (green, blue, amber, grey) in "Needs you" are the last confetti in the app, since Insights went neutral. The example banner here differs from Pipeline's (see Fix 5). |
| Find | 9 | 9 | 8 | 8 | Calm, dense and well aligned. Zero-count chips are disabled. "Fit 92" plus green "New · 8h ago" on every row is a lot of repeated color. At 375 the search placeholder truncates ("Search title, company or"). |
| Job drawer | 8 | 8 | 8 | 8 | Strengths and Gaps are neutral, there is one Regenerate, and quotes are fixed. "Posted today" sits in the header and again as "Posted Today · Nov 3" in the kv list. In the ghost case, "How this works" expands a 5-bullet copy of the method modal inline. The two Claude buttons stack vertically, one per row. |
| Companies | 9 | 9 | 8 | 9 | Still the best screen. |
| Company drawer | 8 | 8 | 8 | 8 | The stat layout is unified, with no triple count. The Roles list is sorted by date, so the first rows are "Fit 25" and "Fit 45" product roles for a software-and-data student. |
| Pipeline board | 8 | 8 | 8 | 8 | Good. With Closed expanded, the board scrolls but the left column is cut mid-word ("ngineering", "h Systems") with no edge fade. "Tomorrow 1 PM · Tech…" still truncates. |
| Bulk selection (new) | 7 | 8 | 7 | 7 | The floating bar is right: count, Move to, Mark ghosted, Export, Delete and ×, centred on the workspace, icon-only on mobile. Selected cards, however, get a 2px accent frame (`border` plus `inset 1px`); with focus that is three rings. Three selected cards make three heavy blue boxes. |
| Pipeline table | 9 | 8 | 8 | 8 | "Days silent" is right-aligned now, and the selected-row tint is good. "Days silent 3" on an app with an interview tomorrow is semantically odd. |
| Table at 375 | 6 | 7 | 6 | 6 | **Bug:** row checkboxes hug the top border of each row (cascade, see §4). Titles truncate to about 18 characters because Stage keeps a 120px column. |
| App drawer | 8 | 8 | 8 | 8 | The read-first layout works: only the next round is expanded and contacts start empty. The "Example" pill is still forced on in `.drawer-head` (`styles.css:245`). "Seattle, WA" appears in both the header and Details. |
| Modals (log email, draft, delete) | 9 | 9 | 8 | 8 | The bulk-delete confirm copy is excellent. In the draft modal, the "Follow-up email" label repeats the title. |
| Method modal (new) | 7 | 8 | 7 | 6 | The content is genuinely good and honest. It uses a fourth vocabulary for ghost levels, its listing count (7,582) contradicts the Find header (8,225), the body is clipped mid-line with no fade, and the Points column wraps awkwardly. |
| Command palette | 7 | 8 | 7 | 7 | Context actions are a strong idea. Hints render as bare grey letters ("N", "E", "4", "G then I") while the footer uses `.kbd` chips. The "4" on "Move to Interviews" means nothing to a user. Over an open drawer, the drawer still reads at full brightness. |
| Prep | 9 | 9 | 8 | 8 | The v3 accent overload is gone: Technical is plain text, Practice is a default button, and the selection is neutral. |
| Mock interview (new) | 7 | 8 | 7 | 7 | The transcript and scorecard are well designed ("4/5 Strong", What worked / Work on, a stronger-answer outline). The context line "Northwind Labs · Software Engineer Intern, Summer 2027 · Technical" repeats three times on one screen. While active, the card has an accent border, an accent progress bar and an accent-ringed composer. The start card breaks the standard `.card-head` pattern. |
| Insights | 8 | 9 | 8 | 8 | Patterns, the KPI sub-line and the tiles are fixed. The funnel percentages and the conversion table below still say similar things twice. |
| Settings | 8 | 8 | 8 | 8 | The location checklist now matches Find, but its counts (SF Bay Area 1,870) and ordering differ from Find's (1,344, with Seattle before Canada) with no label explaining why. |
| Onboarding | 8 | 9 | 8 | 8 | Clean. At 1440 the location counts sit at x=780, leaving a 260px empty band on the right of the card. |
| Mobile (375) | 8 | 8 | 7 | 7 | Prep, the drawers and the bulk bar are all good. The filled-grey search square in the topbar reads as a disabled button. The toast still sits on drawer content. |
| Tablet (768) | 8 | 8 | 8 | 8 | Designed now: 288px board columns, and the ghost track is gone in Find. Prep at 768 loses "Open application". |
| Dark mode | 9 | 8 | 8 | 8 | The toast, checkboxes and drawer separation are all right. |

---

## 2. What improved since v3

- **Layout discipline.**
  - `.td-more` and `.pl-more` no longer reserve space, so the Today action column is flush with the card edge.
  - At 768 the board uses 288px columns, and Find drops the empty ghost track.
- **Toast.**
  - Bottom-right on desktop.
  - Uses `--surface-3` in dark mode.
  - Stays on one line, and the copy is "Added 10 examples".
- **App drawer.**
  - Rounds are summary rows; only the next one is expanded.
  - The outcome is a compact select.
  - "No contacts yet" with a "+ Add contact" ghost button.
  - "8 days ago · Oct 25".
- **Single sources of truth.**
  - One weekly-goal widget on Today.
  - One "Reposted" metric, and Meta shows 11% in both places.
  - The company stats share one label-above layout.
- **AI tone.**
  - "Strengths" and "Gaps" in neutral colors.
  - One Regenerate.
  - Quoted sources.
- **Insights.**
  - "Patterns" with neutral tiles.
  - "8 sent · 2 saved · 0 this week".
- **Prep.** The Example pill is gone, Technical is plain text, Practice is a default button, and the selected item is neutral.
- **Palette.** No focus ring.
- **Checkboxes.** Custom in both themes.
- **New features are well conceived:**
  - bulk actions with one Undo and a confirm that names the count;
  - a mock interview with a real scorecard;
  - a transparent scoring methodology;
  - context-aware palette actions.

---

## 3. Top 10 remaining fixes, ranked by impact

### 1. Lighter selection state on board cards (`pipeline.css:375–376`)
**Problem:** Selected cards draw a 2px accent frame, and a focused selected card draws three rings. With 3 to 5 cards selected, the board turns into a grid of blue boxes. Linear and Things mark selection with a tint, not a frame.

**Fix:**
```css
.pl-card.sel { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); background: var(--accent-soft); box-shadow: none; }
.pl-card.sel:focus-visible { box-shadow: var(--focus); }
.pl-card.sel .pl-card-foot { border-top-color: color-mix(in srgb, var(--accent) 20%, var(--line)); }
```
This matches the table, which already uses `tr.sel td { background: var(--accent-soft) }`.

### 2. Mock interview: say the context once, and use one accent signal (`prep.css`)
**Problem:**
- `.prep-mock-ctx` on the start card and `.prep-mock-sub` on the active card and the scorecard repeat the round header card directly above them.
- While active, `.prep-mock.on { border-color: var(--accent) }` (`prep.css:268`), plus `.prep-mock-progress`, plus the focused composer ring, make three accent hits.
- The start card uses an accent icon tile (`.prep-mock-ico`) and a three-line header instead of the `.card-head` used by "Likely questions" and "Tailored questions".

**Fix:**
- Delete `.prep-mock-ctx` and `.prep-mock-sub` from the markup.
- `.prep-mock.on { border-color: var(--line); }` (the progress bar already signals "live").
- `.prep-mock-ico { display: none; }`
- Rebuild the start card as `.card-head`: "Mock interview" on the left; the `.prep-mock-len` segment and "Start" on the right.
- Body: one line, "Claude plays the interviewer, one question at a time, then scores you."
- Move "Uses your own Claude account…" into the body as `--fg-3` `fs-xs` text, not two right-aligned lines next to the primary button.

### 3. One vocabulary for listing signals, and one listing count
**Problem:** The same concept has four sets of labels:

| Where | Labels |
|---|---|
| Method legend (`.meth-legend`) | "No signals / A minor signal / Some signals / Strong signals" |
| Method footnote | "Looks active / Some ghost signals / Strong ghost signals" (3 bands, not 4) |
| Job drawer | "Looks active · no stale-listing signals" |
| Find | "Some signals / Strong signals", under a "Listing signals" filter |

Separately, the method modal says "Across 7,582 live listings right now" while Find's header says "8,225 open … roles".

**Fix:**
- Pick four labels and use them everywhere: **Looks active / Minor signal / Some signals / Strong signals**.
- Drawer line: "Looks active · no signals".
- Method copy: "Across 7,582 listings (8,225 before duplicates are collapsed)", or count the same set Find counts.

### 4. Method modal layout (`zz-method.js`, `.meth-table`, `.meth-bar`)
**Problem:**
- The body is cut mid-sentence at the modal's max-height ("Reposts are matched by…"), with no scroll affordance.
- The Points column wraps into "10 at 30 days · 25 at 60 · 40 / at 90 · 55 at 150+".
- The intro paragraph is capped at ~580px while the table spans 720px, so the left edges match but the right edges are ragged.

**Fix:**
```css
.modal .modal-body { mask-image: linear-gradient(to bottom, #000 calc(100% - 24px), transparent); }   /* or a sticky .modal-foot with a Close button */
.meth-table td:nth-child(2) { white-space: nowrap; font-variant-numeric: tabular-nums; }
```
- Render the points as stacked lines (`30d +10<br>60d +25<br>90d +40<br>150d +55`).
- Drop the max-width on the intro, or set the table to the same measure.
- In the job drawer's ghost "How this works", replace the 5 inline bullets (a copy of this modal) with one sentence plus the "How we score listings →" link.

### 5. One example-data banner component (`.example-banner`, `.td-banner`)
**Problem:**
- Today's banner has an ⓘ icon, a full sentence and a bordered `Clear examples` button.
- Pipeline's banner has no icon and a borderless ghost "Clear examples".
- At ≤860 Pipeline collapses to "Example data." while Today at 768 keeps the full sentence.

**Fix:**
- Render the Today variant everywhere: icon, `<b>Example data.</b>`, sentence, then `.btn.sm` with a border.
- Drop the sentence at ≤520 only, in both places.

### 6. Mobile table checkbox misalignment (cascade bug, `pipeline.css:335–336` vs `380`)
**Problem:** The ≤520 rules `.pl-table td.pl-chk-cell { vertical-align: top; padding-top: 12px }` and `padding-left: 12px` come earlier in the file than the base rule at line 380 (`padding: 0 4px 0 16px`). The base rule has the same specificity and wins, so the checkboxes sit flush against each row's top border.

**Fix:** Move the selection section above the `@media (max-width:520px)` block, or append after line 380:
```css
@media (max-width:520px){ .pl-table td.pl-chk-cell { padding: 14px 4px 0 12px; vertical-align: top; } }
```
Also hide the Stage label text at ≤520 and keep only the dot (`.pl-table td:nth-child(3) .pl-stage-label { display:none }`) so titles get ~100px back.

### 7. Palette: real key chips and a scrim over the drawer (`styles.css:358–362`, `30-shell.js:151`)
**Problem:**
- `it.sub` hints render as bare text: "N", "E", "?", "G then I", and a bare "4" on "Move to Interviews".
- With an application open, the drawer stays at full brightness behind the palette and its text runs up against the palette's edges. The draft modal does dim the drawer.

**Fix:**
- Render hints as `<span class="kbd">N</span>` and `<span class="kbd">G</span> <span class="kbd">I</span>`.
- Drop the stage-number hint, or show it as a `.kbd` "4" only when that shortcut is live in the palette.
- Group header: "Lumen Robotics · Embedded Software Engineer" rather than just the company name.
- Make sure the palette's `.modal-scrim` is above `.drawer`. Today they share `.frame`; check the drawer's stacking context and give the palette scrim `z-index: 52`.
- `.palette-item .sub .kbd { background: var(--surface); }` so the chips read on the `--accent-soft` selected row.

### 8. Today: neutral task icons (`styles.css:430–433`)
**Problem:** `.task-ico.ok / .accent / .wait / .ghost` give five rows four colors. Insights already proved neutral tiles read calmer, and urgency is carried by the copy and the single primary button.

**Fix:**
```css
.task-ico.ok, .task-ico.accent, .task-ico.ghost { background: var(--surface-2); color: var(--fg-2); }
```
Keep `.task-ico.wait` amber only when the task is overdue.

### 9. Board edge clipping, and the Interviews footer truncation (`pipeline.css:20`)
**Problem:**
- With Closed expanded, the board scrolls and the first column is cut mid-word at the page gutter.
- At 1440 the Interviews card footer still truncates ("Tomorrow 1 PM · Tech…").

**Fix:**
```css
.pl-board { mask-image: linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent); }
```
Apply it only when scrolled, via a `.scrolled-x` class.
- Footer copy: "Tomorrow, 1 PM", with the round type moved into the card body ("Technical") or dropped, since Interviews already implies it.
- Collapse Closed by default again after a stage move.

### 10. Small consistency items
- **Company drawer roles:** Sort by fit (or "Best fit first", with a sort toggle) so a software student does not open TikTok and see "Fit 25 Product Manager" first.
- **Job drawer:** Drop the "Posted" kv row (the header already says "Posted today"), or drop it from the header.
- **Job drawer, Ask Claude:** Put "Weigh my strengths and gaps" and "Tailor my resume" side by side in one `.row` with `gap: 8px`.
- **App drawer:**
  - Remove the location from the header subtitle, since Details has it.
  - Remove `.drawer-head .badge.example` (`styles.css:245`); the page banner already says it.
  - `.pl-kv-v` ("Last reply") sits 1px left of the `PlInline` values. Give it the same padding as `.pl-inline`.
- **Draft modal:** Drop the "Follow-up email" label (the title says it).
- **Settings and onboarding locations:** Show the count basis ("listings, all roles") or use Find's filtered counts. Use the same order in all three places.
- **Mobile topbar:** Make the search button `.btn.ghost.icon` (transparent), not a filled `--surface-2` square.
- **Find at 375:** Placeholder "Search jobs". Put the sort `select` on the matches row, not on a row of its own.
- **Prep at 768:** Restore "Open application" as an icon button next to the calendar.

---

## 4. Regressions and bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Pipeline table at 375 | Checkbox cell padding is overridden by the later base rule (`pipeline.css:380` beats `:335–336`), so checkboxes sit on the row's top border. | Fix 6. |
| 2 | Palette over the app drawer | The drawer reads undimmed behind the palette, while the draft modal does dim it. The palette visually collides with the drawer text. | Fix 7. Verify `.modal-scrim` stacking against `.drawer`. |
| 3 | Method modal | Body is clipped mid-line with no scroll cue. | Fix 4. |
| 4 | Data consistency | Method modal says 7,582 listings, Find says 8,225. Settings says SF Bay Area 1,870, Find says 1,344. Neither explains the basis. | Fix 3 and Fix 10. |
| 5 | Company drawer | Roles are date-sorted, so low-fit roles come first. | Fix 10. |
| 6 | Board, Closed expanded | Hard clip of the first column, and the footer still truncates. | Fix 9. |
| 7 | Prep at 768 | "Open application" is missing from the round header. | Fix 10. |
| 8 | QA harness | Mock actions can't be chained in one session: `prep:mockTurn` after `prep:mockCanned` times out waiting for `#prep-mock-start`, and `prep:mockEnd` after `prep:mockTurn` times out on the "3 questions" button. | Add a `reset()` (reload, or end the mock session) at the start of each `mock*` action, as `actions-pipeline.js` does. |
| 9 | Toast | Still overlaps content: the last Find row's "Fit" chip at 1440, and drawer content at 375. Minor, since it is transient. | At ≤520 with a drawer open, place it at the top (`.toasts.over-drawer { top: 12px; bottom: auto; }`). |

---

## 5. Copy nits

| Where | Current | Suggested |
|---|---|---|
| Method footnote | under 25 "Looks active", 25–49 "Some ghost signals", 50+ "Strong ghost signals" | Use the same four labels as the legend (Fix 3). |
| Job drawer | "Looks active · no stale-listing signals" | "Looks active · no signals" |
| Mock start | "Northwind Labs · Software Engineer Intern, Summer 2027 · Technical" (third repeat) | Delete. |
| Mock start foot | "Uses your own Claude account. Nothing is saved outside this browser." (2 right-aligned lines) | One line under the description: "Runs on your Claude account. Saved only in this browser." |
| Palette | hint "4" | Remove, or show as a `.kbd`. |
| Prep subtitle | "1 upcoming round. Next tomorrow." | "1 upcoming round · next tomorrow" (match the "·" style used on Today and Pipeline). |
| Pipeline table | "Days silent" for apps with upcoming rounds | Show "—" when a round is scheduled. |
| Find at 375 | "Search title, company or location" (truncates) | "Search jobs" |
