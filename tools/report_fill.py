#!/usr/bin/env python3
"""Fill report/index.html placeholders -> report/out/index.html, copy source + shots. Values via report/values.json."""
import json, pathlib, shutil, html
root = pathlib.Path(__file__).resolve().parent.parent
rep = root / "report"; out = rep / "out"; out.mkdir(exist_ok=True)
v = json.loads((rep / "values.json").read_text())
jobs = json.loads((root / "dist/data/jobs.json").read_text())
st = jobs["stats"]
uniq = len({(j["c"], j["t"].lower(), ";".join(j["l"][:3])) for j in jobs["jobs"]})
tl = "\n".join(f'      <li><time>{html.escape(t)}</time><div><b>{html.escape(h)}</b><p>{html.escape(p)}</p></div></li>' for t, h, p in v["timeline"])
known = "\n".join(f"      <li>{html.escape(k)}</li>" for k in v.get("known", []))
page = (rep / "index.html").read_text()
for k, val in {
    "__JOBS__": f'{uniq:,}', "__POSTINGS__": f'{st["active"]:,}', "__COMPANIES__": f'{st["companies"]:,}', "__GHOSTSTRONG__": f'{st["likelyGhost"]:,}',
    "__VERSIONS__": str(v["versions"]), "__SCORE__": v["score"], "__TIMELINE__": tl, "__QA__": html.escape(v["qa"]),
    "__KNOWN__": known, "__POST_MAIN__": html.escape(v["post_main"]), "__POST_SHORT__": html.escape(v["post_short"]), "__CHECKS__": v["checks"],
}.items():
    page = page.replace(k, val)
assert "__" not in page.replace("__fonts", ""), [l for l in page.splitlines() if "__" in l][:3]
(out / "index.html").write_text(page)
src = out / "source"; src.mkdir(exist_ok=True)
for name, p in {"heardback-app.txt": "dist/index.html", "refresh_jobs.py.txt": "tools/refresh_jobs.py", "fetch_ats.py.txt": "tools/fetch_ats.py", "CHANGELOG.md.txt": "CHANGELOG.md", "NOTES.md.txt": "NOTES.md"}.items():
    shutil.copy(root / p, src / name)
print("ok", out)
