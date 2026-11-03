# Heardback QA report (E2E, Playwright)

Date: 2026-11-03. Tester: QA agent. No source files were edited.

**Build under test.** The source changed several times while testing (commits a6901a3 → 92f5941 landed between 09:04 and 09:17 UTC, and views kept changing after that). To get stable results, I snapshotted `src/` at **HEAD 92f5941 plus the uncommitted changes to find/prep/today/zz-pool/today.css at 09:22 UTC**, built it into a scratch dist, and ran the final suite against that snapshot (`DIST=<snapshot>/dist`). Onboarding, Find, Pipeline and Today were also fully run against the v1 build (a6901a3, 09:07). Every bug below reproduces on the snapshot unless it says otherwise.

**How to run.** `qa/e2e/run-all.sh` runs every script at 1440 and 375, with and without `MOCK=1`, and writes `qa/e2e/out/res-*.json`, logs and screenshots. You can also run one script, e.g. `W=375 MOCK=1 node qa/e2e/t3-pipeline.js`. Set `DIST=/path/to/dist` to test another build. Scripts: `t1-onboarding`, `t2-find`, `t3-pipeline` (board, table and app drawer), `t5-email` (with `emails.js`, 11 realistic emails), `t6-today`, `t7-prep-stats`, `t9-settings`, `t10-palette`, `t11-robust`, `t12-a11y`.

Final suite run (36 script×config runs against the snapshot): 1,166 checks, 1,043 pass, 123 fail. The failures are the bugs below repeated across configurations, plus `t2-find` and `t6-today` steps whose expected values no longer match the snapshot. Find now collapses duplicate listings (7,584 rows instead of 8,227) and has new filter controls, and Today's markup was rewritten. Those flows passed on v1. Update their expected counts and selectors before reusing them.

Counts: **P0 2 · P1 4 · P2 11 · P3 15**

---

## P0: crash or data loss

### P0-1. An application with a missing or unknown `stage` crashes the whole app: every route goes blank
- **Repro:** in localStorage `heardback:v1`, set `apps: {a1: {id:"a1", company:"Partial Co"}}` (no `stage` or `events`), or give an app `stage:"archived"`. Load `#today`, then go to Pipeline.
- **Expected:** the app skips or repairs the bad record, or shows it under a safe default stage.
- **Actual:** `PAGEERROR Cannot read properties of undefined (reading 'label')`. The Preact tree unmounts, and Pipeline, Companies, Prep, Insights and Settings all render blank. Settings is blank too, so the user can't reach "Delete all data" or "Import" to recover. A reload doesn't help because the bad record is persisted.
- **Where:** `00-core.js loadState()` does no per-app validation. The crash sites are `STAGE[a.stage].label` / `.i` in `pipeline.js` (`PlCard` aria-label, `PL_COLS.stage`, `PlStepper`), `30-shell.js Palette`, and `Apps.move`.
- **Fix:** sanitize in `loadState()`, reusing prefs.js `pfCleanApp` logic (move it to core): `apps: Object.fromEntries(Object.entries(s.apps||{}).map(([k,a])=>[k, cleanApp(a)]).filter(([,a])=>a))`, with `stage: STAGE[a.stage] ? a.stage : "applied"`, `events/rounds/contacts` forced to arrays and null entries filtered out. Also add a top-level error boundary (a Preact `componentDidCatch` class) that shows "Something went wrong. Export / reset" instead of a blank page.

