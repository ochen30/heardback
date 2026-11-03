# Heardback: cold-launch test (LinkedIn tap, first run, 60-second budget)

**Setup.** Fresh context per persona with no stored data (SETUP=fresh). Each persona ran at 375×812 (`isMobile`, `hasTouch`, taps, DPR 2) and at 1440×900 (clicks). The build tested was `dist/`; no source was edited.
**Scripts** (all in `qa/cold/`):
- `lib.js`: harness, mirrors `qa/shot.js`.
- `personas.js a|b|c`: the three persona flows.
- `peek.js`: first-screen check.
- `fitdist.js`: spread of Fit scores.
- `foot.js`: footer and tap-target measurements.

**Screenshots** are in `qa/out-cold/<persona>-<width>-NN-<step>.png`, with timelines in `qa/out-cold/timeline-*.json`.
**Timings.** The scripts run at robot speed (about 1 s per tap). The "human" times below add realistic reading time: about 4 s per short screen and 8 to 10 s for the resume step.
**Console errors.** None in any run. There was no horizontal overflow except the footer gutter noted below.

> **Gate before launch: the viewport meta.** `dist/index.html` has no `<meta name="viewport">`. When it loads raw on a phone, the layout is 980px wide and scaled to 0.38, so text is about 5px tall (`qa/out-cold/peek-375-00-t0.png`; run `RAW=1` to reproduce). Everything below assumes the artifact host injects `width=device-width`, as `qa/ux2` also assumed. **Check this on the real LinkedIn in-app browser before posting the link.** If the host does not inject the tag, nothing else in this report matters on mobile.

---

## The first screen (t=0), both widths

The screenshots are `a-375-00-t0.png` and `a-1440-00-t0.png`.

- **Does it say what Heardback is at a glance? Partly.** The only pitch is the line "Find real roles, skip ghost listings, and track every reply.", in 13 to 14px grey under the logo. Four things are missing:
  - who it is for (students, internships and new grad);
  - that it is free and has no account;
  - what a "ghost listing" is;
  - a single real job.

  The biggest element on the page is "What are you looking for? Step 1 of 3", which reads as a form to fill in, not a product.
- **On the phone:** above the fold you see Level, Roles and 3 of the 12 locations. No job is visible, and none appears until step 3.
- **Nothing is required.** Every field says "Leave empty to see…", which is good. However, "Step 1 of 3" and a Name field make it feel like signing up.
- **"Skip setup"** sits top right on both widths, so it is findable. But it is grey 13px text with a 73×32 px tap target (under 44 px), and it reads as "skip the important part" rather than "just look around".
- **Privacy story:** nothing on the first screen. It first appears on step 2 (see persona A).

---

## Persona (a): skeptical CS sophomore, "is this another AI resume thing?"

Path: Internship + Software + SF Bay Area → Continue → resume step → Skip this step → matches → Start using Heardback.

| Step | Screenshot (375 / 1440) | Human time | What they see or think |
|---|---|---|---|
| t0 | `a-375-00-t0` / `a-1440-00-t0` | 0–5 s | "A setup wizard. Ghost listings? OK." |
| Picks | `a-*-01-picked` | ~12 s | Location counts (1,869 SF) are a nice credibility hint. |
| Step 2 | `a-*-02-step2-resume` | ~20 s | "Add your resume… We use it to score fit and suggest interview talking points." Then "Your resume is only sent to **Claude** when you click an AI action." **Skeptic's reaction: "There it is, it's an AI resume thing."** |
| Step 3 | `a-*-03-step3-matches` | **~25 s: first real job (TTFV)** | 376 matches, real companies (Roku, NVIDIA, Motorola), "13h ago". This is the strongest screen in the flow. |
| Tap a match | — | ~30 s | Nothing happens. Onboarding rows are not tappable. |
| Today | `a-*-05-landed-today` | ~35 s | On the phone, the top card is the empty "Needs you / Nothing to do yet". The jobs are below it. |

**Ghost-signal idea: never actually shown.** The only mention is "197 of them show no ghost-job signals." The top 5 are picked to be low-ghost, so none of them carries a badge. The persona never sees what a flagged listing looks like. The idea becomes clear only in the job drawer's "Listing check" (`c-375-03-job-open`), which they never reach in this path.

**Confusing:**
- **Every match shows "Fit 88".** `fitdist.js` shows 408 of 408 matches score exactly 88 when there is no resume. A skeptic reads an identical score on every row as fake.
- **"Math Libraries Intern · NVIDIA · Canada +2 more"** appears even though they picked SF Bay Area. The row shows the job's first location, not the one that matched. Today shows the same job as "Santa Clara, CA +2 more".
- **Step 2 sends two messages.** "It stays in this browser" and "only sent to Claude…" sit 3 lines apart, and "Claude" is never explained.
- **The step 2 footer at 375 is too tight.** Back, "Skip this step" and Continue span x=16 to 369, which leaves a 6px right gutter instead of 16px.

