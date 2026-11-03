#!/usr/bin/env python3
"""Ghosted data pipeline: SimplifyJobs community listings -> compact app data.

Usage:
    python3 tools/refresh_jobs.py            # download both listings files, then build
    python3 tools/refresh_jobs.py --offline  # skip download, use data/raw/*.json

Writes:
    dist/data/jobs.json       compact index of active, visible listings with ghost scores
    dist/data/companies.json  per-company posting stats (companies with >=1 open job)
    data/ats_boards.json      Greenhouse / Lever / Ashby board tokens seen in apply URLs

Python 3 standard library only. See data/PIPELINE.md for field docs and the
ghost-score rubric. The helpers in this file (title normalization, ATS detection,
ghost scoring) are imported by tools/fetch_ats.py so both sources score the same way.
"""

import argparse
import datetime as dt
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, "data", "raw")
DIST_DATA = os.path.join(ROOT, "dist", "data")
BOARDS_PATH = os.path.join(ROOT, "data", "ats_boards.json")

SOURCES = [
    # (level, local file, url)
    ("newgrad", "newgrad.json",
     "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json"),
    ("intern", "intern.json",
     "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json"),
]
SOURCE_META = {
    "name": "SimplifyJobs community listings (New-Grad-Positions, Summer2026-Internships)",
    "url": "https://github.com/SimplifyJobs",
    "note": "Listings link to each employer's own application page.",
}
USER_AGENT = "Ghosted job aggregator"
DAY = 86400

# A closed listing only counts toward "time open" if it stayed open at least this long.
# ~60% of closed listings in the dataset have date_updated within an hour of date_posted
# (recorded already-closed / batch edits), which says nothing about how long the job was open.
MIN_MEASURABLE_OPEN_S = DAY
MIN_CLOSED_SAMPLE = 5
MAX_LOCS = 12

# ---------------------------------------------------------------------------
# Normalization helpers (shared with fetch_ats.py)
# ---------------------------------------------------------------------------

CATEGORY_MAP = {
    "software": "Software",
    "software engineering": "Software",
    "ai/ml/data": "Data & AI",
    "data science, ai & machine learning": "Data & AI",
    "hardware": "Hardware",
    "hardware engineering": "Hardware",
    "product": "Product",
    "product management": "Product",
    "quant": "Quant",
    "quantitative finance": "Quant",
}

SPONSOR_MAP = {
    "Offers Sponsorship": "yes",
    "Does Not Offer Sponsorship": "no",
    "U.S. Citizenship is Required": "citizen",
}

DEGREE_MAP = {
    "Bachelor's": "BS",
    "Master's": "MS",
    "PhD": "PhD",
    "Associate's": "AS",
    "MBA": "MBA",
    "Certificate": "Cert",
}

# Simplify uses short forms for a few big metros; expand so search/filter by city works.
LOCATION_ALIASES = {
    "NYC": "New York, NY",
    "SF": "San Francisco, CA",
    "LA": "Los Angeles, CA",
    "South SF": "South San Francisco, CA",
    "Remote in US": "Remote in USA",
}
CITY_ALIASES = {"NYC", "SF", "LA", "South SF"}

REMOTE_RE = re.compile(r"remote", re.I)

# Titles that describe a talent pool / standing requisition rather than a specific opening.
# "pipeline" alone is NOT used: it matches real roles ("Data Pipeline Engineer",
# "CI/CD Pipeline", "Art and Media Pipeline"). It only counts in talent-pipeline phrasing.
EVERGREEN_RE = re.compile(
    r"talent (?:community|pool|network|pipeline)"
    r"|general application|open application|speculative application"
    r"|future opportunit|future openings?\b|evergreen|expression of interest"
    r"|\b(?:bachelor'?s?|master'?s?|ph\.?d|graduate|campus|university|early career|hiring|candidate)\s+pipeline\b"
    r"|\bpipeline\s+(?:requisition|req|role|position|opportunit|candidates?|hiring|application)",
    re.I,
)

