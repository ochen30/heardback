# Changelog — Heardback

## Night 1 (Nov 3, 2026)

### 00:30 PT — Setup
- Verified platform limits (external fetch blocked by Artifact CSP; job-board APIs blocked by this container's network policy; db is read-only for outside viewers; in-page Claude runs on the viewer's account). Documented in NOTES.md.
- Found a reachable real data source: SimplifyJobs community listings (raw.githubusercontent.com).
- App renamed from "Ghosted" to **Heardback** (user request).

### 00:45 PT — Foundations
- Design system: Geist type, cool ink neutrals, one cobalt accent, semantic status colors, full dark mode, 5-size type scale.
- App shell: left rail, top bar, bottom tab bar on mobile, Cmd/Ctrl+K command palette, keyboard shortcuts (`?`), toasts with Undo, in-page confirm dialogs, drawer + modal system, offer celebration.
- Core: local-first store (localStorage) with stage moves, rounds, events; nudges engine (prep, thank-you, outcome, follow-up, likely-ghosted, apply); personal stats; example pipeline with fictional companies.
- Data layer: job loading from published files, transparent fit score, rule-based skill extraction, rule-based email parser.
- Data pipeline (agent): 8,227 open internship + new-grad roles from 1,969 companies; ghost-job score from real signals; per-company posting stats; 1,934 ATS boards for direct refresh later; `fetch_ats.py` ready for when network allows.
- Competitor scan (agent): research/competitors.md.

### 01:05 PT — v1 published (https://claude.ai/artifact/CUYnHDx5AYEtoPjDxxVobm)
- Find jobs: 8,227 real listings, search, filters with live counts, three sorts, fit score, ghost signals, freshness, save; job drawer with ghost-signal breakdown, fit breakdown, company tempo, Claude "why you / why not" and resume tailoring.
- Companies directory + company drawer: posting tempo, repost share, Summer 2027 hiring progress, pooled reply data card, Claude company brief (labeled AI-generated).
- Pipeline board + table, drag and drop, keyboard moves, application drawer (overview, rounds, timeline, notes), draft follow-up / thank-you (template or Claude), add application, paste-an-email logging (rule-based parser + Claude).
- Today: prioritized nudges with snooze/dismiss, upcoming rounds, new matching roles, weekly goal, pipeline at a glance.
- Insights: KPIs with sample sizes, funnel, 8-week activity chart, outcomes, "where you stall", ghost-job radar.
- Interview prep: rounds list, question bank by round type and role, talking points from resume, questions to ask, practice mode with timer, Claude feedback.
- Onboarding (3 steps), Settings (profile, resume, reminders, theme, example data, JSON/CSV export + import, delete all, privacy, data source), anonymous reply-data sharing (opt-in, shared db).
- QA: all routes at 1440 and 375, light and dark, zero console errors, no horizontal overflow.

### 01:10 PT — v2 published
- Add to calendar on interview rounds (application drawer + prep): creates a Google Calendar event through the viewer's own connector (asks permission first), otherwise downloads an .ics file. Argument names match the connector schema; not exercised with a real call tonight (it would create a real event).
- Email parser: case-insensitive "thank you for applying", interview invites that mention a recruiter call are no longer misread as screens, interview times are read from the body (not the Date header), company names stop at "on/to/for…", offer titles ("position of X at Y") detected.
- Core: modals keep their own props (draft modal opened from Today now works), Escape closes only the top-most overlay, dialogs focus their first field, toasts support an action button, thank-you template cleans interviewer names, danger confirmations styled as danger, shortcuts disabled during onboarding.
- Mobile: "More" sheet (Companies, Insights, Paste email, Settings), toasts sit above the tab bar.

