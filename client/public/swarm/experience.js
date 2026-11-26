// experience.js — the swarm remembers what it has been. Every formation is recorded so it can later
// recombine pieces it has actually been to build new things (no training; experience).
// A record keeps, per square: which dimension's unit sat there, its gate, line, and the colour it showed;
// plus the picture's name and size, the leading dimension, bond counts, and the ASCII form.
// Stored in the phone's IndexedDB (falls back to memory if that isn't available) and exportable as a file.
const DIMS = ["Movement", "Evolution", "Being", "Design", "Space"];
const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

/** Pack one formation into a compact record. units: swarm units with .target {x,y}; colorAt(u) -> [r,g,b]. */
export function packFormation({ name, w, h, leader, units, colorAt, ascii = "", bonds = 0, visible = 0 }) {
  const dim = new Uint8Array(w * h).fill(255), gate = new Uint8Array(w * h), line = new Uint8Array(w * h), rgb = new Uint8Array(w * h * 3);
  for (const u of units) { if (!u.target) continue;
    const i = Math.min(h - 1, Math.floor(u.target.y * h)) * w + Math.min(w - 1, Math.floor(u.target.x * w));
    dim[i] = Math.max(0, DIMS.indexOf(u.address.dimension)); gate[i] = u.address.gate ?? 0; line[i] = u.address.line ?? 0;
    const c = colorAt(u); rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; }
  return { v: 1, t: Date.now(), name, w, h, leader, bonds, visible, ascii,
    dim: b64(dim), gate: b64(gate), line: b64(line), rgb: b64(rgb) };
}
export function unpackFormation(r) {
  return { ...r, dim: unb64(r.dim), gate: unb64(r.gate), line: unb64(r.line), rgb: unb64(r.rgb) };
}

/** One piece of what it has been: a k×k patch around (x, y) of a formation — what a new build can reuse. */
export function piece(f, x, y, k = 3) {
  const out = [];
  for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const xx = x + dx, yy = y + dy; if (xx >= f.w || yy >= f.h) continue;
    const i = yy * f.w + xx; out.push({ dx, dy, dim: DIMS[f.dim[i]] ?? null, gate: f.gate[i], line: f.line[i], rgb: [f.rgb[i * 3], f.rgb[i * 3 + 1], f.rgb[i * 3 + 2]] }); }
  return out;
}

/** Storage: IndexedDB on the phone, memory otherwise. */
export class Experience {
  constructor() { this.mem = []; this.db = null; }
  async open() {
    try { if (typeof indexedDB === "undefined") return this;
      this.db = await new Promise((ok, no) => { const r = indexedDB.open("synthia-experience", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("formations", { keyPath: "t" }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    } catch { this.db = null; }
    return this;
  }
  async add(rec) {
    if (!this.db) { this.mem.push(rec); return rec; }
    try { await new Promise((ok, no) => { const tx = this.db.transaction("formations", "readwrite"); tx.objectStore("formations").put(rec); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }); }
    catch { this.mem.push(rec); }
    return rec;
  }
  async all() {
    if (!this.db) return [...this.mem];
    try { return await new Promise((ok, no) => { const r = this.db.transaction("formations").objectStore("formations").getAll(); r.onsuccess = () => ok([...r.result, ...this.mem]); r.onerror = () => no(r.error); }); }
    catch { return [...this.mem]; }
  }
  async exportJSON() { return JSON.stringify({ synthiaExperience: 1, formations: await this.all() }); }
  async importJSON(text) { const j = JSON.parse(text); let n = 0; for (const r of j.formations ?? []) { await this.add(r); n++; } return n; }
}
