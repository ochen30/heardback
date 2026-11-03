# Heardback: power-user study (5 weeks in, ~40 applications, keyboard first)

**Participant (played by me):** a CS junior who has used Heardback every day for 5 weeks. They have 42 tracked roles in various states and want to get through the morning routine fast, using the keyboard and Ctrl K on a 1440×900 laptop, with a quick phone check on the bus (375×812).

**Setup**
- Harness: `qa/ux3/h.js`, modeled on `qa/shot.js` and `qa/ux2/h.js`.
  - It uses a persistent profile and the timezone America/Los_Angeles.
  - The clock is pinned to **Tue Nov 3 2026, 8:30 AM PT**.
  - Desktop runs use a real keyboard with no touch. When W is under 600, the phone runs use `isMobile` and touch.
- Seed: `qa/ux3/seed.js` builds state with `page.evaluate` and `Apps.create`/`Apps.update`.
  - Profile: Software + Data & AI, intern, SF Bay Area + NYC + Remote, resume text and 12 skills.
  - Applications: 18 applied, 6 screen, 5 interviews, 2 offers, 6 rejected, 3 ghosted and 2 saved. Applied dates fall across the last 5 weeks.
  - Rounds: there are past and upcoming rounds, and some outcomes are still pending.
  - Linked postings: 30 applications have real `jobId`s from `dist/data/jobs.json`. Two of them (Figma, applied; Ramp, screen) point to IDs that no longer exist.
- Task scripts: `t1`–`t6`, `perf.js`, `peek.js` and `notepersist.js`.
- Screenshots: `qa/out-ux3/`.
- No source files were edited. Claude was not mocked.
- Not repeated here: findings already fixed since `qa/ux/UX_REPORT.md` and `qa/ux2/UX_REPORT2.md`.

**Reproducing**
```
FRESH=1 TAG=seed node qa/ux3/seed.js
TAG=t1 node qa/ux3/t1.js
# t2 … t5 run the same way; the seed should be fresh before t2
W=375 TAG=t6 node qa/ux3/t6.js
TAG=perf node qa/ux3/perf.js
```

---

## 1. Tasks

| # | Task | Result | Effort (scripted) | Main friction |
|---|------|--------|------------------|---------------|
| 1 | Morning routine on Today | **Friction** | 7 of 27 items cleared in 14 clicks. Clearing all 27 would take a real person about 6–8 min. | **"27 things need you today"**, shown as one flat list with 5 visible and "Show 22 more". There's no grouping, no batching and no keyboard. Some items repeat: Scale AI has both a thank-you and a "How did it go?"; Figma has both a follow-up and "took down". Three of the five visible rows repeat the Upcoming card. After every action, focus falls back to `<body>`. |
| 2 | Keyboard only: palette → app → Interviews → add round → Find → save 3 with J/K/S | **Success with friction** | About 50 keys on the shortest path (137 including probing). About 7s to reach the round form and 6.5s in Find. | Ctrl K → "hex" → Enter worked well. **"Add an interview round" only switches tabs**, after which it took **11 Tabs** to reach "Add round". The date field eats Tab presses. Esc then G F lands focus on `<body>`. J/K/S in Find worked very well. **S on a role you've applied to silently does nothing**, and **S inside the job drawer does nothing**. |
| 3 | Bulk-mark 4 stale applications as ghosted | **Success** | Focus card + X ×4, then 1 click, about 2s, with Undo. | It works on the board. But the stale cards sit at the **bottom of an 18-card Applied column** (about 2,800px of scrolling). There's no "silent 21d+" filter, and Today's 5 "Mark as ghosted" nudges can't be done in one go. |
| 4 | Insights at real volume | **Partial** | 0 clicks | The headline numbers read well: 48% response, 11-day median. But **3 of the 7 "Patterns" are misleading** (see B1–B3), and none of them has an action button. |
| 5 | Find the 2 taken-down postings and decide what to do | **Success with friction** | 3 clicks once found | The palette ("taken down", "removed", "posting") and the Pipeline filter can't find them. On Today they are items **#20 and #22 of 23**, behind "Show more". **Clicking "Review" opens a drawer that never mentions the takedown**, and still offers "Open posting" for a dead link. It doesn't suggest Figma's other open roles, even though the palette shows 6+. |
| 6 | Phone: what's next today, plus a quick note | **Success with friction** | 5 taps | The headline says "22 things… · 4 interviews this week" but not *which* interview is next. Upcoming starts 850px down. The quick note lives in **Timeline**, while the **Notes** tab is a different free-text field. A note added there doesn't show in Timeline, and the reverse is also true. |