### 01:40 PT — v3 published (design pass + QA fixes)
Design review scored v2 at 6.3/10 ("good foundations, too much noise"). Fixed:
- Quieter everywhere: example data is one banner (no per-item pills), one primary button per region, no duplicate page titles, neutral company monograms, solid (not dashed) borders, chips with a check when selected, no footnote under every number.
- Today: one primary action, aligned buttons, Snooze/Dismiss folded into one menu, no repeated widgets; Insights: simpler chart, one "How we calculate this" note.
- Find: one "Fit 92" format, ghost labels only when there are signals, location checkbox list, drawers use sections instead of nested cards, unknown fields hidden, duplicate listings collapsed, "new since your last visit".
- Pipeline: no tall grey columns, single "Closed" rail, underline tabs in the application drawer, read-mode details that edit on click, footer action matches the next step, compact "Log an email" preview.
- Prep / Settings / Onboarding: clean mobile header, roomier answer tips, no card-head icons, custom skill input, calmer copy.
- Toasts bottom-left, modals sit above drawers, drawers don't pop the keyboard, Escape closes one layer, dark-mode switches visible.
QA found 32 bugs (2 crash, 4 broken). Fixed all P0/P1 and most P2:
- Bad or partial records can no longer crash the app (validated on load and import; error boundary per screen with export/retry).
- Unreadable saved data is backed up instead of overwritten; failed saves warn you; edits flush on tab close.
- Email parser scores signals instead of first match (11/11 realistic test emails now classified correctly), handles numeric dates, time zones (ET/PT…), assessment deadlines, platform senders (HackerRank etc.).
- No duplicate rounds from re-logging the same email; Offer cards can't be arrow-keyed into Rejected; hidden examples aren't matched or exported as real; Delete all clears every Heardback key; Tab stays inside dialogs; long names wrap.

### 02:10 PT — v4 published (design pass 2, new features)
Design review 2 scored v3 at 7.4/10 (from 6.3). Applied its fixes:
- Hover-only menus no longer take layout space (Today, Pipeline); tablet (768) layouts designed for the board and Find; toasts bottom-right on desktop and dark-mode aware; palette without a focus ring; custom checkboxes and radios that read well in both themes.
- Application drawer is no longer form-first: rounds are summary rows with Edit (only the next round expanded), contacts start as "No contacts yet", outcome is a compact select.
- Company stats use one layout and one "Reposted" metric everywhere; AI output says "Strengths" / "Gaps" (no red), one Regenerate; zero-count filter chips disabled; Insights "Patterns" card; one weekly-goal widget on Today.
New:
- **Posting taken down:** when a saved or applied job disappears from the live listings, Today and the pipeline card say so.
- **Season closing:** apply nudges get urgent when a company has closed most of its Summer 2027 internship postings.
- **PDF resumes:** upload a PDF in onboarding or Settings; it's read locally in the browser (pdf.js, loaded only when needed).
- **New since your last visit** in Find; identical duplicate listings collapsed (Palo Alto Networks listed one title 26 times); fit score recalibrated.
- Job data refreshed from live sources (8,225 open roles).

### 02:30 PT — v5 published (new features)
- **Mock interview with Claude** (Interview prep): a realistic interviewer for the round type and role, one question at a time, short feedback after each answer, then a scorecard (strengths, what to work on, a stronger answer outline) you can save to the round's notes. Runs on your own Claude account; hidden when Claude isn't available.
- **Bulk actions** in Pipeline (board and table): select with checkboxes, Shift-click ranges, Cmd/Ctrl-click or X; move, mark ghosted, export or delete many at once with one Undo.
- **Command palette context actions:** with an application open, Cmd/Ctrl+K offers "Move to Interviews", "Add a round", "Draft a follow-up"; with a job open, "Save", "Mark as applied", "View company".
- **How we score listings:** a methodology page with the exact signals, points and live score distribution across all listings, plus known limits. Linked from Find and every job's ghost check.
- Modal polish: content never squeezes into nested scroll areas; dialogs without fields don't show a focus ring on open.

