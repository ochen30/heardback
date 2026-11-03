# Heardback — Morning report (Night 1)

_Living document. Updated each cycle; published as its own page at wrap-up._

## Live app
- App: https://claude.ai/artifact/CUYnHDx5AYEtoPjDxxVobm (private until you share it)

## What Heardback does (5 lines)
1. Real internship and new-grad roles (8,227 open, 1,969 companies) that link to each employer's own application page.
2. A ghost-job check on every listing, built from signals in the data: age, close-and-repost cycles, location blasts and the company's usual time to close.
3. A pipeline that tracks every application and interview round, with paste-an-email logging.
4. A Today view that tells you what to do: prep, thank-you notes, follow-ups, and when to call it ghosted.
5. Interview prep per round, personal insights, and opt-in anonymous reply data per company.

## Status by cycle
- **v1 (1:05 AM):** every screen built by four parallel agents; real data pipeline; published.
- **v2 (1:10 AM):** Add to calendar (Google Calendar connector or .ics), parser accuracy, core fixes.
- **v3 (1:40 AM):** design review 1 (6.3/10) applied across every screen; QA pass (32 bugs) — all crash/broken bugs fixed.
- **Later cycles:** see CHANGELOG.md.

## Needs you (5 minutes)
1. **Create the GitHub repo** `ochen30/heardback` (empty). This session can't create repos, and neither `heardback` nor `ghosted` existed tonight. The full git history is ready to push.
2. **Decide on the data source license.** Listings come from the SimplifyJobs community GitHub lists, which have no LICENSE file. Fine for a private prototype; before a public LinkedIn launch, either ask them, or switch to direct company job boards (step 3).
3. **Allow the job-board hosts** in this environment (Settings → Network access → Allowed domains): `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com`. Then `tools/fetch_ats.py` pulls listings straight from 822 company boards, with full descriptions (which also makes fit scores and tailoring much sharper).
4. **Share the app** from the page's Share menu when you're ready. It is private to you right now.
5. **Try "Add to calendar" once** on a real round. It's wired to your Google Calendar connector's `create_event` and matches its schema, but I didn't fire it tonight because that would create a real event in your calendar.

## Known issues (honest)
- Job dates are when the community list added a listing (dataset starts Mar 9, 2026), not the employer's own posting date.
- No job descriptions in tonight's data, so fit is based on title, level, location and your skills. Paste a description in the job panel for a sharper Claude read.
- Sponsorship is almost never stated in the data (99.7% blank), so the visa filter rarely helps yet.
- Anonymous reply data can only be written by people with Contributor access or above on the artifact; public-link visitors can read but not contribute. A real backend fixes this (night 2/3).
- In-page Claude features use each visitor's own Claude account and ask permission first; signed-out visitors get the non-AI versions.
- Your tracker lives in the browser on one device (export/import for moving devices).

## Platform limits found tonight
- Pages can't fetch outside URLs (Artifact CSP) → job data ships as files next to the page and is refreshed by a script.
- This container's network policy blocks the Greenhouse/Lever/Ashby APIs → used the SimplifyJobs lists on raw.githubusercontent.com.
- Shared database: 25,000 documents, 256 KiB each; outside viewers read-only.
- `<a download>`, alert/confirm and window.open don't work in the frame → used the downloads capability, in-page dialogs and real links.

## Competitor summary
- The job feed is a commodity (SimplifyJobs and others publish the same lists hourly). Heardback doesn't try to win on breadth.
- Ghost-job scoring exists (Remote Rocketship, Klepify, HiringCafe and many tiny extensions) but nobody explains their signals per listing or publishes data. Heardback shows the exact reasons ("Posted and closed 7× before") and never calls a listing a ghost job outright.
- Reply/ghosting stats exist only in fragments (didtheyghost.me, DidTheyGhostYou, Dataford, LinkedIn/Indeed badges). Nobody does early-career, per-stage, outcome-verified reply stats. That's Heardback's long-term wedge, and it needs the real backend.
- Trackers with AI tailoring are mature and cost $24–40/month (Teal, Huntr, Simplify+, Jobright, Careerflow). Heardback is free, and does what they mostly don't: paste-an-email logging, per-round tracking with prep and thank-you nudges, and "posting taken down" detection.
- Full table and sources: research/competitors.md.

## LinkedIn post draft

**Main version**

> [Edit to your own experience] Half the internship listings I applied to last year never replied. Some of them were never real.
>
> So I built Heardback, a free job search app for internships and new-grad roles that asks one question about every listing: will you actually hear back?
>
> - 8,000+ live internship and new-grad roles, each linking straight to the company's own application page
> - A ghost-job check on every listing: how long it's been up, how many times it was closed and reposted, how many cities it's blasted across
> - A pipeline that tracks every interview round. Paste a recruiter email and it logs itself.
> - A Today view that tells you who to follow up with, who owes you a reply, and when to call it ghosted
>
> It's free and your data stays in your browser.
>
> If you're recruiting this season, try it and log your last 10 applications. Once enough people share, Heardback shows each company's real reply rate.
>
> [link]

Suggested images: (1) Find view with ghost-signal column, (2) a job drawer showing "Posted and closed 7× before", (3) the pipeline board, (4) Today on a phone.

**Short version**

> Built Heardback overnight: a free internship/new-grad job search that flags ghost listings (open 200+ days, reposted 7×) and tracks every interview round. Paste a recruiter email and it logs itself. Try it and log your last 10 applications: [link]


## Roadmap nights 2–3
**Night 2: real data and real accounts**
- Direct ATS ingestion (Greenhouse/Lever/Ashby, 822 boards) with descriptions → description-based fit, requirement extraction, much better tailoring.
- Daily history snapshots → true "first seen" dates, real close-and-repost detection by requisition, and a published hit rate for the ghost score.
- Small backend (Supabase/Postgres + one edge function) so anyone can sign in, sync across devices, and contribute anonymous reply data (rate-limited, verified by pasted emails).
- Nightly scheduled refresh + republish of the data files.

**Night 3: launch**
- Public company pages ("Who replies at Stripe?") once sample sizes allow, with minimum-sample rules.
- Gmail import via the viewer's connector (read-only, only recruiting emails), if the user wants it.
- Shareable weekly progress card for LinkedIn; landing page; onboarding A/B on the first screen; accessibility audit.
