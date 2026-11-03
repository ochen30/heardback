# Heardback v5 regression QA (E2E, Playwright)

Date: 2026-11-03. Tester: QA agent. No files under `src/` were edited.

**Build under test.** `dist/index.html` md5 `7767a46d…` (built 10:28 UTC), snapshotted to `qa/e2e/out2/dist/` so concurrent rebuilds by other agents could not change results mid-run. `lib.js` uses that snapshot by default (override with `DIST=`). Browser time zone is UTC unless `TZID=` is set.

**How to run.** `qa/e2e/run-all.sh` runs every script at 1440 and 375, with and without `MOCK=1`, writing results, logs and screenshots to `qa/e2e/out2/` (`E2E_OUT=` to change; `TESTS="t13-bulk t14-new"` to run a subset; `PAR=` sets parallelism). Single script: `W=375 MOCK=1 node qa/e2e/t13-bulk.js`.

**Final run:** 49 result files (12 scripts × 4 configs + a11y). **2,280 checks: 2,238 pass, 42 fail.** The 42 failures are the 13 bugs below, repeated across configs. Every v2 suite flow passes against v5 after the selector updates.

Counts of new or remaining bugs: **P0 0 · P1 0 · P2 3 · P3 10**

| Script | Checks | Pass |
|---|---|---|
| t1-onboarding | 124 | 124 |
| t2-find | 152 | 152 |
| t3-pipeline (board, table, drawer) | 284 | 284 |
| t5-email | 190 | 186 |
| t6-today | 108 | 108 |
| t7-prep-stats | 130 | 130 |
| t9-settings | 144 | 144 |
| t10-palette | 134 | 134 |
| t11-robust | 124 | 124 |
| **t13-bulk** (new) | 200 | 200 |
| **t14-new** (new features) | 420 | 396 |
| **t15-keys** (new) | 248 | 236 |
| t12-a11y (1440) | 22 | 20 |

---

## P2: wrong behavior

### P2-1. Command palette "Open the posting" calls `window.open`, which the artifact frame blocks
- **Repro:** open an application that has a posting URL → Ctrl+K → type "posting" → Enter.
- **Expected:** the posting opens in a new tab.
- **Actual:** `window.open(a.url, "_blank", "noopener")` runs (the test records 1 call). In the claude.ai frame this does nothing, and the brief forbids `window.open`. The raw `a.url` is also passed without `plHref()`, so a stored URL like `northwind.example/jobs/1` would resolve relative to the page.
- **Where:** `src/js/30-shell.js` `Palette`, the app context list (`label: "Open the posting"`).
- **Fix:** build an anchor and click it: `const el = Object.assign(document.createElement("a"), { href: plHref(a.url), target: "_blank", rel: "noopener" }); document.body.appendChild(el); el.click(); el.remove();`. Alternatively, render the palette item as a real `<a>`.

### P2-2. "Add to calendar" without a downloads capability copies raw .ics text to the clipboard, then says "In calendar"
- **Repro (no MOCK, so `caps.downloads` is null; this is the normal no-connector case):** app drawer → Rounds → upcoming round → Add to calendar.
- **Actual:** `saveFile` falls back to `copyText` and returns `true`. The ICS source lands on the clipboard with the toast "File downloads aren't available here, so the contents were copied instead". The round is marked `calendar:"ics"` and the button turns into **"In calendar"**, but nothing was added to any calendar, and most users can't do anything with pasted VCALENDAR text.
- **Where:** `src/js/views/zz-calendar.js` `addToCalendar` (and `00-core.js saveFile`, which returns `true` for a clipboard copy).
- **Fix:** only set `calendar` when `caps.downloads` actually saved the file. Without downloads, offer a Google Calendar template link instead, which needs no connector: `<a target="_blank" rel="noopener" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=YYYYMMDDTHHMMSSZ/…&details=…">`. Keep the ICS copy as a secondary "Copy .ics" option with honest copy.

