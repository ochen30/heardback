# Ghosted data pipeline

Two stdlib-only Python scripts in `tools/`:

| Script | What it does | Runs tonight? |
|---|---|---|
| `tools/refresh_jobs.py` | Downloads the SimplifyJobs `listings.json` files to `data/raw/` (skipped with `--offline`). Builds `dist/data/jobs.json`, `dist/data/companies.json` and `data/ats_boards.json`, then prints a summary. | Yes. `raw.githubusercontent.com` is reachable. |
| `tools/fetch_ats.py` | Reads `data/ats_boards.json`, fetches each board from the public Greenhouse / Lever / Ashby APIs and writes the same job shape plus a description excerpt to `data/ats_jobs.json`. `--selftest` checks the normalizers against hand-written SAMPLE payloads. | No. The API hosts are blocked by this container's network policy. The script says so and stops cleanly. |

```
python3 tools/refresh_jobs.py            # download + build
python3 tools/refresh_jobs.py --offline  # build from data/raw/*.json
python3 tools/fetch_ats.py --selftest    # offline normalizer tests (SAMPLE data, nothing written)
python3 tools/fetch_ats.py --open-only   # once boards-api.greenhouse.io, api.lever.co, api.ashbyhq.com are allowed
```

## Inputs

* `data/raw/newgrad.json`, from `SimplifyJobs/New-Grad-Positions@dev/.github/scripts/listings.json`. Gets `lvl = "newgrad"`.
* `data/raw/intern.json`, from `SimplifyJobs/Summer2026-Internships@dev/.github/scripts/listings.json`. Gets `lvl = "intern"`.

Each file is a JSON array of community-maintained listings. The listings have no job descriptions. The download writes to a `.part` file first, checks that the payload is a JSON array of 100 or more items, and only then replaces the old copy. If a download fails, the build uses the existing local copy and prints a warning with that copy's timestamp.

## jobs.json (minified)

```
{ "v":1, "generatedAt":"2026-11-03T08:43:11Z",
  "source":{"name":…, "url":"https://github.com/SimplifyJobs", "note":"Listings link to each employer's own application page."},
  "stats":{"active","companies","intern","newgrad","postedLast7d","likelyGhost"},
  "companies":["10a Labs", …],          // index-addressed, alphabetical (case-insensitive)
  "jobs":[ {…}, … ] }                    // newest date_posted first
```

The file contains only listings where `active && is_visible`, de-duplicated by URL key (see below). When two records share a URL, the build keeps the one with the newest `date_updated`.

| Field | Meaning |
|---|---|
| `id` | First 10 characters of the Simplify uuid (e.g. `6be0cbab-0`). If two jobs collide, both get 14 hex characters with the dash removed. This happened 2 times in the current build. |
| `c` | Index into `companies`. |
| `t` | Title with whitespace collapsed. |
| `l` | Cleaned locations, at most 12. The client shows the first 6 and then "+N more". |
| `nl` | Total number of cleaned locations (not capped). |
| `r` | 1 if any location matches `/remote/i`, otherwise 0. |
| `cat` | `Software` (Software, Software Engineering), `Data & AI` (AI/ML/Data, Data Science, AI & Machine Learning), `Hardware`, `Product` (Product, Product Management), `Quant` (Quant, Quantitative Finance), otherwise `Other`. |
| `lvl` | `intern` or `newgrad`, set by which source file the record came from. |
| `term` | First entry of `terms`. `"N/A"` becomes `""`. New-grad records have no terms, so they are always `""`. |
| `sp` | `yes` = Offers Sponsorship, `no` = Does Not Offer Sponsorship, `citizen` = U.S. Citizenship is Required, `""` = anything else. |
| `deg` | Bachelor's→`BS`, Master's→`MS`, PhD→`PhD`, Associate's→`AS`, MBA→`MBA`, Certificate→`Cert`. Other values (Bootcamp, JD, MD, PharmD, Incomplete…) are kept as given. |
| `p` | `date_posted` (unix seconds). This is when the listing was added to the Simplify list, not when the employer published it. |
| `u` | `date_updated`. For an active listing this is only the last time Simplify re-checked it. It is not a repost. |
| `url` | Apply URL, unchanged. |
| `ats` | Taken from the URL host. `*.greenhouse.io` or a `gh_jid=` parameter → `greenhouse`. `jobs.lever.co` / `jobs.eu.lever.co` → `lever`. `jobs.ashbyhq.com` → `ashby`. `*.myworkdayjobs.com` / `*.myworkdaysite.com` / `*.myworkday.com` → `workday`. Everything else → `other`. |
| `g` | Ghost score, an integer from 0 to 100 (rubric below). |
| `gr` | Up to 3 reasons, ordered by the points each one contributed. `[]` when `g == 0`. |
| `rp` | Close-and-repost cycles: the number of **earlier** distinct postings in the dataset (both files, visible) with the same company key and normalized title that were posted before this job (`date_posted` strictly earlier) **and are now closed**. Postings of the same title that are open right now are not counted. |

