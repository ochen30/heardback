# Heardback: principal design re-review (v3)

Reviewed 2026-11-03 against `dist/index.html` built with `tools/build.py`. Screens were captured with `qa/shot.js` at:
- 1440×900, light and dark, all routes;
- 375×812, light and dark;
- 768×1024;
- first run (`SETUP=fresh`), at 1440 and 375;
- drawer, modal, menu and palette states from `qa/actions-find.js`, `qa/actions-pipeline.js`, `qa/actions-today.js`, `qa/actions-prep.js` and `qa/critic/actions-critic.js`.

The harness reports no console errors and no horizontal overflow on any route.

**Overall: 7.4 / 10** (v2 was 6.3).

The subtractive pass worked. The app now reads as one calm product, not a scaffold:
- The Example pills are gone from list items.
- There is one primary button per region.
- The dashed borders are gone.
- Drawers use dividers instead of nested cards.

What separates it from the 8.5+ bar is a layer of second-order polish:
- **Hover-only controls still reserve layout space.** That causes ragged gutters and truncated company names.
- **The tablet breakpoint was never designed.** At 768, board columns are 600px wide and Find titles truncate next to a 137px empty gap.
- **The toast still sits on content.**
- **The app drawer is still form-first.** Contacts and every round render as live forms.
- **Small inconsistencies remain:** stat layouts, chip versus checklist, and repeated numbers.

---

## 1. Scores (1–10)

| Screen | Professionalism | Clarity | Visual hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 8 | 8 | 8 | 7 | One accent button, hover "⋯" menu, rail trimmed. Remaining: a 32px dead gutter right of every action button (reserved `.td-more`), and "This week" still appears twice (sidebar `.goal-card` plus a rail card whose body is a single line). |
| Find | 8 | 8 | 7 | 7 | The location checklist, "Fit 92", the ghost glyph only when it matters, and dedupe are all big wins. Zero-count chips ("Quant 0", "Hardware 0") show during search. The search clear "×" is bold accent. |
| Job drawer | 7 | 7 | 7 | 7 | Sections with dividers, a one-line listing check and hidden unknown fields: much calmer. The AI block is still loud: a red "✕ Why not you (yet)", two regenerate buttons ("Ask again", "Suggest again") and "From Built a Flask API…" with no quotes. |
| Companies | 8 | 8 | 8 | 8 | Still the best screen. Neutral monograms help. Stale-signal colors are now explained via ⓘ. |
| Company drawer | 7 | 7 | 7 | 6 | "382 open roles" appears three times (header, stat and list head). Its stat blocks put the label above the number, while the company block in the job drawer puts the number above the label. |
| Pipeline board | 8 | 8 | 8 | 7 | One Add, shrink-wrapped columns, a solid Closed rail and a dismissible tip. Expanding Closed squeezes columns, so "Fernhill Capi…", "Northwind L…" and "Technical · Tomorro…" truncate. |
| Pipeline table | 8 | 8 | 8 | 7 | Example column gone, next-step color only when due. The "Days silent" header is not right-aligned over its numeric column. |
| App drawer | 7 | 7 | 7 | 7 | Underline tabs, a stepper, details shown as text, and the footer CTA now matches the next step. Contacts is a permanent 3-input form, every round is a full form, and "View rounds" is the only underlined link in the app. |
| Log-an-email modal | 8 | 8 | 7 | 8 | One name and one disclaimer. The "Email" field label is redundant under the "Log an email" title. |
| Draft modal | 8 | 8 | 8 | 8 | The scrim now dims the drawer behind it. Copy is fixed. |
| Prep | 8 | 8 | 7 | 7 | Calm. The header still carries an "Example" pill, and the blue "Technical" pill, accent-text selected item and solid Practice button make three accent hits in one glance. |
| Insights | 7 | 8 | 7 | 7 | Copy is much better. "Where you stall" contains a positive trophy item. Colored icon tiles. The Funnel card has ~50px of dead space at the bottom. |
| Settings | 8 | 8 | 7 | 7 | Good. Locations are a 13-chip cloud here but a checklist in Find. |
| Onboarding | 8 | 8 | 8 | 8 | "Skip setup", a scroll fade on mobile, and the name placeholder. Clean. |
| Command palette | 7 | 8 | 7 | 7 | The input draws the global 4px focus ring inside the palette, so it reads as a form field. |
| Mobile (375) | 7 | 7 | 7 | 7 | The prep header is fixed and the banner is one line. The toast wraps to 2 lines and covers drawer content and the "Mark ghosted" button. The job drawer keeps its 48px monogram, so the title wraps to 3 lines. |
| Tablet (768) | 6 | 7 | 6 | 6 | Not designed: board columns are 82% of the viewport (~600px), and Find titles truncate at ~270px next to a 137px empty gap. |
| Dark mode | 8 | 7 | 7 | 7 | The drawer on `--surface-2`, the visible switch knob and the primary with dark text are all good. Native unchecked checkboxes render as filled grey squares, and the toast inverts to a glaring white slab. |

