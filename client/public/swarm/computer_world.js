// computer_world.js — the Klein computer (the user's klein-computer.zip, Nov 15: messy.js = the full MESSY 1976
// interpreter from Appelbaum's manual, klein_ato.js = the ATO processor, klein-novel-writer.js = AutoNovel 1973)
// running the swarm. Loaded through vendor/klein-computer/computer.browser.mjs (computer.mjs with only its Node imports
// swapped for the globals the three files already set). None of the user's files is changed.
//   every unit enters MESSY by intake() — an atom it can reason with AND a word the writer can say;
//   its gate enters the same way, worded by the user's vocabulary (gate name);
//   facts are told into the live network:  U<id> AT G<gate> · U<a> TOUCH U<b> (visible bond) · U<id> WEAR <face>
//   a bond that breaks is negated (MESSY keeps the history);
//   narrate() hands what changed since last time to AutoNovel, which writes it as sentences;
//   analogy(a, b, c) is the ATO over what is true right now (A : B :: C : ?).
// Sits beside messy_world.js (the reduced kernel), which stays.
import { KleinComputer } from "./vendor/klein-computer/computer.browser.mjs";
import { vocabulary } from "./vocabulary.js";
const BOOT = `$LIMITS START=0W0D0H, END=99W0D0H;
$NODES;
SWARM 1 = 'SWARM';
$RELATIONS;
HOLD 3 0 = 'HOLD';
$END;`;

export class ComputerWorld {
  constructor(seed = 1973) {
    this.kc = new KleinComputer({ seed }).boot(BOOT);
    this.R = { AT: this.kc.intake("AT", { type: "R", grammar: 4, words: ["at"] }),
               TOUCH: this.kc.intake("TOUCH", { type: "R", grammar: 3, words: ["touch"] }),
               WEAR: this.kc.intake("WEAR", { type: "R", grammar: 3, words: ["wear"] }) };
    this.known = new Set(); this.facts = new Map(); this.told = 0; this.archive = [];
  }
  faceAtom(face) { this.faceIds ??= new Map(); if (!this.faceIds.has(face.id)) this.faceIds.set(face.id, "F" + (this.faceIds.size + 1)); return this.faceIds.get(face.id); }
  atom(name, words) { if (!this.known.has(name)) { this.kc.intake(name, { type: "N", grammar: 1, words }); this.known.add(name); } return name; }
  tell(key, s, r, o) { if (this.facts.has(key)) return; this.facts.set(key, this.kc.tell(s, r, o)); this.told++; }
  untell(key) { const rec = this.facts.get(key); if (rec) { this.kc.m.rt.negateRec(rec, true); this.facts.delete(key); } }
  sync(S) {
    const V = vocabulary(), live = new Set();
    for (const u of S.units) {
      if (u.broken || !u.address?.gate) continue;
      const U = this.atom("U" + u.id, [`${u.kind} ${u.id}`]);
      const g = u.address.gate, G = this.atom("G" + g, [(V?.gates?.[g]?.name ?? "gate " + g).toLowerCase().replace(/^the /, "")]);
      this.tell(`at:${u.id}:${g}`, U, this.R.AT, G); live.add(`at:${u.id}:${g}`);
      if (u.face?.name) { const F = this.atom(this.faceAtom(u.face), [u.face.name]);   /* MESSY keeps only 8 characters of a name: short unique id */ const k = `wear:${u.id}:${F}`; this.tell(k, U, this.R.WEAR, F); live.add(k); }
      for (const e of u.bonds ?? []) if (e.visible) { const o = S.units[e.a === u.id ? e.b : e.a]; if (!o || o.broken || o.id < u.id) continue;
        const k = `touch:${u.id}:${o.id}`; this.tell(k, U, this.R.TOUCH, this.atom("U" + o.id, [`${o.kind} ${o.id}`])); live.add(k); }
    }
    for (const k of [...this.facts.keys()]) if (!live.has(k)) this.untell(k);
    return this;
  }
  /** AutoNovel writes what changed since the last narration */
  narrate() { const m = this.kc.m; const text = this.kc.write().map(p => p.text).join(" ");
    this.archive.push(...m.out); m.out = []; m.curBlock = null; return text; }
  analogy(a, b, c) { return this.kc.analogy(a, b, c); }
  stats() { return { atoms: this.kc.m.atoms.size, live: [...this.kc.m.state.net.values()].filter(t => t.asserted).length, told: this.told }; }
}
