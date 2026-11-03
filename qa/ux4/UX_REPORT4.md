# Heardback UX study 4: "interview week" (Stripe technical tomorrow, Datadog recruiter call today)

**Participant (played by me):** Maya, a Berkeley EECS junior. She has a Datadog recruiter call **today at 4:00 PM** and a Stripe technical interview **tomorrow at 2:00 PM**. She had a Figma technical interview **yesterday at 11:00 AM** and hasn't heard back yet. She is getting ready on a 1440 laptop and checks her phone (375) on the day.

**Setup**
- Harness: `qa/ux4/h.js`, a copy of `qa/ux3/h.js`.
  - `OUT=qa/out-ux4`, a persistent profile per mode, and the timezone America/Los_Angeles.
  - The clock is pinned to **Tue Nov 3 2026, 10:00 AM PT**. The day-of runs use `CLOCK=2026-11-04T09:00` and `13:45`.
  - `MOCK=1` injects `qa/mock-claude.js`.
- Seed: `qa/ux4/seed.js` uses `page.evaluate`, `Apps.create` and `Apps.addRound`.
  - Profile: onboarded, with a full resume (Brex internship, RISELab, SplitSmart built on Stripe Connect, a Rust rate limiter) and 12 skills.
  - Applications (6):
    - Stripe, Interviews: recruiter round passed; technical round tomorrow 2 PM with Daniel Cho. The application notes hold the recruiter's tip: "pair-programming in your own IDE, no LeetCode".
    - Datadog, Screen: recruiter call today 4 PM with Jordan Reyes.
    - Figma, Interviews: technical round yesterday 11 AM with Marcus Webb, outcome pending, no thank-you sent.
    - Airbnb, Applied. Ramp, Rejected. Notion, Saved.
- Scripts: `t1` (Today → prep, prep content, notes), `t3` (mock or practice), `t4` (calendar), `t5`/`t5b` (thank-you and outcome), `t6` (day-of at 375).
- Screenshots: `qa/out-ux4/`. The prefix `m-` means MOCK and `n-` means no Claude.
- No source files were edited. There were no console errors and no horizontal overflow in any run.
- **Harness note:** the stock mock answers the scorecard prompt with a *question array*, because the prompt contains both "JSON" and "question". That gives `invalid_json`. `PATCH=1` in `t3.js` swaps in a valid scorecard so the rest of the flow could be judged. The failure path itself was useful: see issue 5.

**Reproducing**
```
FRESH=1 MOCK=1 TAG=seed node qa/ux4/seed.js; MOCK=1 TAG=t1 node qa/ux4/t1.js; MOCK=1 PATCH=1 TAG=t3p node qa/ux4/t3.js
FRESH=1 TAG=seed node qa/ux4/seed.js; TAG=t1 node qa/ux4/t1.js; TAG=t3 node qa/ux4/t3.js; TAG=t4 node qa/ux4/t4.js; TAG=t5 node qa/ux4/t5.js
PROFILE=day FRESH=1 TAG=seed node qa/ux4/seed.js; PROFILE=day TAG=n node qa/ux4/t6.js notes
PROFILE=day W=375 CLOCK=2026-11-04T09:00:00-08:00 TAG=t6 node qa/ux4/t6.js
```

---

## 1. Tasks

