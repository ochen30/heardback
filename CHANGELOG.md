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
