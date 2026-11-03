# Heardback: mobile first-run study (new-grad DS/ML persona)

**Participant (played by me):** a graduating senior hunting for new-grad data science and ML roles. Impatient, mostly on a phone, and opening Heardback for the first time. Already tracks 6 applications in a Google Sheet.

**Setup**
- Harness: `qa/ux2/h.js`, modeled on `qa/shot.js`. It uses a persistent profile, `isMobile` and `hasTouch` with an iPhone UA, and `locator.tap()` only (no hover).
- Starting state: `SETUP=fresh`, no example data.
- Viewports: 375×812, then spot checks at 768×1024 (`qa/ux2/tab.js`).
- Screenshots: 80 of them, in `qa/out-ux2/`.
- Claude: no `MOCK` was used, so Claude was unavailable throughout. The downloads capability was absent too.
- Date: Tue Nov 3 2026, about 4 AM PT. No source files were edited.

**Harness caveats**
- `dist/index.html` has no `<meta name=viewport>`. The harness wraps the page in a doctype plus `width=device-width`, as the artifact host's skeleton is expected to do. **Check that the host really adds this:** without it, the mobile layout renders at 980px and scales down (see `t1-01` in the first run).
- The on-screen keyboard was simulated by shrinking the viewport to 476px, which is how Android Chrome resizes. iOS Safari's overlay keyboard was not tested.

**Fixed since the first study (`qa/ux/UX_REPORT.md`)**
- The **+** button now offers "Log an email".
- "New grad" is no longer pre-selected in onboarding.
- Days silent is now counted from the applied date.
- "Hide strong ghost signals" is on by default.

---

## 1. Tasks

| # | Task | Result | Taps | Main friction |
|---|------|--------|-----:|---------------|
| 1 | Onboard: New grad, Data & AI, Seattle + Remote, skip resume | **Success** | 6 | It was smooth. But Today's **"New for you" immediately showed 5 *intern* roles** (Meta and Microsoft "Research Intern", Fit 73) for a new-grad-only profile. Onboarding never offers "Import from a spreadsheet". |
| 2 | Import 6 applications from the Sheet CSV via Settings | **Success with friction** | 3 | It took 3 levels to reach (More → Settings → scroll to "Your data"). Nothing previews how my stages will be read: **"OA" silently became Applied**, and "Interviewing" became Interviews with no round. Afterwards Today told me to **"Mark as ghosted" Zillow, the one company I'm interviewing with**, and to "Follow up with Expedia" when Expedia had already sent me an OA. |
| 3 | Find 2 remote new-grad data roles from this week with no ghost signals, and save them | **Success with friction** | 8 | I had to open each listing to learn it had "no signals", because the list shows no realness chip. **"Most likely real" gave the same order as "Newest".** Every row was **Fit 88**. Results mixed in gig work ("AI Tutor – Oromo", "Data Annotator", "Generalist"). Searching "data scientist" returned 0. The remote filter included "Durham, NC +1 more". |
| 4 | Open a saved job and decide whether it's worth applying | **Partial** | 4 | The application drawer has no fit score. The listing has no description, no salary, and company data reading "Not enough data". "Business Data Analyst" needs a **Master's** but still shows Fit 88, because degree isn't scored. "View company" replaces the job drawer, with no Back. I couldn't really decide. |
| 5 | Log a rejection email from the phone | **Success** | 4 | **+ → Log an email** worked well. It matched the Spotify application and showed a clear preview ("Moves Spotify to Rejected"). Role came out as "Not found. Type it in." even though the title is in the email. The toast has no Undo. |
| 6 | Check what to do today | **Friction** | 3 | Two of the four Needs-you items were wrong (Zillow ghost, Expedia follow-up). My 2 saved jobs were never surfaced ("Apply to 2 saved roles"). Upcoming said "No interviews scheduled" while Zillow sat in Interviews. The follow-up draft has no "Open in email" button. |
| 7 | Practice for an interview with Prep (no Claude) | **Success with friction** | 9 | The non-AI path is genuinely useful: 11 DS-specific technical questions, "what a good answer shows" hints, a 2:00 timer and saved outlines. But Prep said "No interviews" until I added a dated round by hand. Afterwards it **stayed stuck on "Practice without an interview"** while the header read "1 upcoming round". Round type reset to Behavioral on reload. "Questions to ask them" are SWE questions ("How does code review work…") for a Data & AI role. |
| 8 | Share progress (Insights → Share) without Claude or downloads | **Friction** | 4 | "Save image" is the primary button, but it only produces a **toast that is cut off** ("…Right-click or long"). The fix it suggests ("Right-click") is desktop copy. There's no native share sheet. The default "This month" card says **"0% response rate"**, which nobody would post. "Copy caption" worked. |