### 02:55 PT — v6 published (design pass 3)
Design review 3 scored v5 at 8.1/10 (from 7.4). Applied:
- One vocabulary for listing signals everywhere ("Looks active" / "Some ghost signals" / "Strong ghost signals"), and one honest count ("7,582 open roles (8,225 postings)").
- Methodology page: points stacked and aligned, counts explained; job drawer links to it instead of repeating it.
- Board selection is a soft tint (no heavy frames); mobile table checkboxes aligned; board edge fades only when scrolled; Interviews card footers no longer truncate; Closed column folds back after moves.
- Mock interview start card simplified to the standard card header; no repeated context; calmer while live.
- Neutral task icons on Today (amber only when genuinely urgent); one example-data banner design everywhere.
- Command palette shows real key chips and names the open application in its group header.
- Company roles sorted by fit (with a Newest toggle); duplicate "Posted" row removed; Claude actions side by side.
- Settings/onboarding location counts match Find and say what they count.

### 03:05 PT — v6.1
- **Share your progress:** a clean 1200×630 card (week, month or all time; light or dark) with applications, replies, interviews, offers, response rate and an 8-week sparkline, plus a modest suggested caption. Counts only real applications, never examples; company names off by default. From Insights or the command palette.

### 03:30 PT — v7 published (design pass 4 + QA round 2)
Design review 4 scored v6 at 8.6/10 (from 8.1). QA round 2: 2,280 automated checks, no crash or broken-feature bugs left. Applied:
- Fit is plain text (highlighted only at 95+); age is quiet metadata with a green dot for new listings; one row order everywhere (age · Fit · save).
- Company monograms: one or two letters, never "H&".
- Dark mode: drawers and dialogs sit on a raised surface; lighter scrim; calmer Insights charts.
- Typography: curly quotes, en dashes in titles, no orphaned "·" separators or one-word last lines.
- Pipeline: mobile stage control fixed; typing right after clicking a field never triggers shortcuts; Escape cancels an edit before closing the drawer.
- Find: focus returns to the row after closing a job; job drawer values aligned in one column.
- Command palette: context actions first; screen-reader combobox semantics; removed an action the frame blocks.
- Add to calendar never claims success when nothing was saved; .ics files follow the line-length standard and carry the time zone.
- Unreadable saved data now shows a notice with a Restore action on launch (not only in Settings).
- Imported dates are validated to a sane range.
- Job data refreshed (8,245 open roles).

### 04:00 PT — v8 published (usability test + design pass 5)
A fresh-eyes usability test (an agent playing a stressed CS student doing 8 real tasks) and design review 5 (8.9/10). Fixed:
- **Silence is counted from the applied date** (and the last reply), so old applications correctly go stale and get "Mark as ghosted?" prompts. Editing the applied date updates the drawer header and "last reply" everywhere.
- **Marking something applied says "applied today" with a Change date action.**
- **Logged interviews always show in Upcoming** (not only within 7 days), and Today never says "caught up" while a round is scheduled. After logging an invite email, a **"Confirm your interview"** task appears.
- **Strong ghost signals hidden by default** in Find, with an honest "Hiding 230 with strong ghost signals · Show them".
- Onboarding keeps your choices if you reload mid-way; Prep re-renders correctly on reload or deep link.
- Mobile: the + button offers "Add an application" or "Log an email".
- Typography: no line ever starts with a "·" separator; Insights outcomes sum to 100%; consistent "Mark as ghosted" wording; Fit highlight only on clean top matches.

### 04:25 PT — v9 published (usability test 2: mobile, new grad)
A second usability test played a graduating senior on a phone, looking for new-grad data roles and importing 6 applications from a spreadsheet. Fixed:
- Apps at Screen or Interviews aren't nudged toward "ghosted" right after import; instead "What's next with X?" asks for the next round.
- **CSV import preview:** "6 rows found. Check the stages." with an editable stage per row; common words map correctly (OA/assessment → Screen, Interviewing → Interviews).
- "New for you" respects your level, roles and locations strictly (new-grad users never see internships).
- **"Remote" means remote in the US**; Canada/UK remote roles appear under their own locations.
- Prep opens your soonest round by default; imported reply dates no longer produce a fake "first reply in 0 days".
- Phone: Find's count area is two clean lines with large tap targets; toasts wrap instead of cutting off.

