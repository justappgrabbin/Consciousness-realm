// contact1965.js — Klein, "Some Components of a Program for Dynamic Modelling of Historical Change
// in Language" (Int. Conf. on Computational Linguistics preprints, paper 14, New York, May 1965;
// Russian translation in Novoe v lingvistike VI, 1972, pp.141-151 — read directly, OCR).
//
// The four components named in the paper (§2.0):
//   a) a table of each individual's grammar rules and parameters        -> Individual
//   b) generator and recognizer using the interacting grammars          -> generate() / exchange()
//   c) a table of functional relations (the interaction rules)          -> FUNCTIONS
//   d) a control system that runs time and reports to the experimenter  -> Community.run()
//
// Every individual has a GENERATIVE and a RECOGNIZING grammar. Rule content is deliberately
// unspecified in the paper (semantic, syntactic, morphological or phonological) — rules are ids.
// A rule with weight >= 0.1 is in both grammars (same weight); below 0.1 recognition only;
// below 0.01 it is erased from both. All values to hundredths; >=1 shown as 0.99, <=0 as 0.01.

export const FUNCTIONS = {
  // (1) probability that x speaks to y
  speakProb: (Sx, Sy) => { const d = Math.round(Math.abs(Sx - Sy) * 100) / 100; return clamp(d === 0 ? 1 : 0.1 / d); },
  // (2) weight of a recognition rule after use in analysis; f = its relative frequency in the form
  used: (w, f) => w - (w - f) / 5,
  // (3) weight of a rule not used in the analysis
  unused: (w) => w - 0.02,
  // (4) threshold to be in the generative grammar
  GEN_THRESHOLD: 0.1,
  // (5) threshold below which a rule is erased from the recognizing grammar
  ERASE_THRESHOLD: 0.01,
  // (6) speaker's status after speaking with listener y
  status: (Sx, Sy) => Sx - (Sx - Sy) / 5,
};

const r2 = (v) => Math.round(v * 100) / 100;
function clamp(v) { return v >= 1 ? 0.99 : v <= 0 ? 0.01 : v; }

export class Individual {
  constructor(name, status, rules = {}) {
    this.name = name; this.S = status;
    this.recog = new Map(Object.entries(rules));     // rule -> weight
  }
  generative() { return [...this.recog].filter(([, w]) => w >= FUNCTIONS.GEN_THRESHOLD); }
}

/** One small cycle: speaker produces `form` (rule -> count) to listener. Returns what happened. */
export function exchange(speaker, listener, form) {
  const total = Object.values(form).reduce((a, b) => a + b, 0);
  const borrowed = [], erased = [];
  for (const [rule, count] of Object.entries(form)) {
    const f = r2(count / total);
    if (!listener.recog.has(rule)) { listener.recog.set(rule, 0); borrowed.push(rule); }
    listener.recog.set(rule, r2(clamp(FUNCTIONS.used(listener.recog.get(rule), f))));
  }
  for (const [rule, w] of [...listener.recog]) {
    if (rule in form) continue;
    const nw = r2(FUNCTIONS.unused(w));
    if (nw < FUNCTIONS.ERASE_THRESHOLD) { listener.recog.delete(rule); erased.push(rule); }
    else listener.recog.set(rule, nw);
  }
  speaker.S = r2(clamp(FUNCTIONS.status(speaker.S, listener.S)));
  return { borrowed, erased };
}

/** Generator. The paper leaves form production open ("suppose Mary produces G(A,2D)").
 *  MY choice, flagged: draw 1-3 rule uses from the generative grammar, weighted by rule weight. */
export function generate(speaker, rng) {
  const gen = speaker.generative(); if (!gen.length) return null;
  const n = 1 + Math.floor(rng() * 3), form = {};
  const total = gen.reduce((a, [, w]) => a + w, 0);
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    for (const [rule, w] of gen) { if ((r -= w) <= 0) { form[rule] = (form[rule] ?? 0) + 1; break; } }
  }
  return form;
}

/** Control system: big cycle i = one speaker; small cycle j = each accepted listener. */
export class Community {
  constructor(individuals, rng = Math.random) { this.people = individuals; this.rng = rng; this.log = []; this.i = 0; }
  bigCycle() {
    const speaker = this.people[Math.floor(this.rng() * this.people.length)];
    let j = 0;
    for (const listener of this.people) {
      if (listener === speaker) continue;
      if (this.rng() > FUNCTIONS.speakProb(speaker.S, listener.S)) continue;
      const form = generate(speaker, this.rng); if (!form) break;
      const r = exchange(speaker, listener, form);
      this.log.push({ T: `${this.i},${j++}`, speaker: speaker.name, listener: listener.name, form, ...r });
    }
    this.i++;
  }
  run(bigCycles) { for (let k = 0; k < bigCycles; k++) this.bigCycle(); return this; }
  report() {
    return this.people.map(p => ({ name: p.name, S: p.S,
      generative: Object.fromEntries(p.generative()), recognizing: Object.fromEntries(p.recog) }));
  }
}
