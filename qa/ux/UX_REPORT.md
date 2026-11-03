# Heardback: first-run usability study

**Method.** I played the participant myself: a stressed 3rd-year CS student recruiting for Summer 2027 internships and opening Heardback for the first time. I skimmed instead of reading, and I expected things to work the way they do in Linear, Notion and Gmail. I drove the real UI with Playwright clicks and typing, finding elements by visible text and roles, and I read every screenshot.

**Setup**
- Harness: `qa/ux/ux.js`, modeled on `qa/shot.js`. It uses a persistent browser profile so state carries over between task scripts, a fixed port, the timezone America/Los_Angeles, and optional `MOCK=1` and `CLOCK=` overrides.
- Task scripts: `qa/ux/t*.js` for desktop and `qa/ux/m*.js` for mobile.
- Screenshots: 91 of them, in `qa/out-ux/`.
- Viewports: `SETUP=fresh` with no example data at 1440×900, then the critical tasks repeated at 375×812.
- Today was Tue Nov 3 2026, about 3:30 AM PT.
- `MOCK=1` (the QA stand-in for Claude) was used only for the AI features: tailored questions, mock interview and backup save.
- `CLOCK=` was used to jump to Nov 9 and Nov 10 for the "day before" and "after the call" moments.
- No source files were edited.

---

## 1. Task results

The time column is estimated time for a real person, not script time. The clicks column counts deliberate clicks, plus any wasted ones.

| # | Task | Result | Time | Clicks | Main friction |
|---|------|--------|-----:|------:|---------------|
| 1 | Set up: Software + Data & AI, intern, SF + NYC + Remote, upload resume, finish | **Success with friction** | ~2 min | 10 | "New grad" was pre-selected and I had to un-pick it. The Name field sits below the fold at 900px. A reload mid-onboarding wiped all my choices and the resume. |
| 2 | Find 3 good internships from the last 3 days, not ghost jobs; save them; understand a flag | **Success with friction** | ~5 min | 11 (+2 wasted) | Clean rows show no "real" indicator, and the "Most likely real" sort looked the same as "Newest". No listing in the 3-day window was flagged, so I had to widen to "Any" and scroll to a 5-day-old KLA listing. "Remote" included "Remote in Germany". Every fit score was 88 or 92. |
| 3 | Record that I applied to one of them yesterday | **Success with friction** | ~1.5 min | 5 | Dragging to Applied set the date to today with no prompt. The date was only editable by clicking a plain-looking date. The header still said "Applied since Nov 3" afterwards (bug). |
| 4 | Log a recruiter email (30-min phone screen, Tue 2pm PT) so it shows as a scheduled round | **Success with friction** | ~1 min | 4 | The parse was excellent. But Today then said "No interviews in the next 7 days" and "Nothing needs you right now". |
| 5 | See what to do today; prep for the screen; draft a thank-you after | **Success with friction** | ~4 min | 7 | Today did not ask me to confirm the time with the recruiter. Opening Prep by reload or deep link hid Mock interview and Tailor and showed the wrong role type (bug). The thank-you appeared at the right moment but there is no "Open in email". |
| 6 | Look at how the search is going overall | **Success with friction** | ~1 min | 2 | "Interview rate 100%" and "Interviewed 1" for a call that hadn't happened yet. "Applications 3" counts saved jobs. |
| 7 | Move two stale applications to Ghosted at once | **Success with friction** | ~2 min | 4 (+1 wasted) | The Board doesn't multi-select (shift-click opened the drawer), so I had to find Table view. The backfilled apps showed "Days silent 0", so nothing told me they were stale (bug). On mobile the bulk-bar icons have no labels. |
| 8 | Back up my data | **Success** | ~1 min | 3 (+1 dead end) | Ctrl K for "backup" or "export" found nothing. The option is under Settings → Your data. The file name has no date. |

All 8 tasks were completed and none failed outright. The mobile re-runs of tasks 1, 2, 3, 4, 7 and 8 also succeeded. Mobile added two problems: "Log an email" is buried under More, and the bulk-bar icons have no labels.

---

## 2. Top 12 usability issues, ranked by severity

