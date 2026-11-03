#!/usr/bin/env python3
"""Concatenate src/ into dist/index.html (single page; data files ship beside it)."""
import pathlib, sys, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
src = root / "src"
css = (src / "styles.css").read_text() + "\n" + "\n".join(p.read_text() for p in sorted((src / "css").glob("*.css")))
js_files = sorted((src / "js").glob("*.js"))
core = [p for p in js_files if not p.name.startswith("99")]
boot = [p for p in js_files if p.name.startswith("99")]
views = sorted((src / "js" / "views").glob("*.js"))
js = "\n".join(f"/* --- {p.relative_to(src)} --- */\n" + p.read_text() for p in core + views + boot)
page = (src / "index.template.html").read_text().replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
out = root / "dist" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page)
# syntax check the combined script
tmp = root / "dist" / ".check.js"
tmp.write_text(js)
r = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
tmp.unlink()
if r.returncode:
    print(r.stderr); sys.exit(1)
print(f"built {out} ({out.stat().st_size//1024} KB)")
