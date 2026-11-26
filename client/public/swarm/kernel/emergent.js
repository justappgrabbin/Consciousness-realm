// emergent.js — emergent neural nets in the dual swarm, with harmony, dissonance and consequences.
//
// Sources this follows (all user docs, Nov 24 2026):
//  - Locked spec (Drive 1m4jCA...): channels EMERGE by Hamming distance 1 (36-channel table = prior only);
//    Klein Tool SPEC-2: K(context) -> {relation, intensity, direction}, joint not summed, fixed once
//    evaluated for a context; Shadow = emergent field that surfaces from wrong choices; provenance on edges.
//  - Observable Semantic Swarm spec (Drive 1tW7kA...): one identity in five configurations; Being is the
//    threshold for realized properties; leadership observed per event, may stay unresolved; A->B and B->A
//    keep separate histories; declared parameters; aggregation/dissolution keep constituents.
//  - Neural Net Morphing Limits (Drive 1pTzHt...): base network kind per circuit; changing line = metastable
//    regime (gain 2+3t, noise 0.1t, cross-circuit bleed 0.3t); same-circuit crossing stacks, cross-circuit hybridises.
//  - Klein 1965 (kernel/contact1965.js): use strengthens W-(W-f)/5, disuse -0.02, erase below 0.01.
//
// Dual swarm: SWARM A = the four contributing dimensions computing (Movement, Evolution, Being, Design).
// SWARM B = Space, the resulting condition, expressed as matter (formations with realized properties).
// Weight changes here are declared graph adaptation, NOT claimed neural learning.

import { xnor, fold, str, hamming } from "./klein4.js";
import { k4Relation } from "./klein4.js";
import { evaluateSwarmBond } from "./bond.js";
import { ACTIVATIONS } from "./swarmnet.js";
import { trigramName } from "./loshu.js";
import { makeParticle } from "./particle.js";
import { kingWenFromMask, maskFromKingWen } from "../kingwen.js";
import { FUNCTIONS as K65 } from "./contact1965.js";

// ---- declared experimental parameters (every number the engine uses that is not from a source) -------
export const PARAMS = {
  tensionRate: 0.25,      // dissonance -> tension per event
  reliefRate: 0.10,       // resonance -> tension relief per event
  flipThreshold: 1.0,     // tension at which a stable line becomes a changing line
  perturbWeaken: 0.05,    // extra weakening of a dissonant edge per event
  leadMargin: 0.15,       // leader must exceed runner-up by this fraction, else "unresolved"
  reservoirSteps: 8,
  reach: 40,              // degrees of arc: a net-forming bond must be local (matter interacts with neighbours)
};
export const SOURCED = { metastable: "Morphing PDF: gain 2+3t, noise 0.1t, bleed 0.3t", decay: "Klein 1965 Table 2" };

// ---- network kinds per sub-circuit (prior from the PDF; selection, not lookup) -----------------------
export const KIND_OF_SUB = { Logical: "feedforward", Abstract: "markov", Knowing: "pulsed-reservoir",
  Centring: "residual", Willpower: "hmm", Integration: "echo-state" };    // Defence: not assigned in the PDF
const CONTRIBUTING = ["Movement", "Evolution", "Being", "Design"];

const maskOf = (form) => form.reduce((m, b, i) => m | (b << i), 0);
const formOf = (mask) => Array.from({ length: 6 }, (_, i) => (mask >> i) & 1);

export class Field {
  constructor(particles, channelPrior = {}) {
    this.p = new Map(particles.map(x => [x.id, { ...x, tension: 0, regime: "stable", history: [] }]));
    this.prior = channelPrior;            // { "63-4": {sub:...}, ... } reference only
    this.edges = new Map();               // "a>b" -> directed edge record (separate history each way)
    this.kleinLedger = new Map();         // collapsed Klein-tool evaluations
    this.shadow = [];                     // derived view: wrong pairings and their consequences
    this.formations = new Map(); this.archive = []; this.events = []; this.t = 0; this.nextF = 1;
    this.emerge();
  }

