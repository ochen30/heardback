/* ===== Add an interview round to the calendar =====
   1) Viewer has the Google Calendar connector on claude.ai -> create the event directly (they approve the first call).
   2) Otherwise -> an .ics file they can open in any calendar app. */
const CAL_SERVER = "Google Calendar";
const CAL_MIN = 45;
function cal_localISO(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`; }
function cal_tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } }
/* RFC 5545: lines are at most 75 octets (UTF-8); continuation lines start with one space. */
function cal_fold(line) {
  const enc = new TextEncoder(); const out = []; let cur = ""; let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) { out.push(cur); cur = " "; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}
function cal_utcStamp(ts) { return new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
function cal_text(app, round) {
  const type = ROUND[round.type]?.label || "Interview";
  const summary = `${type}: ${app.company}${app.title ? " · " + app.title : ""}`;
  const lines = [`${type} for ${app.title || "the role"} at ${app.company}.`];
  if (round.interviewers) lines.push(`With: ${round.interviewers}`);
  if (round.where) lines.push(`Where: ${round.where}`);
  if (round.prep) lines.push(`Prep notes: ${round.prep}`);
  if (app.url) lines.push(`Posting: ${app.url}`);
  lines.push("Added from Heardback.");
  return { summary, description: lines.join("\n") };
}
function cal_ics(app, round) {
  const { summary, description } = cal_text(app, round);
  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Heardback//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${round.id}@heardback`, `DTSTAMP:${cal_utcStamp(now())}`, `DTSTART:${cal_utcStamp(round.at)}`, `DTEND:${cal_utcStamp(round.at + CAL_MIN * 60000)}`,
    `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(description)}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Interview in 30 minutes", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"].map(cal_fold).join("\r\n");
}
async function addToCalendar(appId, roundId) {
  const app = Apps.get(appId); const round = app?.rounds.find((r) => r.id === roundId);
  if (!app || !round) return;
  if (!round.at) { toast("Set a date and time for this round first."); return; }
  if (caps.mcp) {
    const { summary, description } = cal_text(app, round);
    try {
      await caps.mcp.callTool(CAL_SERVER, "create_event", { summary, description, startTime: cal_localISO(round.at), endTime: cal_localISO(round.at + CAL_MIN * 60000), ...(cal_tz() ? { timeZone: cal_tz() } : {}) });
      Apps.updateRound(appId, roundId, { calendar: "google" });
      toast("Added to Google Calendar");
      return;
    } catch (e) {
      const fallthrough = ["server_not_connected", "not_in_manifest", "not_granted", "capability_disabled", "capability_removed", "selection_required", "blocked_by_policy", "consent_required"];
      if (e?.code === "needs_reauth") { toast("Reconnect Google Calendar in claude.ai Settings → Connectors, then try again."); return; }
      if (e?.code === "approval_required") { toast("Google Calendar needs your approval for this page. Try again and choose Allow."); return; }
      if (!fallthrough.includes(e?.code)) { toast("Google Calendar didn't respond. Downloading a calendar file instead."); }
    }
  }
  if (!caps.downloads) {
    const { summary } = cal_text(app, round);
    const who = roundPeople(round);
    const text = `${summary}\n${fmt.dateTime(round.at)}${who ? `\nWith ${who}` : ""}${round.where ? `\nWhere: ${round.where}` : ""}`;
    copyText(text, "Event details copied. Paste them into your calendar.");
    return;
  }
  const ok = await saveFile(`${app.company.replace(/[^\w]+/g, "-").toLowerCase()}-${round.type}.ics`, cal_ics(app, round), "text/calendar");
  if (ok) Apps.updateRound(appId, roundId, { calendar: "ics" });
}
function CalendarButton({ appId, round, size = "sm" }) {
  useCaps();
  if (!round?.at || round.at < now() - DAY) return null;
  const done = round.calendar;
  const doneLabel = done === "google" ? "In calendar" : "Calendar file saved";
  return html`<${Btn} size=${size} icon=${done ? "check" : "cal"} aria-label=${done ? doneLabel : caps.mcp || caps.downloads ? "Add to calendar" : "Copy event details"} onClick=${(e) => { e.stopPropagation(); addToCalendar(appId, round.id); }} title=${caps.mcp ? "Adds the event to your Google Calendar" : "Downloads a calendar file you can open in any calendar app"}>${done ? doneLabel : caps.mcp || caps.downloads ? "Add to calendar" : "Copy event details"}</${Btn}>`;
}