### 1. A logged interview vanishes from Today, and Today says nothing needs doing (High)
- **What happened:**
  - I logged the Nov 10, 2:00 PM invite. The toast said "Roku: moved to Screen, Recruiter call round added".
  - Today then showed **"Upcoming: No interviews in the next 7 days. Paste an invite email and the round shows up here."** and **"You're all caught up"**. The call was 7 days and 10 hours away.
  - Interview prep showed "next in 7 days" at the same moment.
  - The email dialog suggested "Reply with your availability", but that never became a task.
  - The same thing happened on mobile.
- **Why it matters:** This is the moment users most need reassurance. The empty-state copy invites them to paste the email again, and the real to-do (confirm the time) is lost.
- **Fix:**
  - Upcoming should always list the next scheduled rounds, whatever the date: "Tue, Nov 10 · 2:00 PM — Roku · Recruiter call (in 7 days)".
  - Use the 7-day window only for the empty-state copy.
  - When an invite is logged, add a Needs-you item: **"Confirm Tue 2:00 PM with Megan Torres"** with buttons **[Draft reply] [Done]**.

### 2. Backfilled applications never go stale (High; bug)
- **What happened:**
  - I added Stripe (applied Oct 1) and Figma (applied Oct 5) using the Applied-on date.
  - Table view showed **Days silent 0**, Last activity "just now" and Next step "Wait for a reply".
  - Today never suggested a follow-up or ghosting either of them.
- **Why it matters:** First-time users always arrive with weeks of past applications. The core promise ("know what to do next") breaks for exactly that history.
- **Fix:**
  - Count silence from the later of the applied date and the last reply, not from when the record was created.
  - When a past applied date is entered, nudge: **"No reply in 33 days. Mark as ghosted?"**

### 3. "Mark as applied" and drag-to-Applied assume today; changing the date is hidden (High)
- **What happened:**
  - Both paths, on desktop and on mobile, stamped "Applied just now" with no choice of date.
  - Fixing it meant opening the card and clicking a plain "Nov 3, 2026" text. The pencil only appears on hover.
- **Why it matters:** People log applications after the fact. A wrong date skews follow-up timing and the weekly stats.
- **Fix:** Make the toast say **"Marked applied today · Change"**, and let Change open the chips **Today / Yesterday / Pick a date…**. Always show the edit pencil on the Applied row.

### 4. Changing the applied date leaves stale text behind (High; bug)
- **What happened:** After I changed Applied to Nov 2:
  - The drawer header still said **"Applied since Nov 3"**, even after reopening.
  - "Last reply" said **"No reply in 0 days"**.
  - The follow-up date did update to Nov 9.
- **Why it matters:** The same app shows two dates for one fact, which undermines trust in every date it shows.
- **Fix:** Work out the header and the "No reply in N days" text from the applied date.

### 5. Interview prep loses its Claude features on reload or deep link (Medium-High; bug)
- **What happened:**
  - Opening `#prep` directly, or reloading on it, hid the **Mock interview** card and the **Tailor questions** button for good. I waited 6 seconds.
  - It also showed **Role type: Data & AI** instead of Software.
  - Arriving from the sidebar showed everything correctly.
- **Why it matters:** Before an interview, users will return to Prep from a bookmark or after a refresh. The most valuable prep tools quietly disappear.
- **Fix:** Re-render Prep once the job data and the Claude connection have both loaded. Look up the role type from the job, not by guessing from words in the title.

### 6. Ghost-job signals are hard to use while browsing (Medium)
- **What happened:**
  - Clean listings show nothing in the list.
  - The green dot next to the posting age means "new", but green means "Looks active" in the drawer and in the scoring legend.
  - "Most likely real" gave the same order as "Newest" because every recent listing scored 0. Nothing on screen explained this.
  - "Hide strong ghost signals" is off by default and sits below the fold on desktop.
  - The drawer says "**Scored 0/100**", which reads like a failing grade.
- **Why it matters:** Ghost-job detection is the product's headline promise, and in the list it is nearly invisible.
- **Fix:**
  - Add a small realness chip to every row: **"✓ Active"** or **"⚠ 2 signals"**.
  - Label the dot ("New").
  - Move "Hide strong ghost signals" to the top of the filters and turn it on by default.
  - Rewrite the score copy: **"Ghost score 0 of 100 (lower is better)"**.

