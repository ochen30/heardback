# BUGS3: e2e pass 3 (2026-11-03)

## 1. .ics lines folded by UTF-16 characters, not octets (RFC 5545 §3.1)
- **Where (suspected):** `src/js/views/zz-calendar.js`, `cal_fold()`. It splits every 74 *characters*
  (`s.length`/`slice`), but RFC 5545 caps content lines at 75 *octets* of UTF-8.
- **Repro:** in the console (or `t14-new.js`, check "ics: non-ASCII lines folded at 75 octets"):
  ```js
  cal_ics({ company: 'Café Zoë', title: 'Ingénieur logiciel – stagiaire' },
          { id: 'ru', type: 'technical', at: Date.UTC(2026,10,20,17,30),
            interviewers: 'José Müller, Zoë Ångström', prep: 'c’est important; « DP » ’’’’’’’’' })
    .split('\r\n').map(l => new TextEncoder().encode(l).length).filter(n => n > 75)
  // -> [79, ...]
  ```
- **Impact:** a long summary or description with non-ASCII text (accented names, "·" and "–" in titles, curly quotes)
  produces over-long lines. Strict parsers may reject or garble the event. The default SUMMARY already
  contains "·" (2 octets), so a long job title is enough to trigger it.
- **Fix:** fold by UTF-8 byte length without splitting a code point (or a surrogate pair). Each continuation line
  is a space plus at most 74 octets.
