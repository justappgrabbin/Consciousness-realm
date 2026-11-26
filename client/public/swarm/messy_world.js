// messy_world.js — MESSY as the world the swarm lives in (layer 1: pure JS, no neural).
// Uses the user's MESSY kernel (vendor/messy-kernel/kernel.js, "Synthia/MESSY experimental kernel v0.1", from
// Appelbaum's 1976 manual: semantic triples, scheduled rule groups, seeded probabilistic firing, look-ahead on a copy).
// Every swarm tick the units are written into the kernel as facts, then the kernel's own clock ticks:
//   uN address "<planetary.dimension.gate.line.color.tone.base…>"   (opaque, the user's order, kernel never interprets it)
//   uN gate G · uN line L · uN dimension D · uN kind K · uN face F · uN alive true|false
//   uA bonded uB   (visible bonds only; removed bonds are NEGated, so the history keeps them)
// Klein tools (or anyone) add rule groups to `world.k`; they fire against the live network. Look-ahead never touches it.
// DISEMINER (vendor/klein-js, the user's DISEMINERFixed: 27/27 questions, 9/9 riddles vs the 1968 paper) reads the
// world: every live triple s-p-o becomes a dependency link s→o, so "what can relate to what" is learned from the world.
import "./vendor/messy-kernel/kernel.js";
import { DISEMINERFixed } from "./vendor/klein-js/diseminer-engine.fixed.js";
const { Kernel } = globalThis.SynthiaMessyKernel;
const ADDR = ["planetary", "dimension", "gate", "line", "color", "tone", "base", "degree", "minute", "second", "arc", "zodiac", "house"];
const id = u => "u" + u.id;

export class MessyWorld {
  constructor(seed = 23) { this.k = new Kernel(seed); this.bonds = new Set(); this.D = new DISEMINERFixed(); this.fed = 0; }
  addressOf(u) { return ADDR.map(k => u.address?.[k] ?? "").join("."); }
  /** write the swarm into the world as facts */
  sync(S) {
    const k = this.k, now = new Set();
    for (const u of S.units) {
      const n = id(u); k.node(n, { kind: u.kind }); const a = this.addressOf(u); if (k.nodes[n].meta.address !== a) k.setAddress(n, a);
      for (const [p, v] of [["gate", u.address?.gate], ["line", u.address?.line], ["dimension", u.address?.dimension], ["kind", u.kind], ["face", u.face?.name], ["alive", !u.broken]])
        if (v !== undefined && v !== null && !Object.is(k.query({ s: n, p })[0]?.o, v)) k.set(n, p, v);   // only real changes go into history
      if (!u.broken) for (const e of u.bonds ?? []) if (e.visible) { const o = S.units[e.a === u.id ? e.b : e.a]; if (o && !o.broken) now.add(n < id(o) ? n + "|" + id(o) : id(o) + "|" + n); }
    }
    for (const b of now) if (!this.bonds.has(b)) { const [a, c] = b.split("|"); k.assert(a, "bonded", c); }
    for (const b of this.bonds) if (!now.has(b)) { const [a, c] = b.split("|"); k.neg(a, "bonded", c); }
    this.bonds = now; return this;
  }
  /** one world step: sync, then MESSY's own clock (its rule groups fire on the live network) */
  tick(S) { this.sync(S); return this.k.tick(); }
  query(pattern) { return this.k.query(pattern); }
  ask(patterns, where) { return this.k.solutions(patterns, where); }
  /** what would happen in n steps, on a copy — the real world is not touched */
  lookAhead(n = 3) { return this.k.lookAhead(n); }
  /** DISEMINER reads the world: live triples (object is a name) → dependency links */
  readWorld() {
    const links = this.k.active().filter(t => typeof t.o === "string" || typeof t.o === "number")
      .map(t => ({ from: String(t.s), to: String(t.o), relation: t.p, isTransitive: t.p === "bonded", frequency: 1 }));
    if (!links.length) return 0;
    this.D.processText("world@" + this.k.clock, { dependencyLinks: links, tokens: [], posTags: [] }); this.fed += links.length; return links.length;
  }
  /** what DISEMINER has learned can follow from x (its merged matrix, weight > 0) */
  related(x) { return [...(this.D.mergedMatrix?.get(String(x)) ?? new Map()).entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]); }
  export() { return this.k.toJSON(); }
}
