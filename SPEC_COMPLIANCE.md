# SPEC.md compliance, section by section (checked 9:01 AM PT, Nov 3)

Legend: ✅ done · ◐ partly (reason) · ✗ not done (reason)

## Preamble
- ✅ Looped and improved until 9:00 AM PT (20 published versions; time checked every cycle).
- ◐ Named "Ghosted": the user asked mid-session to rename it to something more unique ("Heardback"); "Ghosted" stays as the pipeline stage and the ghost-job score.

## 0. Setup
- ✅ add_repo for ochen30/ghosted (and ochen30/heardback) tried; neither repo exists, so per the spec the Artifact is the source of truth and the source ships in the morning report (plus heardback-source.bundle and local git history).
- ✅ artifact-design + artifact-capabilities loaded first; findings on external fetch, db limits/access and in-page Claude in NOTES.md.
- ✅ CHANGELOG.md and MORNING_REPORT.md kept from the start.

## 1. Product
FIND
- ◐ Real listings: the job-board API hosts are blocked by this environment's network policy, so listings come from the SimplifyJobs community lists (real employer postings, linking to each employer's own page). No scraping of LinkedIn/Indeed/Glassdoor.
- ◐ 150+ curated boards: 1,934 Greenhouse/Lever/Ashby boards derived from real postings (822 with open roles) in data/ats_boards.json; API verification blocked (needs the allowlist).
- ✅ Refresh script (tools/refresh_jobs.py, plus tools/fetch_ats.py for the APIs); "updated N ago" shown honestly.
- ✅ Search, filters (role, level, location/remote, posted date, visa, ghost signals), company via search/Companies; sort Newest / Best fit / Most likely real.
- ✅ Freshness (age + green dot for new).
- ◐ Ghost-job detection with reasons from age, close-and-repost cycles, location blast, talent-pool titles and company tempo; no "vague description" signal (no descriptions in the data) and no pooled reply rate yet (needs data).
MATCH
- ✅ Resume paste or PDF upload (local only); fit with role/level/location/degree/skills breakdown, matched and missing skills.
- ✅ Tailor bullets (Claude, never invents) and Strengths/Gaps ("why you, why not").
TRACK
- ✅ Board + table, drag and drop, keyboard (arrows, J/K, 1–7), bulk actions.
- ✅ Rounds: recruiter/technical/behavioral/case/final/online assessment, date/time, interviewers, where, prep notes, how it went, outcome.
- ✅ Paste-an-email logging: rule-based parser plus Claude; preview; then log.
- ✅ Nudges: follow-up, thank-you, likely ghosted, confirm and prep interviews, outcome, takedowns; Today view.
- ✅ Stats: response rate, interview rate, median days to reply, funnel, weekly activity.
- ✅ CSV import (with preview) and export; works offline in local storage.
RESEARCH and PREP
- ◐ Company page: open roles, listing tempo, reposts, season progress, reply data, Claude brief ("what they do", labeled AI). Size and recent news aren't reachable from this environment.
- ✅ Pooled stats: opt-in, anonymous fields only; reply rate, median days, ghosting, drop-off by stage; "Not enough data yet" below 5 applications from 3 people.
- ✅ Prep per round: likely questions by role and round type, talking points from the resume, questions to ask, practice mode, mock interview.
- ◐ Example data: a labeled example pipeline you can switch off. Pooled company stats are NOT faked, because the honesty rule forbids inventing company stats.

## 2. Design
- ✅ Sidebar (Today, Find, Pipeline, Companies, Prep, Insights, Settings), top bar with global search, 8px grid.
- ✅ One Google Font sans (Geist), 5 sizes, tabular numbers.
- ✅ Neutrals + one cobalt accent; status colors; tokens on :root; full dark mode; axe-clean WCAG 2 A/AA.
- ✅ 1px borders, shadows only on floating layers, focus rings; 120–200ms motion; reduced motion respected.
- ✅ Cmd/Ctrl+K palette with context actions; "?" shortcut sheet; quick add.
- ✅ Skeletons, empty states, error states with retry, optimistic UI with Undo.
- ✅ 3-step onboarding (targets, resume, matched live jobs); "Just browse jobs".
- ✅ Offer celebration and weekly goal.
- ✅ Mobile at 375: bottom nav, 16px gutters, no horizontal scroll, 44px targets.
- ◐ Charts: minimal and legible in both themes, reviewed by six design passes; the dataviz skill itself wasn't loaded by the agents that built the charts.

## 3. Quality bar and loop
- ✅ Parallel agents: builders, competitor research, QA, design critic (12 reviews), usability (4 + cold visitor).
- ✅ Playwright at 375/768/1440, light and dark, every cycle; zero console errors; e2e 2,428 / 2,428; 2x report screenshots.
- ✅ Same Artifact URL republished 20 times; never left broken.
- ✅ Early competitor scan with a comparison table (research/competitors.md; on the report).

## 4. Rules
- ✅ No example data shown as real; no invented company stats.
- ✅ No scraping against terms; nothing posted publicly (LinkedIn drafts only).
- ✅ No personal data in the shared db; privacy line in Settings and footer.
- ✅ No secrets in page code; the Artifact is private.
- ✅ Impossible capabilities documented in NOTES.md with honest alternatives.

## 5. Wrap-up
- ✅ Final build (v20) published; morning report published as its own Artifact with: live link at top, 5-line summary, desktop + phone and light + dark screenshots, everything built (timeline + changelog), QA and known issues, competitor table, platform limits, LinkedIn post + short version, nights 2–3 incl. backend.
- ✅ Both re-read and verified after 9:00 AM PT (17:00 UTC).
