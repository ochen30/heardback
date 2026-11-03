# Heardback: principal design review

Reviewed 2026-11-03 against `dist/index.html` built with `tools/build.py`. Screens were captured at 1440×900 in light and dark, at 375×812 in light and dark, in first-run onboarding (steps 1–3), and in drawer and modal states reached with the `qa/actions-*.js` scripts plus `qa/critic/actions-critic.js` (command palette).

**Overall: 6.3 / 10.** The foundations are good: the token set, the type scale, the Geist pairing, restrained color, a real command palette, and honest data. It does not yet meet the bar of "calm, focused, nothing template-looking". The main reason is noise rather than any broken screen:
- ~40 "Example" pills.
- Five solid primary buttons in one list.
- Three different fit-score formats.
- Dashed wireframe borders.
- Card-inside-card drawers.
- Footnotes on every number.
- A toast that sits on top of the primary CTA.

Most fixes are subtractive and small.

---

## 1. Scores (1–10)

| Screen | Professionalism | Clarity | Visual hierarchy | Consistency | Notes |
|---|---|---|---|---|---|
| Today | 6 | 6 | 5 | 5 | Five solid blue buttons in "Needs you". The right rail repeats the sidebar goal card and the topbar actions. "Example" pill on every row. |
| Find | 7 | 7 | 6 | 6 | Strong list. The filter rail is a 30-pill tag cloud. Meta "Research Scientist Intern – PAR Safety…" appears twice (rows 1 and 4). "Fit 100" shows on generic roles. |
| Job drawer | 6 | 6 | 5 | 6 | Four bordered cards stacked inside the drawer. The ghost check states the same thing three times. A focus ring is drawn on the close button after a mouse open. |
| Companies | 8 | 7 | 7 | 7 | The best screen: a clean, dense table. The "Your apps" column is all dashes, and the ghost % color thresholds are unexplained. |
| Company drawer | 6 | 5 | 5 | 6 | "n=15 / n=574 / n=430" jargon, a methodology paragraph, and a dead "Reply data loads when you open Heardback on claude.ai" card. |
| Pipeline board | 6 | 7 | 6 | 5 | Two primary "Add" buttons. ~400px of empty grey column. Dashed "Rejected/Ghosted" rails. 10× "Example" pills. A permanent keyboard-hint sentence. |
| Pipeline table | 7 | 7 | 7 | 6 | Good. A whole column is spent on "Example", the stage selects read as a form, and "Next step" uses four text colors. |
| App drawer | 6 | 6 | 5 | 6 | Segmented-control tabs. The Details section is a permanently-editable form with native `mm/dd/yyyy`. Every round is a full form. The footer CTA ("Draft follow-up") does not match the next step ("Prep"). |
| Paste email modal | 6 | 6 | 5 | 5 | Three nested scroll areas after parsing. Two privacy disclaimers. Three different names for the feature. |
| Prep | 7 | 7 | 7 | 7 | Calm and useful. The expanded answer is a single grey line with no breathing room, and the mobile header is broken. |
| Insights | 7 | 6 | 6 | 6 | KPI row is good. The bar+line combo chart is busy. A footnote under every insight. "replied· small sample" is missing a space. |
| Settings | 7 | 7 | 7 | 7 | Solid and conventional. A "First name" field holds "Alex Kim". Icon in every card head. "Shown in the sidebar" also appears on mobile, which has no sidebar. |
| Onboarding | 7 | 8 | 7 | 6 | Clean three-step flow. The step 2 card clips content with no scroll affordance, the skill input shows a raw native datalist triangle, and step 3 shows a bare "93" fit. |
| Mobile overall | 5 | 6 | 5 | 6 | The example banner and duplicate add buttons push content below the fold. The toast covers CTAs. The drawer autofocuses a date input, so the picker or keyboard pops up on open. The prep header collapses. |
| Dark mode overall | 7 | 7 | 6 | 6 | The palette is good. The switch knob is a dark dot, so the off switches nearly vanish. The scrim is weak and the drawer is barely separated from the page. Monograms are low-contrast. |

---

## 2. Top 15 fixes, ranked by impact on perceived quality

