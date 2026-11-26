// bookshelf.js — books read ON THE PHONE (nothing uploaded). Pick PDFs (Android's picker includes Google Drive),
// say which field each belongs to; the text is split by gate and kept in the phone's own storage (IndexedDB).
// Fairness: every field starts with the SAME reading budget, spread evenly over the 64 gates — a long book can't
// out-know the others; the rest of each book stays on the shelf for later. Space has no book: it reads all four.
// PDF text via pdf.js (Mozilla, Apache-2.0, vendored in vendor/pdfjs). Scanned pages with no text layer are
// reported honestly (they need OCR, which isn't on the phone yet).
export const FIELDS = ["Movement", "Evolution", "Being", "Design"];

/** Split a book's text into the 64 gates by its own headings ("Hexagram 18", "Gate 18", "Key 18", "18." at a line start). */
export function splitByGate(text) {
  const T = String(text), hits = [];
  for (let n = 1; n <= 64; n++) {
    const re = new RegExp(`(?:^|\\n)\\s*(?:hexagram|gate|key|chapter)?\\s*0?${n}\\s*(?:[.:)\\-–—]|\\n|\\s+[A-Z])`, "gi");
    let m, best = null; while ((m = re.exec(T))) { const after = T.slice(m.index, m.index + 40); if (/hexagram|gate|key/i.test(after) || /^\s*\n?\s*0?\d+\s*[.:)\-–—]?\s+[A-Z][a-z]/.test(after)) { best = m.index; break; } best ??= m.index; }
    if (best !== null) hits.push({ gate: n, at: best });
  }
  /* keep only headings that come in increasing order (a book's own sequence), longest such run */
  hits.sort((a, b) => a.at - b.at); const keep = []; let last = 0;
  for (const h of hits) if (h.gate > last) { keep.push(h); last = h.gate; }
  const sections = {}; keep.forEach((h, i) => { sections[h.gate] = T.slice(h.at, keep[i + 1]?.at ?? T.length).trim(); });
  return { sections, found: keep.length, general: keep.length ? T.slice(0, keep[0].at).trim() : T };
}
/** The same budget for every field: the first `words` words of each gate's section. */
export function budgeted(sections, words = 300) {
  const out = {}; for (const [g, t] of Object.entries(sections)) out[g] = t.split(/\s+/).slice(0, words).join(" "); return out;
}

// ---- scan reader: pages with no text layer are drawn and read by Tesseract (Apache-2.0, vendored, works offline) ----
let OCR = null;
async function ocrWorker() { if (OCR) return OCR; const T = await import("./vendor/tesseract/tesseract.esm.min.js"), createWorker = T.createWorker ?? T.default?.createWorker, dir = new URL("./vendor/tesseract/", import.meta.url).href;
  OCR = await createWorker("eng", 1, { workerPath: dir + "worker.min.js", corePath: dir, langPath: dir, gzip: true, workerBlobURL: false }); return OCR; }
export async function stopReadingScans() { if (OCR) { await OCR.terminate(); OCR = null; } }
async function readScan(page, scale = 2) { const v = page.getViewport({ scale }), c = document.createElement("canvas"); c.width = v.width; c.height = v.height;
  await page.render({ canvasContext: c.getContext("2d"), viewport: v }).promise; const { data } = await (await ocrWorker()).recognize(c); return { text: data.text, confidence: data.confidence }; }

export async function pdfText(file, onPage, { scans = true } = {}) {
  const pdfjs = await import("./vendor/pdfjs/pdf.min.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise, pages = [], conf = []; let empty = 0, scanned = 0;
  for (let i = 1; i <= doc.numPages; i++) { const c = await (await doc.getPage(i)).getTextContent();
    let s = "", y = null; for (const it of c.items) { const ny = it.transform?.[5]; if (y !== null && ny !== undefined && Math.abs(ny - y) > 2) s += "\n"; s += it.str + (it.hasEOL ? "\n" : ""); y = ny; }
    if (!s.trim()) { if (scans) { try { const r = await readScan(await doc.getPage(i)); s = r.text; scanned++; conf.push(r.confidence); } catch { empty++; } } else empty++; }
    pages.push(s); onPage?.(i, doc.numPages, scanned); }
  return { text: pages.join("\n"), pages: doc.numPages, emptyPages: empty, scannedPages: scanned, scanConfidence: conf.length ? Math.round(conf.reduce((a, b) => a + b, 0) / conf.length) : null };
}

// ---- the shelf: the phone's own storage ----
const db = () => new Promise((ok, no) => { const r = indexedDB.open("synthia-shelf", 1); r.onupgradeneeded = () => r.result.createObjectStore("books", { keyPath: "name" }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
export async function shelve(book) { const d = await db(); return new Promise((ok, no) => { const t = d.transaction("books", "readwrite"); t.objectStore("books").put(book); t.oncomplete = () => ok(book); t.onerror = () => no(t.error); }); }
export async function shelf() { const d = await db(); return new Promise((ok, no) => { const r = d.transaction("books").objectStore("books").getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); }

/** Read one book into its field: each gate's budgeted text goes to that field's units of that gate (or the field's units if none hold it). */
export function teach(S, readFile, book, { words = 300 } = {}) {
  const B = budgeted(book.sections, words); let lines = 0, gates = 0;
  for (const [g, text] of Object.entries(B)) {
    const mine = S.units.filter(u => u.address?.dimension === book.field && u.address?.gate === +g), field = S.units.filter(u => u.address?.dimension === book.field);
    const who = mine.length ? mine : field; if (!who.length) continue;
    const r = readFile({ units: who }, { path: `${book.name}#${g}`, text }); lines += r.lines; gates++;
    for (const u of who) { u.knows ??= {}; (u.knows[book.field] ??= new Set()).add(+g); }
  }
  return { gates, lines, words };
}
