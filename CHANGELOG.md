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