---

## 2. What improved since v2

- **Example labeling.** The per-item `.badge.example` pills are gone from Today, the board, the table and Insights. The banner is a solid one-liner with a single "Clear examples" action. The dashed borders are gone everywhere except drop targets.
- **Primary discipline.**
  - Today has one accent button (the first task). The others are default `.btn` with matching verbs (Prep, Apply).
  - Snooze and Dismiss moved into a hover "⋯" menu, and the menu takes focus correctly.
  - The topbar is the only Add on desktop.
- **Duplicate titles.** The topbar title is gone on desktop, and mobile uses the topbar title only.
- **Today rail.** Quick actions were removed. The zero week is one sentence. Response metrics read "9.4 days · median of 4 replies".
- **One fit format.** "Fit 92" is used everywhere, and low fits are grey. The ghost glyph appears only with text ("Some signals" / "Strong signals"). The sort is renamed "Most likely real". Duplicate listings are collapsed.
- **Drawers.** Sections use h3 plus dividers, not `.card`. Unknown kv rows are hidden. The ghost check is one line plus a "How this works" disclosure. Focus no longer rings the close button. A modal opened over a drawer now dims the drawer.
- **App drawer.**
  - The tabs are underline tabs.
  - A stage stepper sits at the top.
  - Details render as text.
  - The footer CTA matches the next step ("Prep for this round" or "Mark as ghosted").
  - Timeline times are rounded.
- **Pipeline.** Columns shrink-wrap, Closed is a solid rail, the tip is dismissible, the table lost its Example column, and next-step color is used only when due.
- **Copy.** Almost every line in the v2 copy table was applied: "Log an email", "Read on this device.", the draft subject and greeting, "Name", the Insights subtitle, and the onboarding footnote.
- **Dark mode.** The drawer separates from the page, the switch knob is visible, and monograms are neutral.
- **Mobile.** The prep header wraps with an icon-only calendar button, the banner collapses to "Example data. [Clear examples]", and Board/Table plus the filter share a row.

---

## 3. Top 12 remaining fixes, ranked by impact

### 1. Hover-only controls must not reserve layout space (Today and Pipeline cards)
- **Today:**
  - `.td-more` (`today.css:26–30`) is `opacity:0` but still takes 28px plus a 4px gap.
  - Every action button therefore ends 48px short of the card edge (x=1003 against a card edge of 1051 at 1440, and the same at 768), which reads as misalignment.
- **Pipeline cards:**
  - `.pl-more` (`pipeline.css:76–81`) reserves width inside `.pl-card-top`.
  - With the Closed column expanded, columns drop to ~165px, so company names truncate ("Fernhill Capi…", "Harbor & Fin…").
  - `.pl-card-foot` truncates too ("Technical · Tomorro…").
