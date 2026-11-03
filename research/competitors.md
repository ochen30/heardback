# Ghosted: competitor comparison (as of 3 November 2026)

**Scope:** early-career (internship / new-grad) job search tools, plus every tool I could find that publishes crowdsourced employer reply/ghosting stats or scores listings as ghost jobs.

**How this was researched, and its limits (please read):**
- Research used web search plus direct reads of GitHub. **From this sandbox, the page fetcher could not reach vendor sites** (huntr.co, simplify.jobs, tealhq.com, jobspipe.dev, metaintro.com, hr-brew.com, fortune.com, weekday.works, allwork.space and others failed DNS under the session's network allowlist). So most product facts come from search-engine extracts of vendor pages, help centers and third-party reviews, not from reading the live pages myself.
- Reddit could not be read directly. "User complaints" come from app-store/extension reviews, Trustpilot, G2 and review sites that quote Reddit. Many of those review sites sell competing products (Weekday, LoopCV, JobShinobi, Jobright's own blog), so their claims are flagged where it matters.
- The SimplifyJobs, speedyapply, vanshb03, Jobright and didtheyghost.me GitHub data was read directly on 2026-11-03 and is verified.
- **(unverified)** marks claims I could not confirm from a primary source. Prices change often. Check them before quoting externally.

---

## 1. Executive summary

1. **The job feed is a commodity, and Simplify already owns the early-career version of it.** The SimplifyJobs Summer 2027 GitHub list (48k stars) had **1,685 internship roles** on 3 Nov 2026. It scrapes company career pages **every hour**, links straight to the employer's ATS page, shows an **Age** column and a 🔒 closed marker, and has a companion New-Grad list (574 roles). At least five other daily-updated lists exist (speedyapply, vanshb03, zapply, Jobright, zshah101). Ghosted will not win on breadth or freshness of listings.
2. **Ghost-job scoring is crowded but shallow, and nobody has a validated, trusted score.** There are dozens of 2025–26 extensions and checkers (Klepify, Subspace, Trouvr, Ghost Post, GhostJob, ghostjobs.io, JobsPipe, Ghost Job Detector). Most have tiny user bases (2–43 users on several listings) and publish no accuracy data. Two are close to Ghosted's signal set and should be taken seriously. **Remote Rocketship** scored all 512k of its listings using "outlived the company's own hiring speed, quietly reposted, pile of openings the company has no track record of filling." **Klepify** builds a "GhostScore" from age, repost history and company hiring velocity. HiringCafe also filters ghost jobs at the feed level. **Ghosted's signal list on its own is not novel.**
3. **Crowdsourced reply/ghosting stats exist, but they are fragmented, unverified or locked inside incumbents.**
   - Small community sites: **didtheyghost.me** (open source, internship-focused, response timelines plus per-round interview experiences, mostly Singapore). **DidTheyGhostYou.com** (moderated post-interview reports, about 25 "most reported" companies). **GhostScore** (extension with tiered company ghosting labels on LinkedIn). **Ghost Index** (0–100 score). **Ghoster** (Gmail-read tracker with "company ghosting scores").
   - Aggregators: **Dataford** (per-company ghosting rates from 800k+ interview reports, only for companies with 300+ reports).
   - Platforms with first-party response data that show only coarse badges: LinkedIn ("Actively reviewing applicants", "Review time is typically 1 week"), Indeed (Responsive Employer badge, >51% response rate over 30 days), Greenhouse (MyGreenhouse status plus "verified" employers). Jobright has 4.4M applications of outcome data.
   - **No one does early-career, per-stage, outcome-verified reply stats well.** That gap is real.
4. **Tracking and AI resume features are mature and mostly paywalled at about $24–40/month.** Huntr (Pro $40/mo), Teal (Teal+ $29/mo), Simplify+ ($39.99/mo, reported), Jobright Turbo (about $39.99/mo, reported) and Careerflow ($23.99 / $44.99/mo) all have Kanban trackers, match scores and AI tailoring. **Email auto-logging is the exception.** None of the big trackers clearly offers it (unverified for each). Small tools do (ApplyTrack, JobShinobi, Job Beast for Gmail, JobSnap, Wonsulting JobTrackerAI, Ghoster). **Per-round interview tracking is weak everywhere** except Huntr's interview tracker and didtheyghost.me's community round reports.
5. **Recommended positioning: "the honest job search for students".** Ghosted's edge is not any single feature. It is the **closed loop**: tracker outcomes feed pooled, verified, early-career reply stats, which calibrate the ghost score on each listing, which drives the nudges. Compete on trust and truthfulness, and be free. Do **not** compete on listing breadth, autofill/auto-apply, resume-builder depth, LinkedIn optimization, networking CRMs or salary data. Link out to the GitHub lists and Levels.fyi instead.

---

## 2. Comparison table

Legend: **Y** = yes. **P** = partial or limited. **N** = no / not found. **?** = could not verify. Prices are USD per month unless noted, and "(rep.)" means reported by third parties only.

### 2a. Mainstream job-search tools

| Product | Price | Job feed | Ghost-job detection | Match score | AI resume tailoring | Pipeline tracker | Per-round interview tracking | Email auto-logging | Nudges / reminders | Interview prep | Company reply / ghosting stats |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ghosted (plan)** | Free | Y (Greenhouse/Lever/Ashby) | Y (per listing) | Y | Y (bullets) | Y | Y | Y (paste email) | Y (Today view) | Y (per round) | Y (pooled, anonymous) |
| Teal | Free; Teal+ $13/wk, $29/mo, $79/qtr | N (saves jobs from other boards) | N (one unreliable extension listing claims it) | Y (Matching Mode; full keywords paid) | Y (paid for unlimited) | Y | P (stages, notes) | N ? | P (networking CRM follow-ups) | P ? | N |
| Huntr | Free (100 jobs, 2 tailored resumes); Pro $40/mo ($30/mo quarterly) | P (job search / clipper) ? | P ? (AlternativeTo says it "flags questionable or ghost jobs"; not in Huntr docs) | Y (Job Match Score) | Y (Pro) | Y (Kanban) | **Y** (interview tracker) | N ? | P ? | N ? | N |
| Simplify (Copilot + Jobs) | Copilot and tracker free; Simplify+ $39.99/mo (rep.) | **Y** (Job Matches + Job Board, strong for interns) | P (Age column + closed marker; no score) | P (ranked matches with "why it matched"; no confirmed %) | Y (Simplify+) | Y (auto-logs apps submitted via autofill) | N ? | N (autofill logs applications, not email) | ? | N ? | N |
| Simplify GitHub lists (and speedyapply, vanshb03, zapply, Jobright lists) | Free | **Y** (1,685 intern + 574 new-grad roles at Simplify alone) | P (Age, 🔒 closed, sponsorship flags) | N | N | N | N | N | N (third-party SWEList email alerts) | N | N |
| LinkedIn (My Jobs + Premium Career) | Free; Premium Career ~$39.99+/mo (rep.) | Y | P (posting age, "Reposted" label, "Actively reviewing applicants") | P (Premium "job-post fit insights") | P (Premium AI writing) ? | P (Saved / Applied / Archived; no notes or reminders) | N | N (in-app statuses only) | N | P (Premium AI coach) ? | **P** (Hirer responsiveness insights per posting; no per-company stats) |
| Jobright | Free (daily credits); Turbo ~$39.99/mo (rep.), .edu half price (2025) | **Y** | P ? (only competitor sources claim stale/fake filtering) | **Y** | Y | Y | N ? | N ? | ? | P (Orion copilot) | N public (it has an internal 4.4M-application ghosting study) |
| Careerflow | Free; Premium $23.99/mo; Premium Plus $44.99/mo | N ? | N | P | Y | Y (free, unlimited per FAQ) | N ? | N ? | P (follow-ups) ? | Y (Premium Plus AI mock interview) | N |
| Glassdoor | Free | Y | N | N | N | N | N | N | N | **Y** (interview questions per company) | **P** (interview reviews incl. process length; aggregate ghosting research only, no per-company rate shown) |
| Levels.fyi | Free | Y (~4.5k internship roles, many with pay) | N | N | N | N | N | N | N | N ? | N (pay data only) |
| Indeed (extra) | Free | Y | N | N | N | P (My Jobs) | N | N | N | N | **P** (Responsive Employer badge; "typically responds within X days") |
| Greenhouse MyGreenhouse (extra) | Free | P (Greenhouse jobs only) | N | N | N | P (status of Greenhouse applications only) | N | N (status comes from the ATS) | P (status updates) | N | **P** ("Verified" employer badges) |
| HiringCafe (extra) | Free | **Y** (scrapes career pages several times a day) | **P** (filters ghost jobs at the feed level; method not published) | ? | N | N | N | N | N | N | N |
| Handshake (extra) | Free for students | Y (campus-exclusive) | N | P | N ? | P (application tracking, deadline reminders) | N | N | P | N ? | N |

### 2b. Ghost-job detectors and reply/ghosting-stats sites

| Product | Price | Job feed | Ghost-job detection | Match / AI resume | Tracker | Per-round tracking | Email auto-log | Nudges | Interview prep | Company reply / ghosting stats | Traction (as found) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **didtheyghost.me** (open source) | Free | P (community-sourced SG tech internships) | P (open/closed postings) | N | Y (Applied / Interviewing / Rejected / Ghosted / Offered) | **Y** (OA + round experiences, types) | N | N | P (shared questions) | **Y** (response timelines per job/company) | 71 GitHub stars; Singapore-focused |
| **Ghoster** | "Free" (waitlist) | N | N | N | Y | ? | **Y** (Gmail read) | Y (auto-"ghosted" after 10 business days) | N | **Y** ("company ghosting scores" in extension) | Extension v1.0.1, May 2026; launch status unclear |
| DidTheyGhostYou.com | Free | N | N | N | N | N (records stage where contact stopped) | N | N | N | **Y** (moderated reports; "most reported" list) | 515+ approved reports (one source); press in HR Brew / Inc. |
| GhostScore (getghostscore.com) | Free | N | N | N | N | N | N | N | N | **Y** (tiers from Sketchy to Serial Ghoster shown on LinkedIn) | Near-zero users on mirror sites |
| Ghost Index (getghostindex.com) | ? | N | N | N | N | N | N | N | N | Y (0–100 score from "verified candidate experiences") | Method not found |
| Dataford | ? | N | N | N | N | N | N | N | Y ? (interview reports) | **Y** (per-company ghosting %; only companies with 300+ reports) | 800k+ interview reports |
| Remote Rocketship | Free / paid board ? | Y (remote jobs) | **Y** (scored 512,744 listings; hiring speed, reposts, revivals) | ? | N | N | N | N | N | P (company track record of filling roles) | 46.5k companies |
| JobsPipe ghost checker | Free checker (API product) | P (index) | **Y** (first/last seen, closed, ghost score; per-ATS stats) | N | N | N | N | N | N | P (per-board stats) | ? |
| Klepify | ? | P | **Y** ("GhostScore": age, repost history, company hiring velocity) | ? | ? | N | N | N | N | P | Product Hunt only |
| ghostjobs.io | Free | N | Y (user reports + company posting history) | N | N | N | N | N | N | P | Claims 500k companies / 30M postings (self-reported) |
| Small extensions: Subspace, Trouvr ($9/mo premium), Ghost Post, GhostJob, VantageCV, Advanced Apply, Ghost Job Hunter, Commit | Mostly free | N | Y (heuristic scores) | N | N | N | N | N | N | N | 2–43 users on several listings; GhostJob had 23 MAU, $0 MRR |
| Ghost Job Detector (onrender) | Free | N | Y (11 weighted rules, 0–100, shows evidence) | N | N | N | N | N | N | N | ? |
| Email-reading trackers: ApplyTrack, JobShinobi ($20/mo Pro), Job Beast for Gmail, JobSnap, Wonsulting JobTrackerAI | Mixed | N | N | P | Y | ? | **Y** | P | N | N | Small |

---

## 3. Per-product notes

### Teal (tealhq.com)
- **What it does:** a resume builder plus job tracker with a Chrome extension that saves jobs from other boards, "Matching Mode" (resume vs JD keywords), AI bullets and cover letters, and a networking CRM.
- **Pricing:** free plan (tracker, extension, basic resume, limited AI). Teal+ is **$13/week, $29/month, $79/quarter** per Teal's own help center ([help.tealhq.com](https://help.tealhq.com/en/articles/9530153-teal-vs-teal)). One aggregator lists $39/mo, which conflicts with this and is probably outdated ([spotsaas](https://www.spotsaas.com/product/teal/pricing)).
- **Strengths:** reviewers rate the tracker and extension highly ([scoutify](https://scoutify.com/blog/teal-review)).
- **Weaknesses:** "AI generated content isn't always accurate", Teal+ price compared with free AI tools, and the full keyword list is paywalled ([jobright review, biased](https://jobright.ai/blog/teal-review-2026-walkthrough-alternatives-and-faqs/)). Trustpilot is about 4/5 from ~106 reviews ([trustpilot](https://www.trustpilot.com/review/tealhq.com)).
- **Not found:** email sync, ghost-job flags (one extension listing claiming ghost detection appears to be mislabeled Trouvr copy, so it is unreliable), and company reply stats.

### Huntr (huntr.co)
- **What it does:** a Kanban tracker with a Chrome clipper, an **Interview Tracker** (included free) ([huntr.co](https://huntr.co/product/interview-tracker)), a contact tracker ([huntr.co](https://api.huntr.co/product/contact-tracker)), a Job Match Score ([help.huntr.co](https://help.huntr.co/en/articles/10552323-job-match-score)), AI resume/cover-letter tailoring and autofill.
- **Pricing:** free tier with 100 tracked jobs, 2 tailored resumes and unlimited autofill. **Pro is $40/mo**, or $90/quarter, or $160 per six months ([weekday](https://www.weekday.works/post/huntr-review), [loopcv](https://www.loopcv.pro/directory/huntr/)). Huntr's own pages also mention $30/mo, which is likely the quarterly-equivalent price.
- **Ghost flags:** AlternativeTo says Huntr "flags questionable or ghost jobs" ([alternativeto](https://alternativeto.net/software/huntr)). **Unverified.** I found nothing in Huntr's own docs.
- **Complaints:** no live support, tailoring works best only on resumes built in Huntr, autofill is hit-or-miss ([weekday](https://www.weekday.works/post/huntr-review)), and "too complex... asks so much information" (Chrome Web Store review; 4.8 average from about 1.3k ratings) ([CWS](https://chromewebstore.google.com/detail/huntr-job-search-tracker/mihdfbecejheednfigjpdacgeilhlmnf/reviews)).
- **Email sync:** I found no evidence of it ([search summary of huntr.co product pages](https://huntr.co/product/job-tracker)).

### Simplify: Copilot, Simplify Jobs and the GitHub lists
- **GitHub lists (verified directly, 2026-11-03):**
  - [SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships) has 48.3k stars and lists **1,685 roles**: SWE 546, DS/AI/ML 656, Hardware 297, PM 111, Quant 75.
  - Columns are Company, Role, Location, Application and **Age**. Rows link to the employer's own ATS page and to a Simplify page. Legend flags cover no sponsorship, US citizenship, 🔒 closed, FAANG+ and advanced degree required.
  - The FAQ says it combines community submissions with Simplify scraping "career pages at top tech companies and startups **every hour**."
  - There are separate inactive and off-season READMEs, and a [New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions) list (574 roles).
  - The lists are the biggest funnel for the Copilot extension: every row carries a Simplify link plus an autofill banner.
- **Other lists (verified via GitHub search):** speedyapply/2027-SWE-College-Jobs (9.6k stars), vanshb03/Summer2027-Internships (9.2k), zapplyjobs/Internships-2027 (5.3k), vanshb03/New-Grad-2027 (2.7k), and jobright-ai/2026-*-New-Grad lists (≤505 each). zshah101's list claims 4,300 employer boards, refreshed every 30 minutes, with H-1B sponsor data.
- **Copilot:** a free autofill extension (described as working across 100+ ATSs, including Workday, Lever and Greenhouse) plus a free, unlimited tracker ([stork.ai](https://www.stork.ai/reviews/simplify-copilot), [loopcv](https://www.loopcv.pro/directory/simplify/)).
- **Job Matches:** a daily ranked feed that explains *why* each role matched, with no confirmed percentage ([help.simplify.jobs](https://help.simplify.jobs/articles/2166608-using-your-job-matches), [Matches vs Board](https://help.simplify.jobs/articles/6542018-job-matches-vs-job-board)).
- **Simplify+:** **$39.99/mo** (reported by [Weekday, 27 Oct 2026](https://www.weekday.works/post/simplify-jobs-review), a competitor). It adds AI tailoring and **Autopilot** auto-submit.
- **Complaints:**
  - Autopilot: refunds refused, and "wrong or invented answers on submitted forms" (Weekday, biased).
  - Firefox extension (4.38/5, 125 ratings): slowdowns, freezes and login problems ([AMO reviews](https://addons.mozilla.org/en-US/firefox/addon/simplify-jobs/reviews)).
  - Praise: autofill saves several minutes per application.
- **Ghost signals:** only Age and the closed marker. There is no ghost score and no reply stats.

### LinkedIn (My Jobs, job posts, Premium Career)
- **My Jobs:** Saved / Applied (In progress) / Archived. You "can't add notes or set reminders" ([scale.jobs](https://blog.scale.jobs/how-to-track-job-applications-on-linkedin)). Statuses (Applied, Application viewed, Resume downloaded) are only reliable for Easy Apply. For off-site applications, confirm with the employer ([careery](https://careery.pro/blog/resume-applications/linkedin-application-status-meaning)).
- **Responsiveness insights (official):** posts can show **"Actively reviewing applicants"** (a recruiter reviewed at least one application in the past 2 weeks, updated daily) and **"Review time is typically 1 week"** ([LinkedIn Help](https://www.linkedin.com/help/learning/answer/a1655396)). Coverage from February 2025 framed this as LinkedIn telling job seekers how likely they are to get a response ([Fortune](https://fortune.com/2025/02/02/linkedin-indeed-greenhouse-job-seekers-likely-response-interviews)). This is the most important incumbent move against Ghosted's stats wedge. It is per-posting and coarse, it does not publish company reply rates, and it only covers LinkedIn-tracked activity.
- **Reposts:** posts carry a "Reposted" label. Vendors note this is a weak signal on its own ([JobsPipe](https://jobspipe.dev/blog/how-often-does-linkedin-repost-jobs)).
- **Premium Career:** AI job-fit insights, AI writing assistant, "<10 applicants" filter, "top choice" flag ([premium.linkedin.com](https://premium.linkedin.com/careers/career)). The price is roughly $39.99+/mo per third parties (unverified) ([itsourcecode](https://itsourcecode.com/linkedin/is-linkedin-premium-worth-it/)).
- **Ghosted must not scrape LinkedIn** (the spec already forbids it).

### Jobright (jobright.ai)
- **What it does:** an AI job feed from boards and company sites with a **Match Score** ([jobright.ai](https://jobright.ai/ai-job-match)), auto resume tailoring, a tracker, an H-1B filter, **Insider Connections** (referral contacts) and the **Orion** copilot ([Jobscan comparison](https://www.jobscan.co/blog/jobscan-vs-jobright/)). It also publishes new-grad GitHub lists.
- **Pricing:** free tier with daily credits. **Turbo is reported at $39.99/mo** (raised from $29.99), $17.99/week or $89.99/quarter. Jobright's pricing page 404'd for one reviewer in October 2026 ([jobstrack.io](https://jobstrack.io/blog/jobright-review-2026), [atsverification](https://atsverification.com/blog/jobright-ai-review-2026/)). A 2025 AMA said .edu emails get Turbo at half price.
- **Ghosting data (important):** Jobright published its own analysis of **550k users and 4.4M applications**. It reports ghosting rates of 11% remote vs 8% on-site vs 6% hybrid, and 1% for postings with salary vs 11% without ([jobright blog](https://jobright.ai/blog/?p=5110)). Jobright has the outcome data to launch per-company reply stats at any time. **It is the most dangerous potential fast follower.**
- **Ghost filter:** only claimed by competitors (unverified).
- **Complaints:** the price feels steep for the results, Orion "doesn't clearly beat ChatGPT", irrelevant matches, and a limited free tier (aggregated from Reddit and G2 by biased reviewers) ([G2](https://www.g2.com/products/jobright/reviews)).

### Careerflow (careerflow.ai)
- **What it does:** a tracker (free with no limit per the official FAQ; some reviews say 15–25 apps), a Chrome extension, resume builder, LinkedIn optimizer, cover letters and a networking tracker. Premium Plus adds **AI Mock Interview** and interview analysis ([FAQ](https://www.careerflow.ai/faq), [help center](https://help.careerflow.ai/en/articles/10605570-free-vs-premium-access), [tracker](https://www.careerflow.ai/job-tracker)).
- **Pricing:** Premium is $23.99/mo ($172.99/yr). Premium Plus is $44.99/mo ($299.99/yr). Student pricing is available.
- **Complaints:** bugs that lost progress, a restrictive free plan, and unexpected renewal charges ([weekday](https://www.weekday.works/post/careerflow-ai-review), [scoutify](https://scoutify.com/blog/careerflow-review)).
- **Not found:** ghost features and reply stats.

### Glassdoor
- **What it offers:** a job board plus per-company interview reviews (questions, experience, and self-reported process length, e.g. "average of 20 days") ([time-to-hire](https://www.glassdoor.com/blog/time-to-hire-study/)).
- **Ghosting research (aggregate only):**
  - Ghosting mentions in interview reviews more than doubled from February 2020 to 2023 ([HR Dive](https://www.hrdive.com/news/employer-ghosting-doubled-in-recent-years-glassdoor/698304/)).
  - Mentions were up 11% year over year in 2024, with an industry table led by Media & Communication at 6.5% ([Glassdoor blog](https://www.glassdoor.com/blog/conversation-starter-ghosting-2024)).
- **What it lacks:** no per-company reply rate, no tracker, no ghost-listing flags.
- **Strength:** the deepest interview-question corpus.
- **Weakness for students:** sparse data for intern roles at smaller companies.

### Levels.fyi
- **What it offers:** a jobs board with about **4,547 internship roles** across ~200 companies, many with pay ranges, plus intern pay data ([levels.fyi](https://www.levels.fyi/jobs/level/internship)).
- **What it lacks:** no tracker, ghost flags or reply stats found. It is a complement to link to for pay, not a competitor to fight.

### Indeed, Greenhouse MyGreenhouse, HiringCafe, Handshake (extras)
- **Indeed:** "Responsive Employer" badge for employers with a **>51% response rate over the last 30 days**, recalculated weekly. Some posts also show "typically responds within X days" ([Indeed Help](https://in.indeed.com/help/employers/articles/what-is-an-employer-response-badge), [Workable](https://help.workable.com/hc/en-us/articles/16965390312215-What-is-a-Responsive-Employer-Badge-on-Indeed)). This is first-party and credible, but binary and Indeed-only.
- **Greenhouse MyGreenhouse:** candidates track the status of Greenhouse applications. Rejections auto-mark inactive. Employers earn "Verified" badges for communication practices. There are monthly "Dream Job" flags ([my.greenhouse.com](https://my.greenhouse.com/how-it-works), [support](https://support.greenhouse.io/hc/en-us/articles/43418495049499-MyGreenhouse-FAQ-for-Candidates)). It only covers Greenhouse employers, and one guide says employers must switch status visibility on (unverified conflict). Greenhouse data is also the source of the oft-quoted "18–22% of postings are ghost jobs."
- **HiringCafe:** a free search engine over career pages that "actively filters listings it determines to be ghost jobs". It raised a $6.8M pre-seed and is popular on Reddit, though users still asked for repeat-listing flags ([TNW](https://thenextweb.com/news/hiringcafe-6-8m-pre-seed-ai-talent-agent), [scoutify](https://scoutify.com/blog/hiringcafe-review)). It is the strongest "real jobs only" feed, but has no tracker and no stats.
- **Handshake:** campus-exclusive listings, a video-style feed, application tracking and deadline reminders ([Sacra](https://sacra.com/research/handshake)). It is the default for many students. No ghost or reply data found.

### Crowdsourced reply/ghosting stats: who already does it
- **didtheyghost.me** ([GitHub](https://github.com/didtheyghostme/didtheyghostme), [site](https://didtheyghost.me)). **Closest conceptual match to Ghosted's stats.**
  - Its README asks: "How long does it usually take to hear back from company X? Has anyone heard back from this role? What are the OA/interview rounds like?"
  - It has a personal tracker with a Ghosted status, plus per-round interview experiences and response timelines.
  - It is small (71 stars), starts with **Singapore tech internships**, and has no ghost-listing score, matching, email logging or nudges.
- **Ghoster** ([site](https://ghoster-nine.vercel.app/), [extension](https://chromewebstore.google.com/detail/ghoster/ocmfinclelcmanempbbjngooegkbhlmp)). **Closest all-in-one competitor to Ghosted's tracker-plus-stats idea.**
  - Its business-day clock auto-marks an application ghosted after 10 business days of silence.
  - Gmail integration detects invites and rejections.
  - Its extension shows "company ghosting scores before you apply".
  - It is early stage: waitlist copy, extension v1.0.1 from May 2026.
- **DidTheyGhostYou.com** ([HR Brew](https://www.hr-brew.com/stories/ghosting-website-takes-aim-at-employers), [Metaintro](https://www.metaintro.com/blog/ghosting-tracker-apple-microsoft-meta-applicants), [Allwork](https://allwork.space/2026/07/new-website-lets-job-seekers-publicly-report-employers-that-ghost-candidates/)).
  - Launched mid-July 2026 by Gary Meyer (Toronto). It takes anonymous, moderated post-interview ghosting reports and has a "most reported" list topped by Apple, Microsoft and Meta.
  - Coverage notes the data is "self-reported, unverified and unaudited", and big employers accumulate reports simply because of volume.
  - It shows report counts, not rates.
- **GhostScore extension** ([CWS](https://chromewebstore.google.com/detail/ghostscore-company-ghosti/njpofhdaklnebjihhedfdhglnnegflee)). It labels LinkedIn employers with tiers (Sketchy, Known Offender, Major Red Flag, Serial Ghoster) from report counts. The tiers are judgmental, the method is not public, and adoption looks minimal.
- **Ghost Index** ([LinkedIn](https://linkedin.com/company/ghostindex)). A 0–100 "Ghost Index Score" from "verified candidate experiences". The site and method could not be checked (unverified).
- **Dataford** ([Onrec summary](https://onrec.com/node/129483)). Per-company ghosting rates from 800k+ interview reports (sources include Glassdoor; snapshot 4 September 2026), only for companies with 300+ reports. Highest rates: Whova 18%, Insulet 16%, SharkNinja 15%, FanDuel 14%. **This is the most rigorous public per-company number I found.** It is still self-reported, interview-stage only (not application reply rates), and not early-career-specific.
- **Other small projects:** Ghostedd (stories marked "unverified" by default) ([PH](https://www.producthunt.com/products/ghostedd)), Do Not Ghost Me (open source, company-intel API with a minimum sample size) ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fnecdetsanli%2Fdo-not-ghost-me)), and a Claude skill that scores companies by reply speed from your own email ([GitHub](https://github.com/KaoNotCow/job-application-ghosting-tracker)).

### Ghost-job detection: who already does it
- **Remote Rocketship** ([report, 27 Aug 2026](https://www.remoterocketship.com/advice/ghost-jobs-report/)).
  - It scored all **512,744** live listings from 46,517 companies. **20.3% showed ghost warning signs**: listings that "outlived the company's own hiring speed, been quietly reposted, or sit in a pile of openings the company has no track record of filling".
  - It found that staffing agencies post 3% of listings but produce 10.8% of likely ghosts, and that about 2% of listings were "revived" so their "posted 2 days ago" label reset.
  - **This is essentially Ghosted's signal set, already run at scale**, but only on remote jobs, and with no published validation against outcomes.
- **Klepify** ([PH](https://www.producthunt.com/p/klepify-ghost-free-job-search/klepify)). A side-panel "GhostScore" from posting age, repost history and the company's real hiring velocity. Its maker is asking users for accuracy feedback, so it is not validated.
- **JobsPipe** ([ghost checker](https://jobspipe.dev/ghost-jobs), [by-board stats](https://jobspipe.dev/blog/ghost-jobs-by-job-board)). Paste a URL to get first/last seen, closed status and a ghost score. It publishes per-ATS warning shares: Lever 43.9% and Greenhouse 36.8% of scored postings, with Lever driven by mass posters and re-dating. It also notes that evergreen requisitions inflate scores.
- **Ghost Job Detector** ([how it works](https://ghostjobdetector.onrender.com/how-it-works)). Deterministic: 11 weighted red flags, 0–100, with the matched evidence shown. It is transparent but text-only.
- **ghostjobs.io** ([PH update](https://www.producthunt.com/p/ghost-jobs/major-update-of-ghostjobs-io-live-now-making-the-job-market-more-transparent)). User reports plus company posting history. It claims 500k companies and 30M postings (self-reported).
- **JobsGlitch** ([dev.to](https://dev.to/jobsglitch/the-jobsglitch-employer-intelligence-report-which-companies-are-actually-hiring-35m0)). A "Hiring Velocity" score with a published formula: fresh jobs × 0.4 + unique titles × 0.3 + salary recency × 0.3. Per-company tables were empty.
- **Show HN tracker** ([HN](https://hn.svelte.dev/item/48163604)). Tracks 35k+ listings at 200+ companies for time-open. No public API.
- **Long tail of extensions:** Subspace (2 users) ([AMO](https://addons.mozilla.org/firefox/addon/subspace-ghost-job-scanner/)), Trouvr ($9/mo premium, 12 users) ([auditor](https://extensionauditor.com/scan/trouvr-ghost-job-detector-gmiggnoakdoiombhiofncfmghbnoidlp)), Ghost Post ([CWS](https://chromewebstore.google.com/detail/djgegpommklkillcbapokgoicohajnfl)), GhostJob (23 MAU, $0 MRR) ([IH](https://www.indiehackers.com/post/building-ghostjob-a-chrome-extension-to-detect-ghost-job-postings-day-19-23-mau-0-mrr-b6083b2db2)), JobGhosting (stale postings from Greenhouse/Lever/Ashby/Workday feeds) ([PeerPush](https://peerpush.com/p/jobghosting)), and a Taiwanese 104.com.tw detector that was **discontinued in October 2026** ([GitHub](https://github.com/fansia/104-ghost-job-detector)). **Lesson: a standalone ghost badge is not a business. It has to sit inside a daily-use workflow.**

### Email auto-logging specialists
- **ApplyTrack:** Gmail OAuth moves statuses automatically; real-time sync is premium ([docs](https://mintlify.com/philtechphilips/applytrack/integrations/gmail)).
- **JobShinobi:** forwarding address that matches emails to existing rows; Pro feature, $20/mo ([site](https://jobshinobi.com/landing/job-tracker-that-auto-logs-confirmations)).
- **Job Beast for Gmail:** per-email import, so it reads only the open email ([Workspace Marketplace](https://workspace.google.com/marketplace/app/job_beast_for_gmail/35754788047)).
- **Wonsulting JobTrackerAI:** Google-approved Gmail access ([site](https://www.wonsulting.com/jobtrackerai)).
- **Takeaway:** paste-an-email, which is Ghosted's approach, is the privacy-friendliest of these models. It is also manual, so make it very fast.

---

## 4. Recommended positioning for Ghosted

**One line:** *"Know which internships are real and which companies actually reply, before you spend the hours."* It is free, built for students and new grads, and every number shows its sample size.

**Where Ghosted is clearly different (defend these):**
1. **A closed loop no competitor has.** Trackers (Huntr, Teal, Careerflow) know your outcomes but not anyone else's. Stats sites (didtheyghost.me, DidTheyGhostYou, Dataford) know crowd outcomes but are not where you work. Ghost detectors (Remote Rocketship, Klepify, JobsPipe) see listings but not outcomes. Ghosted can join all three: a listing's ghost score is informed by what happened to Ghosted users who applied to it, which no one else can do.
2. **Early-career specificity.** Intern and new-grad hiring is seasonal and has its own failure modes: evergreen "talent pool" reqs, roles filled by October but left open until spring, and OA-then-silence. Generic tools ignore all of these. Stats segmented by role category × seniority × season are rare. didtheyghost.me is the only one, and it is Singapore-focused.
3. **Honesty as a feature.** Every competitor in this space either hides its method or labels companies with loaded terms ("Serial Ghoster"). Ghosted should show the evidence behind each score ("open 94 days, 3rd repost of the same title, company's median time-to-close is 31 days"), sample sizes, and "Not enough data yet". That is a credible contrast and lowers defamation risk.
4. **Free, with the core AI included.** Huntr, Teal, Simplify+, Jobright and Careerflow all charge about $24–40/mo for unlimited tailoring and match details. Students are price-sensitive (Jobright gives .edu users half price; Careerflow has student pricing).

**What Ghosted should NOT compete on:**
- **Listing breadth or freshness.** Simplify scrapes hourly and has 1,685 intern roles. Use the Greenhouse, Lever and Ashby APIs for the signal, then link to the GitHub lists and Levels.fyi rather than trying to out-aggregate them.
- **Autofill and auto-apply.** Simplify Copilot is free and entrenched, and auto-apply draws refund and "invented answers" complaints. It also undermines the "quality over volume" story.
- **Resume-builder depth** (templates, PDF design, LinkedIn profile optimization). This is Teal and Careerflow's home turf. Keep tailoring to "suggested bullets, never invent experience".
- **Networking CRM or insider connections.** That is Jobright and Teal's territory.
- **AI mock-interview video/voice.** Careerflow Premium Plus and many others do this. Ghosted's per-round prep should stay lightweight and tied to the tracked round.
- **Salary data.** Link to Levels.fyi.

**Risks to state plainly:**
- **Jobright has the data to copy the stats wedge**: 4.4M applications with outcomes.
- **LinkedIn, Indeed and Greenhouse hold first-party response data.** If any of them publishes per-company reply rates, Ghosted's moat shrinks to early-career specificity and honesty.
- **Cold start.** Pooled stats are empty on day one, and seeded example data must stay clearly labelled.
- **Name collisions.** "Ghosted" is already used by a terminal tracker ([celloopa/ghosted](https://awesome.ecosyste.ms/projects/github.com%2Fcelloopa%2Fghosted)) and a Web3 career project ([HackQuest](https://hackquest.io/projects/Ghosted)). Ghoster and Ghostedd are close in name and concept. Check this before any public launch.

---

## 5. Three wedge features that no competitor does well

### Wedge 1: Requisition lineage with an outcome-checked ghost score
Track each posting's **identity across reposts** using the ATS's own IDs: Greenhouse job/requisition ID, Lever posting ID, Ashby job ID, plus a title/description fingerprint. Then show a lineage line on the card:

> *"4th posting of this role since Feb (same description, new date). Of 37 Ghosted users who applied to earlier versions, 0 heard back."*

- Then **publish calibration**, e.g. *"Of listings we scored 80+ last season, 71% produced no reply for any Ghosted user (n = 412)."*
- **Why it's a wedge:** competitors either see reposts but not outcomes (Remote Rocketship, JobsPipe, Klepify) or outcomes but not listings (didtheyghost.me, Dataford). Nobody publishes how often their ghost score is right.
- **How to build it:** the spec's public ATS APIs make it feasible without scraping.

### Wedge 2: Company "reply clock" by stage and season, wired into nudges
From pooled outcomes, compute each company's p50/p90 **days to first reply after applying, after the OA and after each interview round**, for the intern/new-grad cohort and the current season. Then make it drive the user's own Today view:

> *"Datadog usually replies to intern OAs within 6 days (p90 = 11). You're at day 12. Likely ghosted: send one follow-up today, then move it to Ghosted."*

- **Why it's a wedge:**
  - Ghoster uses a fixed 10-business-day rule for everyone.
  - Indeed and LinkedIn show a single "typically responds" label, with no stages.
  - didtheyghost.me shows timelines but doesn't act on them.
  - Trackers nudge on generic timers.
- **The core value:** a company-specific "when to give up" is something students repeatedly ask for, and it turns stats into a daily habit.

### Wedge 3: Verified-by-email pooled stats plus a "this season's hiring window is closing" signal
When a user pastes a confirmation, OA, interview-invite or rejection email, record only an **anonymized, verified event**: company, role category, stage, date. The sender domain and ATS template are checked, and no text is stored. Use these events to:
1. Label every company stat with how much of it is **email-verified** vs self-reported. This answers the "self-reported, unverified, unaudited" critique that every current ghosting site carries.
2. Detect **season saturation**, e.g. *"Ghosted users report final rounds and offers already out at this company for Summer 2027 SWE intern. Applicants since Oct 1 got 0 first replies (n = 23)."* This is the early-career ghost-job pattern (the role is effectively filled, but the posting stays up), and generic detectors miss it.
- **Why it's a wedge:**
  - DidTheyGhostYou, GhostScore and Ghost Index are all unverified self-reports.
  - Dataford is interview-stage only, with a 300-report threshold.
  - Incumbents' badges are binary.
- **Guardrails:** k-anonymity thresholds (e.g. at least 5 per cell) and "Not enough data yet" protect users and limit defamation exposure.

---

## 6. Key sources (also cited inline above)
- Simplify lists (read directly): https://github.com/SimplifyJobs/Summer2027-Internships, https://github.com/SimplifyJobs/New-Grad-Positions
- didtheyghost.me README (read directly): https://github.com/didtheyghostme/didtheyghostme
- LinkedIn hirer responsiveness: https://www.linkedin.com/help/learning/answer/a1655396
- Indeed response badge: https://in.indeed.com/help/employers/articles/what-is-an-employer-response-badge
- Remote Rocketship ghost report: https://www.remoterocketship.com/advice/ghost-jobs-report/
- Jobright ghosting study: https://jobright.ai/blog/?p=5110
- Dataford ghosting rates (via Onrec): https://onrec.com/node/129483
- DidTheyGhostYou coverage: https://www.hr-brew.com/stories/ghosting-website-takes-aim-at-employers
- Ghoster: https://ghoster-nine.vercel.app/
- Teal pricing: https://help.tealhq.com/en/articles/9530153-teal-vs-teal
- Huntr pricing/complaints: https://www.weekday.works/post/huntr-review
- Simplify+ pricing/complaints: https://www.weekday.works/post/simplify-jobs-review
- Careerflow plans: https://help.careerflow.ai/en/articles/10605570-free-vs-premium-access
- Glassdoor ghosting research: https://www.glassdoor.com/blog/conversation-starter-ghosting-2024
- Levels.fyi internships: https://www.levels.fyi/jobs/level/internship
