# Heardback: principal design review 12 (v16, launch regression check)

Reviewed 2026-11-03 against a fresh `python3 tools/build.py`. The clock was frozen at Tue Nov 3, 10:00 AM PT (MOCK=1). No source was edited.

**State:** the `qa/ux4/seed.js` interview-day user, plus two "Where" values:
- Datadog recruiter call at 4 PM: `https://datadog.zoom.us/j/88123456789?pwd=Xy12abCD`.
- Stripe technical: a street address.
- Datadog also has app notes.

**Captures:** `qa/out-critic12/`.
- Today, Prep, the calendar click, and the Datadog drawer (Overview and Rounds) and Stripe drawer (Rounds), at 1440 light (`m-L-*`), 1440 dark (`m-D-*`) and 375 light (`m-P-*`).
- `SETUP=examples` Today, Pipeline and Find at 1440 (`examples/`).

**Zero console errors and zero overflow in all runs.**

## Overall: 9.2 / 10 (unchanged; ship)

The new interview-day features work, and they look calm in both themes:
- "Next up" pins correctly at 6h. Join opens the link. "Open notes" lands with focus in the round's Prep notes textarea.
- The drawer shows the link as "Zoom".
- "From your notes on Datadog" reads well.
- The calendar button changes to "Calendar file saved".

Nothing blocks launch. The four seams below are each under 15 minutes.

Not verified: "Save answers to notes". The mock interview didn't advance past Start in this harness run, so `#prep-mock-save-answers` never rendered.

## Fix list (max 4)

1. **Prep shows the raw meeting URL, passcode included.**
   - Where: `.prep-where` / `#prep-where-link` (prep.js:765) renders `https://datadog.zoom.us/j/88123456789?pwd=Xy12abCD` in full. On the phone it is cut off at "…/j/881234…".
   - Why it matters: the drawer (`PlWhere`, `.pl-next-where`) and Today (`#td-next-join`) both say "Zoom" / "Join". The same field reads three ways, and Prep is the screen people share or present.
   - Fix: render the link text with the same service-name helper `PlWhere` uses, e.g. "Zoom ↗". Keep the full URL in `title`.

2. **Every calendar save fires two toasts.**
   - Seen at both 1440 and 375: "Saved datadog-recruiter.ics", then "Calendar file saved. Open it to add the event."
   - On the phone the pair covers the "From your notes" card and the Mock interview Start row.
   - Fix: in `addToCalendar` (zz-calendar.js:66), suppress the generic download toast for `.ics` files. Or merge them into one: "Saved datadog-recruiter.ics. Open it to add the event."

3. **At 375 the saved calendar state is a bare check mark.**
   - In `.prep-head-actions .prep-cal`, the `CalendarButton` collapses to icon-only. After a save it shows only "✓" in a grey box next to the pipeline icon button, and nothing says what the check means.
   - Fix: give the button `aria-label` and `title` set to `doneLabel` ("Calendar file saved" / "In calendar"). Better still, keep a short visible label on phone ("Saved", "In calendar"), or use a calendar-check icon rather than a plain check.

4. **The pinned interview is listed three times in the first screen.**
   - Today shows `.td-next` ("Datadog · 4:00 PM · Jordan Reyes"), then directly under it the Needs you row "Recruiter call with Datadog in 6h · Prep", then Upcoming "Datadog · Recruiter call".
   - The Next up line is also the only one of the three that leaves out the round type, because `roundPeople(r)` wins over `ROUND[r.type].label` in `today_NextUp`.
   - Fix:
     - When `nextUp` is set, filter that round's prep task out of `today_NeedsYou`. `noPrimary` already handles the button weight, but the row is still redundant.
     - In `.td-next-line`, show the type and the people together: "Datadog · 4:00 PM · Recruiter call with Jordan Reyes".