### P0-2. Importing a JSON backup with a malformed `profile` (or null array entries) permanently breaks the app
- **Repro:** Settings → Import a `.json` file containing `{"apps":[{"id":"a1","company":"Acme","title":"SWE","stage":"applied"}],"profile":{"locations":"New York","roles":"Software"}}` → Import and merge.
- **Actual:** `PAGEERROR locs.find is not a function`, and the workspace goes blank. The bad profile is saved, so the app stays broken across reloads. Variant: an app with `events:[null]` → `Cannot read properties of null (reading 'to')`. The same crash happens when the stored profile itself is corrupt (`locations:"nyc"`, `roles:null`).
- **Where:** `prefs.js pfImportFile` merges `data.profile` and `data.settings` without type checks. `pfCleanApp` passes `events`, `contacts` and `rounds` arrays through without filtering null or invalid items. `00-core.js loadState` has the same gap for the profile.
- **Fix:** whitelist and coerce profile fields (`roles/levels/locations/skills` → arrays of strings, `weeklyGoal` → clamp to an int, booleans). In `pfCleanApp`, use `events.filter(e => e && typeof e === "object")` and do the same for contacts and rounds.

---

## P1: broken feature

### P1-1. Corrupt stored JSON is silently discarded and then overwritten, so there is no recovery path
- **Repro:** set `heardback:v1` to truncated JSON (for example a write that was cut off), then load the page.
- **Actual:** onboarding appears as if this were a first run. As soon as anything is saved (Skip setup, or any `store.set`), the unreadable data is overwritten. No backup copy is kept and no message explains what happened.
- **Where:** `00-core.js storage.get` (catch → fallback) and `loadState`.
- **Fix:** when `JSON.parse` fails on an existing value, copy the raw string to `heardback:v1:corrupt:<ts>` before using defaults, and show a callout: "Your saved data couldn't be read. A copy was kept. Import a backup from Settings."

### P1-2. Saving to localStorage fails silently (quota or private mode), so the user loses data without warning
- **Where:** `00-core.js store.set` → `storage.set(...)` returns `false` on a `QuotaExceededError`, and nothing checks the return value. Large notes or resumes, or many applications (300 apps take about 132 KB, so the risk grows with notes), push toward the quota.
- **Expected:** a toast or banner like "Couldn't save on this device. Export a backup now.", and a retry.
- **Fix:** `if (!storage.set(STORE_KEY, this.state)) toast("Couldn't save your changes on this device. Export a backup from Settings.", {ms: 8000})`, throttled.