`stats.likelyGhost` is the number of jobs with `g >= 50`. `stats.postedLast7d` counts jobs with `p >= now − 7 days`.

## companies.json (minified)

The file has the shape `{"v":1,"generatedAt":…,"companies":{"<index>":{…}}}`. It contains only companies with at least one open job, and each key is the same index as in `jobs.json`.

| Field | Meaning |
|---|---|
| `n` | Display name. |
| `open` / `intern` / `newgrad` | Open job counts. |
| `cats` | `{category: open count}`. |
| `seen` | Distinct postings ever in the dataset (visible, open or closed). |
| `first` | Earliest `date_posted` for this company. |
| `closed` | Number of closed (inactive) postings. |
| `closedTimed` | Closed postings with a measurable open time. **Measurable** means `date_updated − date_posted ≥ 1 day`; see the caveats for why. |
| `medOpenDays` | Median days open across the measurable closed postings. `null` when `closedTimed < 5`. |
| `fastClose` | Share of the measurable closed postings that closed within 14 days. `null` when `closedTimed < 5`. |
| `avgGhost` | Mean `g` of the company's open jobs. |
| `repostShare` | Share of open jobs with `rp >= 1`, meaning the same role was posted and closed at least once before. |
| `sponsor` | Share of open jobs with `sp == "yes"`. Almost always 0 because the source rarely fills this field (see caveats). |
| `locs` | Top 5 locations across open jobs. |
| `ats` | Most common `ats` among open jobs. |
| `board` / `boardAts` | Greenhouse/Lever/Ashby board token taken from the company's URLs. The build prefers a token seen on open jobs and falls back to the most-seen token. `board` is `null` when none was found. `boardAts` names the ATS the token belongs to, which can differ from `ats`. |
| `site` | `company_url` from the source. This is the company's **Simplify page** (`simplify.jobs/c/…`), not the company's own website. |

## data/ats_boards.json

The file holds one entry per (company, ats, board) found in the apply URLs of any visible listing, open or closed:
`{company, ats, board, openInDataset, seenInDataset, lastSeen, region?}`. `region` is `"eu"` for `job-boards.eu.greenhouse.io` and `jobs.eu.lever.co` boards, and `fetch_ats.py` then calls the EU API host. Entries are sorted by `openInDataset`, highest first.

Token rules:

* Greenhouse: the first path segment of `boards.greenhouse.io/<t>`, `job-boards.greenhouse.io/<t>` and their `.eu` variants, or the `for=` parameter of `/embed/job_app`. Greenhouse tokens are lowercased.
* Lever: `jobs.lever.co/<t>`, lowercased.
* Ashby: `jobs.ashbyhq.com/<t>`, case kept as written.
* UUID-shaped segments are internal org ids, not board names, so they are dropped.

"Verified to exist" here means that a real apply URL on that board appeared in the dataset. The boards have **not** been checked against the APIs, because the API hosts are blocked. Treat boards with `openInDataset == 0` as lower confidence. The first `fetch_ats.py` run reports 404 boards, which should then be removed from the list.

## Normalization

* **Company key.** Trim, collapse runs of whitespace and hyphens to one space, then casefold. This merges `Whatnot`/`WhatNot`, `Rolls Royce`/`Rolls-Royce` and names with trailing spaces. The display name is the most common trimmed variant. Different legal names such as `Rocket Lab USA` and `Rocket Lab Corporation` are **not** merged.
* **Distinct posting.** Records that share a Simplify `id` or a URL key are one posting. 264 postings appear in both files.
* **URL key.** Lowercase the host, drop the fragment and the trailing `/`, drop tracking parameters (`embed`, `utm_*`, `src`, `ref`, `gh_src`, `lever-source`, `mobile`, `needsRedirect`…), and strip the Ashby `/application` and Lever `/apply` suffixes. Parameters that identify the job, such as `gh_jid`, `token` and `jobId`, are kept.
* **Normalized title**, which decides "same role":
  1. lowercase, `co-op`→`coop`, `new grad`→`newgrad`;
  2. remove gender tags (`m/f/d`, `h/f`, `w/m/d`…);
  3. remove years `20xx`;
  4. remove season words `summer|fall|autumn|winter|spring`;
  5. turn punctuation into spaces (`+` and `#` are kept, so `C++` and `C#` survive);
  6. token aliases: `internship`/`interns`→`intern`, `coop`→`co-op`, `graduate`→`grad`, `newgrad`→`new grad`, `engineering`→`engineer`, `sr`→`senior`, `jr`→`junior`, `i/ii/iii`→`1/2/3`;
  7. drop stopwords (`and the of for a an in to with at on term`);
  8. **sort the token set**, so word order does not matter.

  Level words (`intern`, `new grad`, `senior`, `1`/`2`) are deliberately **kept**, so an internship never matches a full-time role, and `Software Engineer 1` never matches `Software Engineer 2`.
  Examples: `Software Engineering Intern - Summer 2026`, `Intern, Software Engineer (Fall 2027)` and `Software Engineer Intern` all become `engineer intern software`.
