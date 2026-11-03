/* ===== Read a resume file locally (PDF, TXT, MD). Nothing leaves the browser. =====
   pdf.js loads only when someone picks a PDF. Its worker script is loaded as a plain script
   (allowed by the page's CSP), so pdf.js runs it on the main thread. */
const PDFJS_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/";
let pdf_loading = null;
function pdf_loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
}
function pdf_lib() {
  if (window.pdfjsLib && window.pdfjsWorker) return Promise.resolve(window.pdfjsLib);
  if (!pdf_loading) pdf_loading = pdf_loadScript(PDFJS_BASE + "pdf.min.js")
    .then(() => pdf_loadScript(PDFJS_BASE + "pdf.worker.min.js"))
    .then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js"; return window.pdfjsLib; })
    .catch((e) => { pdf_loading = null; throw e; });
  return pdf_loading;
}
async function pdf_text(file) {
  const lib = await pdf_lib();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // Rebuild lines from text items using their vertical position.
    const lines = []; let lastY = null, cur = "";
    for (const it of tc.items) {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) { if (cur.trim()) lines.push(cur.trim()); cur = ""; }
      cur += (cur && !cur.endsWith(" ") && !it.str.startsWith(" ") ? " " : "") + it.str;
      lastY = y;
    }
    if (cur.trim()) lines.push(cur.trim());
    pages.push(lines.join("\n"));
  }
  try { doc.destroy(); } catch {}
  return pages.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
/* Returns {text} or throws {message} with plain copy. */
async function readResumeFile(file) {
  if (!file) throw { message: "No file selected." };
  if (file.size > 10 * 1024 * 1024) throw { message: "That file is over 10 MB. Try a smaller PDF or paste the text." };
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    let text;
    try { text = await pdf_text(file); }
    catch (e) { throw { message: "Couldn't read that PDF here. Paste the text instead." }; }
    if (text.length < 40) throw { message: "That PDF looks like a scanned image with no text. Paste the text instead." };
    return { text };
  }
  if (/\.(txt|md|markdown|text)$/.test(name) || /^text\//.test(file.type)) return { text: (await file.text()).trim() };
  throw { message: "Use a PDF, .txt or .md file, or paste the text. Word files: save as PDF first." };
}
