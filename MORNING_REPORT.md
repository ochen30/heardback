# Heardback: Morning report (Night 1, Nov 3, 2026)

**App:** https://claude.ai/artifact/CUYnHDx5AYEtoPjDxxVobm (private until you share it)
**This report as a page:** https://claude.ai/artifact/UbZ4zpWbMQZYFJsDEsA8uT

## What Heardback does
1. **Real roles:** 7,617 open internship and new-grad roles (8,263 postings, identical repeats shown once) from 1,966 companies, each linking to the employer's own application page.
2. **A ghost-job check on every listing,** with the reasons: age, close-and-repost cycles, location blasts and the company's usual time to close. Strong-signal listings are hidden by default, with an honest count.
3. **A pipeline for every application and interview round.** Paste a recruiter email and it logs itself.
4. **A Today view** that says what to do: confirm and prep interviews, send thank-yous, follow up, notice taken-down postings, call it ghosted.
5. **Interview prep and mock interviews,** Insights, a shareable progress card and opt-in anonymous reply data, with Claude running on your own account.

## Needs you (about 5 minutes)
1. **Create the GitHub repo** `ochen30/heardback` (empty). This session couldn't create repos; full git history is ready to push.
2. **Decide on the data source:** the SimplifyJobs community lists have no LICENSE file. Fine for a private prototype; ask them, or switch to direct company boards (item 3), before a public launch.
3. **Allow three hosts** in this environment's network settings: `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com`. Then `tools/fetch_ats.py` pulls 822 company boards directly, with full job descriptions.
4. **Try "Add to calendar" once** on a real interview round. It uses your Google Calendar connector and matches its schema, but wasn't fired tonight because that would create a real event.
5. **Share the app** from its Share menu when you're ready to post.

## Quality
- Design reviews: 6.3 → 7.4 → 8.1 → 8.6 → 8.9 → 9.0 → 8.8 → 8.9 → 9.1 → 9.1 → **9.2** ("ship").
- Four usability tests: intern hunter on desktop, new grad on a phone, power user with 42 applications, interview day.
- A cold-visitor test modeled your LinkedIn launch moment.
- End-to-end suite: 2,428 checks passing at phone and desktop widths, with and without Claude.
- axe-core: zero WCAG 2 A/AA violations on every screen and overlay, light and dark.
- Chaos test: 2,500 random clicks and keys with zero errors.
- Every published version had zero console errors and no horizontal overflow at 375 / 768 / 1440, light and dark.

## Timeline
- Final build: v20 at 8:18 AM PT, job data refreshed 8:08 AM.
- **12:30 AM, Setup and platform limits:** Verified what an Artifact page can and can't do, found that this environment blocks the job-board APIs, and found a reachable real data source. Renamed the app from Ghosted to Heardback.
- **12:45 AM, Foundations:** Design system (Geist, cool neutrals, one cobalt accent, full dark mode), app shell, command palette, local-first store, nudges engine, data pipeline with ghost signals, competitor scan.
- **1:05 AM, v1: every screen:** Four agents built Find, Pipeline, Today/Insights and Prep/Onboarding/Settings in parallel. First publish.
- **1:10 AM, v2: calendar and parsing:** Add to calendar (Google Calendar connector or .ics), email parser accuracy, core fixes.
- **1:40 AM, v3: design pass 1 + QA:** Design review 1 scored 6.3. Removed noise everywhere. QA found 32 bugs; fixed every crash and broken feature.
- **2:10 AM, v4: design pass 2:** Review 2 scored 7.4. Calmer layouts, tablet breakpoints, rounds as summaries. New: posting-taken-down detection, season-closing nudges, PDF resumes, new since your last visit.
- **2:30 AM, v5: new features:** Mock interview with Claude, bulk actions, command palette context actions, How we score listings.
- **2:55 AM, v6: design pass 3:** Review 3 scored 8.1. One vocabulary for signals, softer selection, simpler mock interview. Share-your-progress card.
- **3:30 AM, v7: design pass 4 + QA round 2:** Review 4 scored 8.6. Quieter fit and freshness, typography, raised dark overlays. QA round 2 (2,280 checks): no crash or broken-feature bugs left.
- **4:00 AM, v8: usability test 1:** An agent played a stressed intern-hunting student through 8 real tasks. Fixed: silence counted from the applied date, change-date on apply, confirm-your-interview task, ghost signals hidden by default with an honest count, onboarding survives reloads, mobile quick add.
- **4:25 AM, v9: usability test 2 (phone, new grad):** CSV import preview with stage mapping, stage-aware nudges after interviews, strict level and location matching, US-only Remote, two-line mobile count bar, wrapping toasts.
- **4:45 AM, v10: accessibility + review 6:** Design review 6 scored 9.0. Zero axe-core WCAG 2 A/AA violations on every route and overlay in both themes. Silence respects scheduled rounds; share card opens on a meaningful period.
- **5:10 AM, v11: usability test 3 (power user):** A student five weeks in with 42 applications. Today grouped into Today / Quick wins / When you have time, one row per application, batch ghosting, inline outcomes; J/K everywhere; Online assessment rounds; takedown callouts; age-matched Insights.
- **5:40 AM, v12: calmer power-user UI:** Review 7 (8.8) said the new UI was loud. One focus style, folded silent apps, two-button outcomes, one block for taken-down postings. End-to-end suite 2,428 / 2,428.
- **6:15 AM, v13: launch readiness:** A cold-visitor test (someone tapping a LinkedIn link) and review 8. Degree-aware fit (PhD-only roles no longer top the list), fit only once skills exist, a one-glance first screen, Just browse jobs, See a sample tracker, an honest note for non-tech students.
- **6:35 AM, v14: review 9 (“ship”):** Natural round names, last-reply agrees everywhere, Review instead of Apply on strong-ghost listings, distinct second follow-up.
- **6:55 AM, v15: review 10 + chaos test:** Generic round type renamed Interview, browse-only visitors see no goal they never set, thin company stats hidden, Interviews get their own color. 1,900 random clicks and keys: zero errors.

## Known issues
- Listing dates are when the community list added a role (the data starts Mar 9, 2026).
- No job descriptions in tonight's data, so fit uses title, level, location, degree and your skills.
- Sponsorship is almost never stated in the data.
- Anonymous reply data needs Contributor access to write; public-link visitors can read only. A small backend fixes this.
- Claude features run on each visitor's own account and ask permission first.
- Your tracker lives in one browser (export and import move it).
- One mobile end-to-end step (the mock interview at 375px with mock Claude) is flaky in the test harness; the feature itself works.

## LinkedIn post
[Edit to your own experience] Half the internship listings I applied to last year never replied. Some of them were never real.

So I built Heardback, a free job search app for internships and new-grad roles that asks one question about every listing: will you actually hear back?

• 7,500+ live internship and new-grad roles, each linking straight to the company's own application page
• A ghost-job check on every listing, with the reasons: how long it's been up, how many times it was closed and reposted, how many cities it's blasted across
• A pipeline that tracks every interview round. Paste a recruiter email and it logs itself.
• A Today view that tells you who to follow up with, when a posting was taken down, and when to call it ghosted
• Mock interviews and prep for each round, on your own Claude account

It's free and your data stays in your browser.

If you're recruiting this season, try it and log your last 10 applications.

[link]

**Short version:** Built Heardback: a free internship and new-grad job search that flags ghost listings (open 200+ days, posted and closed 7× before) and tracks every interview round. Paste a recruiter email and it logs itself. Try it and log your last 10 applications: [link]

## Competitors, nights 2–3, platform limits
See the report page, research/competitors.md and NOTES.md.
