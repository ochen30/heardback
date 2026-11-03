#!/usr/bin/env python3
"""Fetch live postings straight from public Greenhouse / Lever / Ashby job-board APIs.

    python3 tools/fetch_ats.py                 # all boards in data/ats_boards.json
    python3 tools/fetch_ats.py --open-only     # only boards with open jobs in the Simplify dataset
    python3 tools/fetch_ats.py --ats lever --limit 20
    python3 tools/fetch_ats.py --selftest      # run normalizers on built-in SAMPLE payloads (no network)

Output (default data/ats_jobs.json, never dist/ unless --out says so): the same envelope
and job shape as dist/data/jobs.json, plus "d" = plain-text description excerpt (<=1200
chars) and "board". Early-career filter: only titles that look like internships or new-grad /
entry-level roles are kept (use --all to keep everything; non-matching jobs get lvl "").

Polite by design: sequential requests, --delay seconds between them (default 0.3), 20 s
timeout, User-Agent "Ghosted job aggregator". If the network policy blocks a host (proxy
answers CONNECT with 403), the host is marked blocked after 2 consecutive failures and its
remaining boards are skipped and reported - nothing tries to route around the block.

Python 3 standard library only.
"""

import argparse
import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import refresh_jobs as R  # noqa: E402  (shared normalization + ghost scoring)

ROOT = R.ROOT
BOARDS_PATH = R.BOARDS_PATH
DEFAULT_OUT = os.path.join(ROOT, "data", "ats_jobs.json")
USER_AGENT = R.USER_AGENT
TIMEOUT = 20
DESC_MAX = 1200
BLOCK_AFTER = 2  # consecutive blocked responses before a host is skipped

API = {
    "greenhouse": "https://boards-api{eu}.greenhouse.io/v1/boards/{board}/jobs?content=true",
    "lever": "https://api{eu}.lever.co/v0/postings/{board}?mode=json",
    "ashby": "https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true",
}

# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

_BLOCK_TAGS = {"p", "div", "br", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section"}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip += 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n")
        if tag == "li":
            self.parts.append("- ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(s):
    if not s:
        return ""
    p = _TextExtractor()
    p.feed(s)
    p.close()
    txt = "".join(p.parts)
    txt = re.sub(r"[ \t\r\f\v ]+", " ", txt)
    txt = re.sub(r"\s*\n\s*", "\n", txt)
    txt = re.sub(r"\n{2,}", "\n", txt)
    return txt.strip()


def excerpt(txt, n=DESC_MAX):
    txt = (txt or "").strip()
    if len(txt) <= n:
        return txt
    cut = txt[: n - 1]
    sp = cut.rfind(" ")
    if sp > n * 0.8:
        cut = cut[:sp]
    return cut.rstrip() + "…"


def iso_to_ts(s):
    if not s:
        return None
    try:
        s = s.strip().replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=dt.timezone.utc)
        return int(d.timestamp())
    except (ValueError, TypeError):
        return None


def split_locations(s):
    """Greenhouse location names often pack several places: 'NYC; SF' / 'A | B' / 'A or B'."""
    if not s:
        return []
    parts = re.split(r"\s*(?:;|\||/(?=\s)|\bor\b)\s*", s)
    return [p for p in parts if p and p.strip()]


# ---------------------------------------------------------------------------
# Classification from title / description (ATS feeds carry no Simplify labels)
# ---------------------------------------------------------------------------

INTERN_RE = re.compile(r"\b(intern|interns|internship|co-?op|summer student|student researcher|working student|placement student)\b", re.I)
NEWGRAD_RE = re.compile(
    r"\b(new ?grad(uate)?|graduate (engineer|program|scheme|analyst|software|developer|scientist)|"
    r"early[- ]career|entry[- ]level|junior|jr\.?|university (grad|hire|graduate)|campus|recent grad(uate)?|"
    r"(engineer|developer|scientist|analyst|associate)\s+(i|1)\b|(software|data|product|quant\w*)\s+associate)\b",
    re.I,
)
SENIOR_RE = re.compile(r"\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|vice president|architect|(engineer|developer|scientist|analyst)\s+(ii|iii|iv|2|3|4))\b", re.I)