### P1-3. Rule-based email parser misreads common real-world emails (6 of 11 realistic emails wrong on at least one field)
See the full table in [Email parser results](#email-parser-results). The two that change the user's data the most:
- A **Greenhouse confirmation** that contains the sentence "…will reach out to schedule an interview" is classified as **Interview invite**. A new application is created in the *Interviews* stage, and confirming moves an existing Applied app to Interviews.
- A **generic "thank you for your interest"** confirmation that says "Unfortunately, due to the high volume…" is classified as a **Rejection**. Confirming moves the app to Rejected.
- An **offer** worded "I'm thrilled to extend you an offer" is classified as **Update (other)**, so no stage change happens.
- **Where:** `20-data.js parseEmail`. The keyword `has(...)` checks run in priority order offer → rejection → interview → confirmation, and a single loose keyword ("interview", "unfortunately") anywhere in the body wins.
- **Fix:** score the kinds instead of first-match-wins. Check confirmation phrases ("received your application", "thanks for applying", "thank you for applying") before interview, and only count "interview" when it appears with scheduling verbs ("schedule", "invite", "availability", or a date). Require "unfortunately" to co-occur with "not", "other candidates" or "regret". Add `extend (you )?an offer`, `offer (you )?(a |the )?(position|role)`, and `congratulations` + `offer` to the offer check.

### P1-4. Pasting the same interview email twice adds a duplicate round
- **Repro:** Log an email → Interview sample → Update application. Do it again.
- **Actual:** Northwind gets two identical "Technical · Nov 5 2:00 PM" rounds. Both produce prep and thank-you nudges on Today.
- **Where:** `pipeline.js MODALS.paste confirm()`.
- **Fix:** before `Apps.addRound`, skip it (and say "round already logged") when the target app already has a round whose `at` is within 30 minutes of `f.interviewAt` and whose type matches.

---

## P2: wrong behavior or UX bug

### P2-1. Arrow Right on an Offer card moves it to **Rejected** (and Arrow Right on Rejected moves it to Ghosted)
- **Repro:** Pipeline board → focus the Harbor & Finch (Offer) card → press →.
- **Expected:** nothing happens. Offer is the last stage in the main flow, and closing an app should be an explicit choice.
- **Actual:** the stage becomes `rejected`, with an "Undo" toast.
- **Where:** `pipeline.js PlBoard onKey`, which uses `STAGE[a.stage].i ± 1` across all 7 stages.
- **Fix:** step within `PL_MAIN` only: `const ord = PL_MAIN; const j = ord.indexOf(a.stage); if (j < 0) return; const to = ord[j + dir]; if (to) move(a, to);`.

### P2-2. Notes typed less than 600 ms before a reload or tab close are lost
- **Repro:** app drawer → Notes → type → reload within about 0.5 s.
- **Actual:** the previous notes come back. The unmount flush never runs on unload, and the store's own save also waits 150 ms.
- **Where:** `pipeline.js PlText` (600 ms debounce), `prep.js PrepNotes`, and `00-core.js store.set` (150 ms timer).
- **Fix:** add `window.addEventListener("pagehide", flushAll)` in core so it writes `storage.set(STORE_KEY, store.state)` synchronously, and have PlText/PrepNotes register their pending flush there, or call `flush()` on `visibilitychange`.

### P2-3. Logging an email auto-matches and lets you pick *hidden* example applications
- **Repro:** Settings → turn Show examples off → Log an email → Interview sample.
- **Actual:** "Apply to" preselects the hidden example "Northwind Labs", so confirming changes an invisible fictional app. Hidden examples also appear in the "Apply to" dropdown.
- **Where:** `20-data.js matchApp` uses `Object.values(store.get().apps)`, and `pipeline.js MODALS.paste appList` does the same.
- **Fix:** use `Apps.list()` in both places, which respects `settings.showExamples`.

### P2-4. CSV export includes fictional example apps with no marker, and CSV import turns them into real applications
- **Repro:** with examples loaded, Settings → Export CSV, then import that CSV into a fresh profile.
- **Actual:** Northwind Labs, Harbor & Finch and the other examples come back with `example:false`. They count in Insights and the pool as real data, which breaks the brief's honesty rule.
- **Where:** `prefs.js pfExportCSV`.
- **Fix:** export `Apps.list().filter(a => !a.example)` (or add an `example` column that `pfParseCSV` respects).

### P2-5. Dialogs and drawers don't trap Tab focus
- **Repro:** open any modal (Add application) or the app drawer and press Tab repeatedly.
- **Actual:** focus leaves the dialog into the rail and page behind the scrim, even though the dialog has `aria-modal="true"`. Tested in light and dark, at 1440 and 375.
- **Where:** `10-ui.js useFocusTrap` only sets the initial focus and restores focus on close.
- **Fix:** add a keydown handler on the dialog element that loops focus from the last focusable element to the first (and the reverse with Shift+Tab), or set `inert` on `.frame` while an overlay is open.

### P2-6. App drawer header overflows horizontally with long company or location names
- **Repro:** create an app whose company or location has a long unbroken word, for example `"Extraordinarily Long Company … Supercalifragilistic…"`, then open the drawer at 375 or 1440.
- **Actual:** `.drawer` scrollWidth is 1221 px against a clientWidth of 375 (1283 against 559 at 1440). The company and location line runs off-screen and the drawer scrolls sideways. The title wraps correctly. Screenshot: `qa/e2e/out/long-drawer-375.png`.
- **Where:** `pipeline.js` `.pl-dsub` and `.pl-dco` (css/pipeline.css).
- **Fix:** add `.pl-dsub{min-width:0;flex-wrap:wrap} .pl-dsub > span{overflow-wrap:anywhere;min-width:0}` and `.pl-dhead-text{min-width:0}`.

### P2-7. Assessment invites: company comes from the sender platform and the deadline becomes an "interview round"
- **Repro:** paste the HackerRank email ("You have been invited by Coinbase … Please complete it by Nov 10, 2026").
- **Actual:** company is "HackerRank" and title is empty. A *Technical* round is scheduled for Nov 10 at 10:00 (the deadline date), which then triggers prep and thank-you nudges.
- **Where:** `20-data.js parseEmail` (company patterns; the From display name is used because `hackerrank` isn't in the ATS exclusion list) and `pipeline.js plFindTime` (any date counts).
- **Fix:** add `hackerrank|codesignal|codility|karat|hirevue|myworkday|ashby|greenhouse` to the From-name exclusion list. Add an `invited by ([A-Z][\w&.' -]+?) to` pattern. Ignore dates that follow "by", "before" or "deadline".

### P2-8. Parsed interview times ignore the stated time zone
- **Repro:** "Would Tuesday, November 10 at 3:30 PM ET work…" is parsed as 15:30 in the *viewer's* local zone, so a Pacific-time user gets the round 3 hours late. "10:00am - 1:00pm PT" has the same problem.
- **Where:** `pipeline.js plFindTime`.
- **Fix:** detect `\b(ET|EST|EDT|CT|CST|CDT|MT|PT|PST|PDT|UTC|GMT)\b` after the time and convert with a fixed offset map (DST-aware for ET/PT). Show "converted from ET" in the preview.

### P2-9. Numeric dates aren't recognized ("Thursday 11/12 at 2pm ET")
- **Actual:** `interviewAt` is null, so the round isn't created. The preview says "No time found."
- **Where:** `pipeline.js plFindTime` (and the core `parseEmail` regex) only match month names.
- **Fix:** add `\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b` with the same time lookahead (assume US M/D).

### P2-10. Insights median "n" doesn't match the sample the median is computed from
- **Repro:** add an application directly in the *Interviews* (or Screen/Offer) stage with the Add modal, then open Insights.
- **Actual:** the KPI says "n=5 replies", but the median is still computed from the 4 apps that have `lastReplyAt`. Apps created directly in a reply stage get no `lastReplyAt` and no stage event, so they count as "replied" but are left out of the median. Today's "Response so far" card has the same mismatch.
- **Where:** `25-logic.js computeStats` (`replyDays` filters on `a.lastReplyAt`), `stats.js stats_Kpis`, `today.js today_Response`, and `00-core.js Apps.create` (doesn't set `lastReplyAt` for reply stages).
- **Fix:** return `replyN: replyDays.length` from `computeStats` and show that. Optionally have `Apps.create` set `lastReplyAt` when the stage is a reply stage and an applied date is given.

### P2-11. "Delete all data" leaves other Heardback keys in localStorage
- **Repro:** open a company drawer with MOCK and click "Brief me", then Settings → Delete all data.
- **Actual:** `heardback:find:brief:<Company>` (Claude summaries) and `heardback:lastVisit` stay behind. The copy says "removes everything from this browser".
- **Where:** `prefs.js pfDeleteAll`.
- **Fix:** `Object.keys(localStorage).filter(k => k.startsWith("heardback:")).forEach(k => storage.del(k))` before resetting the store. Also clear the shared `pool/<me>` document if the user shared one, or say that it isn't removed.

---

## P3: polish

1. **Practice outline is lost on Exit.** The hint says "Notes stay in this browser", but `PrepPractice` keeps the outline in `useState`, so Exit practice and re-enter shows it empty. Fix: keep it in `store.ui.prepPractice[questionKey]`, or change the hint. (`prep.js PrepPractice`)
2. **Typing right after Ctrl+K loses the first characters.** The palette input is focused by a 30 ms `setTimeout` (`30-shell.js Palette`), so fast typing ("Ctrl+K google") drops the first keys (the v1 build used `autofocus` and didn't have this). Fix: focus in `useLayoutEffect` with no timeout.
3. **Ghost threshold can be set below the follow-up threshold** (follow 30, ghost 10). The follow-up nudge then never appears, because the ghost check runs first. Fix: enforce `ghostDays > followUpDays` in `prefs.js PfReminders`, or swap the values with a hint.
4. **Mobile Pipeline table** shows only the Company and Stage columns, so you can't sort by applied date, activity or days silent at 375. Add a sort `<select>` like Find has. (`pipeline.js PlTable`)
5. **Workday titles lose the suffix:** "Technology Internship Program - Summer 2027" becomes "Technology Internship Program", because the title regex stops at `-`. (`20-data.js parseEmail` title patterns)
6. **From display name used verbatim:** "Robinhood Interviews <interviews@…>" gives company "Robinhood Interviews". Add `Interviews|Recruiting Coordination|University|Early Careers` to the suffix strip. (`parseEmail`)
7. **Title not found** for "applying to the Software Engineer, New Grad role" (comma in the title). Allow `,` in the second title pattern (the first one already allows it). (`parseEmail`)
8. **Two `<h1>` per page:** the topbar `h1.top-title` and the page header `h1` ("Today" and "Good morning, Alex"). Make the topbar title a `div` or `h2`. (`30-shell.js Topbar`)
9. **Contrast just below AA (light theme):** the topbar search placeholder `.label-text` (4.25:1), the Find filter group headings `h4` and `.find-prefs` (4.41:1), and `.td-date` (4.41:1). The `·` separators measure 1.5–1.7:1 but are decorative. Bump `--fg-3` slightly or use `--fg-2` for these labels.
10. **`.ics` export doesn't escape semicolons:** `esc` uses `"\;"`, which is just `";"` in JS. It should be `"\\;"`. (`zz-calendar.js cal_ics`)
11. **Shortcuts are case-sensitive:** with Caps Lock on, `N` and `E` do nothing. Compare `k.toLowerCase()`. (`30-shell.js useShortcuts`)
12. **"Upcoming · Next 7 days"** actually covers through the end of day +7 (`startOfDay + 8*DAY`), so it shows 8 calendar days. (`today.js today_upcoming`)
13. **Closing the command palette leaves focus on `<body>`.** Escape or picking an action doesn't return focus to the element that had it, so keyboard users lose their place. Remember `document.activeElement` on open and restore it on close. (`30-shell.js Palette`, which doesn't use `useFocusTrap`.)
14. **JSON round-trip nit:** apps without `appliedAt` come back as `appliedAt:null` instead of having the key absent. This is harmless, and everything else round-trips exactly.
15. **(v1 build only; the Today goal stepper was removed in the snapshot.)** Clearing Today's weekly goal field reset the goal to 1 (`today.js today_ThisWeek setGoal`: `+"" || 1`), and its max was 99 while Settings allows 100.

---

## Email parser results

These are the parsed fields (`plParse`, which the Log-an-email modal uses) compared with the expected values. The test emails are in `qa/e2e/emails.js`.

| Email | kind | company | title | interview time | Result |
|---|---|---|---|---|---|
| Greenhouse confirmation ("…reach out to schedule an interview") | **interview** ✗ (want confirmation) | Stripe ✓ | Software Engineering Intern ✓ | none ✓ | **misparse (P1-3)** |
| Lever confirmation ("Thank you for your interest in Plaid") | confirmation ✓ | Plaid ✓ | Software Engineer - New Grad ✓ | none ✓ | pass |
| Workday "Application Received - … (R212345)" | confirmation ✓ | Capital One ✓ | **"Technology Internship Program"** ✗ (suffix dropped) | none ✓ | misparse (P3-5) |
| Recruiter phone screen "Tuesday, November 10 at 3:30 PM ET" | screen ✓ | Datadog ✓ | Software Engineer Intern ✓ | 2026-11-10 15:30 ✓ (time zone ignored, P2-8) | pass |
| Virtual onsite "Monday, Nov 16, 2026 from 10:00am - 1:00pm PT" | interview ✓ | **"Robinhood Interviews"** ✗ | Software Engineer Intern ✓ | 2026-11-16 10:00 ✓ | misparse (P3-6) |
| Technical "Thursday 11/12 at 2pm ET" | interview ✓ | Duolingo ✓ | Software Engineer Intern ✓ | **null** ✗ | misparse (P2-9) |
| Rejection after interview ("move forward with other candidates") | rejection ✓ | Ramp ✓ | Software Engineer Intern ✓ | none ✓ | pass |
| Offer ("thrilled to extend you an offer") | **other** ✗ | Figma ✓ | Software Engineer Intern ✓ | none ✓ | **misparse (P1-3)** |
| Generic "Thank you for your interest… Unfortunately, due to the high volume…" | **rejection** ✗ | Acme Corp ✓ | (none) ✓ | none ✓ | **misparse (P1-3)** |
| HackerRank assessment "invited by Coinbase… complete it by Nov 10" | interview ✓ | **HackerRank** ✗ | **(empty)** ✗ | **Nov 10 10:00** ✗ (deadline) | misparse (P2-7) |
| Ashby rejection "applying to the Software Engineer, New Grad role" | rejection ✓ | Notion ✓ | **(empty)** ✗ | none ✓ | misparse (P3-7) |
| 4 built-in samples | all ✓ | all ✓ | all ✓ | Nov 5 14:00, interviewers "Priya Shah and Tom Lee" ✓ | pass |

What confirming did, verified against the store:
- Interview sample → existing Northwind: a round was added and the stage stayed Interviews. ✓
- Rejection sample → Quarry moved Applied → Rejected with `lastReplyAt`. ✓
- Offer sample → Fernhill moved Screen → Offer, and the celebration showed. ✓
- Confirmation sample on an app already in Interviews: no regression. ✓
- New Datadog email → new app in Screen with a Recruiter round. ✓
- Empty company is blocked with a message. ✓
- Empty textarea shows an error. ✓
- MOCK "Read with Claude" fills the preview with the AI label. ✓

---

## What passed

Configurations: 1440 and 375, with and without `MOCK=1`. No console errors anywhere except the crashes listed above.

- **Onboarding:**
  - Fresh start shows onboarding, and the N and Ctrl+K shortcuts are inert while it's open.
  - Level, role, location, sponsorship and name are saved, and the name is trimmed.
  - Pasting a resume detects 14 skills with no false "C" or "R". Removing and adding skills works, and "kubernetes" is normalized to "Kubernetes".
  - The step 3 match count equals my own computation (422).
  - Examples load, the app lands on Today with the greeting name, and a reload keeps everything.
  - Find opens with "Using your preferences".
  - Skip setup works.
  - No overflow at 375.
- **Find:**
  - The preference filter count is correct.
  - Show all, search (multi-word, "c++"), the empty state with its suggestion, and each filter (level, role, location, posted 7d, visa yes, hide-citizenship, hide-ghost) all match my own counts. This was verified on v1; the snapshot collapses duplicate listings, so "Show all" is now 7,584.
  - Clear filters works.
  - Sorts: Newest, Fewest ghost (ascending) and Best fit (descending), and the sort persists.
  - Show more goes 60 → 120, and "Showing X of Y" is correct.
  - Save, Undo and re-save work, and the job appears in Pipeline Saved.
  - J, K, S and Enter work.
  - The job drawer: focus moves inside it, Mark as applied works for both saved and untracked jobs, the Open in pipeline button appears, the company link opens the company drawer, and Escape closes it.
  - On mobile, filters open in a modal with a live count and Clear works.
  - MOCK shows the Ask Claude section and non-MOCK hides it.
- **Pipeline:**
  - Drag and drop works between columns and onto the collapsed Rejected rail.
  - Undo restores the stage, removes the event and clears `lastReplyAt`.
  - Arrow Left and Right work for the normal stages, and focus stays on the moved card.
  - The Move menu stays in the viewport and closes with Escape.
  - The filter matches company, title and location, with a no-match callout.
  - The table view sorts ascending and descending, the inline stage select moves the app without opening the drawer, and the chosen view persists.
- **App drawer:**
  - 4 tabs.
  - Location, salary, URL and applied date save. Contacts can be added and removed with undo.
  - Rounds: add, type, date and time, interviewers and prep all save. Outcome changes (passed, didn't pass) and the thanked checkbox save.
  - Deleting a round needs confirmation, and Escape closes only the confirm dialog.
  - Timeline notes save and update `lastActivityAt`.
  - Notes autosave shows "Saved" and persist after a reload.
  - Keys 3 and 4 move the stage, and typing digits in notes doesn't.
  - The draft modal opens over the drawer with the template and profile name, and Escape closes the modal first, then the drawer.
  - Delete with confirm, then Undo, works.
  - Focus returns to the card when the drawer closes.
- **Today:**
  - The task list matches `computeTasks`, Show more works, and the rail count matches.
  - Thank-you: the draft has the template, and Mark as sent sets `thanked` and removes the task.
  - Follow-up: the template is filled, MOCK Improve and Undo rewrite work, and Mark as sent sets `followedUpAt`, logs an event and removes the task.
  - Mark ghosted works.
  - Prep jumps to the Prep page focused on that round.
  - Snoozing for 3 days stores about now + 3 days, dismiss and undo work, and both persist after a reload.
  - The goal +/- buttons and typed values work, and the goal clamps 0 → 1 and 500 → 99.
  - The This week number matches `computeStats`.
- **Prep:**
  - Choosing a round from the list (desktop) or the select (mobile) works and stores `prepFocus`.
  - Prep notes save to `round.prep`, persist after a reload and reload when switching rounds.
  - The practice timer counts down, pauses and resets on the next question.
  - The resume CTA leads to talking points (2).
  - Practice without an interview works.
  - MOCK feedback and tailored questions work.
- **Insights:**
  - Applied, response rate, interview rate and median days, the funnel (8 applied, 4 replied, 3 interviewed, 1 offer), and the outcome totals all equal my independent computation.
  - The weekly chart total equals the applications in the 8-week window.
  - The examples toggle excludes example apps.
- **Settings:**
  - JSON export → import into a fresh profile round-trips apps, profile, settings and dismissed exactly, apart from the `appliedAt:undefined→null` nit.
  - CSV export → import keeps the count, stages and applied dates, handles quotes, commas and newlines, and dedupes a second import.
  - Bad JSON and a CSV with no usable columns show clear toasts.
  - The System, Light and Dark themes apply.
  - Reminders clamp to their min and max.
  - Hiding examples, clearing them and loading them again all work.
  - Delete all resets to onboarding and persists.
  - Without MOCK, export falls back to the clipboard with an explanation. With MOCK it uses the downloads capability.
- **Palette and shortcuts:**
  - Ctrl+K opens the palette with the input focused.
  - Searching finds applications, jobs and companies. Arrow keys and Enter open the right drawer.
  - Actions like Settings work, the empty state shows, and Enter on no results does nothing.
  - n, e and / work, as do g then p, i, s, f and t, and ?.
  - Escape order: palette, then modal, then drawer, one layer at a time (fixed in 92f5941).
  - On mobile, More → Insights works and bottom-nav tap targets are at least 44 px.
- **Robustness:**
  - `null` storage and `apps:null` fall back cleanly.
  - With `data/jobs.json` missing, Find, Companies, Today and onboarding step 3 show clear error states, the job drawer says "Listing not found", and Try again loads the data once the file is back.
  - Long strings cause no page-level overflow on any route at 375 (only the drawer, P2-6).
  - 300 applications: every route renders in under 1 s, a stage move re-renders in under 200 ms, a filter keystroke takes under 150 ms, and nothing overflows at 375.
- **Accessibility:**
  - Every visible button and link has an accessible name, and every form control has a label, across all routes, the app drawer and the paste modal.
  - No duplicate ids.
  - Focus is visible.
  - Modals move focus inside and return it to the trigger on close.
  - There is one `main` landmark.