| # | Task | MOCK (Claude test double) | No Claude | Clicks | Main friction |
|---|------|------|------|------|------|
| 1 | From Today, get to tomorrow's prep | ✅ | ✅ | 1 | None. **Prep** on "Technical interview with Stripe tomorrow" opens `#prep` with Stripe selected (about 1.1s). This works well. |
| 2a | Likely questions | ⚠️ | ⚠️ | 0 | 11 generic LeetCode-style questions. Her own application note says "pair-programming in your own IDE, no LeetCode", but **Prep never shows application notes**. |
| 2b | Talking points from resume | ⚠️ | ⚠️ | 0 | The education line is turned into a story ("Say the number (2028) early"). The Brex line leads with "45%" rather than "30/week → 0". The same caption repeats 5 times. Nothing links SplitSmart (built on Stripe Connect) to Stripe. |
| 2c | Questions to ask | ⚠️ | ⚠️ | 0 | 5 generic questions. They don't use the interviewer ("Daniel Cho, Payments"). You can't add one to your notes or tick it off. |
| 2d | Notes | ✅ | ✅ | 1 | Autosaves and persists. The notes card is at the very bottom, after about 5 cards (y≈2,839px at 375). |
| 2e | Tailored questions (Claude) | ⚠️ | n/a, card hidden | 1 | They generate fine, but **are gone after navigating away or reloading**. |
| 3 | 3-question mock interview, then save takeaways | ✅ with PATCH; ❌ with the stock mock | n/a | 6 | The length picker, Ctrl+Enter, progress ticks and scorecard all work, and **Save to round notes** appends a clean summary. If scoring fails, the only buttons are "Try the scorecard again" and "New mock interview", so **there's no way to save the answers**. |
| 3' | Practice mode (no Claude) | — | ⚠️ | 5 | Always 11 questions, no 3-question option. Outlines are saved per question text, globally, **not to the Stripe round**. There's no "save takeaways". Nothing says a mock interview exists with Claude. |
| 4 | Add both interviews to the calendar | ⚠️ | ❌ | 2 per round | Only in the Prep header and the drawer's Rounds tab. Not on Today, not in the palette ("No matches for 'calendar'"). **MOCK:** saves an `.ics` file, then the button claims **"In calendar"**. **No Claude:** a dead-end toast with a ✓ success icon. |
| 5a | Thank-you: draft, copy, mark sent | ✅ | ✅ | 3 | Good: addressed "Hi Marcus", has Copy and Mark as sent, and "Improve with Claude" plus Undo with MOCK. The template is generic, with no slot for a specific detail. "Subject:" is inside the copied body. There's no "Open in email". |
| 5b | Log yesterday's outcome | ⚠️ | ⚠️ | 4+ | Today hides the outcome until the round is 24h old, and the thank-you takes its place. Prep's "Waiting on outcome" shows *likely questions and a mock interview* for a finished round. Drawer "Log the outcome instead" only switches tab, and focus falls to `<body>`. The select saves silently: no toast, no Undo, no "add next round". |
| 6 | Day of, on the phone: what's next, when, with whom, notes | ⚠️ | ⚠️ | 2 + 3.5 screens of scrolling | The header says "Next: Stripe technical at 2:00 PM", but **row 1 is "Send a thank-you note to Datadog"**, with the blue primary button, even at 1:45 PM ("Stripe in 15m" is row 2). The Prep tap lands on Likely questions; notes are 3.5 screens down. The Upcoming row opens an edit form. There's no meeting-link or location field anywhere. |

---

## 2. Top 8 issues, ranked

### 1. On the day, the interview isn't the first thing you see (High)

**What happened**
- At 9:00 AM and again at 1:45 PM on Nov 4, Needs you puts "Send a thank-you note to Datadog" (primary blue button) above "Technical interview with Stripe in 15m" (secondary button).
- The cause is `TODAY_QUICK_ORDER`/sort, where thanks = 0 (`today.js:246`).
- The only signal is the header sub-line, "Next: Stripe technical at 2:00 PM", which isn't tappable.

**Fix**
- When a round starts within 12 hours, pin a "next up" card above Needs you, on every width:
  > **Stripe · Technical interview** · **2:00 PM** (in 15 min)
  > With Daniel Cho (Software Engineer, Payments)
  > **[Open my notes]**  [Join link]  [All prep]
- Within 3 hours of a round, sort its prep task above any thank-you, and give it the primary button.
- Make the header line a link: "Next: **Stripe technical at 2:00 PM →**".

### 2. Notes are buried, and there's nowhere to put the "where" (High)

**What happened**
- Prep orders its cards as Mock interview → Likely questions (11) → Tailored → Talking points → Questions to ask → Prep notes.
- At 375, notes are at y≈2,839px, 3.5 screens down.
- The Upcoming row opens the drawer's *edit form*: date picker, outcome select, a Delete icon. That's risky to thumb through minutes before a call.
- Rounds have no link or location field, so Maya's note says "Zoom link is in Hannah's email".