### 7. Onboarding forgets everything on reload (Medium; bug)
- **What happened:** I reloaded on step 2 and came back to step 1 with the defaults restored. My roles, locations, intern-only choice, name and parsed resume were all gone.
- **Why it matters:** The app runs inside a page that can reload, and a stressed user who loses their resume upload may not come back.
- **Fix:** Save a draft of the profile after each step and resume at the same step, with the line **"Picking up where you left off."**

### 8. On mobile, "Log an email" is buried (Medium)
- **What happened:**
  - At 375px the top-bar **+** opens Add application only.
  - "Log an email" lives under **More**, or below the fold in Today's Upcoming card.
  - The More sheet also shows "Keyboard shortcuts", which is useless on a phone.
- **Why it matters:** Recruiter emails arrive on the phone. Logging them should take one tap.
- **Fix:** Make **+** open a two-option sheet: **"Add application" / "Log an email"**. Hide "Keyboard shortcuts" on touch devices.

### 9. Bulk actions are hard to find and unlabeled on mobile (Medium)
- **What happened:**
  - On the Board, shift-click (my habit from Linear) opened the drawer, and the Board has no checkboxes. I had to discover Table view.
  - The mobile bulk bar shows only icons. The "Mark as ghosted" icon looks like a **padlock**.
- **Why it matters:** Cleaning up stale applications is a weekly chore. Multi-select should behave the same in every view.
- **Fix:**
  - Support shift/⌘-click and **X** to select on Board cards.
  - On mobile, show labels ("Ghosted", "Export", "Delete") or long-press tooltips.
  - Use a ghost or moon-style icon instead of the lock.

### 10. Insights overstates progress (Medium)
- **What happened:**
  - With one recruiter call booked and not yet held, Insights showed **Interview rate 100%** and a funnel of "Interviewed 1 100%".
  - "Applications 3" counted 2 saved jobs.
  - One day after my first application, Today showed **Response rate 0% (0 of 1)**.
- **Why it matters:** Inflated numbers mislead, and a 0% after one day discourages an already stressed user.
- **Fix:**
  - Count "interviewed" only after an interview round has actually happened, and keep recruiter screens separate.
  - Label the total **"3 tracked · 1 applied · 2 saved"**.
  - Hide rates until there are at least 5 applications or 7 days of data, and show **"Too early to tell"** instead.

### 11. Matching noise makes "fit" unhelpful (Medium-Low)
- **What happened:**
  - "Remote" matched **"Remote in Germany"** (Entrust).
  - "Data Intelligence/Technical Program Manager Intern" appeared under Software / Data & AI at **Fit 92**.
  - Nearly every row scored 88 or 92, so "Best fit" doesn't separate anything.
  - KLA appears as both "KLA" and "KLA Corporation", and only one of the duplicate "Software Engineer Intern" listings is flagged.
- **Why it matters:** When every score is the same, users stop trusting it.
- **Fix:**
  - Make the Remote filter country-aware and label it **"Remote (US)"**.
  - Lower the score for title keywords like "Program Manager" in the Software and Data & AI categories.
  - Spread scores using how much of the skills overlap.
  - Merge company aliases.

### 12. Ctrl K doesn't know actions, and the Settings route is a mystery (Low)
- **What happened:**
  - "backup", "export" and "ghost" all returned "No matches".
  - Settings lives at `#prefs`, so typing `#settings` falls back to Today.
- **Why it matters:** Power users from Linear or Notion reach for the command palette first.
- **Fix:**
  - Add commands such as **"Export backup (JSON)"**, **"Export CSV"**, **"Log an email"** and **"Mark selected as ghosted"**, with synonyms (backup, download, save).
  - Make `#settings` an alias for `#prefs`.

**Smaller nits:**
- "Good evening, Jordan" appears at 3:30 AM (by design for hours before 5 AM, but it reads oddly).
- At 1440×900 the Name field is below the fold on step 1.
- Three "Saved X to your pipeline" toasts stack on top of the Fit and bookmark column.
- The mobile Filters sheet has two "Clear filters" controls.
- The mobile Board opens on an empty "Saved" column while the real cards sit off-screen to the right; consider defaulting to Table on phones.
- The thank-you note has no **"Open in email"** (mailto prefilled to mtorres@roku.com), and "about the Software Engineer Intern - AI Engineering at Roku" is missing the word "role".
- The backup file name `heardback-backup.json` has no date; use `heardback-backup-2026-11-03.json`.
- The pipeline subtitle "3 applications · 0 active" counts saved jobs as applications.
- The sidebar Pipeline badge number is never explained.