  // ---- channels emerge: Hamming distance <= 1 between gate hexagrams; strength = BHANTUGH harmony count
  emerge() {
    const ids = [...this.p.keys()];
    for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const A = this.p.get(ids[i]), B = this.p.get(ids[j]), key = `${A.id}>${B.id}`;
      const h = hamming(A.form, B.form);
      // different gates: channel only at exactly one line apart. same gate: only the 3-2-1 line pairs 1-4, 2-5, 3-6
      // a hexagram instance (distribute.js) is one body: all its particles tie to each other
      const intra = A.hex !== undefined && A.hex === B.hex;
      const tie = intra || h === 1 || (h === 0 && A.hex === undefined && Math.abs(A.line - B.line) === 3);
      if (!tie) { if (this.edges.has(key)) this.edges.get(key).alive = false; continue; }
      const bond = evaluateSwarmBond(A, B);
      const e = this.edges.get(key);
      if (e && e.alive !== false) { e.bond = bond; e.intra = intra; continue; }
      this.edges.set(key, { from: A.id, to: B.id, w: 0.5, bond, alive: true, intra, history: [],
        provenance: { relation: intra ? `hexagram ${A.hex} bigram ${A.bigram}->${B.bigram}` : h === 0 ? `line-pair ${Math.min(A.line, B.line)}-${Math.max(A.line, B.line)}` : `line-change ${changedLine(A.form, B.form)}`,
          address: [A.address, B.address], dimension: [A.dress.dimension, B.dress.dimension],
          transformation: `${A.gate}->${B.gate}`, rule: intra ? "3-2-1 hexagram body (distribute.js)" : h === 0 ? "3-2-1 line pair within a gate" : "Hamming=1 between gates (locked spec §2)", born: this.t } });
    }
  }
  live(id) { return [...this.edges.values()].filter(e => e.alive && (e.from === id || e.to === id)); }
  /** Net membership needs a VISIBLE bond (BHANTUGH >=3). Low-harmony channels stay as structural ties:
   *  that is where dissonance lives (a channel exists, harmony does not). */
  joins(id) { return this.live(id).filter(e => e.intra || (e.bond.isVisible && this.near(e.from, e.to))); }
  near(a, b) { const d = Math.abs(this.p.get(a).longitude - this.p.get(b).longitude) % 360; return Math.min(d, 360 - d) <= PARAMS.reach; }

  // ---- Klein Tool (SPEC-2): context-dependent, joint, collapsed once evaluated ------------------------
  klein(id, contextIds) {
    const ctx = [...contextIds].filter(c => c !== id).sort((a, b) => a - b);
    const key = `${id}|${this.p.get(id).gate}|${ctx.map(c => this.p.get(c).gate).join(",")}`;
    if (this.kleinLedger.has(key)) return this.kleinLedger.get(key);
    const me = this.p.get(id).form;
    const out = !ctx.length ? { relation: "none", intensity: 0, direction: 0, witnessed: false }
      : (() => { const joint = xnor(me, fold(ctx.map(c => this.p.get(c).form)));   // joint evaluation, not a sum
          const ones = joint.reduce((a, b) => a + b, 0);
          return { relation: k4Relation(str(joint.slice(0, 2)), str(me.slice(0, 2))), intensity: ones / 6,
            direction: ones > 3 ? 1 : ones < 3 ? -1 : 0, joint: str(joint), witnessed: true }; })();
    this.kleinLedger.set(key, out);
    return out;
  }

  // ---- formations = connected components of live edges; identity kept across steps -------------------
  formFormations() {
    const seen = new Set(), comps = [];
    for (const id of this.p.keys()) {
      if (seen.has(id)) continue;
      const stack = [id], comp = []; seen.add(id);
      while (stack.length) { const c = stack.pop(); comp.push(c);
        for (const e of this.joins(c)) { const o = e.from === c ? e.to : e.from; if (!seen.has(o)) { seen.add(o); stack.push(o); } } }
      if (comp.length > 1) comps.push(comp);
    }
    const next = new Map();
    for (const comp of comps) {
      const set = new Set(comp);
      let match = null, best = 0;
      for (const [fid, f] of this.formations) {
        const inter = f.members.filter(m => set.has(m)).length, j = inter / (set.size + f.members.length - inter);
        if (j > 0.5 && j > best) { best = j; match = fid; }
      }
      const fid = match ?? this.nextF++;
      const prev = this.formations.get(fid);
      next.set(fid, { id: fid, members: comp, born: prev?.born ?? this.t,
        constituents: [...new Set([...(prev?.constituents ?? []), ...comp])], history: prev?.history ?? [] });
    }
    for (const [fid, f] of this.formations) if (!next.has(fid)) this.archive.push({ ...f, dissolved: this.t });
    this.formations = next;
    for (const f of next.values()) { f.kind = this.selectKind(f); f.space = this.space(f); f.matter = this.being(f); }
  }

  // ---- network kind: SELECTION against the channel prior (complete channel = 1 vote, half = 0.5) -------
  selectKind(f) {
    const gates = new Set(f.members.map(m => this.p.get(m).gate)), votes = {};
    for (const [k, c] of Object.entries(this.prior)) {
      const [a, b] = k.split("-").map(Number), sub = c.sub ?? (c.circuit ? null : "Integration");
      if (!sub) continue;
      const v = (gates.has(a) ? 0.5 : 0) + (gates.has(b) ? 0.5 : 0);
      if (v) votes[sub] = (votes[sub] ?? 0) + v;
    }
    const ranked = Object.entries(votes).sort((x, y) => y[1] - x[1]);
    const subs = ranked.filter(r => r[1] === ranked[0]?.[1]).map(r => r[0]);
    const kinds = [...new Set(subs.map(s => KIND_OF_SUB[s] ?? "unresolved"))];
    // crossing (PDF): one circuit -> that kind; several tied -> hybrid stack of them
    return { kind: kinds.length === 1 ? kinds[0] : kinds.length ? "hybrid:" + kinds.join("+") : "unresolved",
      votes, evidence: "channel prior (reference only), gates present in formation" };
  }

  // ---- SPACE: resulting condition of the four contributing fields (DECLARED EXPERIMENTAL RULE) --------
  space(f) {
    const per = {};
    for (const d of CONTRIBUTING) { const ms = f.members.filter(m => this.p.get(m).dress.dimension === d);
      if (ms.length) per[d] = str(fold(ms.map(m => this.p.get(m).form))); }
    const present = Object.values(per);
    return { rule: "experimental: XNOR fold of each contributing dimension's members, then across dimensions",
      contributing: per, state: present.length ? str(fold(present.map(s => [...s].map(Number)))) : null,
      complete: Object.keys(per).length === 4 };
  }

  // ---- SWARM B / BEING THRESHOLD: realized properties only when Being participates --------------------
  being(f) {
    const hasBeing = f.members.some(m => this.p.get(m).dress.dimension === "Being");
    if (!hasBeing) return { realized: false, potential: true };
    const pts = f.members.map(m => { const p = this.p.get(m), a = p.longitude * Math.PI / 180, r = p.line / 6;
      return [r * Math.cos(a), r * Math.sin(a)]; });
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const extent = Math.max(...pts.map(q => Math.hypot(q[0] - cx, q[1] - cy)));
    return { realized: true, centroid: [cx, cy], extent, size: pts.length, rule: "experimental rendering geometry" };
  }

  // ---- run one formation's net -----------------------------------------------------------------------
  runNet(f, input) {
    const ids = f.members, ix = new Map(ids.map((id, i) => [id, i]));
    const W = ids.map(() => ids.map(() => 0));
    for (const e of this.edges.values()) if (e.alive && (e.intra || (e.bond.isVisible && this.near(e.from, e.to))) && ix.has(e.from) && ix.has(e.to)) W[ix.get(e.to)][ix.get(e.from)] = e.w * (e.bond.connectionCount / 5);
    const meta = ids.map(id => { const p = this.p.get(id), t = Math.min(1, p.tension);
      return p.regime === "changing" ? { gain: 2 + 3 * t, noise: 0.1 * t } : { gain: 1, noise: 0 }; });
    const K = ids.map(id => this.klein(id, ids));
    const act = ids.map(id => ACTIVATIONS[trigramName(this.p.get(id).form.slice(0, 3).join(""))][1]);
    const x0 = ids.map((id, i) => input[i % input.length]);
    const step = (v) => v.map((_, i) => meta[i].gain * act[i](W[i].reduce((s, w, j) => s + w * v[j], 0) + x0[i]) * (K[i].direction || 1) + meta[i].noise);
    const kinds = f.kind.kind.startsWith("hybrid:") ? f.kind.kind.slice(7).split("+") : [f.kind.kind];
    let v = x0.slice();
    for (const k of kinds) {
      if (k === "feedforward" || k === "unresolved") v = step(v);
      else if (k === "residual") v = v.map((a, i) => a + step(v)[i]);
      else if (k === "echo-state") { for (let s = 0; s < PARAMS.reservoirSteps; s++) v = step(v).map((a, i) => 0.7 * v[i] + 0.3 * Math.tanh(a)); }
      else if (k === "pulsed-reservoir") { let spikes = v.map(() => 0), mem = v.map(() => 0);
        for (let s = 0; s < PARAMS.reservoirSteps; s++) { mem = step(mem.map((m, i) => m + spikes[i])).map(m => m);
          spikes = mem.map(m => (m > 0.5 ? 1 : 0)); mem = mem.map((m, i) => (spikes[i] ? 0 : m * 0.9)); v = v.map((a, i) => a + spikes[i]); } }
      else if (k === "markov") { const rows = W.map(r => { const s = r.reduce((a, b) => a + Math.abs(b), 0) || 1; return r.map(w => Math.abs(w) / s); });
        let pdist = v.map(a => Math.abs(a) + 1e-9); const z = pdist.reduce((a, b) => a + b); pdist = pdist.map(a => a / z);
        for (let s = 0; s < PARAMS.reservoirSteps; s++) pdist = pdist.map((_, i) => rows.reduce((acc, r, j) => acc + pdist[j] * r[i], 0) || pdist[i]);
        v = pdist; }
      else if (k === "hmm") { const emit = K.map(k2 => 0.05 + 0.9 * k2.intensity); let a = emit.map(e => e / ids.length);
        for (let s = 0; s < input.length; s++) { const obs = input[s] > 0;
          a = a.map((_, i) => (obs ? emit[i] : 1 - emit[i]) * a.reduce((acc, aj, j) => acc + aj * (Math.abs(W[i][j]) + 1e-3), 0));
          const z = a.reduce((x, y) => x + y) || 1; a = a.map(x => x / z); }
        v = a; }
    }
    return { kind: f.kind.kind, out: v };
  }

  // ---- one event: run, measure harmony/dissonance, apply consequences --------------------------------
  step(input = [0.3, -0.2, 0.5, 0.1]) {
    this.t++;
    this.formFormations();
    const before = new Map([...this.p].map(([id, p]) => [id, { tension: p.tension, gate: p.gate }]));
    const outputs = {};
    for (const f of this.formations.values()) {
      outputs[f.id] = this.runNet(f, input);
      f.history.push({ t: this.t, kind: f.kind.kind, realized: f.matter.realized });
    }
    // edges: resonance strengthens (Klein 1965 "used"), dissonance perturbs, every live edge ages
    for (const e of this.edges.values()) {
      if (!e.alive) continue;
      const f = e.bond.connectionCount / 5, dissonant = !e.intra && e.bond.connectionCount <= 1, w0 = e.w;
      e.w = dissonant ? K65.unused(e.w) - PARAMS.perturbWeaken : K65.used(e.w, f);
      e.history.push({ t: this.t, w: +e.w.toFixed(3), dissonant });
      if (e.w < K65.ERASE_THRESHOLD) { e.alive = false; e.history.push({ t: this.t, erased: true });
        this.shadow.push({ t: this.t, kind: "bond-erased", edge: `${e.from}>${e.to}`, from: w0, cause: "persistent dissonance" }); }
    }
    // particles: tension from dissonant neighbours, relief from resonant ones; changing line; flip
    const flips = [];
    for (const p of this.p.values()) {
      const es = this.live(p.id); if (!es.length) continue;
      const dis = es.filter(e => !e.intra && e.bond.connectionCount <= 1).length / es.length;
      p.tension = Math.max(0, p.tension + PARAMS.tensionRate * dis - PARAMS.reliefRate * (1 - dis));
      if (p.regime === "changing") {                       // resolve: the changing line flips (Hamming-1 move)
        const oldGate = p.gate, mask = maskOf(p.form) ^ (1 << (p.line - 1));
        // a changing line changes the whole hexagram: every particle of this hexagram instance moves with it
        const body = p.hex !== undefined ? [...this.p.values()].filter(q => q.hex === p.hex) : [p];
        for (const q of body) { q.form = formOf(mask); q.gate = kingWenFromMask(mask); q.yang = q.form[q.line - 1]; }
        p.regime = "stable"; p.tension = 0;
        p.history.push({ t: this.t, flip: `${oldGate}.${p.line} -> ${p.gate}` });
        this.shadow.push({ t: this.t, kind: "line-flip", particle: p.id, from: oldGate, to: p.gate, line: p.line,
          cause: `dissonance ${dis.toFixed(2)} across ${es.length} bonds` });
        flips.push(p.id);
      } else if (p.tension >= PARAMS.flipThreshold) {
        p.regime = "changing"; p.history.push({ t: this.t, regime: "changing", tension: +p.tension.toFixed(3) });
      }
    }
    if (flips.length) this.emerge();                     // a flip changes the address, so channels re-emerge
    // leadership: observed from what changed in THIS event, per dimension; unresolved if not clear
    const change = Object.fromEntries(["Movement", "Evolution", "Being", "Design", "Space"].map(d => [d, 0]));
    for (const [id, p] of this.p) { const b = before.get(id);
      change[p.dress.dimension] += Math.abs(p.tension - b.tension) + (b.gate !== p.gate ? 1 : 0); }
    const ranked = Object.entries(change).sort((a, b) => b[1] - a[1]);
    const leader = ranked[0][1] > 0 && ranked[0][1] - ranked[1][1] > PARAMS.leadMargin * ranked[0][1] ? ranked[0][0] : "unresolved";
    const ev = { t: this.t, formations: this.formations.size, flips, leader, change, outputs };
    this.events.push(ev);
    return ev;
  }
}

function changedLine(a, b) { const i = a.findIndex((x, k) => x !== b[k]); return i + 1; }

/** All 64 hexagrams x 6 single-line changes = 384 cases (first-build spec §10, verification 1). */
export function lineChangeTable() {
  const rows = [];
  for (let kw = 1; kw <= 64; kw++) for (let line = 1; line <= 6; line++) {
    const m = maskFromKingWen(kw), m2 = m ^ (1 << (line - 1));
    rows.push({ from: kw, line, to: kingWenFromMask(m2), back: kingWenFromMask(m2 ^ (1 << (line - 1))) });
  }
  return rows;
}

export { makeParticle };