**Fix**
- When the round is today, Prep should open with **"Your notes"** as the first card, with the scorecard summary folded into it. Collapse Likely questions to 3 with "Show all 11".
- Add a **"Where"** field to rounds (placeholder: "Zoom/Meet link or address"). Show it as **[Join]** on Today, in Upcoming and in Prep.
- Upcoming rows should open Prep (read view), not the editor.

### 3. "Add to calendar" fails silently or overclaims (High)

**What happened**
- **No Claude:** the toast "Calendar files can't be saved in this view. Open Heardback on claude.ai to add it to your calendar." uses the ✓ success icon. Nothing is added, and the button's tooltip still says "Downloads a calendar file".
- **MOCK (downloads, no connector):** "Saved stripe-technical.ics", then the button flips to **"In calendar"**, but the file was only saved, never opened.
- There's no entry point on Today or in Ctrl K, and no "add both".
- **Fix: copy**
  - Downloads available: toast "**Calendar file saved.** Open stripe-technical.ics to add it to your calendar." Button: "**Calendar file saved**", with a menu offering "Download again".
  - No downloads: don't dead-end. Offer **[Copy event details]**, which copies the title, time, interviewers and link. Toast "Event details copied. Paste into your calendar." with a neutral ℹ icon.
  - Never say "In calendar" unless the Google Calendar connector created the event.
  - Add a one-line hint under the button: "Connect Google Calendar on claude.ai to add events directly."
- **Fix: entry points**
  - Add "Add to calendar" to the Today row ⋯ menu.
  - Add "Add upcoming rounds to calendar (2)" to the palette.

### 4. Prep ignores what Maya already knows (Medium-High)

**What happened**
- The Stripe application note ("60-min pair-programming in your own IDE. No LeetCode; practical bug-fixing + an API") never appears in Prep (`app notes visible on prep? 0`). Directly below it, Prep lists "Reverse a linked list… in groups of k".
- Talking points don't connect SplitSmart's Stripe Connect integration to Stripe.

**Fix**
- At the top of the Prep header, add **"From your notes on Stripe"** with the application notes and an **[Edit]** link.
- Badge any resume line that mentions the company: **"Mentions Stripe: lead with this."**
- Let her hide or star questions ("Not this round"), so the list matches what the recruiter said.

### 5. Mock interview answers are lost if scoring fails (Medium-High)

**What happened**
- With the stock mock, the scorecard fails ("Claude's answer came back in an unexpected shape. Try again."). The footer then offers only "Try the scorecard again" and "New mock interview", so 3 typed answers can't be saved.
- Even on success, only the scorecard is saved, not her answers.
- Likely questions stay hidden until she starts a new mock.

**Fix**
- Always show **[Save answers to notes]** once at least one answer exists. On a scoring error, show "**Couldn't score this one.** Your answers are safe. [Save answers to notes] [Try scoring again]".
- Include her answers under the scorecard in the saved summary (folded).
- Keep Likely questions available below the scorecard.

### 6. Practice mode without Claude doesn't lead to takeaways (Medium)

**What happened**
- No length choice (always 11 questions).
- Outlines are stored per question text in `ui.prepPractice`, shared across every company, and **never reach the Stripe round notes**.
- "Exit practice" just closes the card.
- With no Claude, the Mock interview and Tailored cards vanish without any word.

**Fix**
- Add a "3 / 5 / All" picker.
- On the last question or on Exit: "**Done. Add your 3 outlines to Stripe prep notes?** [Add to notes] [Not now]".
- One quiet line where the mock card would be: "Mock interviews with scoring need Claude. Open Heardback on claude.ai to use them."

### 7. After yesterday's round, the outcome and the thank-you compete, and the outcome loses (Medium)

**What happened**
- For the first 24h, Today shows only the thank-you. After she marks it sent, nothing asks how it went, so the outcome task appears only after `until <= -DAY` (`25-logic.js:30`).
- Prep's "Waiting on outcome" view for Figma shows Mock interview and Likely questions, plus "Add to calendar" for a round that is over.
- In the drawer, "Log the outcome instead" and "Log outcome" switch tab, but focus goes to `<body>`, not the Outcome select. Choosing "Passed" saves with no toast or next step.
- **Fix: Today**
  - When she marks the thank-you as sent, show the toast "**Thank-you marked as sent.** How did it go? [Passed] [Didn't pass] [No news yet]".
  - Allow the outcome as soon as the round ends.