### P2-3. Unreadable saved data: the backup is kept, but the user is only told if they open Settings
- **Repro:** set `heardback:v1` to truncated JSON → load `#today`.
- **Actual:** a raw copy is saved under `heardback:v1:corrupt:<ts>` (pass). The app then boots empty: Today says "Nothing to do yet" at 375, and onboarding or an empty shell appears at 1440. No message appears. The only callout (`.pf-corrupt`) is in Settings, so a user who thinks their data is gone will probably start over.
- **Where:** `src/js/views/prefs.js:285` is the only reader of `storage.corrupt`. The shell (`30-shell.js`) and onboarding don't check it.
- **Fix:** show the same callout as a global banner in the shell (and on onboarding step 1) while `storage.corrupt` is true. Add a "Restore from backup" button that opens Settings → Import.

---

## P3: minor, polish, a11y

### P3-1. Palette context actions: "Add an interview round" and "Draft a follow-up" are hidden until you type
- With an app drawer open, Ctrl+K shows `ctx.slice(0, 6)`. The 6 "Move to …" items fill that slice, so the actions the changelog advertises only appear after you type. (Typing "move to offer", "follow" or "round" works: all pass.)
- **Where:** `30-shell.js Palette`. **Fix:** order the list as next-stage move, Add round, Draft follow-up, Open posting, then the other moves, or show all context items when `q` is empty.

### P3-2. Inline-edit focus race: a key pressed in the same frame as the click goes to the drawer
- **Repro:** app drawer → click "Location" → type `5` straight away (Playwright does this deterministically). The stage moves to **Offer**, with the celebration. Pressing Escape inside that window closes the whole drawer instead of cancelling the edit (1 in 10 at 375).
- **Where:** `pipeline.js PlInline` focuses the input in `setTimeout(…, 0)`, and `PlEscape` registers with `useEscape` in a post-paint effect.
- **Fix:** focus in `useLayoutEffect` (or with `autoFocus`), and register the Escape handler in a layout effect. Also, the digit shortcut handler could ignore keys while `document.activeElement` is a `.pl-inline` button that was just activated.

### P3-3. Find: after J/K + Enter → Escape, focus falls to `<body>`
- The drawer restores focus to whatever was focused before it opened. J/K only highlights the row (`aria-selected`) without focusing it, so focus goes to `body`. Opening by mouse restores focus correctly.
- **Where:** `find.js` keyboard handler. **Fix:** `row.focus({preventScroll:true})` on J/K, or pass the row as the drawer's restore target.

### P3-4. Command palette has no combobox semantics
- `.palette input` has no `role="combobox"`, `aria-controls` or `aria-activedescendant`, and the options have no `id`. Screen readers don't announce the highlighted option as you arrow through.
- **Where:** `30-shell.js Palette`. **Fix:** give the input `role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant={"pal-opt-"+sel}`, and give each option `id={"pal-opt-"+i}`.

### P3-5. .ics lines are not folded at 75 octets (RFC 5545 §3.1)
- `DESCRIPTION:` was 127 octets in the test. Google and Apple accept it, but strict parsers (some Outlook versions) may not.
- **Where:** `zz-calendar.js cal_ics`. **Fix:** fold each line to ≤75 octets with `\r\n ` continuations (count UTF-8 bytes).

### P3-6. Google Calendar connector: the start time is browser-local but no `timeZone` is sent
- `create_event` receives `startTime: "2026-11-20T17:30:00"` with no `timeZone`. The connector's schema says the server then uses the calendar's own zone. If the browser zone differs from the calendar zone (for example when travelling), the event lands at the wrong hour.
- **Where:** `zz-calendar.js addToCalendar`. **Fix:** add `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone`.

### P3-7. Email parser: the assessment invite has an empty title
- "You have been invited by Coinbase to take the Software Engineer Intern coding assessment" → company Coinbase (fixed since v2), but title "". All other 10 realistic emails parse correctly, including the time zone conversions: 3:30 PM ET → 20:30 UTC, 10am PT → 18:00 UTC, 11/12 2pm ET → 19:00 UTC.
- **Where:** `pipeline.js plParse` / `20-data.js parseEmail`. **Fix:** add the pattern `take the (.+?) (?:coding |online |technical )?(?:assessment|challenge|test)`.