_YEAR_RE = re.compile(r"\b20\d\d\b")
_SEASON_RE = re.compile(r"\b(?:summer|fall|autumn|winter|spring)\b")
_GENDER_RE = re.compile(r"\b(?:m|f|w|d|h|x)\s*/\s*(?:m|f|w|d|h|x)(?:\s*/\s*(?:m|f|w|d|h|x))?\b")
_PUNCT_RE = re.compile(r"[^a-z0-9+#]+")
_TOKEN_ALIASES = {
    "internship": "intern",
    "interns": "intern",
    "coop": "co-op",
    "graduate": "grad",
    "newgrad": "new grad",
    "engineering": "engineer",  # "Software Engineering Intern" == "Software Engineer Intern"
    "sr": "senior",
    "jr": "junior",
    "i": "1",
    "ii": "2",
    "iii": "3",
}
_STOP = {"and", "the", "of", "for", "a", "an", "in", "to", "with", "at", "on", "term"}


def normalize_title(title):
    """Key for 'same role' matching. Lowercase; drop years (20xx), season words,
    gender tags (m/f/d); punctuation -> space; light token aliases (internship->intern,
    engineering->engineer, graduate->grad, roman numerals->digits); drop stopwords; then
    sort the token set so word order doesn't matter ("Intern - Software Engineer" ==
    "Software Engineer Intern"). Level words (intern / new grad / senior) are KEPT, so an
    internship never matches a full-time role with the same name."""
    t = (title or "").lower()
    t = t.replace("co-op", "coop").replace("new grad", "newgrad")
    t = _GENDER_RE.sub(" ", t)
    t = _YEAR_RE.sub(" ", t)
    t = _SEASON_RE.sub(" ", t)
    t = _PUNCT_RE.sub(" ", t)
    toks = set()
    for tok in t.split():
        tok = _TOKEN_ALIASES.get(tok, tok)
        if tok in _STOP or not tok:
            continue
        toks.add(tok)
    return " ".join(sorted(toks))


def company_key(name):
    """Merge trivial name variants ('Whatnot'/'WhatNot', 'Rolls Royce'/'Rolls-Royce',
    trailing spaces). Display name is the most common variant."""
    n = re.sub(r"[\s\-]+", " ", (name or "").strip()).casefold()
    return n


def clean_title(t):
    return re.sub(r"\s+", " ", (t or "").strip())


def clean_locations(locs):
    out, seen = [], set()
    for raw in locs or []:
        if not isinstance(raw, str):
            continue
        l = re.sub(r"\s+", " ", raw.strip())
        if not l:
            continue
        l = LOCATION_ALIASES.get(l, l)
        if l.lower() in seen:
            continue
        seen.add(l.lower())
        out.append(l)
    return out


def city_level_count(locs):
    """Locations that name a specific on-site place. Excludes remote entries
    ('Remote in Mali') and bare state/country names ('Iowa', 'Canada') - a listing
    open in all 50 states or 130 remote countries is broad eligibility, not a
    city-by-city blast."""
    n = 0
    for l in locs:
        if REMOTE_RE.search(l):
            continue
        if "," in l or l in CITY_ALIASES or l in LOCATION_ALIASES.values():
            n += 1
    return n


def map_category(c):
    return CATEGORY_MAP.get((c or "").strip().lower(), "Other")


def short_degrees(degs):
    out = []
    for d in degs or []:
        s = DEGREE_MAP.get(d, d)
        if s and s not in out:
            out.append(s)
    return out


def detect_ats(url):
    host = (urllib.parse.urlparse(url or "").hostname or "").lower()
    if host.endswith("greenhouse.io") or "gh_jid=" in (url or ""):
        return "greenhouse"
    if host in ("jobs.lever.co", "jobs.eu.lever.co"):
        return "lever"
    if host == "jobs.ashbyhq.com":
        return "ashby"
    if host.endswith("myworkdayjobs.com") or host.endswith("myworkdaysite.com") or host.endswith(".myworkday.com"):
        return "workday"
    return "other"


_TOKEN_OK = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._\-]{0,79}$")
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
_GH_RESERVED = {"embed", "v1", "jobs", "job_app", "api"}