- **Fix:**
  ```css
  .td-task { position: relative; }
  @media (hover:hover) {
    .td-more { position:absolute; right:12px; top:50%; translate:0 -50%; }
    .td-task:hover .td-task-actions, .td-task:focus-within .td-task-actions { margin-right: 32px; }
  }
  .pl-card { position: relative; }
  @media (hover:hover) { .pl-more { position:absolute; top:6px; right:6px; background: var(--surface); } }
  .pl-col { min-width: 200px; }   /* let the board scroll instead of squeezing when Closed expands */
  ```

### 2. Design the tablet breakpoint (768)
- **Board:** at ≤860, `pipeline.css:283` sets `.pl-col { flex: 0 0 82% }`. At 768 that gives ~600px columns: one stage per screen, with 2 cards floating in a huge grey column.
- **Find:**
  - `.find-c-ghost:empty { visibility:hidden }` (`find.css:53`) keeps the 112px ghost track of `.find-side` (`112px 60px 84px 92px`).
  - Titles therefore truncate at x≈350 ("Research Scientist Intern - PAR Safety E…") with a 137px empty gap before "Fit 92".
- **Fix:**
  ```css
  @media (min-width:521px) and (max-width:860px) { .pl-col { flex: 0 0 288px; } }
  .find-side { grid-template-columns: auto 60px 84px 36px; }   /* ghost column auto-sizes */
  .find-c-ghost:empty { display: none; }                       /* at all widths, not only ≤520 */
  ```

### 3. Toast: stop covering content, fix dark mode and wrapping
- **Problem:**
  - `.toasts` (`styles.css:365`) sits at `left: calc(var(--rail) + 24px)`, directly over the first content column: the Today "New for you" row, the Find filter rail and Prep's left list. It also persists 4.2s.
  - At 375 it wraps "Added 10 example applications" to 2 lines and covers "Mark ghosted" on Today and the Fit section in the job drawer. `.toasts.over-drawer` lifts it but it still sits on content.
  - In dark mode, `background: var(--fg)` makes it a bright white slab.
- **Fix:**
  - Desktop: anchor bottom-right, `right: 24px; left: auto; align-items: flex-end;`. Add `right: calc(min(560px,100vw) + 24px)` when a drawer is open.
  - Dark mode: `.toast { background: var(--surface-3); color: var(--fg); border: 1px solid var(--line-strong); }`.
  - Mobile: `.toast { white-space: nowrap; }` and shorten the copy to "Added 10 examples" (`loadExamples` toast). When a drawer is open on mobile, put toasts at the top (`top: 12px; bottom: auto`).

### 4. App drawer: stop rendering forms by default
- **Problem:**
  - Contacts (`.pl-contact-form`, `pipeline.css:205`) is a permanent Name / Role / Email / Add row, even when the list is empty.
  - Rounds: every `.pl-round` is a live form. That means a 4-way segmented Outcome control, an Interviewers input, and two 84px textareas (`.pl-round-grid .textarea { min-height:84px }`). Two rounds fill 800px of drawer.
- **Fix:**
  - Contacts: show "No contacts yet" plus a `.btn.ghost.sm` "+ Add contact" that reveals the form.
  - Rounds: render each one as a summary row (`Recruiter call · Tue, Oct 27 · Passed · Dana`) with an "Edit" affordance that expands it. Keep only the next upcoming round expanded.
  - Replace the outcome `.seg` with a compact `.select` or a status badge.

### 5. Today: delete the duplicated weekly goal
- **Problem:** The sidebar `.goal-card` says "This week 0 / 10 applied · 10 more to hit your goal". The Today rail card says "This week · No applications yet this week · goal 10", which is a full card header (`.card-head`, 50px) for one sentence.
- **Fix:** Remove the Today "This week" card, or at ≥861px hide `.goal-card` on `#today`. Move "Edit goal" into the `.goal-card` as a `.btn.ghost.sm`.