### 04:35 PT — accessibility
- Automated axe-core scan (WCAG 2 A/AA) on every route in light and dark: fixed page language, progress bar names, an invalid ARIA attribute on job rows, chip-count contrast, and inline links that relied on color alone. Result: zero violations.

### 04:45 PT — v10 published (design review 6: 9.0/10, accessibility)
- Accessibility: zero axe-core WCAG 2 A/AA violations on every route and overlay, light and dark.
- Silence respects interview rounds (an app with a round tomorrow is never "8 days silent"); rounds count as contact.
- Imported applications never produce a fake "first reply in 0 days".
- Share card opens on the shortest period with real activity.
- Find says "Hiding N with strong ghost signals" consistently at every width; sort stays on the count row on tablets; Settings locations in two columns.

### 05:10 PT — v11 published (usability test 3: power user with 42 applications)
A third usability test played a student five weeks in, with 42 real applications, working fast with the keyboard. Fixed:
- **Today scales:** one row per application, grouped into Today / Quick wins / When you have time, with "Show N more", and a batch "Mark all N as ghosted". Inline outcome buttons (Passed / Didn't pass / Still waiting) on outcome tasks.
- **Keyboard everywhere:** J/K + Enter on Today (D dismiss, S snooze) and Pipeline (board and table); focus never drops to the page after an action.
- **Online assessment** is its own round type ("Due Thu, 11 PM"), not counted as an interview.
- Taken-down postings are called out in the application drawer for Applied/Screen too, with "Draft a last follow-up", "Mark as ghosted", "See open roles".
- Interview cards say "Log outcome · Technical, 3d ago" when an outcome is pending.
- Insights comparisons are age-matched and name their sample; patterns that could mislead are gone.
- Command palette: "Add an interview round" actually adds one; new actions for outcome, thank-you, note, mark ghosted, export.
- Thank-you drafts don't say "today" for yesterday's call; at most two toasts at once.

### 05:42 PT — v12 published (design review 7 on the new UI)
Review 7 found the new power-user UI louder than the rest (8.8). Quieted it:
- One keyboard-focus style everywhere (a slim accent edge and soft fill).
- Today: silent applications fold into one row ("5 applications with no reply in 21+ days") with "Mark all as ghosted" and a Review list; outcome is two joined buttons (Passed / Didn't pass); groups sorted by urgency so the one primary button sits on the soonest item; 44px menu targets on phones.
- Pipeline: the taken-down drawer shows one block with each action once; card footers match the next step on one line.
- Calendar files fold lines by UTF-8 bytes per RFC 5545.
- QA: end-to-end suite 2,428 / 2,428 checks passing; axe clean on every screen.

### 06:15 PT — v13 published (launch readiness)
A cold-visitor test (someone tapping a LinkedIn link) and design review 8 (8.9, "ship once these land"). Fixed:
- **Fit respects degree:** a PhD-only role no longer shows "Fit 92" to an undergrad (capped low, with "Asks for a PhD"). New degree setting in onboarding and Settings.
- **Fit appears only once you've added skills or a resume**; before that every match would score the same.
- **First run says what it is in one glance:** "Internship and new-grad listings, checked for ghost jobs. Track every application and interview in one calm place." plus "Free. Your data stays in this browser."
- **"Just browse jobs →"** lands on Find; **"See a sample tracker first"** loads examples into the pipeline; a "Something else" option for non-tech students with an honest note.
- Step 3 shows a flagged listing with its reason, and previews are tappable. Today is never empty for a brand-new user ("Fresh roles posted today").
- Pipeline table fits tablets without hiding key columns; card footers never truncate; the methodology table stacks on phones.
