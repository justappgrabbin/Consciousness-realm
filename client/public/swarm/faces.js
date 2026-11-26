// faces.js — the harvested functions (faces_functions.json, 492 self-contained functions pulled out of the user's
// uploads by harvest_functions.cjs) put into the living swarm as faces. No interface: a unit simply wears a face.
// Placement is NOT decided ahead of time — it is earned by use, per gate:
//   a unit tries a face on its own material (address numbers, position, its words); the face runs ONLY in the
//   sealed chamber (chamber.js: sandboxed iframe + no-network CSP + Worker + time limit); a usable answer
//   (no error, not empty, not NaN, finished in time) counts as a success for that unit's gate.
//   Once a face has worked on a gate often enough, units of that gate reach for it first.
// This is the provisional rule until each gate's own test is wired (the Blue I Ching line texts in vocabulary.json,
// exalted = what success looks like, detriment = what failure looks like) — later, by 58/18.
export const EARN_TRIES = 3, EARN_RATE = 0.5;

function material(u) {
  const a = u.address ?? {}, nums = [a.gate, a.line, a.color, a.tone, a.base].filter(n => typeof n === "number");
  const words = u.four?.area ?? u.vocab ?? [];
  return { nums: nums.length ? nums : [1], vec: [u.x ?? 0, u.y ?? 0, ...(nums.map(n => n / 64))], words, text: words.join(" ") };
}
// map each parameter by its name to the part of the unit's material it most likely wants
export function argsFor(u, face) {
  const m = material(u); let ni = 0; const args = {};
  for (const p of face.params ?? []) {
    const n = String(p).toLowerCase();
    if (/^(s|str|text|word|name|label|key|id|line|sentence|token|prefix)s?$|text|word|str|name/.test(n)) args[p] = /s$|list|arr/.test(n) ? m.words : m.text;
    else if (/^(arr|list|xs|ys|values|vals|nums|numbers|items|vec|vector|v|a|b|p|q|u|w|points|data|series|array|set)\d*$|arr|list|vec|values|points|series/.test(n)) args[p] = m.vec;
    else if (/obj|opts|options|config|state|ctx|node|graph|map|record/.test(n)) args[p] = { x: u.x, y: u.y, ...u.address, words: m.words };
    else args[p] = m.nums[ni++ % m.nums.length];
  }
  return args;
}
// the chamber runs a function body with `args`; a face is a whole function, so call it with its params in order
export const bodyOf = face => `${face.code}\nreturn (${face.name})(${(face.params ?? []).map(p => "args[" + JSON.stringify(p) + "]").join(", ")});`;
// what a value IS, coarse enough to match needs by: number, text, list of numbers, list of text, list, record, yes/no
export const kindOf = v => v === null || v === undefined ? "none" : typeof v === "number" ? "number" : typeof v === "string" ? "text" : typeof v === "boolean" ? "yesno"
  : Array.isArray(v) ? (v.length && v.every(x => typeof x === "number") ? "numbers" : v.length && v.every(x => typeof x === "string") ? "texts" : "list") : "record";
const usable = r => r?.ok && r.result !== null && r.result !== undefined && !(typeof r.result === "number" && !Number.isFinite(r.result))
  && !(Array.isArray(r.result) && !r.result.length) && !(typeof r.result === "string" && !r.result.length);

