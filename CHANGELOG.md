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