CAT_RULES = [
    ("Quant", re.compile(r"\bquant|trading|trader|\bstrats?\b", re.I)),
    ("Data & AI", re.compile(r"\bdata\b|machine learning|\bml\b|\bai\b|artificial intelligence|analytics|scientist|\bnlp\b|computer vision|\bllm", re.I)),
    ("Hardware", re.compile(r"hardware|electrical|\basic\b|fpga|firmware|embedded|silicon|\bsoc\b|analog|rf\b|mechanical|robotics|semiconductor|verification", re.I)),
    ("Product", re.compile(r"product (manager|management|owner|analyst)|\bapm\b|\bpm\b", re.I)),
    ("Software", re.compile(r"software|developer|engineer|\bswe\b|front ?end|back ?end|full ?stack|devops|\bsre\b|mobile|ios|android|security", re.I)),
]
TERM_RE = re.compile(r"\b(summer|fall|autumn|winter|spring)\s*(20\d\d)\b", re.I)

SP_NO_RE = re.compile(r"(will not|won't|unable to|cannot|can't|not able to|do(es)? not)\s+(provide\s+|offer\s+)?sponsor|no (visa )?sponsorship|sponsorship (is )?not (available|offered)", re.I)
SP_CITIZEN_RE = re.compile(r"u\.?s\.? citizenship (is )?required|must be (a )?u\.?s\.? citizen|requires? u\.?s\.? citizenship", re.I)
SP_YES_RE = re.compile(r"(visa )?sponsorship (is )?available|will sponsor|(we )?(offer|provide)s? (visa )?sponsorship|able to sponsor", re.I)
DEG_RULES = [
    ("BS", re.compile(r"bachelor'?s?|\bb\.?s\.?\b|\bba\b|\bbsc\b|undergraduate", re.I)),
    ("MS", re.compile(r"master'?s?|\bm\.?s\.?\b|\bmsc\b", re.I)),
    ("PhD", re.compile(r"\bph\.?\s?d\b|doctoral|doctorate", re.I)),
    ("MBA", re.compile(r"\bmba\b", re.I)),
]


def classify_level(title, extra=""):
    t = title or ""
    if INTERN_RE.search(t) or re.search(r"\bintern", extra or "", re.I):
        return "intern"
    if SENIOR_RE.search(t):
        return ""
    if NEWGRAD_RE.search(t):
        return "newgrad"
    return ""


def classify_category(title):
    for cat, rx in CAT_RULES:
        if rx.search(title or ""):
            return cat
    return "Other"


def sponsorship_from_text(txt):
    if not txt:
        return ""
    if SP_CITIZEN_RE.search(txt):
        return "citizen"
    if SP_NO_RE.search(txt):
        return "no"
    if SP_YES_RE.search(txt):
        return "yes"
    return ""


def degrees_from_text(txt):
    return [code for code, rx in DEG_RULES if rx.search(txt or "")]


def term_from_title(title):
    m = TERM_RE.search(title or "")
    return f"{m.group(1).title()} {m.group(2)}" if m else ""


# ---------------------------------------------------------------------------
# Normalizers: each returns a list of partial jobs (company/title/locs/url/p/u/desc...)
# ---------------------------------------------------------------------------

def _sid(ats, board, jid):
    return hashlib.sha1(f"{ats}:{board}:{jid}".encode()).hexdigest()[:10]


def _base(ats, board, company, jid, title, locs, url, posted, updated, desc, remote_flag=False, lvl_hint=""):
    title = R.clean_title(title)
    locs = R.clean_locations(locs)
    if remote_flag and not any(R.REMOTE_RE.search(l) for l in locs):
        locs.append("Remote")
    return {
        "_company": company, "_board": board, "_lvl_hint": lvl_hint,
        "id": _sid(ats, board, jid), "t": title, "l": locs, "url": url, "ats": ats,
        "p": posted, "u": updated, "d_full": desc,
    }