### 6. Command palette input shows a focus ring
- **Problem:** The global `:focus-visible { box-shadow: var(--focus) }` (`styles.css:99`) applies to `.palette-input input`. The palette opens with a 2+2px blue ring inside the already-elevated sheet, so it looks like a form field, not Raycast or Linear.
- **Fix:** `.palette-input input:focus, .palette-input input:focus-visible { box-shadow: none; }`.

### 7. Company stats: one layout, no triple counts, one metric name
- **Problem:**
  - The company drawer `.find-stats` puts the label above the number ("Open roles / 382").
  - The job drawer company block `.find-mini` puts the number above the label ("87 / open roles").
  - "382 open roles" also appears in the drawer subtitle and again as the "Open roles 382" list head.
  - The job drawer shows "13% reposted titles" for Meta, while the Companies table shows Meta "Stale signals 0%". These are two near-synonyms that disagree.
- **Fix:**
  - Standardize on label-above (`.find-mini` → same markup as `.find-stats`).
  - Drop the stat tile "Open roles" (the subtitle covers it) and label the list "Roles".
  - Name one metric "Reposted" in both places, or show both with a ⓘ difference.

### 8. Job drawer AI output: tone down and dedupe
- **Problem:**
  - `.find-yn-h.bad { color: var(--bad) }` (`find.css:121`) puts a red ✕ "Why not you (yet)" on a student's resume, which is alarmist.
  - There are two regenerate buttons ("Ask again" above, "Suggest again" below).
  - `.find-bullet-from` renders "From Built a Flask API for club sign-ups" with no quotes or colon.
  - The listing check line "Listed 1 more time with the same title and locations. Shown once here." is clunky.
- **Fix:**
  - Use `.find-yn-h.bad { color: var(--fg-2) }` with a neutral "–" icon, and title the columns "Strengths" and "Gaps".
  - Keep one "Regenerate" `.btn.ghost.sm` in the section head.
  - Bullets: `From “Built a Flask API for club sign-ups”`.
  - Dup copy: "Also posted once more with the same title. Shown once."

### 9. Prep: remove the last Example pill and reduce accent hits
- **Problem:**
  - `styles.css:245` explicitly re-enables `.prep-head .badge.example`.
  - The prep header has "Example", a blue `Technical` pill, and a solid `Practice` button in the next card, while the selected left item uses `--accent-text`. That is four accent hits in one viewport.
- **Fix:**
  - Delete `.prep-head .badge.example` from that selector.
  - Render round type as plain `--fg-2` text after the role ("Software Engineer Intern · Technical").
  - Make `Practice` a default `.btn` with a play icon.
  - Selected list item: `color: var(--fg)` on `--surface-2`, not accent.

### 10. Filters: one pattern for locations, hide dead options
- **Problem:**
  - Find uses a location checklist, but Settings and onboarding still use a 13-chip cloud.
  - During search, Level and Role chips show zero counts ("Quant 0", "Hardware 0") and stay clickable.
  - The search clear "×" is bold accent.
- **Fix:**
  - Reuse the Find checklist ("6 + Show 7 more") in Settings → Locations.
  - Zero-count chips: `.chip[data-count="0"] { opacity:.45; pointer-events:none; }`, or hide them.
  - Search clear: `.btn.ghost.sm.icon` in `--fg-3`.

### 11. Insights: title and tone
- **Problem:**
  - "Where you stall" lists "You've passed 4 of 4 interview rounds", which is a positive item under a negative title.
  - Rows use amber, green and grey icon tiles (confetti).
  - The Funnel card has ~50px of dead space under the conversion table.
  - "Applications sent 8" sits next to Pipeline's "10 applications" with no hint why they differ.
- **Fix:**
  - Rename the card to "Patterns" and use neutral `--surface-2` icon tiles with `--fg-2` icons.
  - Align the card heights to content (`align-items: start` on the grid).
  - KPI sub-line: "8 sent · 2 saved · 0 this week".