**Would they continue? Yes, tentatively.** Real, fresh listings in about 25 s earn the next visit. The "Claude" line and the identical Fit scores cost trust they did not have to spend.

---

## Persona (b): finance / consulting student

Path: looks for Finance → none → leaves Roles empty → Internship + New York → skip resume → matches → Find → search "finance", "consulting", "investment banking".

| Step | Screenshot | Human time | What happens |
|---|---|---|---|
| t0 | `b-*-00-t0` | 0–6 s | The Roles choices are Software, Data & AI, Product, Quant, Hardware. There is no Finance, Consulting or Business option, and **no line saying the app is tech-focused**. "Leave empty to see every role" implies every role is covered. |
| Step 3 | `b-*-02-step3-matches` | ~22 s | 466 matches. The top 5 are a Meta Research Scientist (Safety Evals), an ML Solution Architect and three SWE interns, **all "Fit 73"** (488 of 488 matches score 73). "Best fit first" plus five ML/SWE jobs reads as "this isn't for me". |
| Find, "finance" | `b-*-05-search-finance` | ~40 s | 4 matches. Two are niche: a PhD Economics role and a Master's FinTech role. |
| "consulting" / "investment banking" | `b-*-06`, `b-*-07` | ~50 s | 5 matches, then 1. The one IB match is "Quantitative Strats" and carries "Some ghost signals". |

Dataset check: of 8,245 postings, only 36 titles contain "financ", 40 "consult" and 8 "banking". Every posting is filed under one of the five tech categories.

**Time to first value: none.** They see real jobs at about 22 s, but none of them are relevant, and nothing explains why.

**Would they continue? No, and they leave feeling misled** rather than "not my tool". Ten words of honest scoping would turn that into "not for me yet, but my CS roommate should see this". The pipeline tracker, the half of the product that is field-agnostic, is never pitched to them.

---

## Persona (c): just wants to look around

Path: taps "Skip setup" immediately → wanders.

| Step | Screenshot | Human time | What happens |
|---|---|---|---|
| t0 → Skip setup | `c-*-01-after-skip` | ~5 s | **They land on an empty dashboard.** "Needs you: Nothing to do yet", "This week 0/10 applied", and New for you reads "Add target roles and locations so Heardback can pick roles that fit you. **Set preferences**". So Skip leads straight back to setup. Onboarding treated empty choices as "show everything"; Today treats them as "show nothing". |
| Find tab | `c-*-02-find` | **~12 s: first real job, if they tap Find** | 6,860 matches, "740 with strong ghost signals · Show". This is the clearest one-line statement of the ghost idea in the app. |
| Open a job | `c-*-03-job-open` | **~20 s: the ghost idea clicks** | "Listing check: Looks active · 1 minor signal · Posted and closed 1× before… More signals means worth a check, not that the job isn't real." This is the aha moment, and it sits 3 taps deep. |
| Pipeline | `c-*-04-pipeline` | ~30 s | A good empty state, with a small link: "Load an example pipeline". |
| Load examples | `c-*-05-pipeline-examples` | ~33 s | 10 fictional applications, an "Example data" banner and "Clear examples". It works well, but it's hard to find. |

**Can they see examples without committing? Only by accident.** There are two ways in:
- the step 3 checkbox, which is off by default and below the fold on a phone (top=913 in an 812px viewport);
- the Pipeline empty-state link, after Skip.

Neither is offered on the first screen.

**Would they continue? 50/50.** With Skip as the first tap, the next screen has no job on it. If they happen to try Find they get the best path in the product (job, then Listing check, in about 20 s). If not, "Set preferences" sends them back to the form they just skipped.

---

## Cross-cutting answers

- **One-glance clarity:** weak. The pitch is one grey line with no audience, no "free / no account", no example job and no explanation of "ghost listing".
- **Is "Skip setup" discoverable?** Yes. **Does it land somewhere valuable?** No. It lands on an empty Today, while Find, one tap away, holds 6,860 jobs.
- **Examples without committing:** possible, but hidden. They are not on the first screen, are off by default at step 3, and are a text link in the empty Pipeline.
- **Required fields:** nothing is required, which is good. Name and visa sponsorship on step 1, and a resume as a whole step before any job, add friction before value.
- **Privacy:** not on the first screen. It is split across step 2 ("stays in this browser" vs "sent to Claude…"). "No account" and "free" are never stated.

---

## The 8 highest-impact changes, ranked