def normalize_greenhouse(payload, board, company):
    out = []
    for j in (payload or {}).get("jobs") or []:
        # content=true returns entity-escaped HTML; unescape once, then strip tags.
        desc = html_to_text(html.unescape(j.get("content") or ""))
        locs = split_locations((j.get("location") or {}).get("name") or "")
        for o in j.get("offices") or []:
            if o.get("location"):
                locs.append(o["location"])
        updated = iso_to_ts(j.get("updated_at"))
        posted = iso_to_ts(j.get("first_published")) or updated
        out.append(_base("greenhouse", board, j.get("company_name") or company, j.get("id"),
                         j.get("title"), locs, j.get("absolute_url"), posted, updated, desc))
    return out


def normalize_lever(payload, board, company):
    out = []
    for j in payload or []:
        cats = j.get("categories") or {}
        locs = list(cats.get("allLocations") or []) or ([cats["location"]] if cats.get("location") else [])
        parts = [j.get("descriptionPlain") or html_to_text(j.get("description") or "")]
        for lst in j.get("lists") or []:
            parts.append((lst.get("text") or "") + "\n" + html_to_text(lst.get("content") or ""))
        parts.append(j.get("additionalPlain") or "")
        desc = "\n".join(p.strip() for p in parts if p and p.strip())
        created = j.get("createdAt")
        posted = int(created / 1000) if isinstance(created, (int, float)) else None
        out.append(_base("lever", board, company, j.get("id"), j.get("text"), locs,
                         j.get("hostedUrl") or j.get("applyUrl"), posted, posted, desc,
                         remote_flag=(j.get("workplaceType") == "remote"),
                         lvl_hint=cats.get("commitment") or ""))
    return out


def normalize_ashby(payload, board, company):
    out = []
    for j in (payload or {}).get("jobs") or []:
        if j.get("isListed") is False:
            continue
        locs = [j.get("location")] if j.get("location") else []
        for s in j.get("secondaryLocations") or []:
            if isinstance(s, dict) and s.get("location"):
                locs.append(s["location"])
        desc = j.get("descriptionPlain") or html_to_text(j.get("descriptionHtml") or "")
        posted = iso_to_ts(j.get("publishedAt"))
        remote = bool(j.get("isRemote")) or (j.get("workplaceType") or "").lower() == "remote"
        out.append(_base("ashby", board, company, j.get("id"), j.get("title"), locs,
                         j.get("jobUrl") or j.get("applyUrl"), posted, posted, desc,
                         remote_flag=remote,
                         lvl_hint="intern" if (j.get("employmentType") or "") == "Intern" else ""))
    return out


NORMALIZERS = {"greenhouse": normalize_greenhouse, "lever": normalize_lever, "ashby": normalize_ashby}


def finalize(partials, now_ts, keep_all=False):
    """Classify, score and package partial jobs into the jobs.json envelope."""
    rows = []
    for j in partials:
        lvl = classify_level(j["t"], j.get("_lvl_hint"))
        if not lvl and not keep_all:
            continue
        rows.append((j, lvl))
    # Repeat titles within this snapshot (all currently open, so they are concurrent).
    grp = Counter((R.company_key(j["_company"]), R.normalize_title(j["t"])) for j, _ in rows)
    names = sorted({j["_company"] for j, _ in rows}, key=str.casefold)
    cidx = {n: i for i, n in enumerate(names)}
    jobs = []
    for j, lvl in rows:
        desc = j.get("d_full") or ""
        p = j.get("p") or int(now_ts)
        age = max(0.0, (now_ts - p) / R.DAY)
        # A single snapshot has no closed history, so the strict repost count is 0 here;
        # identical open titles are passed only as (point-free) concurrency context.
        rp = 0
        live = grp[(R.company_key(j["_company"]), R.normalize_title(j["t"]))] - 1
        extra = []
        if desc and len(desc) < 300:
            extra.append((10, "Very short job description"))
        g, gr = R.ghost_score(age, rp, p, R.city_level_count(j["l"]), j["t"],
                              extra=extra, live_similar=live)
        jobs.append({
            "id": j["id"], "c": cidx[j["_company"]], "t": j["t"], "l": j["l"][:R.MAX_LOCS],
            "nl": len(j["l"]), "r": 1 if any(R.REMOTE_RE.search(l) for l in j["l"]) else 0,
            "cat": classify_category(j["t"]), "lvl": lvl, "term": term_from_title(j["t"]),
            "sp": sponsorship_from_text(desc), "deg": degrees_from_text(desc),
            "p": int(p), "u": int(j.get("u") or p), "url": j["url"], "ats": j["ats"],
            "g": g, "gr": gr, "rp": rp, "d": excerpt(desc), "board": j["_board"],
        })
    jobs.sort(key=lambda x: (-x["p"], x["t"]))
    return names, jobs


# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------

class Blocked(Exception):
    pass


class NotFound(Exception):
    pass


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise NotFound(url)
        body = ""
        try:
            body = e.read(400).decode("utf-8", "replace")
        except Exception:
            pass
        # A policy proxy answers 403/407 with its own page; the APIs themselves don't 403 GETs.
        if e.code in (403, 407) and ("policy" in body.lower() or "proxy" in body.lower() or not body):
            raise Blocked(f"HTTP {e.code} from network proxy")
        raise
    except urllib.error.URLError as e:
        reason = str(e.reason)
        if "Tunnel connection failed" in reason or "403" in reason or "407" in reason:
            raise Blocked(reason)
        raise


def run(boards, delay, keep_all, out_path):
    now_ts = time.time()
    blocked_hosts, streak = set(), Counter()
    report = defaultdict(list)  # status -> [board labels]
    partials = []
    for i, b in enumerate(boards):
        ats, board = b["ats"], b["board"]
        eu = ".eu" if b.get("region") == "eu" and ats in ("greenhouse", "lever") else ""
        url = API[ats].format(board=urllib.parse.quote(board, safe=""), eu=eu)
        host = urllib.parse.urlparse(url).hostname
        label = f"{ats}:{board}"
        if host in blocked_hosts:
            report["skipped (host blocked)"].append(label)
            continue
        if i:
            time.sleep(delay)
        try:
            payload = fetch_json(url)
            streak[host] = 0
            got = NORMALIZERS[ats](payload, board, b.get("company") or board)
            partials.extend(got)
            report["ok"].append(f"{label} ({len(got)})")
        except Blocked as e:
            streak[host] += 1
            report["blocked"].append(label)
            if streak[host] >= BLOCK_AFTER:
                blocked_hosts.add(host)
                print(f"BLOCKED: {host} refused by network policy ({e}); skipping its remaining boards. "
                      f"Allow it under environment Network access to enable direct ATS refresh.", file=sys.stderr)
        except NotFound:
            report["not found (drop from ats_boards.json)"].append(label)
        except (urllib.error.URLError, OSError, ValueError) as e:
            report["error"].append(f"{label}: {e}")
    names, jobs = finalize(partials, now_ts, keep_all=keep_all)
    for k in ("ok", "blocked", "skipped (host blocked)", "not found (drop from ats_boards.json)", "error"):
        if report.get(k):
            print(f"{k}: {len(report[k])}" + (f"  e.g. {', '.join(report[k][:5])}" if k != "ok" else ""))
    if blocked_hosts:
        print("blocked hosts: " + ", ".join(sorted(blocked_hosts)))
    if not report.get("ok"):
        print("No board could be fetched; output not written.")
        return 2
    gen = dt.datetime.fromtimestamp(now_ts, dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    doc = {
        "v": 1, "generatedAt": gen,
        "source": {"name": "Public Greenhouse, Lever and Ashby job-board APIs",
                   "url": "", "note": "Fetched directly from each employer's public job board."},
        "stats": {
            "active": len(jobs), "companies": len(names),
            "intern": sum(1 for j in jobs if j["lvl"] == "intern"),
            "newgrad": sum(1 for j in jobs if j["lvl"] == "newgrad"),
            "postedLast7d": sum(1 for j in jobs if j["p"] >= now_ts - 7 * R.DAY),
            "likelyGhost": sum(1 for j in jobs if j["g"] >= 50),
        },
        "companies": names, "jobs": jobs,
    }
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {out_path}: {len(jobs)} jobs from {len(report['ok'])} boards "
          f"({os.path.getsize(out_path)/1e6:.2f} MB)")
    return 0