### 1. Remove the per-item "Example" pills (Today, Pipeline board and table, drawers, Prep, Insights)
- **Problem:** `ExampleTag()` (`src/js/10-ui.js:117`) renders `.badge.example`, a dashed 1px outline pill, on every task, card, row and drawer header. That is about 40 on screen at once on Pipeline and Today. On mobile it wraps onto its own line under task subtitles. The `.example-banner` already says this is example data, and Insights then adds a pill, a sentence and a toggle on top. This is the most template-looking thing in the app.
- **Fix:**
  - Keep the banner and the pill in drawer headers only. Hide it everywhere else: `.td-task .badge.example, .td-up-row .badge.example, .pl-card .badge.example, .pl-table .badge.example, .prep-item .badge.example { display:none }`.
  - Remove the dedicated "Example" column from the pipeline table.
  - If you need a per-item marker, use a 6px hollow ring before the company name (`border:1.5px solid var(--fg-3); border-radius:50%`), no text.
  - On Insights, drop the pill and "Includes example applications" and keep only the switch, labeled "Include examples".

### 2. Today: stop the wall of primary buttons in "Needs you"
- **Problem:** Each `.td-task` row has a solid `.btn.primary`: Draft note, Prep, Draft follow-up, Mark ghosted, Open. Widths vary from 46 to 105px, so the right edge is ragged. Add the "+ Add" primary in the topbar and there are 6 accent-filled buttons above the fold. Each row also has "Snooze ⌄" and "×". The result is 15 controls for 5 tasks.
- **Fix:**
  - Change `.td-task-actions .btn.primary` to the default `.btn` (surface background, `--line-strong` border, `--fg` text). Keep accent fill only on the first row: `.td-task:first-child .td-task-actions .btn.primary`.
  - Fold Snooze and Dismiss into one `.btn.sm.icon` "⋯" menu (the existing `.td-menu`).
  - Show row secondary controls only on `:hover` / `:focus-within` at desktop.
  - Give action buttons a common `min-width: 96px` so the right edge aligns.

### 3. Move the toast off the content and the CTAs
- **Problem:** `.toasts` is fixed bottom-center with z-index 60, above `.drawer` (41).
  - It sits on the drawer's "Apply on company site" button at 1440 in light and dark.
  - On mobile it covers the full-width Apply CTA and the third Today task.
  - "Loaded 10 example applications. They're labeled Example." also wraps to three lines at 375.
- **Fix:**
  - Desktop: `.toasts { left: calc(var(--rail) + 24px); transform: none; align-items: flex-start; }`.
  - When a drawer is open, give the toast stack `right: calc(min(560px,100vw) + 24px)`.
  - Mobile: keep it above the bottom nav, but raise it above `.drawer-foot` when a drawer is open.
  - Auto-dismiss after 4s. Shorten the copy to "Added 10 examples".

### 4. Remove the duplicate page title (all desktop routes)
- **Problem:** The topbar `.top-title` says "Find jobs" and the `.page-head h1` directly below repeats "Find jobs" at 24px. The same happens on Pipeline, Companies, Insights, Settings and Interview prep. This wastes ~70px of vertical space and reads as a scaffolded template.
- **Fix:** Hide `.top-title` at ≥861px (`@media (min-width:861px){ .top-title{display:none} }`), or keep the topbar title and drop the h1, leaving the subtitle as a 13px `--fg-2` line. Mobile already uses the topbar title, so drop the h1 there too (`.page-head h1 { display:none }` under 860px) and keep the subtitle.

### 5. Today right rail: remove the repetition
- **Problem:**
  - "This week · 0 of 10 applications" repeats the sidebar `.goal-card` "This week 0 / 10 applied" verbatim.
  - The 7-day bar chart shows seven empty grey 24×48 boxes at zero, which is noise.
  - The goal stepper duplicates Settings.
  - "Quick actions" (Paste an email / Add application / Find jobs) duplicates the topbar buttons and the palette.
  - "Pipeline at a glance" duplicates the nav count and the Pipeline page.
- **Fix:**
  - Delete the Quick actions card.
  - Delete the sidebar `.goal-card` on routes that show the week card, or delete the week card and keep the rail widget.
  - When the week total is 0, collapse `.td-bars` into one line: "No applications yet this week · goal 10".
  - Move the stepper to Settings only.