### 12. Small alignment and link inconsistencies
- **Table:** In `.pl-table`, the "Days silent" `th` is left/centre while the values are right-aligned (x=1313 against 1395). Fix: `th.num { text-align: right }` and put the sort chevron after the label.
- **Next-step card:** The "View rounds" link in `.pl-next-card` is the only underlined link in the app. Fix: `.pl-next-card a { text-decoration: none; font-weight: 500; }`.
- **Round title:** `.pl-round-type` has `padding-left: 8px` and a transparent border, so "Recruiter call" sits 9px right of the "Outcome" label below it. Fix: `padding-left: 0; margin-left: 0` until hover or focus.
- **Kbd chip in dark mode:** `.btn.primary .kbd` uses `border-color: rgba(255,255,255,.35)`, which is invisible on the light periwinkle primary. Fix: `border-color: color-mix(in srgb, currentColor 35%, transparent)`.
- **Stage names:** The mobile stepper `.pl-step-s` says "Interview" where everywhere else says "Interviews". Use the same word, or "Intvw." consistently.

---

## 4. Regressions and bugs

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Pipeline board, Closed expanded (1440) | Columns squeeze to ~165px. Company names and footers truncate. Made worse by the reserved `.pl-more`. | Fix 1: `.pl-col { min-width: 200px }`, absolutely positioned `.pl-more`. |
| 2 | Find at 768 | Titles truncate next to a 137px empty `.find-c-ghost` track. | Fix 2. |
| 3 | Board at 768 | `.pl-col { flex: 0 0 82% }` gives 600px columns. | Fix 2. |
| 4 | Palette | Focus ring on the input. | Fix 6. |
| 5 | Dark Find filter rail | Native unchecked checkboxes render as filled grey squares (`color-scheme: dark` default), muddy against `--bg`. | `input[type=checkbox] { accent-color: var(--accent); }`, or a custom `.check` (16px, 1.5px `--line-strong` border, `--surface` fill). |
| 6 | Dark toast | `background: var(--fg)` gives a white slab on a dark UI. | Fix 3. |
| 7 | Mobile job drawer | `.pl-dhead .logo` is hidden at ≤520, but the matching rule is missing for `.find-dhead`. The 48px monogram stays and the title wraps to 3 lines. | `@media (max-width:520px){ .find-dhead .logo { display:none } }`. |
| 8 | Mobile toasts | Wrap to 2 lines and cover task buttons and drawer content. | Fix 3. |
| 9 | Today, 1440 and 768 | Ragged 32px gutter right of the task buttons. | Fix 1. |
| 10 | Data consistency | The job drawer "reposted titles" and the Companies "stale signals" disagree for the same company (Meta 13% vs 0%). | Fix 7. |
| 11 | QA harness | `pipeline:drawerRounds` asserts "2 rounds" but gets 3 when run after `pipeline:pasteApplyInterview` in the same session: `reset()` in `actions-pipeline.js` doesn't restore apps. Separately, `qa/out/` is shared, so concurrent runs overwrite each other. I saw "Gone Corp" / "Vanished Ltd" fixtures from `qa/tmp/removed.js` leak into a capture. | Reload examples in `reset()`, and add an `OUT=` env var to `shot.js`. |

---

## 5. Copy nits still open

| Where | Current | Suggested |
|---|---|---|
| Toast | "Added 10 example applications" | "Added 10 examples" |
| Job drawer | "Listed 1 more time with the same title and locations. Shown once here." | "Also posted once more with the same title. Shown once." |
| Job drawer AI | "Why you" / "Why not you (yet)" | "Strengths" / "Gaps" |
| Job drawer AI | "From Built a Flask API…" | From “Built a Flask API…” |
| App drawer | "Last reply: 8 days · last reply Oct 25" | "8 days ago · Oct 25" |
| Insights | "Where you stall" | "Patterns" |
| Log-an-email modal | Field label "Email" under the title "Log an email" | Drop the label and keep the placeholder. |
| Company drawer | "Closed within 14 days 27%" next to "Typical time open ~52 days" | Keep one; the pair reads as contradictory. |
