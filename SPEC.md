# Ghosted — Overnight Build Spec (night 1)

You are building "Ghosted", the best job-search and application tracking app that exists, and improving it in a loop until exactly 9:00 AM Pacific (17:00 UTC). Check `date -u` at the start of every cycle. Never declare yourself done before 9:00 AM Pacific. When one improvement ships, pick the next most valuable one and keep going. If you hit a wall, route around it and keep working on something else.

## 0. SETUP (first 15 minutes)
- Call add_repo for ochen30/ghosted with access "push". If it works, clone it, and commit + push after every cycle (main is fine; the repo is new and empty). If it fails, don't retry; the published Artifact is the source of truth, and a copy of the source goes in the morning report.
- Load the artifact-design and artifact-capabilities skills before writing any page code. Work out exactly: (a) whether the page can fetch external URLs (Greenhouse, Lever, Ashby public job board APIs); (b) how the shared database works, its size limits, and who can read what; (c) how the in-page "ask Claude" capability works and what a visitor who isn't the owner needs in order to use it. Write findings in NOTES.md and design around them.
- Keep CHANGELOG.md and MORNING_REPORT.md from the start; update every cycle.

## 1. PRODUCT
One sentence: the job search app that knows which jobs are real, who actually replies, and what to do next.
Target users v1: early-career (internships, new grad) in software, data, product, design, finance, consulting. Roles and locations filterable so it works for anyone.
Four connected parts (a job you find becomes a job you track, which shows its research and prep):