---

## 2. Top 10 issues, ranked

### 1. Today is a 27-item flat list with no triage or batching (High)

**What happened**
- The list is sorted only by `pri`. Six follow-ups come before the three "How did it go?" items.
- Ghost nudges are mixed in with takedowns.
- An upcoming round shows up both in Needs you and in Upcoming.

**Fix**
- Group the list into three sections, each with its own count, and show no more than about 7 rows above the fold:
  1. **"Today"**: anything time-bound, meaning prep, thank-yous and confirmations.
  2. **"Quick wins"**: batchable items.
  3. **"When you have time"**: everything else.
- In Quick wins, collapse items of the same kind into one row each:
  - **"5 applications silent 21+ days · [Mark all ghosted] [Review]"**
  - **"6 follow-ups due · [Draft one by one] [Snooze all 3 days]"**
- Show one row per application. Merge "thank-you" and "how did it go" into **"Scale AI onsite (Sun): Thank them · Log outcome"**.
- Drop rows that duplicate Upcoming; that card already lists them.
- Headline copy: **"6 for today · 11 quick wins · next: Notion technical at 2:00 PM"**.

### 2. Today and the drawers aren't usable from the keyboard (High for this persona)

**What happened**
- The shortcuts sheet promises **"J / K: Next / previous item in lists"**, but J/K only works in Find (B7).
- After Mark as ghosted, Mark as sent or Esc, focus goes to `<body>`, so the next task means Tabbing from the top again (8 Tabs).

**Fix**
- On Today, J/K moves between task rows, and Enter runs the primary action.
- Add single-key actions on the selected row: G ghost, S snooze 3 days, D dismiss, O open.
- After an action, move focus to the next row.
- Add J/K plus Enter to the Pipeline board and table.
- When a drawer opened from the palette closes, return focus to the row of the item it opened.

### 3. Logging an outcome takes 4 or more steps, buried in an edit form (High)

**What happened**
- "Log outcome" opens the drawer's Rounds tab with a full editor: date, interviewers, prep notes and a "Pending" select.
- The drawer footer button says "Log outcome" as well.

**Fix**
- Put inline chips right on the Today row: **"How did the Coinbase recruiter call go? [Passed] [Didn't pass] [Still waiting]"**.
- "Still waiting" snoozes the item for 3 days.
- Picking Passed asks **"Add the next round?"** with one date field.

### 4. A taken-down posting is a dead end (High)

**What happened**
- The drawer only flags a takedown when the stage is Saved (`pipeline.js:89`). Applied and Screen applications show nothing (B4).
- The drawer still offers "Open posting".