### 6. Use one fit-score format, and make it credible
- **Problem:**
  - Three formats exist: "80% fit" (`today.js:217`), "Fit 92" (`find.js:171/563`) and a bare "93" (onboarding step 3). The same job shows "92% fit" on Today and "Fit 92" in Find.
  - "Fit 100" appears on generic titles such as "Backend Software Engineer" and "Junior Data Engineer", which makes the score feel fake.
  - The `.gbars` ghost-signal glyph sits unlabeled at 3px wide in every row, and only the onboarding footnote explains it.
- **Fix:**
  - Standardize on "Fit 92" in `.fit` everywhere, as one shared component.
  - Cap the display at 95, or show bands: "Strong" ≥85, "Good" 70–84, otherwise hidden.
  - In list rows, replace the bare `.gbars` with nothing when the risk is low. Show `.gscore` with text ("Stale?") only for mid/high risk.

### 7. Drawers: fix focus on open
- **Problem:** `useFocusTrap` (`src/js/10-ui.js:131`) focuses the first input or button.
  - On the app drawer, that is the "Applied on" date input. On mobile the month segment is highlighted and the date picker or keyboard opens immediately.
  - On the job and company drawers, the first focusable element is the close button, so the 4px `--focus` ring appears after a mouse click and looks like a bug.
  - With a drawer open, Ctrl+K opens the palette but focus stays trapped in the drawer, so typed text goes nowhere.
- **Fix:**
  - For `.drawer`, focus the dialog element itself (`tabindex="-1"`, `outline:none`). Autofocus inputs only in `.modal`.
  - Have the palette take focus from any active trap.
  - Close overlays on hash change: the Add modal currently survives route changes.

### 8. Fix the stacking when a modal opens from a drawer (Draft follow-up, Paste email, Add round)
- **Problem:** `.drawer` and `.modal` are both z-index 41 and `.scrim` is 40. A modal opened from the drawer covers the drawer, but the drawer is not dimmed. Two surfaces sit at the same elevation, so the 560px drawer competes with the 560px modal.
- **Fix:** Set `.modal { z-index: 51 }` and render a modal scrim at z-index 50 that covers the drawer. Alternatively, open drafts inline inside the drawer as a sub-view.

### 9. Replace the dashed borders
- **Problem:** Dashed outlines are used on `.example-banner`, `.badge.example`, `.pl-col-closed`, `.pl-rail` (the vertical "Rejected"/"Ghosted" rails), `pipeline.css:35/40` and `.td-bar.future`. Dashed borders signal "placeholder" or "drop zone", and here they make the app look like a wireframe.
- **Fix:**
  - Give the banner a solid `border:1px solid var(--line); background: var(--surface-2)`, a single line, and a dismiss "×".
  - Make `.pl-rail` solid `var(--line)`, or replace the two vertical rails with one 40px "Closed · 2" pill at the end of the board that expands.
  - Use dashed borders only for an active drag target (`.col.drop`).

### 10. Pipeline board: one Add button, lighter columns, no permanent instructions
- **Problem:**
  - The topbar "+ Add" (primary) and the page `.pl-add-btn` "+ Add application" (primary) are 250px apart and do the same thing. On mobile, the blue "+" and a full-width "Add application" are stacked.
  - The `.col` grey `--surface-2` boxes run to ~780px high even when they hold one card, which gives large grey voids.
  - `.pl-foot-note` ("Drag cards between columns, or focus a card and press ←→…") is always visible.
  - The interview card wraps "Technical · Tomorrow 12:09 PM" onto two lines.
- **Fix:**
  - Remove `.pl-add-btn` on desktop, since the topbar Add is the global action. On mobile remove the topbar "+" on this route.
  - Set `.board { min-height: 0 }` and `.col { align-self: start; }`. Alternatively set `.col { background: transparent; border: 0 }` and let cards sit on `--bg` with a 1px header rule.
  - Move the keyboard hint into the "?" shortcuts sheet, or show it once.
  - Shorten the card status to "Technical · Tomorrow 12 PM" in one line (`white-space:nowrap; text-overflow:ellipsis`).

### 11. Find filters: replace the tag cloud
- **Problem:**
  - The 240px left rail holds about 30 pills with counts (Level 2, Role 5, Location 14, Posted segment, Visa). Fourteen location pills form a ragged cloud.
  - The selected state (`.chip[aria-pressed=true]`: `--accent-soft` fill and accent border) is too close to unselected (white fill, `--line-strong` border). On the screenshot you have to look twice to see that Remote, SF Bay Area and New York are on.
  - "Fewest ghost signals" crowds the sort segment.
  - The data contains duplicate rows (the Meta PAR listing is rows 1 and 4).