---

## 2. Top 10 issues, ranked

### 1. Imported "Interviewing" applications get treated as ghosted (High)
- **Where:** `pfBuildApp`. An imported application with stage Interviews has no rounds and `lastReplyAt` set to the applied date.
- **What I saw:** Today said "No reply from Zillow in 22 days · **Mark as ghosted**". The drawer's primary button was **Mark as ghosted**.
- **Fix:** Never show ghost or follow-up nudges for applications at Screen, Interviews or Offer. Instead, show **"Zillow · Interviews: When's your next round? [Add date]"**.

### 2. CSV import maps stages silently (High)
- **What happened:** "OA", "Take-home" and "HireVue" all become Applied, so Today tells me to chase a company that is waiting on me.
- **Fix:** After choosing the file, show a preview sheet before importing:
  - **"6 rows found. Check the stages:"**, with one stage dropdown per row.
  - Map OA, assessment and take-home to Screen, with a round named "Online assessment".
  - Buttons: **[Import 6]**.
- Also offer it in onboarding step 1: **"Already applying? Import from a spreadsheet (.csv)"**.

### 3. "New for you" ignores the level filter (High; bug)
- **What happened:** Level is only worth 15 fit points, so intern roles still score 73 and pass the 60 cut-off.
- **Fix:** Make level and role hard filters whenever the profile sets them, as Find already does.

### 4. Prep stays stuck on practice mode after a real round exists (Medium-High; bug)
- **What happened:** `ui.prepFocus = {practice:true}` persists. The header says "1 upcoming round", but the workspace shows generic behavioral questions.
- **Fix:**
  - Clear practice focus when a new upcoming round appears, or open the soonest round by default.
  - Remember the practice round type and role.
  - Make Today's Upcoming row open **Prep for this round**.