### (1) FIND
- Real, live listings from public company job boards: Greenhouse (boards-api.greenhouse.io), Lever (api.lever.co/v0/postings), Ashby (api.ashbyhq.com/posting-api/job-board). Never scrape LinkedIn, Indeed, Glassdoor or any site whose terms forbid it.
- Curated list of 150+ companies that hire early-career people, board names verified. Check each returns data; drop the ones that don't.
- If the page can't fetch these APIs directly, write a refresh script that this session (and future nightly runs) runs to fetch listings and write them into the shared database or a published data file. Show "last refreshed" honestly.
- Search, filters (role type, seniority, location/remote, company, posted date), sort by newest or best match.
- Freshness badges ("2h ago", "3 days ago").
- GHOST-JOB DETECTION (headline feature): score how likely a listing is a ghost job from real signals (days open, repeat reposts of same title, same role in many locations, vague description, company's pooled reply rate if known). Show score with a short honest reason ("open 94 days, reposted 3 times"). Never state guesses as facts.

### (2) MATCH
- User uploads/pastes resume once (stored only in their browser, or only theirs to see). Each job gets a match score with breakdown: matched skills, missing skills, seniority fit.
- One-click "tailor": suggested resume bullets for that job, never inventing experience.
- "Why you, why not you" summary per job.

### (3) TRACK (core daily-use part; must be excellent)
- Pipeline board (Saved → Applied → Screen → Interviews → Offer / Rejected / Ghosted) plus table view, drag and drop and keyboard control.
- Every interview round: type (recruiter, technical, behavioral, onsite, case), date/time, interviewer names, prep notes, how it went, outcome.
- Paste-an-email auto-log: paste confirmation / rejection / interview invite / offer email; Claude extracts company, role, stage, date, next steps; preview, then log.
- Smart nudges: follow up after N days, thank-you within 24h of interview, "likely ghosted" after silence threshold, upcoming-interview reminders. A "Today" view showing exactly what to do today.
- Personal stats: response rate, interview rate, median days to reply, funnel chart, weekly activity.
- CSV import/export. Works offline from local storage for the user's own data.

### (4) RESEARCH and PREP
- Company page: what they do, size, recent news if reachable, open roles, Ghosted stats.
- Ghosted stats (pooled, anonymous): reply rate, median days to first reply, drop-off by stage, ghosting rate. Store ONLY: company, role category, seniority, dates, stage reached, outcome. Never names, emails, resume text or free-text notes in the shared database. Explicit opt-in ("Share anonymously to help others") before anything is pooled.
- "Not enough data yet" below a minimum sample size; never fake precision.
- Interview prep per round: likely questions for role + round type, talking points from the resume, questions to ask the interviewer, quick-practice mode.
- Example data: fill stats with realistic example data so the app looks alive, labeled clearly and visibly "Example data", separate from real data, easy to switch off.

## 2. DESIGN: extremely professional, calm, focused
Feel: a top-tier productivity tool. User feels organized, in control, focused, a little impressed. Simple at first glance, powerful underneath. No clutter, no gimmicks, nothing template-looking. Own visual identity; never copy another brand.
- Layout: left sidebar (Today, Find, Pipeline, Companies, Prep, Stats, Settings), clean top bar with global search, consistent 8px grid. Generous whitespace, dense where it helps (tables, pipeline).
- Type: one excellent Google Font sans (Inter or similar), max 5 sizes, tabular numbers for stats, hierarchy via weight and color.
- Color: neutral grays, ONE confident accent, status colors sparing and meaningful (green offer, amber waiting, red rejected, purple-gray ghosted). Tokens on :root. Full intentional dark mode. WCAG AA.
- Components: crisp 1px borders, subtle shadows only on floating things, consistent radii, clear hover/focus/active, visible focus rings.
- Motion: 120–200ms transitions, smooth pipeline drag, no bounce. Respect prefers-reduced-motion.
- Speed: Cmd/Ctrl+K command palette (search jobs, jump to company, add application, paste email), keyboard shortcuts with "?" cheat sheet, quick-add anywhere.
- States: skeleton loaders, useful empty state on every screen (next action + one button), friendly errors with retry, optimistic UI.
- First run: 3-step onboarding (target roles + locations → resume (optional) → matched live jobs), under 60 seconds. First screen after onboarding already valuable.
- Satisfaction: subtle classy celebration on an offer, weekly-goal progress, streaks only if classy.
- Mobile: fully usable at 375px, bottom nav, 16px gutters, no horizontal scroll, 44px+ tap targets.
- Charts: load the dataviz skill first. Minimal, legible in both themes.

## 3. QUALITY BAR and LOOP
Use agents in parallel where work is independent: competitor research, build agents for separate areas, QA agent, and a design-critic agent that reviews screenshots without seeing your reasoning.
Each cycle (45–75 min):
1. Check time. Pick highest-impact item from prioritized backlog in NOTES.md: broken things → core daily-use quality → unique features → polish.
2. Build it.
3. Playwright QA on Chromium at 375 / 768 / 1440px, light + dark. Click every flow: onboarding, search/filter, save job, apply, drag stages, add round, paste each sample email type, nudges, stats, company page, export/import, command palette. Zero console errors. Screenshots (deviceScaleFactor 2 for report ones).
4. Design-critic agent scores screenshots 1–10 on professionalism, clarity, hierarchy, consistency with specific fixes. Apply the ones that matter.
5. Republish to the SAME Artifact URL. Never leave the published version broken; roll back first if a change breaks it.
6. Update CHANGELOG.md and MORNING_REPORT.md; commit + push if repo attached.
Early: competitor scan (Teal, Huntr, Simplify, LinkedIn's tracker, any site publishing reply/ghosting rates). Comparison table; Ghosted clearly better or clearly different on every row. If someone already publishes ghosting stats, report it and lean harder on what's unique.

## 4. RULES
- Never present example or estimated data as real. Never invent company stats, reviews or quotes.
- Never scrape against terms. Never post anything publicly for the user; drafts only.
- Privacy: no personal data in the shared database. Resumes and notes stay with the user. Clear privacy line in Settings and footer.
- No secrets or API keys in page code.
- Keep the Artifact private (default). The user decides when to share.
- If a capability is impossible, write why in NOTES.md, pick the closest honest alternative, keep going.

## 5. 8:20 AM PACIFIC: WRAP-UP
Stop new features. Finish current change, full QA pass, fix breakage, publish final. Finalize MORNING_REPORT.md and publish it as its own Artifact page with:
- live app link at top
- 5-line summary of what Ghosted does now
- hero screenshots (desktop + phone, light + dark)
- everything built tonight (from CHANGELOG)
- QA results and known issues, honestly
- competitor comparison table
- platform-limit findings (external fetch, database limits, who can use in-page Claude)
- LinkedIn launch post draft (hook, 4–6 short lines, CTA like "log your last 10 applications", suggested screenshots) + shorter alternate
- roadmap for nights 2 and 3, incl. what's needed to move to a real backend if usage grows
Everything published and verified by 9:00 AM Pacific.