export class Faces {
  constructor(list, chamber, saved = null) {
    this.list = list.filter(f => f.code && f.name); this.chamber = chamber; this.byId = new Map(this.list.map(f => [f.id, f]));
    this.record = saved?.record ?? {};   // gate -> faceId -> { tries, ok }
    this.does = saved?.does ?? {};          // faceId -> "number,numbers->number" -> {n, examples}: what each function has been SEEN to do
    this.tries = 0; this.last = null; this.busy = false;
  }
  stat(gate, id) { return this.record[gate]?.[id] ?? { tries: 0, ok: 0 }; }
  /** faces that have earned their place on this gate, best first */
  earned(gate) {
    return Object.entries(this.record[gate] ?? {}).filter(([, s]) => s.tries >= EARN_TRIES && s.ok / s.tries >= EARN_RATE)
      .sort((a, b) => b[1].ok / b[1].tries - a[1].ok / a[1].tries || b[1].ok - a[1].ok).map(([id, s]) => ({ face: this.byId.get(id), ...s })).filter(x => x.face);
  }
  pick(u, rnd = Math.random) {
    const e = this.earned(u.address?.gate);
    if (e.length && rnd() < 0.7) return e[Math.floor(rnd() * e.length)].face;
    // a face that worked here once but isn't confirmed yet gets tried again (confirm), so earning doesn't wait for all 492 to be tried
    const rec = this.record[u.address?.gate] ?? {}, promising = Object.entries(rec).filter(([, s]) => s.ok > 0 && s.tries < EARN_TRIES).map(([id]) => this.byId.get(id)).filter(Boolean);
    if (promising.length && rnd() < 0.6) return promising[Math.floor(rnd() * promising.length)];
    // otherwise explore: faces this gate hasn't tried yet come first
    const fresh = this.list.filter(f => !this.record[u.address?.gate]?.[f.id]);
    const pool = fresh.length ? fresh : this.list; return pool[Math.floor(rnd() * pool.length)];
  }
  /** one unit tries one face in the chamber; the gate keeps the score; a usable answer becomes the unit's face */
  async tryOn(u, face = this.pick(u)) {
    const gate = u.address?.gate; if (!gate || !face) return null;
    const r = await this.chamber.run(bodyOf(face), argsFor(u, face), { timeout: 300 });
    const s = ((this.record[gate] ??= {})[face.id] ??= { tries: 0, ok: 0 }); s.tries++; const good = usable(r); if (good) s.ok++;
    if (good) { const args = argsFor(u, face), sig = (face.params ?? []).map(p => kindOf(args[p])).join(",") + "->" + kindOf(r.result);   // what it did, learned by watching
      const d = ((this.does[face.id] ??= {})[sig] ??= { n: 0, examples: [] }); d.n++; if (d.examples.length < 3) d.examples.push({ args, result: r.result }); }
    this.tries++; this.last = { unit: u.id, gate, face: face.name, good, result: good ? r.result : r?.error ?? "empty" };
    if (good) u.face = { id: face.id, name: face.name, from: face.from, result: r.result, earned: s.tries >= EARN_TRIES && s.ok / s.tries >= EARN_RATE };
    else if (u.face?.id === face.id) u.face = null;
    return this.last;
  }
  async tick(S, rnd = Math.random) {
    if (this.busy) return null; const U = S.units.filter(u => !u.broken && u.address?.gate); if (!U.length) return null;
    this.busy = true; try { return await this.tryOn(U[Math.floor(rnd() * U.length)]); } finally { this.busy = false; }
  }
  /** gate -> earned faces (the placement the swarm has found so far) */
  placement() { const out = {}; for (const g of Object.keys(this.record)) { const e = this.earned(+g); if (e.length) out[g] = e.map(x => ({ name: x.face.name, ok: x.ok, tries: x.tries })); } return out; }
  /** "I need something that turns <in kinds> into <out kind>" → the functions SEEN doing exactly that, most reliable first */
  provide(inKinds, outKind) {
    const want = [].concat(inKinds).join(",") + "->" + outKind, out = [];
    for (const [id, sigs] of Object.entries(this.does)) if (sigs[want]) { const f = this.byId.get(id); if (f) out.push({ face: f, seen: sigs[want].n, examples: sigs[want].examples }); }
    return out.sort((a, b) => b.seen - a.seen);
  }
  /** everything the swarm has seen its functions do, grouped by shape */
  repertoire() { const m = {}; for (const [id, sigs] of Object.entries(this.does)) for (const s of Object.keys(sigs)) (m[s] ??= []).push(this.byId.get(id)?.name); return m; }
  export() { return { record: this.record, does: this.does }; }
}
export async function loadFaces(url = new URL("./faces_functions.json", import.meta.url)) {
  const j = typeof window === "undefined" ? JSON.parse((await import("node:fs")).readFileSync(url, "utf8")) : await (await fetch(url)).json();
  return j.functions ?? j;
}
