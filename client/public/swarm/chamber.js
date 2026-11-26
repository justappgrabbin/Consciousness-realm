// chamber.js — a REAL sealed chamber in the browser (replaces the same-page "sandbox" in Sovereign Code Memory Space).
// Layers: (1) a sandboxed iframe (allow-scripts only: opaque origin — no cookies, storage, parent page, top navigation),
// (2) its own Content-Security-Policy: no network of any kind (connect-src 'none'), (3) inside it a Web Worker per run,
// so the code never runs on a page thread; (4) the iframe TERMINATES the worker when the time runs out, so a loop that
// never ends is cut off instead of freezing anything. The parent page only ever receives a copied result.
const INNER = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'">
<script>
const WORKER = \`self.onmessage = e => { const { source, args } = e.data; let out;
  try { const r = (new Function("args", '"use strict";\\\\n' + source))(args); out = { ok: true, result: JSON.parse(JSON.stringify(r ?? null)) }; }
  catch (err) { out = { ok: false, error: String(err && err.message || err) }; } self.postMessage(out); };\`;
const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
onmessage = e => { const { id, source, args, timeout } = e.data, w = new Worker(url), t0 = performance.now();
  const done = r => { clearTimeout(timer); w.terminate(); parent.postMessage({ id, ...r, elapsed: Math.round(performance.now() - t0) }, "*"); };
  const timer = setTimeout(() => done({ ok: false, error: "stopped: ran longer than " + timeout + " ms", timedOut: true }), timeout);
  w.onmessage = m => done(m.data); w.onerror = er => { er.preventDefault(); done({ ok: false, error: String(er.message || "error") }); };
  w.postMessage({ source, args }); };
parent.postMessage({ ready: true }, "*");
<\/script>`;

export class Chamber {
  constructor() {
    this.frame = document.createElement("iframe"); this.frame.setAttribute("sandbox", "allow-scripts"); this.frame.style.display = "none";
    this.frame.srcdoc = INNER; this.pending = new Map(); this.seq = 0;
    this.ready = new Promise(res => { this._ready = res; });
    addEventListener("message", e => { if (e.source !== this.frame.contentWindow) return; const d = e.data;
      if (d?.ready) return this._ready(); const p = this.pending.get(d?.id); if (p) { this.pending.delete(d.id); p(d); } });
    document.body.appendChild(this.frame);
  }
  /** Run source (a function body that may `return`) with args, at most `timeout` ms. Resolves {ok,result|error,elapsed,timedOut}. */
  async run(source, args = {}, { timeout = 1200 } = {}) { await this.ready; const id = ++this.seq;
    return new Promise(res => { this.pending.set(id, res); this.frame.contentWindow.postMessage({ id, source: String(source), args, timeout }, "*"); }); }
}