- **Fix:**
  - Make Location a checkbox list: the 6 most common, then "Show 8 more", with counts right-aligned in `--fg-3` at 12px.
  - Selected chips: add a 12px check icon and use `border-color: transparent` on unselected chips (`.chip { border-color: var(--line) }`) so selection is the only bordered state.
  - Rename the sort option to "Least stale".
  - Dedupe listings by (company, normalized title, location set) in `find_run`.

### 12. Job and company drawers: remove card-inside-card and the redundant copy
- **Problem:**
  - `.drawer-body` stacks four bordered `.card`s (Ghost-job check, Your fit, Ask Claude, company stats). Claude output adds a third level of bordered boxes (`.find-ai-out`, `.find-bullet`).
  - The key-value list shows empty values ("Term: Not stated", "Remote: No remote option listed") and a helper line under Posted.
  - The ghost check states "0/100 · Looks active · Nothing in the listing data suggests this role is stale · No warning signs found in the listing data · Signals we can see… Not proof either way."
  - The company drawer adds "n=15" under each stat, a 3-line methodology paragraph, and an empty "Reply data…" card.
- **Fix:**
  - Inside drawers, render sections as an h3 (`--fs-sm`, 600) plus a top divider (`border-top:1px solid var(--line); padding-top:16px`), not `.card`.
  - Hide kv rows whose value is unknown.
  - Reduce the ghost check to one line plus a "How this works" disclosure: "Looks active · no stale-listing signals".
  - Move methodology into a "?" tooltip on the section heading.
  - Hide the reply-data card when no data is available.

### 13. Paste email modal: one scroller, one name, one disclaimer
- **Problem:**
  - After a sample is parsed, the modal has three scroll regions: `.pl-raw` (the textarea, cut mid-line at "Hi Alex"), `.pl-preview` and `.modal-body`. The preview form clips at "Interview time".
  - The feature has three names: "Paste email" (topbar), "Log from an email" (modal title) and "Paste an email to log it" (palette).
  - Two privacy notes: "Detected on this device. Check the fields." and "Read on this device. Nothing is sent anywhere."
  - The blue `.pl-plan` sentence is 40 words long.
- **Fix:**
  - After parsing, collapse `.pl-raw` to a single-line summary ("Email from Priya Shah · Show") and use `.modal.lg` (760px) so `.modal-body` is the only scroller.
  - Name the feature "Log an email" everywhere.
  - Keep one footnote: "Read on this device."
  - Shorten the plan to "Adds a Technical round on Thu, Nov 5 at 2:00 PM and logs this email. Stage stays Interviews."

### 14. Mobile: protect the first screen
- **Problem:**
  - Pipeline at 375: the first card starts at y≈430 because the title, a stacked Board/Table segment with a full-width Add button, a filter and a 140px dashed banner come first.
  - Today: the banner takes 145px.
  - Prep: `.prep-head-main` squeezes "Northwind Labs" onto two lines, stacks the Example and Technical pills, and truncates the role to "Software E…" because "Add to calendar" stays inline.
  - The "More" tab lands on a page titled "Settings" that also links to Companies and Insights.
  - Insights: "· small sample" wraps to a line starting with a dot.
- **Fix:**
  - At ≤860px, collapse `.example-banner` to a one-line strip ("Example data · Clear").
  - Put the Board/Table segment and the filter on one row and remove the page Add button.
  - Prep at ≤520px: `.prep-head-main { flex-wrap: wrap }` and move the calendar button to an icon-only `.btn.icon`.
  - Title the More page "More", with Companies, Insights and Settings as rows.
  - Wrap `.st-small-n` in `white-space:nowrap` and drop the leading dot.

### 15. Dark mode: switches, scrim and drawer separation
- **Problem:**
  - `.switch i::after { background: var(--surface) }` makes the knob #14171c in dark. The off state ("I'll need sponsorship", onboarding visa toggle) is a dark knob on a dark track and is nearly invisible. The on state shows a black dot on periwinkle.
  - The drawer uses the same `--surface` as cards, and the scrim at .55 over `#0d0f13` gives little separation.
  - Monograms (`hsl(h 40% 50% / .12)`) are muddy in dark.
