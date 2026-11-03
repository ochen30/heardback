# Heardback (formerly "Ghosted") — working notes

App renamed to **Heardback** at 08:50 UTC per user request. Repo to attach: ochen30/heardback.

## Platform findings (verified 08:30–08:45 UTC, Nov 3 2026)

### (a) Can the page fetch external URLs? NO.
- Artifact CSP blocks every fetch/XHR except files published alongside the page (relative URLs).
- So the page can never call Greenhouse/Lever/Ashby directly. Job data ships as published JSON files (`data/jobs.json` etc.) next to the page, refreshed by a session-run script and republished.
- ALSO: this cloud container's network policy blocks `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com` (proxy 403, policy denial). Fix for the user: environment settings → Network access → add those three hosts under Allowed domains (https://code.claude.com/docs/en/cloud-environments#network-access).
- Reachable tonight: `raw.githubusercontent.com`. The SimplifyJobs community repos (`New-Grad-Positions`, `Summer2026-Internships`) publish `listings.json` (~36k listings, ~8.2k active) with company, title, locations, apply URL (company ATS link), date_posted, date_updated, active, sponsorship, terms, degrees. No job descriptions.
  - No LICENSE file in either repo → flag for the user before any public launch. We attribute and link to the original postings. Long-term source should be direct ATS APIs (script supports it once hosts are allowed).
- CDNs (cdnjs/unpkg/jsdelivr) are blocked from this container but allowed in the Artifact CSP. Published page loads Preact+htm from cdnjs; local Playwright QA routes those URLs to `tools/node_modules` copies.

### (b) Shared database (`db` capability)
- 25,000 docs per artifact, 256 KiB per doc, queries scan (keep collections to low thousands).
- WHO CAN WRITE: owner, email-invited editors, and (Team/Enterprise) org members at Contributor+. **Outside viewers (public link, other orgs) can READ only, never write — not even their own `data/users/<id>` subtree.** Signed-out visitors get no db at all.
- Consequence: pooled anonymous stats from the general public CANNOT be collected on this platform. Design: pooled stats read from db (anyone signed in can read); the "Share anonymously" contribution works only for viewers with `can("data.write")`; others see a clear note. Night 2/3: a real backend (e.g. Supabase/Postgres + an edge function) for public contributions.
- Personal tracking data therefore lives in browser localStorage (works for everyone, private, per device), with CSV/JSON export + import for portability.

### (c) In-page Claude (`sample` capability)
- Runs on the VIEWER's own Claude account and usage; first call per view shows a consent dialog; signed-out → unavailable.
- Memoryless, no browsing, cannot fetch URLs. `sample.json` for structured output. Rate limited per viewer.
- Consequence: every AI feature has a deterministic local fallback (rule-based email parser, keyword skill matcher, template prep questions). Claude is an "Enhance with Claude" upgrade, never a requirement.

### Other frame limits
- `<a download>` is inert → CSV export uses the `downloads` capability (with copy-to-clipboard fallback).
- No alert/confirm/prompt → in-page confirmation UI.
- Hash routing allowed only as plain `#name` (avoid reserved names: settings, sidebar, customize, upgrade, downloads, comment-*). Use `#today`, `#find`, `#pipeline`, `#companies`, `#prep`, `#stats`, `#prefs`.

## Architecture
- `src/` modules → `build.py` concatenates into `dist/index.html` (single page) + `dist/data/*.json`.
- Preact 10.19.3 + htm 3.1.1 (UMD, cdnjs/unpkg pinned).
- State: one store object, persisted to localStorage (`ghosted:v1`), with schema version + migrations.

## Backlog (priority order; update every cycle)
1. [ ] Data pipeline: listings → compact jobs index + company stats + ghost signals
2. [ ] App shell, design tokens, nav, routing, command palette
3. [ ] Find view (search/filter/virtualized list/job drawer, ghost score)
4. [ ] Pipeline board + table, drag/drop, keyboard
5. [ ] Application detail: rounds, notes, timeline
6. [ ] Paste-email auto-log (rule parser + Claude)
7. [ ] Today view + nudges
8. [ ] Onboarding (roles, locations, resume)
9. [ ] Match scoring + tailor (Claude)
10. [ ] Companies view + company page (real posting stats + pooled stats)
11. [ ] Prep view (round prep, practice mode)
12. [ ] Stats view (funnel, weekly activity)
13. [ ] Settings: theme, privacy, export/import, example data toggle
14. [ ] QA + design critique loops