---

## 3. Five things that delighted me

1. **Resume upload just worked.** The PDF parsed in about a second, 8 skill chips appeared that I could remove, and the note "only sent to Claude when you click an AI action" put me at ease.
2. **Email parsing felt like magic.** It got the company, role and interviewer (Daniel Park), converted Tue Nov 10 2:00 PM PT to my time, matched the email to my existing Roku application, and previewed the result in plain English: "Moves Roku to Screen and adds a Recruiter call round on Tue, Nov 10 at 2:00 PM." Pasting only the email body (no headers) also worked, and pasting it twice was caught: "round already logged".
3. **Ghost scoring is honest and explainable.** Each flagged listing gives its reason ("Posted and closed 5× before (since Apr 2026); 3 similar openings live now"). The "How we score listings" table shows the points and admits its own limits.
4. **The pipeline feels like Linear.** Drag between columns, toasts with Undo, a floating "2 selected · Move to… · Mark as ghosted · Export CSV · Delete" bar, and "Marked 2 applications as ghosted · Undo".
5. **Today got the timing right around the interview.** The day before, it showed "Recruiter call with Roku tomorrow · Prep". Right after the call, it showed "Send a thank-you note to Roku · within 24 hours" with a prefilled "Hi Daniel," draft. The mobile Filters sheet's "Show 18 matches" button was a nice touch too.

---

## 4. Bugs

| ID | Severity | Bug | Repro |
|----|----------|-----|-------|
| B1 | High | Days silent and staleness are counted from when the record was created, not the applied date. | Add an application with Applied on Oct 1, then open Table: Days silent 0 and "Wait for a reply". Today stays "all caught up". |
| B2 | High | Today's Upcoming ignores a round 7+ days out and says "No interviews in the next 7 days" right after a round was added, while Prep says "next in 7 days". | Log an invite for 7 days and a few hours ahead, then open Today. |
| B3 | Medium | The drawer header "Applied since Nov 3" doesn't update after the Applied date is edited, and "No reply in 0 days" is wrong. | Open the app drawer, change Applied to yesterday, then reopen. |
| B4 | Medium | Prep opened via reload or `#prep` hides Mock interview and Tailor questions and shows the wrong Role type (Data & AI instead of Software). | Use `MOCK=1`, load `/#prep` directly, then compare with clicking the sidebar link (`qa/ux/t5c.js`). |
| B5 | Medium | Onboarding state isn't saved between steps; a reload resets to step 1 with the defaults. | Fill step 1, Continue, then reload. |
| B6 | Low | The Remote location filter includes non-US remote ("Remote in Germany +1 more"). | Find with Remote checked; see the Entrust "AI Developer Intern". |
| B7 | Low | A TPM role is categorized as Data & AI with Fit 92. | Applied Materials "Data Intelligence/Technical Program Manager Intern". |
| B8 | Low (unconfirmed) | With the clock moved 7 days past the data snapshot, "New for you" showed off-target UK/TX roles (Fit 68–72). This is likely caused by stale data, but it shows that "New for you" falls back to off-target roles silently. | `CLOCK=2026-11-10…` and Today (`qa/ux/t5d.js`). |

No console errors and no horizontal overflow at either viewport.

---

## 5. Reproducing

```
cd /home/user/heardback
FRESH=1 TAG=t1 node qa/ux/t1.js                                # onboarding (desktop, fresh profile)
TAG=t2 node qa/ux/t2b.js ; TAG=t2e node qa/ux/t2e.js           # find + flagged listing
TAG=t4c node qa/ux/t4c.js                                      # email (run once on a fresh profile)
MOCK=1 node qa/ux/t5c.js ; MOCK=1 START=today node qa/ux/t5c.js   # B4 prep deep-link
MOCK=1 CLOCK='2026-11-10T15:20:00-08:00' TAG=t5e node qa/ux/t5e.js  # thank-you
W=375 FRESH=1 TAG=m1 node qa/ux/m1.js                          # mobile, then m2..m7
```
Screenshots are named `qa/out-ux/<tag>-<step>-<name>-<width>.png`.