- **Fix:**
  - Set the knob to `#fff` in both themes. Give the dark off track `--surface-3` with border `--line-strong` and a lighter knob (`#c9ced6`).
  - Dark drawer: `background: var(--surface-2); border-left-color: var(--line-strong)`.
  - Dark monograms: 0.18 alpha and 70% lightness text.
  - Remove the topbar theme button (`30-shell.js:52`). Its "eye" icon for System reads as "visibility/privacy", and the setting already exists in Settings and the palette.

---

## 3. Cross-cutting issues

- **Primary-button discipline.** Solid accent buttons visible at once:
  - Today: 6.
  - Pipeline: 2 identical Adds.
  - Prep: 2 (Add and Practice).
  - App drawer: "Prep for this round" in the next-step card, while the footer offers "Draft follow-up" instead.

  Rule: one primary per view region. The topbar Add counts as the page's primary unless a drawer or modal is open.
- **Pill overload.** At least 9 pill styles exist:
  - `.badge`, `.badge.example` (dashed), `.fit`, `.chip`, `.td-count`;
  - "Past", "tomorrow", "Technical" and "Off" badges;
  - nav counts.

  Counts alone use three treatments: the "Needs you 5" filled pill, "Saved 2" as plain grey, and "Likely questions 11" as plain grey. Keep counts as plain `--fg-3` numerals everywhere, and use pills only for status.
- **Card headers.** Settings and Prep put an icon in every `.card-head`. Today, Insights and Find do not. Many heads also carry a right-side meta label that adds nothing ("Most urgent first", "Next 7 days", "Computed from your own data", "Share of applications sent"). Remove the icons and keep right-side text only when it is a link or an action.
- **Monogram confetti.** `hashHue` gives every company a different tint, so a pipeline column has 4–5 colored squares that compete with the semantic stage colors. Use neutral `.logo` (`--surface-2` background, `--fg-2` text) unless a real logo is available.
- **Colored text as status.** The table's "Next step" column uses amber, blue, green and grey text, and blue text reads as a link. Use neutral text with the existing `.dot`, and color only overdue items.
- **Footnote on every number.** Insights, the company drawer and Today attach a qualifier to almost every metric: "n=4", "Only counts…", "Compared across 2 funnel steps", "Not proof either way". Honest, but it reads as anxious. Put methodology behind one "How we calculate this" disclosure per page and keep the inline "small sample" flag.
- **Native form controls in read contexts.** The app drawer Details, round dates and the Add modal show raw `mm/dd/yyyy` and `--:-- --` native inputs with a calendar glyph. Render values as text ("Oct 16, 2026") and edit on click.
- **Segmented controls used as tabs.** `.pl-tabs .seg` (Overview / Rounds / Timeline / Notes) uses the same control as Board/Table and Newest/Best fit. Navigation tabs should be underline tabs: 2px `--accent` bottom border and no container background.
- **Fixture realism.** Example times land on odd minutes ("12:09 PM", "12:06 PM", "9:08 AM" on every timeline event) because they are seeded relative to now. Round them to :00 or :30 and stagger the timeline times. The duplicate Meta listing has the same effect: both look fake.
- **Line length.** The Today example banner is about 150 characters on one line at 1440. The Settings privacy card is fine. Cap banners and callouts at `max-width: 80ch`.
- **Empty-state tone.** The pipeline empty state (mini-board illustration and three stacked option cards) is fine, though the three cards are equally weighted. Make "Add application" the clear one and the other two text links. "This week" at zero should be a sentence, not seven empty bars.
- **QA signal.** `qa/actions-today.js:openSnooze` logs `FAIL snooze menu opens`. `pipeline:add` times out when run after `pipeline:drawer` in the same session because the drawer intercepts the click; per-action overlay cleanup is missing in `actions-pipeline.js`.

---

## 4. Copy problems