def board_from_url(url):
    """Return (ats, board_token, region) when the apply URL is on a public job-board host
    whose path names the board, else None. region is 'eu' for EU-hosted boards."""
    try:
        p = urllib.parse.urlparse(url or "")
    except ValueError:
        return None
    host = (p.hostname or "").lower()
    parts = [x for x in p.path.split("/") if x]
    qs = urllib.parse.parse_qs(p.query)
    tok, ats, region = None, None, ""
    if host in ("boards.greenhouse.io", "job-boards.greenhouse.io",
                "boards.eu.greenhouse.io", "job-boards.eu.greenhouse.io"):
        ats = "greenhouse"
        region = "eu" if ".eu." in host else ""
        if parts and parts[0] == "embed":
            tok = (qs.get("for") or [None])[0]
        elif parts and parts[0].lower() not in _GH_RESERVED:
            tok = parts[0]
        if tok:
            tok = tok.lower()
    elif host in ("jobs.lever.co", "jobs.eu.lever.co"):
        ats = "lever"
        region = "eu" if ".eu." in host else ""
        tok = parts[0].lower() if parts else None
    elif host == "jobs.ashbyhq.com":
        ats = "ashby"
        tok = urllib.parse.unquote(parts[0]) if parts else None
    if not ats or not tok or not _TOKEN_OK.match(tok) or _UUID_RE.match(tok):
        # UUID path segments are internal org ids, not board names the posting APIs accept.
        return None
    return ats, tok, region


_TRACKING_PARAMS = {"embed", "src", "source", "ref", "gh_src", "lever-source", "lever-origin",
                    "mobile", "needsredirect", "utm_source", "utm_medium", "utm_campaign",
                    "utm_content", "utm_term", "iis", "iisn"}


def url_key(url):
    """Identity key for a posting URL: lowercase host, no fragment, no tracking params,
    no trailing slash, and drop Ashby '/application' / Lever '/apply' suffixes."""
    try:
        p = urllib.parse.urlparse((url or "").strip())
    except ValueError:
        return (url or "").strip()
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True)
         if k.lower() not in _TRACKING_PARAMS]
    path = p.path.rstrip("/")
    host = (p.hostname or "").lower()
    if host == "jobs.ashbyhq.com" and path.endswith("/application"):
        path = path[: -len("/application")]
    if host.endswith("lever.co") and path.endswith("/apply"):
        path = path[: -len("/apply")]
    return host + path + ("?" + urllib.parse.urlencode(sorted(q)) if q else "")


# ---------------------------------------------------------------------------
# Ghost score (shared with fetch_ats.py)
# ---------------------------------------------------------------------------

def fmt_month(ts):
    return dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%b %Y")


def age_points(age_days):
    if age_days >= 150:
        return 55
    if age_days >= 90:
        return 40
    if age_days >= 60:
        return 25
    if age_days >= 30:
        return 10
    return 0


def repost_points(rp):
    if rp >= 4:
        return 30
    if rp >= 2:
        return 20
    if rp >= 1:
        return 10
    return 0


def blast_points(n_city):
    if n_city >= 15:
        return 20
    if n_city >= 8:
        return 10
    return 0