### P3-8. Import accepts absurd timestamps
- A JSON import with `appliedAt: 1e20` is stored unchanged.
- **Where:** `00-core.js cleanApp` `ts()`. **Fix:** treat values outside 2000-01-01 … now + 2 years as null.

### P3-9. A record with an empty company and an empty title is silently dropped on load, even when it has interview rounds
- `cleanApp` returns `null` when both fields are empty.
- **Fix:** keep the record as "Unknown company / Untitled role" when it has rounds, notes or events, and only drop truly empty objects.

### P3-10. Decorative "·" separators have 1.4–1.7:1 contrast (t12-a11y, light and dark)
- These are purely decorative, but automated audits flag them.
- **Fix:** add `aria-hidden="true"` to `.sep` (they are already visual-only), or move them to `--fg-3`.

**Flaky, not filed:** one `t3-pipeline` 375 + MOCK run under 8× parallel load saved `appliedAt` as the original date at 12:00 instead of the typed Oct 1. It didn't reproduce in 4 isolated runs, and opening and blurring the date without a change doesn't modify the value.

---

## Pass list (verified on v5)

**v2 bugs confirmed fixed:** P0-1 unknown or missing stage crash, P0-2 malformed profile import crash (all 7 routes render, and drawers and every tab open, with a deliberately corrupt store: null apps, `stage:"archived"`, `events:[null]`, string locations, `name:{}`, `weeklyGoal:"ten"`, bad settings). Also fixed:
- P1-1: a raw copy is kept (message gap remains, see P2-3).
- P1-3: parser now gets 10 of 11 emails right.
- P1-4: no duplicate rounds.
- P2-1: Arrow keys never close an app.
- P2-2: notes flush on reload.
- P2-3: hidden examples are not matched.
- P2-4: CSV has an `example` column, and re-import keeps the flag.
- P2-5: Tab is trapped in every modal and drawer.
- P2-6: long names wrap.
- P2-8 and P2-9: time zones and numeric dates are parsed.
- P2-10: the median n now matches the sample.

**Updated flows (all pass at 1440 and 375, MOCK and non-MOCK):**
- Onboarding: the location checklist plus "Show more".
- Find: Show all = de-duplicated count (`jobsStore.jobs.length`, 7,582 vs 8,225 raw), location and visa checkboxes and radios, "Most likely real" sort.
- Today: "⋯" menu (role=menu, inside the viewport, Escape closes it, focus returns), Snooze 3 days / Dismiss + Undo, persistence across reload.
- App drawer: underline tabs with roving arrow keys; read-mode values that edit on click (Enter saves, Escape cancels without closing the drawer); "Add contact" reveals the form with an empty-name error; rounds as summary rows with Edit, Done collapses and focuses the row, outcome select.
- Log an email: modal flows; time-zone-aware times.
- Insights: "Applications N" plus "N sent · saved"; median n = replyN.
- Board drag-and-drop onto the Closed rail's Rejected and Ghosted targets.

**New features:**
- **Bulk (200/200):**
  - Selecting: the table checkbox selects without opening the drawer; Shift range on the checkbox and on the row body; the header checkbox is indeterminate, then selects all, then none; X on a focused row or card; Ctrl+A in the table; Escape clears; filtering drops hidden selections; switching view clears.
  - Floating bar: stays inside the viewport at 375; Move with one toast and one Undo that restores every app byte-for-byte; Mark ghosted + Undo; "Already in Applied" message.
  - Export: MOCK saves `heardback-3-applications-YYYY-MM-DD.csv`; without MOCK the CSV is copied (header + 3 rows).
  - Delete: confirm dialog, Escape cancels, delete then Undo restores.
  - Board: Ctrl- and Cmd-click toggle, Shift range in on-screen order, focus lands on a card after a move, Escape with the drawer open closes only the drawer.