* **Locations.** Trim, collapse whitespace and drop case-insensitive duplicates. Simplify's short forms are expanded: `NYC`→`New York, NY`, `SF`→`San Francisco, CA`, `LA`→`Los Angeles, CA`, `South SF`→`South San Francisco, CA`, `Remote in US`→`Remote in USA`.
* **Hidden records** (`is_visible == false`, 15 of them, mostly moderator-hidden duplicates) are excluded everywhere, including `rp`, `seen` and the board list.

## Ghost-job score

The score is computed for every open job relative to `generatedAt`. Each signal adds points, and the total is capped at 100. Only signals that are actually in the data are used. A job with no signals gets `g = 0` and `gr = []`.

| Signal | Rule | Points | Reason text |
|---|---|---|---|
| Age | `ageDays = (now − date_posted) / 86400` | <30: 0 · 30–59: **10** · 60–89: **25** · 90–149: **40** · ≥150: **55** | `Open 94 days`. Jobs posted within a day of the dataset's first record (2026-03-09) show e.g. `Open 238+ days`, because the true age may be longer. |
| Close-and-repost | `rp` (earlier postings of the same role that are now closed) | ≥1: **10** · ≥2: **20** · ≥4: **30** | `Posted and closed 3× before (since Mar 2026)`. The month is the earliest `date_posted` among those earlier closed postings. When 3 or more other postings of the same title are open right now, the text adds `; 4 similar openings live now`. That note is context only and earns **no points**, because several identical titles open at once is often volume hiring. It appears only when `rp >= 1`, since a 0-point job keeps `gr = []`. |
| Location blast | count of **city-level** locations: on-site entries that contain a comma, plus the NYC/SF/LA aliases | ≥8: **10** · ≥15: **20** | `Listed in 23 cities` |
| Talent-pool title | case-insensitive regex: `talent (community\|pool\|network\|pipeline)`, `general application`, `open application`, `speculative application`, `future opportunit`, `future opening(s)`, `evergreen`, `expression of interest`, `(bachelor's\|master's\|phd\|graduate\|campus\|university\|early career\|hiring\|candidate) pipeline`, `pipeline (requisition\|req\|role\|position\|opportunit\|candidate(s)\|hiring\|application)` | **35** | `Title suggests a talent pool, not a specific opening` |
| Company tempo | The company has ≥5 *measurable* closed postings, their median days open `M < 21`, and this job has `ageDays > 3·M` **and** `ageDays > 45` | **15** | `Much older than this company's typical listing (usually closes in ~12 days)` |
| *(ATS feed only)* Short description | `fetch_ats.py` only: the plain-text description is under 300 characters | **10** | `Very short job description` |

Notes on the rules:

* The bare word `pipeline` is **not** a talent-pool cue. It matches real roles ("Data Pipeline Engineer", "CI/CD Pipeline", "Art and Media Pipeline"), and 17 of the 20 titles containing `pipeline` in the dataset were technical roles like these. It counts only in the talent-pipeline phrasings above.
* Remote entries (e.g. Canonical's 248 "Remote in <country>") and bare state or country names (e.g. Highmark's 50 states) do **not** count toward location blast. A listing like that is broad eligibility, not a city-by-city blast. `nl` still reports the total.
* `date_updated` on an active job is never used as a signal. It only records Simplify's last re-check.
* With today's data, 50+ points can come from age alone (≥150 days is 55 points). In the UI, present `g >= 50` as "several ghost-job signals", not as a verdict.

## Caveats and data quality