1. **Make "Skip setup" land on jobs, and rename it.**
   - In `src/js/views/onboarding.js`, change `const skip = () => { commit(true); go("today"); };` to `go("find")`.
   - Rename the button from "Skip setup" to **"Just browse jobs →"**, and give `.onb-link` in the header at least 44px height.
   - In `src/js/views/today.js`, the "New for you" empty-profile branch currently says "Add target roles…" + "Set preferences". Show the newest low-ghost roles instead, with the hint **"Showing the newest roles with no ghost signals. Set targets to narrow these."** That keeps it consistent with onboarding's "empty = everything".

2. **Rewrite the first-screen pitch and add the trust line.**
   - In `onboarding.js`, the `<p class="onb-value">` should read: **"Internship and new-grad listings, checked for ghost jobs. Track every application and reply in one place."**
   - Directly under it, add `<p class="onb-trust">` with the shield icon: **"Free. No account. Everything stays in this browser."**
   - Make the value line body size (`--fs-md`), not hint grey.

3. **Show the ghost signal at step 3, and make the matches tappable.**
   - In `OnbStepMatches`, replace "{low} of them show no ghost-job signals." with **"{n − low} of these {n} show ghost-job signals: reposted again and again, open for months, or listed in 20 cities at once. We flag them so you don't waste an application."**
   - Add one flagged example row under the top 5, with the `GhostScore` badge and its first `gr` reason.
   - Wire `.onb-job` rows to open the job drawer (the same one Find uses), so the "Listing check" aha is one tap away.

4. **Hide Fit until it means something.**
   - With no resume and no skills, every match scores the same: 88 for all 408 (persona A) and 73 for all 488 (persona B).
   - In the step 3 list in `onboarding.js`, and in the Today and Find rows (`find.js` / `25-logic.js` `fitScore`), only show Fit when `profile.skills.length || profile.resume`.
   - Otherwise show nothing, and change the footer to **"Add your resume in Settings to see a fit score for each role."** Also change the step 3 lede from "best fit first" to **"newest and most likely real first"** when there is no resume.

5. **Say plainly that the data is tech-focused, and give non-tech students a path.**
   - In `OnbStepTargets`, change the Roles hint to **"Tech-focused for now: software, data, product, quant and hardware. Leave empty to see all of them."**
   - Add a sixth chip, **"Something else"**, that keeps Roles empty and shows this on step 3: **"Listings here are mostly tech. You can still track any application, from any field, in Pipeline."**
   - In `find.js` (the header around line 428 and the count line), change "open internship and new-grad roles" to **"open tech internship and new-grad roles"**.

6. **Offer examples up front with a "look around first" option.**
   - On step 0 of `onboarding.js`, under the Continue footer (or as a secondary button next to it), add **"See a sample tracker first"**, which runs `commit(true); loadExamples(); go("pipeline")`.
   - On step 3, move the "Add example applications to explore" checkbox above the job list on narrow screens; it is currently 100px below the fold at 375.

7. **Fix the privacy and AI copy on step 2, the skeptic's exit point.**
   - In `OnbResumeEditor` (`onboarding.js`), change `.onb-resume-hint` to **"Upload a PDF or paste the text. It's saved only in this browser, never sent to employers."**
   - Change `.onb-privacy` to **"AI is optional. Your resume goes to Claude (Anthropic's AI) only when you tap an 'Ask Claude' button. Everything else works without it."**
   - Change the step 2 lede in `ONB_STEPS[1]` to **"Optional. Used to score fit and suggest interview talking points. Everything works without it."**

8. **Get to a job sooner and tighten the mobile chrome.**
   - In `OnbStepTargets`, remove the Name group (keep it in Settings) and move the visa switch below a "More options" disclosure.
   - Consider showing the step 3 matches before the resume step, so the order is targets → jobs → optional resume. That puts a real job about 10 s earlier.
   - At 375, the step 2 footer runs to x=369. Either let `.onb-foot` wrap "Skip this step" onto its own line, or shorten it to **"Skip"**.
   - Fix the location shown on matched rows: show the matched location first (persona A saw "Canada +2 more" for an SF match).

---

## Verdict

**Heardback works for the persona it was built for, but its first-run screens hide what makes it special.** A CS student who fills in the 3 steps sees real, fresh listings at about 25 s and will probably come back. The ghost-signal idea, the reason to pick Heardback over LinkedIn or Simplify, is never shown during onboarding. Identical Fit scores and an unexplained "Claude" line undercut a skeptic, and the two other personas bounce:
- the finance student, because nothing says the data is tech-only;
- the browser, because "Skip setup" lands on an empty dashboard.

Changes 1 to 4 are small copy and routing edits in `onboarding.js` and `today.js`. Together they would put a real job and a real ghost flag on screen within about 10 s for all three personas.

Before any of that, confirm the mobile viewport meta on the real share link.