def ghost_score(age_days, rp, rp_since, n_city, title, company_med_open=None,
                age_is_lower_bound=False, extra=None, live_similar=0):
    """Returns (score 0-100, [up to 3 reasons]). Each signal adds points; reasons are
    ordered by the points they contributed. `extra` = list of (points, reason) from a
    source-specific signal (fetch_ats.py uses it for very short descriptions)."""
    sig = []
    a = age_points(age_days)
    if a:
        d = int(age_days)
        sig.append((a, f"Open {d}+ days" if age_is_lower_bound else f"Open {d} days"))
    r = repost_points(rp)
    if r:
        # rp = earlier postings of the same role that are now closed: close-and-repost cycles.
        why = f"Posted and closed {rp}\u00d7 before (since {fmt_month(rp_since)})"
        if live_similar >= 3:
            # Concurrent identical titles earn no points (often volume hiring); context only.
            why += f"; {live_similar} similar openings live now"
        sig.append((r, why))
    b = blast_points(n_city)
    if b:
        sig.append((b, f"Listed in {n_city} cities"))
    if title and EVERGREEN_RE.search(title):
        sig.append((35, "Title suggests a talent pool, not a specific opening"))
    if (company_med_open is not None and company_med_open < 21
            and age_days > 3 * company_med_open and age_days > 45):
        m = max(1, round(company_med_open))
        sig.append((15, f"Much older than this company's typical listing (usually closes in ~{m} days)"))
    for pts, why in extra or []:
        sig.append((pts, why))
    total = min(100, sum(p for p, _ in sig))
    sig.sort(key=lambda s: -s[0])
    return int(total), [why for _, why in sig[:3]]


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download(url, dest):
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)
    with open(tmp, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list) or len(data) < 100:
        os.remove(tmp)
        raise ValueError(f"unexpected payload from {url} (not a listings array)")
    os.replace(tmp, dest)
    return len(data)


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def median(xs):
    return statistics.median(xs) if xs else None


def r3(x):
    return None if x is None else round(x, 3)