| Where | Current | Suggested |
|---|---|---|
| Today banner | "You're looking at example applications. They show how Heardback tracks replies, interviews and follow-ups. Clear them when you're ready to add your own." | "Example data. Clear it when you add your first application." |
| Pipeline banner | "…They're labeled Example and don't count toward anything real." | Same one-liner as Today. |
| Toast | "Loaded 10 example applications. They're labeled Example." | "Added 10 examples." |
| Today task | "Most companies reply within 3 weeks if they're interested. Mark it as ghosted to keep your board honest." | "No reply in 26 days. Most replies come within 3 weeks." ("keep your board honest" is cute and repeats in Settings → Reminders.) |
| Today / Insights | "First reply 9.5d · median, n=4", "n=4 replies" | "9.5 days · median of 4 replies" |
| Insights subtitle | "What your own applications say about your search. Every rate shows how many applications it's based on." | "How your applications are performing." |
| Insights KPI | "4 of 8 replied· small sample" (missing space) | "4 of 8 replied · small sample" |
| Insights cards | "Computed from your own data", "Only counts applications old enough to judge (21 days, from your settings).", "Compared across 2 funnel steps." | Delete. Put one methodology note at the bottom of the page. |
| Insights | "Your biggest drop-off is between sending an application and getting any reply: 4 of 8 (50%) made it through." | "Biggest drop-off: getting a first reply (4 of 8)." |
| Job drawer ghost check | "Looks active / Nothing in the listing data suggests this role is stale. / No warning signs found in the listing data. / Signals we can see in the listing data. Not proof either way." | "Looks active · no stale-listing signals" |
| Job drawer | "Posted Nov 3, 2026 · today — Date the listing was added to the source list." | "Posted today" |
| Job drawer | "Term: Not stated", "Remote: No remote option listed" | Hide unknown fields. |
| Ask Claude placeholder | "Claude can't open the listing, so it only sees the title, level and location unless you paste the description here." | "Paste the job description for a sharper read." |
| AI disclaimers | "Drafted by Claude from your resume and the listing title only. Review before relying on it." and "Drafted by Claude. Review before sending. Keep only what's true." | One per section: "Drafted by Claude · review before using." |
| Company drawer | "Reply data loads when you open Heardback on claude.ai while signed in." | Hide the section, or "Reply data isn't available here." |
| Company drawer | "Closed-listing dates are only counted when a listing stayed up at least a day, and still-open listings aren't in the sample, so typical times lean short." | Tooltip: "Based on closed listings; may underestimate." |
| Company drawer | "Earliest listing in the dataset, which starts Mar 2026. n=574" | "First seen Mar 2026" |
| Paste modal | Title "Log from an email" / button "Paste email" / palette "Paste an email to log it" / quick action "Paste an email" | "Log an email" everywhere. |
| Paste modal | "Fictional companies." after the sample buttons | Delete. The sample buttons are self-evident. |
| Paste modal | "Detected on this device. Check the fields." plus "Read on this device. Nothing is sent anywhere." | Keep one: "Read on this device." |
| Draft modal | "Copy this into your own email and send it from your inbox. Then mark it as sent so Heardback restarts the reply clock." | "Send it from your inbox, then mark as sent." |
| Draft modal | Subject "Following up on my Data Science Intern" | "Following up on my Data Science Intern application" |
| Draft modal | "Hi there," | Use the contact's first name, or "Hi Quarry Analytics team,". |
| Draft modal | "Edit freely. Specific beats polished." | Delete. |
| Rounds tab | "Each round gets a prep reminder before it and a thank-you nudge after it." | Delete, or tooltip. |
| Contacts | "Recruiters and interviewers you talk to. Heardback uses the first name here in follow-up drafts." | Placeholder only: "Name · Role · Email". |
| Settings | "First name" field containing "Alex Kim" | Label "Name", or split first and last. |
| Settings | "Applications per week. Shown in the sidebar." (also on mobile) | "Applications per week." |
| Settings | "Clearing this site's data in your browser also deletes your Heardback data, so export a backup now and then." | "Clearing browser data deletes Heardback data. Export a backup occasionally." |
| Onboarding | "Takes about a minute" | Delete. The step indicator already says 1 of 3. |
| Onboarding step 3 footnote | "Live listings from the SimplifyJobs community lists on GitHub, refreshed 23m ago. Every listing links to the employer's own page. Fit is scored out of 100 from your targets and skills; the bars show ghost-job signals." | "Updated 23m ago from SimplifyJobs. Fit is out of 100." |
| Pipeline mobile empty | "Every application you send, the stage it's in, and what to do next." | "Track applications and what to do next." |
| Today rows | Button "Prep" vs drawer "Prep for this round"; "Open" (for "Apply to Ostrich Systems") | "Prep" and "Apply". The verb should match the task title. |
| Sort | "Fewest ghost signals" (Find, Companies) | "Least stale" |