**Fix**
- In the drawer, add a callout: **"Figma took this posting down on or before Nov 3. You applied Oct 22 and haven't heard back."**
- Give it three buttons:
  - **[Send a last follow-up]**
  - **[Mark as ghosted]**
  - **[See Figma's 6 open roles]**
- Remove the "Open posting" button, or relabel it **"Open posting (may be gone)"**.
- Make takedowns findable:
  - Add a palette command **"Show taken-down postings"**.
  - Add a Pipeline filter chip **"Posting taken down (2)"**.
- For Screen and Interviews, soften the copy: **"The posting closed, but your process with Ramp continues. No action needed."**, and default the task to dismissed.

### 5. Insights "Patterns" mislead at real volume and can't be acted on (High)

**What happened**
- **"Applying within 3 days of posting got replies 11%… vs 29% later"**: the early group is mostly last week's applications, which haven't had time to get a reply. This advice is backwards (B2).
- **"Data & AI 4 of 11 vs 1 of 12 for Software"** only covers the 23 applications with a linked posting, out of 40, and doesn't say so (B3).
- **"Interviewed 13 / 33%"** counts Eudia's call later today and Point72's OA tonight (B1, still open from study 1, issue 10).
- **"Passed 14 of 14 interview rounds"** counts recruiter calls and an OA.

**Fix**
- Compare only applications at least 14 days old: "Of apps older than 2 weeks: applied ≤3 days after posting, 5 of 9 replied; later, 4 of 15 replied."
- Hide any pattern where a group has n < 8, and show n on every line.
- Count a round as an interview only when it is in the past and is not a recruiter call or an OA.
- Give each pattern a button:
  - **"5 past the median with no reply → [Draft follow-ups]"**
  - **"6 rejections before an interview → [Tailor resume for my next saved role]"**

### 6. The palette knows nouns but not verbs (Medium-High)

**What happened**
- These searches return "No matches": *ghost, follow, thank, outcome, note, snooze, export, select, table*.
- Ctrl K for "export" is still missing, as in study 1, issue 12.

**Fix**
- With an application open, add these commands:
  - **Mark as ghosted**, **Mark as rejected**
  - **Log outcome: Passed / Didn't pass**
  - **Draft thank-you**
  - **Add a note…** (a typed note is saved straight to the Timeline)
  - **Snooze nudges 3 days**
- Globally, add:
  - **Export backup (JSON)**
  - **Pipeline: switch to Table**
  - **Select all silent 21+ days**
  - **Show taken-down postings**
  - **Today: ghost all stale (5)**
- Show the 1–7 stage keys in the drawer's stepper tooltips ("Interviews · 4").

### 7. "Add an interview round" doesn't add a round, and moving to Interviews doesn't ask for one (Medium)

**What happened**
- The command opens the Rounds tab, and then it takes 11 Tabs to reach the button.
- A Move to Interviews via the palette or 1–7 doesn't prompt for a date. The card then shows "Replied just now", with nothing scheduled.

**Fix**
- The command should create the round and focus a natural-language date field: **"When? e.g. Thu 2pm"**.
- After a move to Screen or Interviews, show a toast: **"Moved to Interviews · [Add the date]"**.

### 8. Finding stale applications on the board needs scrolling and guesswork (Medium)

**What happened**
- Cards are about 155px tall, so 18 Applied cards take about 2,800px.
- "Silent 7d" and "Silent 33d" look the same: both amber.
- Interviews cards show "Replied 21d ago" even when a past round is waiting on an outcome (B9).

**Fix**
- Add a quick-filter chip over the board: **"Silent 21+ days (5)"**, which selects and highlights matching cards and offers **[Mark 5 as ghosted]**.
- Use a compact card density once there are more than 25 active applications.
- Escalate the silence colour past `ghostDays`.
- Card status should reflect the latest round: **"Onsite Nov 1 · outcome?"**.

### 9. The phone check-in doesn't answer "what's next?" and notes are split in two (Medium)

**Fix**
- On phones, put the next round first, above Needs you: **"Next: Notion · Technical · 2:00 PM (in 5h) [Prep]"**.
- Merge the two notes: the Notes tab gets a **"Quick note"** field on top and the timeline of notes beneath it, with a single "Notes" label.
- Also:
  - Add a **"Note"** action to each Upcoming and Today row (long-press or ⋯ menu).
  - Make the 28×36 "⋯" buttons 44×44.
  - Keep "11:00 PM" on one line (B13).

### 10. There's no online assessment (OA) round type, so the most common intern step reads as "Other" (Medium-Low)

**What happened**
- Today shows **"Other with Point72 in 14h · Prep"** for a HackerRank OA due tonight.

**Fix**
- Add an **"Online assessment"** round type that has a *due* time instead of a start time.
- Copy: **"Point72 online assessment due tonight 11:00 PM · [Start prep] [Mark done]"**.
- Skip the thank-you and outcome nudges for OAs, and use **"Did you pass the OA?"** after the due date.

---

## 3. Keyboard and palette gaps

**Works well**
- Ctrl K opens instantly, and fuzzy app, job and company search works across 8k jobs.
- The context group is named after the open application.
- `G` then a letter moves between routes.
- Find has J/K/S/Enter with row focus, Esc returns to the row, and S has Undo.
- Stage keys 1–7 work in the drawer.
- X selects on the board, and Esc closes one layer at a time.

**Gaps**

| Gap | Where | Suggested |
|---|---|---|
| J/K advertised but missing | Today, Pipeline (board and table), Companies | Same J/K/Enter/X model as Find |
| Focus lost to `<body>` | After Today actions, Mark as sent, closing a drawer opened from the palette, G-navigation | Move focus to the next row or the page's first list item |
| Palette verbs missing | ghost, reject, outcome, thank-you, note, snooze, export, table, select | See issue 6 |
| "Add an interview round" | Palette | Create the round and focus the date field |
| S is a no-op on tracked roles | Find row (applied) and job drawer | Toast "Already in your pipeline (Applied) · [Open]"; S in the drawer saves |
| Datetime field traps Tab | Round form (`datetime-local` segments) | Accept typed "Thu 2pm", or split date and time |
| No shortcut for "Show N more" | Today | Show everything when J reaches the end |
| Stage keys undiscoverable | Drawer stepper | Tooltip or kbd hint "4" on each step |

---

## 4. Performance

Measured locally with no throttling, using `qa/ux3/perf.js` with 45 tracked applications and 8,245 jobs.
- **Today:** tasks painted at about 440ms and "New for you" at about 460ms.
- **Long tasks at boot:** 4 tasks totalling 260ms. The largest was 82ms.
- **Palette:** keystroke-to-paint took 11–27ms per character across "software engineer", which searches all jobs on each key. That's fine.
- **Route switches:** Pipeline 89ms, Find 160ms, Insights 45ms, Today 36ms and Prep 27ms.
- **Find J:** 18–44ms, with one outlier at 91ms when the next page appends.
- **Saved data:** about 35KB of localStorage for 45 applications, so there is plenty of headroom.
- **Risks to watch:**
  - Every visit loads `jobs.json` (3.1MB) plus `companies.json` (0.77MB). On a bus over 4G this is the phone's critical path for "New for you" and for takedown detection. Consider a small "today" slice, or cache the data with an ETag.
  - Boot computes `computeTasks` and `computeStats` on every store change. That's fine at 45 applications but is O(apps × rounds) on each keystroke in drawer fields.

**Harness note:** a quick note added and then the browser context closed within about 50ms was lost (`notepersist.js`). Closing a Playwright context doesn't fire `pagehide`, so this is probably not a real-user bug. The 150ms save debounce is the window.

---

## 5. Bugs

| ID | Severity | Bug | Repro |
|----|----------|-----|-------|
| B1 | Med | "Interviewed" and Interview rate count applications whose only rounds are in the future or are an OA (Eudia today, Point72 OA tonight), giving 13/40 instead of 11/40. Still open from study 1, issue 10. | `seed.js` → `t4.js` |
| B2 | Med | The "Applying within 3 days…" pattern compares groups without matching their age, so recent applications look worse. The advice comes out inverted. | `t4.js`, `stats.js:102` |
| B3 | Med | The category pattern ("4 of 11 vs 1 of 12") uses only linked applications (23 of 40) and doesn't say so, which contradicts "19 of 40 replied". | `t4.js` |
| B4 | Med | The application drawer doesn't mention a taken-down posting for Applied or Screen (only for Saved), and still shows "Open posting". | `t5.js` (Figma, Ramp) |
| B5 | Med | Duplicate nudges for one application: thank-you plus outcome for the same round (Scale AI), and follow-up plus "took down" (Figma). | `seed.js` output |
| B6 | Low | The thank-you template says "talk with me **today**" for a call 18h earlier. | `t1-03-thanks-modal` |
| B7 | Low | The shortcuts sheet says J/K works "in lists", but it only works in Find. | `t2.js` (Pipeline and Today focus stays on `body`) |
| B8 | Low | Focus falls back to `<body>` after Today actions and Mark as sent. | `t1.js` FOCUS log |
| B9 | Low | Interviews cards show "Replied 21d ago" (Scale AI) and "Replied 16d ago" (Two Sigma) while a past round awaits an outcome. | `t3-01-board` |
| B10 | Low | There is no OA round type; an OA reads "Other with Point72 in 14h · Prep". | `t1-02` |
| B11 | Low | S on an applied job in Find is a silent no-op; S in the open job drawer does nothing. | `t2.js` |
| B12 | Low | The palette's "Add an interview round" doesn't create a round. | `t2.js` |
| B13 | Low | In Upcoming at 375px, times wrap ("11:00 / PM", "10:30 / AM"). | `t6-02-upcoming` |
| B14 | Info | Toasts stack three high and cover the Fit and bookmark column in Find during J/K/S. | `t2-11-find-saved3` |

No console errors and no horizontal overflow in any run (1440 and 375).