# ---------------------------------------------------------------------------
# Self-test with hand-written SAMPLE payloads (shape follows the public API docs).
# Nothing here is real data and nothing is written to disk.
# ---------------------------------------------------------------------------

def selftest():
    now = time.time()
    iso = lambda days: dt.datetime.fromtimestamp(now - days * R.DAY, dt.timezone.utc).isoformat()
    gh = {"jobs": [
        {"id": 111, "title": "Software Engineer Intern (Summer 2027)", "updated_at": iso(2),
         "first_published": iso(100), "location": {"name": "New York, NY; San Francisco, CA"},
         "absolute_url": "https://job-boards.greenhouse.io/samplecorp/jobs/111", "company_name": "SAMPLE Corp",
         "content": html.escape("<p>SAMPLE posting. Pursuing a <b>Bachelor's</b> or Master's in CS.</p>"
                                "<ul><li>Build things</li></ul><p>We are unable to sponsor visas.</p>" + "<p>x</p>" * 200),
         "offices": [{"name": "NYC", "location": "New York, NY"}]},
        {"id": 112, "title": "Senior Staff Engineer", "updated_at": iso(1), "location": {"name": "Remote"},
         "absolute_url": "https://job-boards.greenhouse.io/samplecorp/jobs/112", "content": ""},
        {"id": 113, "title": "Talent Community - Early Career", "updated_at": iso(1), "first_published": iso(5),
         "location": {"name": "Remote - US"}, "absolute_url": "https://job-boards.greenhouse.io/samplecorp/jobs/113",
         "content": "&lt;p&gt;Join our talent community.&lt;/p&gt;"},
    ], "meta": {"total": 3}}
    lv = [
        {"id": "aaaa-1", "text": "New Grad Software Engineer", "createdAt": int((now - 10 * R.DAY) * 1000),
         "categories": {"commitment": "Full-time", "location": "Toronto, ON",
                        "allLocations": ["Toronto, ON", "Remote - Canada"], "team": "Eng"},
         "workplaceType": "hybrid", "hostedUrl": "https://jobs.lever.co/samplelever/aaaa-1",
         "descriptionPlain": "SAMPLE description for testing. " * 20,
         "lists": [{"text": "Requirements", "content": "<li>BS in CS</li><li>U.S. citizenship is required</li>"}],
         "additionalPlain": "SAMPLE"},
    ]
    ab = {"apiVersion": "1", "jobs": [
        {"id": "bbbb-1", "title": "Machine Learning Intern", "employmentType": "Intern", "location": "Boston, MA",
         "secondaryLocations": [{"location": "Cambridge, MA"}], "publishedAt": iso(40), "isListed": True,
         "isRemote": False, "jobUrl": "https://jobs.ashbyhq.com/sampleashby/bbbb-1",
         "descriptionHtml": "<p>SAMPLE. PhD students welcome. Visa sponsorship is available.</p>"},
        {"id": "bbbb-2", "title": "Unlisted Intern", "isListed": False, "jobUrl": "x"},
    ]}
    p = normalize_greenhouse(gh, "samplecorp", "SAMPLE Corp") + normalize_lever(lv, "samplelever", "SAMPLE Lever Co") \
        + normalize_ashby(ab, "sampleashby", "SAMPLE Ashby Inc")
    assert len(p) == 5, len(p)  # unlisted Ashby job dropped
    names, jobs = finalize(p, now)
    by_t = {j["t"]: j for j in jobs}
    assert "Senior Staff Engineer" not in by_t, "senior role should be filtered out"
    gi = by_t["Software Engineer Intern (Summer 2027)"]
    assert gi["lvl"] == "intern" and gi["term"] == "Summer 2027" and gi["sp"] == "no", gi
    assert gi["l"] == ["New York, NY", "San Francisco, CA"] and gi["nl"] == 2, gi["l"]
    assert gi["deg"][:2] == ["BS", "MS"] and len(gi["d"]) <= DESC_MAX and "<" not in gi["d"], gi["deg"]
    assert gi["g"] == 40 and gi["gr"] == ["Open 100 days"], (gi["g"], gi["gr"])
    tc = by_t["Talent Community - Early Career"]
    assert tc["lvl"] == "newgrad" and tc["r"] == 1 and tc["g"] == 45, (tc["lvl"], tc["g"], tc["gr"])
    assert tc["gr"][0].startswith("Title suggests a talent pool") and "Very short job description" in tc["gr"]
    ln = by_t["New Grad Software Engineer"]
    assert ln["lvl"] == "newgrad" and ln["sp"] == "citizen" and ln["r"] == 1 and ln["g"] == 0, ln
    am = by_t["Machine Learning Intern"]
    assert am["lvl"] == "intern" and am["cat"] == "Data & AI" and am["sp"] == "yes" and am["deg"] == ["PhD"], am
    assert am["l"] == ["Boston, MA", "Cambridge, MA"] and am["g"] == 20, (am["g"], am["gr"])
    assert html_to_text("<p>a&amp;b</p><ul><li>x</li></ul>") == "a&b\n- x"
    assert split_locations("Austin, TX | Remote") == ["Austin, TX", "Remote"]
    assert R.board_from_url("https://boards.greenhouse.io/embed/job_app?for=acme&token=1") == ("greenhouse", "acme", "")
    assert R.board_from_url("https://jobs.eu.lever.co/cirrus/abc/apply") == ("lever", "cirrus", "eu")
    assert R.board_from_url("https://jobs.ashbyhq.com/f7d8749a-72d6-407c-bf98-292ea630c73a/x") is None
    assert R.normalize_title("Software Engineering Intern - Summer 2026") == R.normalize_title("Intern, Software Engineer (Fall 2027)")
    assert R.normalize_title("Software Engineer Intern") != R.normalize_title("Software Engineer")
    assert not R.EVERGREEN_RE.search("Data Pipeline Engineer Intern")
    g2, gr2 = R.ghost_score(10, 3, now - 200 * R.DAY, 1, "Software Engineer", live_similar=4)
    assert g2 == 20 and gr2[0].startswith("Posted and closed 3\u00d7 before (since ") \
        and gr2[0].endswith("; 4 similar openings live now"), (g2, gr2)
    assert R.ghost_score(10, 0, now, 1, "Software Engineer", live_similar=9) == (0, [])
    print(f"selftest OK: {len(jobs)} SAMPLE jobs normalized from 3 SAMPLE payloads (not written anywhere)")
    for j in jobs:
        print(f"  [SAMPLE] {j['ats']:<10} {j['lvl']:<7} g={j['g']:<3} {j['t']}  {j['gr']}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--boards", default=BOARDS_PATH)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--ats", choices=sorted(API))
    ap.add_argument("--open-only", action="store_true", help="only boards with open jobs in the Simplify dataset")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=0.3)
    ap.add_argument("--all", action="store_true", help="keep all roles, not just intern/new-grad")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    with open(a.boards, encoding="utf-8") as f:
        boards = json.load(f)
    if a.ats:
        boards = [b for b in boards if b["ats"] == a.ats]
    if a.open_only:
        boards = [b for b in boards if b.get("openInDataset", 0) > 0]
    seen, uniq = set(), []
    for b in boards:  # one request per board token even if several company names share it
        k = (b["ats"], b["board"].lower(), b.get("region", ""))
        if k not in seen:
            seen.add(k)
            uniq.append(b)
    if a.limit:
        uniq = uniq[: a.limit]
    print(f"fetching {len(uniq)} boards sequentially (delay {a.delay}s, timeout {TIMEOUT}s)")
    return run(uniq, max(0.0, a.delay), a.all, a.out)


if __name__ == "__main__":
    sys.exit(main())