- **Mock interview (MOCK):**
  - Hidden without Claude.
  - Running: Thinking… + Stop; streamed question; "Question 1 of 3"; answer box focused; Ctrl+Enter sends.
  - Stop mid-stream keeps the partial question marked "stopped" and lets you answer.
  - Scoring: End and score → scorecard 4/5, focused heading, AI label, transcript in `<details>`; the brief has no name or email.
  - Save to round notes appends to the right round and refreshes the notes field; the button changes to Saved.
  - A malformed scorecard shows a plain error with "Try the scorecard again", and retry works.
  - Leaving mid-stream causes no errors; Practice mode also offers the mock.
- **Palette context:** "Move to Offer" moves the open app (palette closes, drawer stays); Draft follow-up opens the template; Add round → Rounds tab. In the job drawer: Save this job / Mark as applied / View company; after saving, "Open in pipeline" replaces Save and exactly one app is created.
- **How we score listings:** opens from Find and from `openModal('method')`; 5 signals; distribution sums to 100%; "Across N" = de-duplicated count; no overflow; Escape returns focus to the link; layered over the job drawer, Escape closes only the modal.
- **PDF upload:**
  - Onboarding step 2 and Settings → resume modal extract "Jordan Lee…"; skills Python, PyTorch and Docker are detected and saved on finish.
  - Errors: a corrupt PDF, a .docx and a blocked CDN each show plain errors and keep the existing text.
  - pdf.js isn't loaded at boot.
- **Posting taken down:** Today tasks appear for saved and applied apps (not offer, never for examples). The Review action opens the app. The card status says "Posting taken down". Dismiss works.
- **New since your last visit:** no link on the first visit. With `lastVisit` 2 days ago, the link count equals the filtered listings posted since then. Clicking it filters (`posted=since`, chip on). A reload within 30 minutes keeps `since`. Garbage `lastVisit` values don't crash and don't produce a NaN filter.
- **Add to calendar:** the MOCK .ics is `cal-co-technical.ics` (`text/calendar`) with UTC DTSTART, +45 min DTEND, escaped SUMMARY and DESCRIPTION, CRLF and VALARM. No button on past or undated rounds. Connector success: `create_event` gets local times and a toast. Connector not connected: falls back to .ics.
- **Robustness:** corrupt store (above); bad imports (non-array apps, null items, a 5,000-char company name, array root, empty file, CSV quoted commas and escaped quotes, BOM header) all import or reject with plain toasts and no page errors; 300 apps render each route in under 1 s.
- **Keyboard and focus (t15):**
  - Tab and Shift+Tab are trapped in the add, paste, method, shortcuts and resume modals, the app, job and company drawers, the palette, and the mobile More sheet; focus is restored to the opener.
  - Escape layering: palette → modal → drawer, one layer per press, with focus returned to the layer below.
  - Shortcuts are inert while typing and while a modal is open; digit keys move the stage in the drawer; ?, E, /, Ctrl+K toggle, and G+T/F/P/C/I/S all work.
  - The Today and card menus support arrow keys, and Escape returns focus to the trigger.

**Notes:**
- Ctrl+Z does not undo a stage move (Undo is toast-only).
- J/K while the job drawer is open doesn't move the drawer.
- Ctrl+K opens the palette over an open modal (layered correctly).
- The QA mock (`qa/mock-claude.js`) answers the scorecard prompt with a question array, because the scorecard prompt contains both "JSON" and "question". `t14-new.js` wraps the mock to stream slowly and return a valid scorecard, and also uses the array case to check the error path.

## Suite changes (qa/e2e only)
- `lib.js`:
  - Paths: output goes to `out2/` (`E2E_OUT`), and the default dist is the `out2/dist` snapshot.
  - Browser setup: routes pdfjs-dist; context options `timezoneId` (`TZID`, default UTC) and `acceptDownloads`; new `init` option for extra init scripts.
- `run-all.sh`: writes to `out2`, includes t13–t15 and a11y, with `TESTS`/`PAR` overrides and a 300 s per-run timeout.
- Updated `t1`, `t2`, `t3`, `t5` (UTC expectations in `emails.js`), `t6`, `t7`, `t9`, `t10`, `t11` to the current UI.
- New: `t13-bulk.js`, `t14-new.js`, `t15-keys.js`.