def load_records(warnings):
    recs = []
    for lvl, fname, _ in SOURCES:
        path = os.path.join(RAW_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        bad = 0
        for x in data:
            if not isinstance(x, dict) or not x.get("url") or not x.get("company_name") \
                    or not isinstance(x.get("date_posted"), (int, float)):
                bad += 1
                continue
            x["_lvl"] = lvl
            recs.append(x)
        if bad:
            warnings.append(f"{fname}: skipped {bad} malformed records")
    return recs


def build(now_ts):
    warnings = []
    recs = load_records(warnings)
    n_raw = len(recs)
    dataset_start = min(x["date_posted"] for x in recs)

    # Company display names (most common stripped variant per key).
    name_votes = defaultdict(Counter)
    for x in recs:
        name_votes[company_key(x["company_name"])][x["company_name"].strip()] += 1
    display = {k: v.most_common(1)[0][0] for k, v in name_votes.items()}
    merged_names = sum(1 for v in name_votes.values() if len(v) > 1)

    # ---- Collapse records into distinct postings (same id OR same URL = same posting).
    hidden = 0
    postings = {}      # pkey -> posting dict
    id_to_key = {}
    for x in recs:
        if not x.get("is_visible", True):
            hidden += 1
            continue
        uk = url_key(x["url"])
        pk = id_to_key.get(x.get("id")) or uk
        id_to_key.setdefault(x.get("id"), pk)
        p = postings.get(pk)
        if p is None:
            postings[pk] = p = {"recs": [], "ck": company_key(x["company_name"])}
        p["recs"].append(x)
    for p in postings.values():
        rs = p["recs"]
        p["active"] = any(r.get("active") for r in rs)
        p["posted"] = min(r["date_posted"] for r in rs)
        p["updated"] = max(r.get("date_updated") or r["date_posted"] for r in rs)
        p["nt"] = normalize_title(clean_title(rs[0].get("title")))
    cross_file = sum(1 for p in postings.values() if len({r["_lvl"] for r in rs_of(p)}) > 1)

    # ---- Repost groups: same company + normalized title, any status.
    groups = defaultdict(list)
    for pk, p in postings.items():
        groups[(p["ck"], p["nt"])].append(pk)

    # ---- Company closed-listing tempo.
    closed_all = Counter()
    closed_open_days = defaultdict(list)
    for p in postings.values():
        if p["active"]:
            continue
        closed_all[p["ck"]] += 1
        dur = p["updated"] - p["posted"]
        if dur >= MIN_MEASURABLE_OPEN_S:
            closed_open_days[p["ck"]].append(dur / DAY)
    med_open = {ck: median(v) for ck, v in closed_open_days.items() if len(v) >= MIN_CLOSED_SAMPLE}

    # ---- Active jobs (active && is_visible), de-duplicated by URL.
    active_by_url = {}
    for x in recs:
        if not (x.get("active") and x.get("is_visible", True)):
            continue
        uk = url_key(x["url"])
        prev = active_by_url.get(uk)
        if prev is None or (x.get("date_updated") or 0) > (prev.get("date_updated") or 0):
            active_by_url[uk] = x
    n_active_recs = sum(1 for x in recs if x.get("active") and x.get("is_visible", True))
    dup_active = n_active_recs - len(active_by_url)

    jobs_tmp = []
    for uk, x in active_by_url.items():
        ck = company_key(x["company_name"])
        title = clean_title(x.get("title"))
        locs = clean_locations(x.get("locations"))
        pk = id_to_key.get(x.get("id")) or uk
        nt = normalize_title(title)
        grp = groups.get((ck, nt), [])
        others = [g for g in grp if g != pk]
        # Strict repost count: same company + normalized title, posted BEFORE this job,
        # and now closed. Concurrent open postings are counted separately (no points).
        prior_closed = [o for o in others
                        if not postings[o]["active"] and postings[o]["posted"] < x["date_posted"]]
        rp = len(prior_closed)
        live_similar = sum(1 for o in others if postings[o]["active"])
        rp_since = min((postings[o]["posted"] for o in prior_closed), default=x["date_posted"])
        age_days = max(0.0, (now_ts - x["date_posted"]) / DAY)
        lower_bound = x["date_posted"] - dataset_start < DAY
        n_city = city_level_count(locs)
        g, gr = ghost_score(age_days, rp, rp_since, n_city, title, med_open.get(ck),
                            age_is_lower_bound=lower_bound, live_similar=live_similar)
        terms = [t for t in (x.get("terms") or []) if t and t.strip().upper() != "N/A"]
        sp = SPONSOR_MAP.get((x.get("sponsorship") or "").strip(), "")
        jobs_tmp.append({
            "_ck": ck,
            "id": (x.get("id") or "")[:10],
            "_fullid": x.get("id") or uk,
            "t": title,
            "l": locs[:MAX_LOCS],
            "nl": len(locs),
            "r": 1 if any(REMOTE_RE.search(l) for l in locs) else 0,
            "cat": map_category(x.get("category")),
            "lvl": x["_lvl"],
            "term": terms[0] if terms else "",
            "sp": sp,
            "deg": short_degrees(x.get("degrees")),
            "p": int(x["date_posted"]),
            "u": int(x.get("date_updated") or x["date_posted"]),
            "url": x["url"].strip(),
            "ats": detect_ats(x["url"]),
            "g": g,
            "gr": gr,
            "rp": rp,
            "_site": x.get("company_url") or "",
        })

    # Short ids must be unique; widen on collision.
    ids = Counter(j["id"] for j in jobs_tmp)
    for j in jobs_tmp:
        if ids[j["id"]] > 1:
            j["id"] = j["_fullid"].replace("-", "")[:14]
            warnings.append(f"short id collision -> widened to {j['id']}")

    # ---- Company index (only companies with >=1 open job), alphabetical.
    open_cks = sorted({j["_ck"] for j in jobs_tmp}, key=lambda k: display[k].casefold())
    cidx = {ck: i for i, ck in enumerate(open_cks)}
    companies_list = [display[ck] for ck in open_cks]
    jobs_tmp.sort(key=lambda j: (-j["p"], j["t"]))
    for j in jobs_tmp:
        j["c"] = cidx[j["_ck"]]

    # ---- ATS boards from every visible listing's URL (open or closed).
    board_hits = defaultdict(lambda: {"n": 0, "last": 0, "region": ""})
    for x in recs:
        if not x.get("is_visible", True):
            continue
        b = board_from_url(x["url"])
        if not b:
            continue
        ats, tok, region = b
        h = board_hits[(company_key(x["company_name"]), ats, tok)]
        h["n"] += 1
        h["last"] = max(h["last"], int(x.get("date_updated") or x["date_posted"]))
        h["region"] = region or h["region"]
    open_board_counts = Counter()
    for j in jobs_tmp:
        b = board_from_url(j["url"])
        if b:
            open_board_counts[(j["_ck"], b[0], b[1])] += 1
    boards = []
    for (ck, ats, tok), h in board_hits.items():
        e = {"company": display[ck], "ats": ats, "board": tok,
             "openInDataset": open_board_counts.get((ck, ats, tok), 0),
             "seenInDataset": h["n"],
             "lastSeen": dt.datetime.fromtimestamp(h["last"], dt.timezone.utc).strftime("%Y-%m-%d")}
        if h["region"]:
            e["region"] = h["region"]
        boards.append(e)
    boards.sort(key=lambda e: (-e["openInDataset"], e["company"].casefold(), e["ats"], e["board"]))
    # Same token claimed by different company names (e.g. subsidiaries) - note it.
    tok_owners = defaultdict(set)
    for e in boards:
        tok_owners[(e["ats"], e["board"])].add(e["company"])
    shared_tokens = {k: v for k, v in tok_owners.items() if len(v) > 1}

    # ---- Company stats.
    by_c = defaultdict(list)
    for j in jobs_tmp:
        by_c[j["_ck"]].append(j)
    seen_c = Counter(p["ck"] for p in postings.values())
    first_c = {}
    for p in postings.values():
        first_c[p["ck"]] = min(first_c.get(p["ck"], p["posted"]), p["posted"])
    # Board per company: prefer tokens seen on open jobs, then most-seen overall.
    board_for_c = {}
    for e in boards:
        ck = company_key(e["company"])
        cur = board_for_c.get(ck)
        cand = (e["openInDataset"], e["seenInDataset"])
        if cur is None or cand > cur[0]:
            board_for_c[ck] = (cand, e)
    companies = {}
    for ck in open_cks:
        js = by_c[ck]
        n = len(js)
        cats = Counter(j["cat"] for j in js)
        loc_c = Counter(l for j in js for l in j["l"])
        ats_c = Counter(j["ats"] for j in js)
        timed = closed_open_days.get(ck, [])
        enough = len(timed) >= MIN_CLOSED_SAMPLE
        rec = {
            "n": display[ck],
            "open": n,
            "intern": sum(1 for j in js if j["lvl"] == "intern"),
            "newgrad": sum(1 for j in js if j["lvl"] == "newgrad"),
            "cats": dict(cats.most_common()),
            "seen": seen_c[ck],
            "first": int(first_c[ck]),
            "closed": closed_all.get(ck, 0),
            "closedTimed": len(timed),
            "medOpenDays": round(median(timed), 1) if enough else None,
            "fastClose": r3(sum(1 for d in timed if d <= 14) / len(timed)) if enough else None,
            "avgGhost": round(sum(j["g"] for j in js) / n, 1),
            "repostShare": r3(sum(1 for j in js if j["rp"] >= 1) / n),
            "sponsor": r3(sum(1 for j in js if j["sp"] == "yes") / n),
            "locs": [l for l, _ in loc_c.most_common(5)],
            "ats": ats_c.most_common(1)[0][0],
            "board": None,
            "site": next((j["_site"] for j in js if j["_site"]), ""),
        }
        if ck in board_for_c:
            e = board_for_c[ck][1]
            rec["board"] = e["board"]
            rec["boardAts"] = e["ats"]
        companies[str(cidx[ck])] = rec

    # ---- Output jobs (strip private fields).
    out_jobs = []
    for j in jobs_tmp:
        out_jobs.append({k: j[k] for k in ("id", "c", "t", "l", "nl", "r", "cat", "lvl", "term", "sp",
                                           "deg", "p", "u", "url", "ats", "g", "gr", "rp")})

    stats = {
        "active": len(out_jobs),
        "companies": len(companies_list),
        "intern": sum(1 for j in out_jobs if j["lvl"] == "intern"),
        "newgrad": sum(1 for j in out_jobs if j["lvl"] == "newgrad"),
        "postedLast7d": sum(1 for j in out_jobs if j["p"] >= now_ts - 7 * DAY),
        "likelyGhost": sum(1 for j in out_jobs if j["g"] >= 50),
    }
    diag = {
        "raw": n_raw, "hidden": hidden, "postings": len(postings), "cross_file": cross_file,
        "dup_active": dup_active, "merged_names": merged_names, "boards": boards,
        "shared_tokens": shared_tokens, "warnings": warnings,
        "closed_total": sum(closed_all.values()),
        "closed_timed": sum(len(v) for v in closed_open_days.values()),
        "companies_with_tempo": len(med_open), "dataset_start": dataset_start,
        "ats_counts": Counter(j["ats"] for j in out_jobs),
    }
    return companies_list, out_jobs, companies, stats, diag


def rs_of(p):
    return p["recs"]


def write_min_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)
    return os.path.getsize(path)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="skip download; use data/raw/*.json")
    args = ap.parse_args(argv)

    os.makedirs(RAW_DIR, exist_ok=True)
    if not args.offline:
        for lvl, fname, url in SOURCES:
            dest = os.path.join(RAW_DIR, fname)
            try:
                n = download(url, dest)
                print(f"downloaded {fname}: {n} listings")
            except (urllib.error.URLError, OSError, ValueError) as e:
                if os.path.exists(dest):
                    print(f"WARNING: download failed for {fname} ({e}); using existing copy "
                          f"from {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime(os.path.getmtime(dest)))}",
                          file=sys.stderr)
                else:
                    print(f"ERROR: download failed for {fname} and no local copy: {e}", file=sys.stderr)
                    return 1

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    now_ts = now.timestamp()
    gen = now.isoformat().replace("+00:00", "Z")
    companies_list, jobs, companies, stats, diag = build(now_ts)

    jobs_doc = {"v": 1, "generatedAt": gen, "source": SOURCE_META, "stats": stats,
                "companies": companies_list, "jobs": jobs}
    comp_doc = {"v": 1, "generatedAt": gen, "companies": companies}
    js = write_min_json(os.path.join(DIST_DATA, "jobs.json"), jobs_doc)
    cs = write_min_json(os.path.join(DIST_DATA, "companies.json"), comp_doc)
    os.makedirs(os.path.dirname(BOARDS_PATH), exist_ok=True)
    with open(BOARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(diag["boards"], f, ensure_ascii=False, indent=1)

    # ---- Summary
    g = [j["g"] for j in jobs]
    buckets = {"0": sum(1 for x in g if x == 0), "1-24": sum(1 for x in g if 1 <= x <= 24),
               "25-49": sum(1 for x in g if 25 <= x <= 49), "50+": sum(1 for x in g if x >= 50)}
    b_by_ats = Counter(e["ats"] for e in diag["boards"])
    b_open = sum(1 for e in diag["boards"] if e["openInDataset"] > 0)
    print(f"generatedAt {gen}")
    print(f"raw records {diag['raw']} (hidden {diag['hidden']}), distinct postings {diag['postings']} "
          f"(listed in both files: {diag['cross_file']})")
    print(f"active jobs {stats['active']} (dropped {diag['dup_active']} duplicate URLs) | companies {stats['companies']} "
          f"| intern {stats['intern']} | newgrad {stats['newgrad']} | posted last 7d {stats['postedLast7d']} "
          f"| likely ghost (g>=50) {stats['likelyGhost']}")
    print(f"ghost buckets {buckets}")
    print(f"closed postings {diag['closed_total']}, with measurable open time (>=1 day) {diag['closed_timed']}; "
          f"companies with tempo baseline {diag['companies_with_tempo']}")
    print(f"ats of open jobs {dict(diag['ats_counts'].most_common())}")
    print(f"ats boards {len(diag['boards'])} ({dict(b_by_ats)}), {b_open} with open jobs in dataset")
    if diag["shared_tokens"]:
        print(f"board tokens shared by >1 company name: {len(diag['shared_tokens'])}")
    print(f"company name variants merged: {diag['merged_names']}")
    print(f"wrote dist/data/jobs.json {js/1e6:.2f} MB, dist/data/companies.json {cs/1e6:.2f} MB, "
          f"data/ats_boards.json")
    for w in diag["warnings"][:20]:
        print("WARNING:", w)
    if js > 3.2e6:
        print("WARNING: jobs.json exceeds ~3 MB budget", file=sys.stderr)
    if cs > 1.0e6:
        print("WARNING: companies.json exceeds ~1 MB budget", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