### 5. Find gives no realness or fit signal in the list (Medium-High; still broken from the first study)
- **What happened:** Every row is Fit 88, "Most likely real" is the same order as "Newest", and there is no per-row chip.
- **Fix:**
  - Add a chip to each row: **"✓ No ghost signals"** or **"⚠ 2 signals"**.
  - Give "Most likely real" a tie-break on company repost rate.
  - Spread fit scores using degree (Master's or PhD required counts against a BS), skills, and title keywords.
  - Push annotator, tutor and rater gigs below DS/ML titles, or add a **"Hide gig / data-labeling roles"** toggle.

### 6. Toasts are truncated on phones (Medium; bug)
- **Where:** `.toast{white-space:nowrap}` in `styles.css:555`.
- **What happened:** The Save image, Add to calendar ("Calendar files can't be saved in this view. Open Hea…") and CSV error toasts are all cut off.
- **Fix:** Use `white-space: normal` below 600px, and put any message longer than about 60 characters inline in the sheet instead of a toast.

### 7. Share has no working path on a phone without downloads (Medium)
- **Fix:**
  - When `navigator.canShare({files})` is true, the primary button should be **"Share…"**, opening the native share sheet with the PNG and caption.
  - Otherwise show inline text under the preview: **"Press and hold the image to save it"**, and drop "Right-click" on touch devices.
  - Default the card to the period with the best story, and hide rates under 5 applications.

### 8. Imported replies skew Insights (Medium)
- **What happened:** "Time to first reply **0 days**, median of 3", and the advice "3 applications are past that with no reply" is built on that number.
- **Fix:** Leave reply timing unknown for imported rows and exclude them from medians. Show the line **"Reply timing starts from apps tracked here."**

### 9. The job decision view is too thin (Medium)
- **What happened:** The application drawer doesn't show Fit, and the company page has no Back to the job.
- **Fix:**
  - Show "Fit 88 · Looks active" in the application drawer's Listing block.
  - Add a **"‹ Back to Junior Data Engineer"** link on the company page.
  - Add a degree line in the fit breakdown: **"Degree: Master's required, you have a BS"**.

### 10. Saved jobs and pending interviews never reach Today (Medium)
- **Fix:**
  - Add **"Apply to 2 saved roles (posted this week)"**, ordered by newest.
  - When an application is at Interviews with no round: **"Add your Zillow interview date"**.
  - Add **[Open in email]**, a prefilled `mailto:` link, next to Copy in every draft.

---

## 3. Mobile ergonomics

**Tap targets.** These were measured with the bounding-box audit in `h.js`.
- Most buttons are 36px tall, under the 44pt guideline but above the WCAG 24px minimum.
- The Find bookmark is 36×36 at 375px, but **28×28 at 768px**. Tablet touch gets desktop sizing because the CSS keys on width, not `(pointer: coarse)`.
- Other undersized targets: the Today "⋯" menu (28×36, and 28×28 on tablet), the table row checkboxes (16×16), the location checkboxes (15×15, though the rows are tappable), the "How we score listings" and "Show all" links (20px tall), and the Prep segmented control (28px tall).
- **Fix:** Add `@media (pointer:coarse){ .btn, .chip, .seg button, .icon-btn { min-height:44px; min-width:44px } }`.

**Thumb reach.**
- Good: the bottom tab bar, sheet primary actions at the bottom right, and sticky footers in the drawers.
- Bad:
  - Close (×) sits only at the top right of full-screen drawers. Add swipe-down or a bottom "Done".
  - The drawer footer wraps a lone red **Delete** icon onto a second row at the very bottom (y≈764), right where the thumb rests. Move it into a "⋯" menu.
  - In Practice, the timer and question start at y≈425 under the setup card, and "Next question" is below the fold. Collapse the setup into a one-line header while practicing.

**Sheets.**
- The More, Add and Filters sheets are clean, and Filters has a live "Show 12 matches" button.
- The More sheet still lists "Keyboard shortcuts" on touch devices.
- The Pipeline board still opens on an empty Saved column at 375px. Table works much better on phones, so default to Table there.

**Keyboard.**
- With the viewport resized, the Log-an-email sheet re-anchors correctly, and "Read email" stays visible (y 427–463 of 476).
- In Prep, the **bottom tab bar stays above the keyboard and covers part of the outline textarea**. Hide `.tabbar` while an input is focused (`:has(input:focus, textarea:focus)`).
- Untested: iOS overlay keyboard behaviour with a `bottom:0` sheet. Use `visualViewport` to offset sheets.

**Tablet (768).** Today, Find, Insights and Prep lay out well. The board shows 2.3 columns, so Interviews is off-screen. The drawer goes full-screen; a 560px side sheet would keep context.

---

## 4. Bugs

| ID | Severity | Bug | Repro |
|----|----------|-----|-------|
| B1 | High | Applications at Interviews (imported) trigger "Mark as ghosted" in Today and as the drawer's primary button. | `t2.js`, then `t2b.js` |
| B2 | High | "New for you" includes intern roles when the profile is new-grad only (soft level scoring). | `t1.js` (Today) |
| B3 | Med | Prep stays on "Practice without an interview" after an upcoming round is added; the header contradicts the workspace. | `t7b.js`, then `t7f.js` |
| B4 | Med | Toasts are clipped on phones because of `white-space:nowrap`. | `t8b.js` (Save image), `t9.js` (Add to calendar) |
| B5 | Med | Imported rows set `lastReplyAt = applied`, giving "First reply 0 days" and wrong pattern advice. | Insights after `t2.js` |
| B6 | Low | The email parser leaves Role empty even though the title is in the body ("…the Data Scientist I, New Grad position…"). | `t5b.js` |
| B7 | Low | The practice round type resets to Behavioral on reload, so an outline can end up on the wrong question. | `t7d.js` |
| B8 | Low | Remote + 7d filters return non-remote-looking rows ("Durham, NC +1 more"), and "Senior Machine Learning Engineer" appears under new grad. | `t3b.js` |
| B9 | Low | A round with no date already offers "Draft thank-you". | `t7e.js` |
| B10 | Low | "Posted today" in the drawer contradicts "21h ago" in the list. | `t3c.js` |
| B11 | Info | `dist/index.html` has no viewport meta, so mobile depends on the host skeleton. | Load `dist/index.html` with `isMobile` |

No console errors and no horizontal overflow at 375 or 768.

**Reproducing:**
```
cd /home/user/heardback
FRESH=1 TAG=t1 node qa/ux2/t1.js
TAG=t2 node qa/ux2/t2.js
# then run t2b … t9 in order
W=768 TAG=tab node qa/ux2/tab.js
```