- **Fix: Prep, past rounds** — swap in a review layout: **Outcome** (the same 3 buttons), **How it went** (the reflection field: "What they asked, what to improve") and **Thank-you** status. Hide the mock interview and calendar.
- **Fix: drawer** — focus the outcome control. On Passed, show the same toast Today uses: "Logged as passed · [Add next round] · Undo".
- **Fix: thank-you template**
  - Add a bracketed slot: "I especially enjoyed **[one thing you discussed]**."
  - Split Subject from Body, with **[Copy body]** and **[Open in email]** (mailto with the subject).

### 8. Talking points read as boilerplate (Medium-Low)

**What happened**
- The education line is treated as a story ("Say the number (2028) early, then what changed").
- The Brex line leads with "45%" rather than the stronger "~30/week to 0".
- "Good for behavioral questions and 'tell me about yourself'" repeats 5 times.
- Talking points don't adapt to the round: the technical round gets the same guidance as a behavioral one.
- Tailored questions (Claude) aren't kept.

**Fix**
- Skip lines that match `/B\.S\.|GPA|expected|Coursework/`.
- Prefer "X → Y" or "from X to Y" results over the last percentage.
- Show the caption once in the card header.
- For technical rounds, retitle the card "**Projects to walk through**", with the hint "Be ready to explain one design decision and one trade-off."
- Save tailored questions on the round: `round.tailored`.

---

## 3. Bugs

| ID | Sev | Bug | Repro / evidence |
|----|-----|-----|-----|
| B1 | Med | The calendar failure toast (no Claude) shows the ✓ success icon. | `n-t4-04-datadog-cal-1440.png` |
| B2 | Med | MOCK: after only saving an `.ics` file, the button reads "In calendar" and `round.calendar = "ics"` is treated as done. | `t4.js` MOCK log |
| B3 | Med | Today sorts a thank-you for another company above an interview starting in 15 min (thanks get order 0). | `t6b` at 13:45, `today.js:246` |
| B4 | Med | Tailored questions are lost after navigation or reload. | `m-t3p-03` shows "Tailor questions to this role" again after `t1` generated 6 |
| B5 | Med | A failed scorecard leaves no way to save the mock answers. | `m-t3-02-mock-end-1440.png` |
| B6 | Low | "Add to calendar" is offered on a past round (Figma, 23h ago) in the Prep header and the drawer. The cutoff is `now - DAY`. | `n-t5-05-figma-drawer-1440.png` |
| B7 | Low | Talking points: the education line gets "Say the number (2028) early"; Brex picks "45%" over "~30/week to 0". | `t1.js` text dump |
| B8 | Low | Drawer "Log the outcome instead" / "Log outcome" don't focus the outcome select; focus falls to `<body>`. | `t5b.js` FOCUS log |
| B9 | Low | Changing the outcome in the drawer select gives no toast, Undo or next-round prompt, unlike Today's inline buttons. | `t5b.js` |
| B10 | Low | The Overview tab says "No contacts yet. Add the recruiter or interviewers…" while the rounds list Lisa Tran and Marcus Webb. | `t5b.js` drawer text |
| B11 | Low | The thank-you "Copy" puts "Subject: …" at the top of the body text. | `n-t5` CLIPBOARD |
| B12 | Low | Prep for a past ("Waiting on outcome") round shows the mock interview and likely questions, not the outcome or reflection. | `n-t5-04-prep-figma` |
| B13 | Info | At 375, the drawer footer wraps its red Delete icon onto a line by itself under "Prep for this round / Open posting". | `n-t6-05-upcoming-tap-375.png` |
| B14 | Harness | `mock-claude.js` returns a question array for the scorecard prompt (it matches `/JSON/` + `/question/`). Add a `/scorecard/` branch. | `t3.js` without PATCH |

**What worked well**
- One click from Today to the right round's Prep.
- The round picker on mobile.
- Notes autosave with a "Saved" state.
- The mock interview flow: Ctrl+Enter, "Question 2 of 3", Stop and End, and a clean saved summary.
- The thank-you modal addresses the interviewer by first name.
- "Improve with Claude" has Undo.
- At 375, Today's three key rows fit above the bottom nav.