1. **Closed-listing timestamps are mostly not close times.** About 60% of the 27,980 closed postings have `date_updated` within an hour of `date_posted` (16,902 of them). The rest cluster at about 6, 14 and 22 hours, which looks like scheduled re-checks. Most of these were probably recorded as already closed or edited in batches. They say nothing about how long the job was open. For that reason `medOpenDays`, `fastClose` and the tempo signal use only closed postings that stayed open at least 1 day (5,124 postings). With that filter, 201 companies have a tempo baseline, 159 of which have open jobs. The median is still right-censored: listings that are still open are not in the sample, so medians lean short.
2. **`date_posted` is when Simplify added the listing**, not when the employer posted it. The dataset starts on 2026-03-09, so ages cannot be longer than about 238 days.
3. **Sponsorship is barely populated.** 99.7% of listings say `"Other"`. Among open jobs, `sp` is `yes` for 4, `no` for 12 and `citizen` for 10. Do not show the `sponsor` share as a real statistic. Show it as "unknown" unless it is non-zero.
4. **`rp` matches titles, not requisitions.** It counts only earlier postings that are now closed, so concurrent openings never add points. A high-volume employer that keeps opening and closing reqs under one generic title can still build a large `rp`: RTX "Software Engineer 1" has up to 176. The signal is capped at 30 points, and the "similar openings live now" note shows when volume hiring is likely. A role re-added by Simplify under a new URL also counts as a cycle, because the source has no requisition ids.
5. Some `company_name` values are not companies (`Internship`, `AI Intern to the CEO`, both community submissions). 15 board tokens are shared by more than one company name, e.g. `Sigma`/`Sigma Computing` and `Sony Interactive Entertainment`/`PlayStation`. `fetch_ats.py` fetches each token once.
6. `company_url` is a Simplify page, not the employer's own site.
7. **License.** Neither SimplifyJobs repository has a LICENSE file (see NOTES.md). We attribute the source and link to the original postings. Resolve this before any public launch.
8. **Size.** At the current volume `jobs.json` is about 3.1 MB minified (about 0.53 MB gzipped). Every key is always present, including empty defaults, so the client never needs fallbacks. `companies.json` is about 0.69 MB.

## fetch_ats.py details

* Endpoints:
  * Greenhouse `https://boards-api{.eu}.greenhouse.io/v1/boards/{board}/jobs?content=true`
  * Lever `https://api{.eu}.lever.co/v0/postings/{board}?mode=json`
  * Ashby `https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true`
* Requests run one at a time with a 0.3 s gap (`--delay`), a 20 s timeout and User-Agent `Ghosted job aggregator`. A token shared by several company names is fetched once.
* **Blocked hosts.** A proxy CONNECT 403/407, or an HTTP 403/407 whose body comes from the proxy, counts as *blocked*. After 2 blocked responses in a row from one host, that host is skipped for the rest of the run, and the summary reports blocked, skipped, 404 and error counts. If nothing could be fetched, the script exits with status 2 and writes nothing.
* **Normalizers.**
  * Greenhouse: un-escapes the entity-escaped `content` and strips the tags. Locations come from `location.name` split on `; | / or`, plus the office locations. `p` is `first_published`, falling back to `updated_at`.
  * Lever: description is `descriptionPlain` + `lists` + `additionalPlain`. Locations come from `categories.allLocations`. `p` is `createdAt`. `workplaceType == "remote"` marks the job remote.
  * Ashby: unlisted jobs are skipped. Locations are `location` + `secondaryLocations`. `p` is `publishedAt`. `isRemote` or `workplaceType == "Remote"` marks the job remote.
* ATS feeds have no Simplify labels, so these fields come from the title or the description:
  * `lvl`: intern/co-op words → intern; new grad, entry level, junior, early career, "Engineer I" → newgrad. Senior, staff, lead and manager roles are dropped unless `--all` is passed.
  * `cat`: keyword rules.
  * `term`: `Season 20xx` in the title.
  * `sp`: explicit sponsorship or citizenship sentences in the description.
  * `deg`: degree words in the description.
* Ghost scoring uses the same `ghost_score()` as the Simplify build. The company-tempo signal is not available from a single snapshot. A single snapshot has no closed history, so `rp` is always 0 there. Identical open titles in the snapshot are passed only as the point-free "similar openings live now" note, which shows only alongside a repost reason, so it never appears on its own. The short-description signal is added here.
* Output goes to `data/ats_jobs.json` in the `jobs.json` envelope, with extra job fields `d` (plain-text excerpt, ≤1200 chars, cut at a word boundary with `…`) and `board`. Merging it into `dist/data/jobs.json` (preferring ATS rows by URL and keeping Simplify history for `rp` and tempo) is the next step once the hosts are allowed.
* `--selftest` runs all three normalizers and the scoring on hand-written SAMPLE payloads and asserts the results. Nothing from it is written to disk.
