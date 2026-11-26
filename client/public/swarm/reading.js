// reading.js — every unit reads with its own AUTOLING (Klein 1968: learn a language's rules by asking an informant
// "can you say this?"). The units already carry AUTOLING-shaped culture for touches (klein_local.js); this gives them
// LANGUAGE: sentence patterns learned from what they read, kept per unit, passed only by contact.
//   informant  = the file itself. A token the file says more than once is a FRAME word (part of the grammar);
//                a token said once is a SLOT ($) — the place where different words go. (Distributional, no network.)
//   pattern    = a line with its slots abstracted:  "import x from 'y'"  →  import $ from ' $ '
//   understood = a line whose pattern the swarm already holds (from earlier reading) or that the file uses again.
//   gap        = a line whose pattern no unit holds and the file never repeats: what the swarm cannot place yet.
export const READ = { OFFER: 3, MIN_FRAME: 2 };
export const tokens = line => (String(line).toLowerCase().match(/[a-z_]+|\d+|[^\s\w]/g) ?? []);

/** Frame words: what the informant (the file) says at least MIN_FRAME times, plus words the unit already knows as frame. */
export function frameOf(lines, known = new Set()) {
  const df = new Map(); for (const l of lines) for (const t of new Set(tokens(l))) df.set(t, (df.get(t) ?? 0) + 1);
  const f = new Set(known); for (const [t, n] of df) if (n >= READ.MIN_FRAME) f.add(t); return f;
}
export function patternOf(line, frame) {
  const out = []; for (const t of tokens(line)) { const p = frame.has(t) ? t : "$"; if (p === "$" && out.at(-1) === "$") continue; out.push(p); }
  return out.join(" ");
}
const grammar = u => (u.grammar ??= { patterns: new Map(), frame: new Set(), read: 0 });

/** The file is read across the swarm: line i goes to the i-th live particle (each unit reads only its share). */
export function readFile(S, file) {
  const live = S.units.filter(u => !u.broken && u.particle !== false), lines = String(file.text).split(/\r?\n|(?<=[.!?;])\s+/).map(s => s.trim()).filter(Boolean);
  if (!live.length || !lines.length) return { lines: 0, understood: 0, gaps: [] };
  const known = new Set(); for (const u of live) for (const t of grammar(u).frame) known.add(t);
  const frame = frameOf(lines, known);
  // what the swarm held BEFORE reading this file: the test of understanding
  const held = new Set(); for (const u of live) for (const p of grammar(u).patterns.keys()) held.add(p);
  const pats = lines.map(l => patternOf(l, frame)), count = new Map(); for (const p of pats) count.set(p, (count.get(p) ?? 0) + 1);
  const gaps = [];
  lines.forEach((l, i) => { const u = live[i % live.length], g = grammar(u), p = pats[i];
    g.patterns.set(p, (g.patterns.get(p) ?? 0) + 1); for (const t of p.split(" ")) if (t !== "$") g.frame.add(t); g.read++;
    if (!held.has(p) && count.get(p) < 2) gaps.push({ line: l, pattern: p, unit: u.id }); });
  return { lines: lines.length, understood: 1 - gaps.length / lines.length, heldBefore: pats.filter(p => held.has(p)).length, gaps, patterns: count.size };
}

/** Contact only: each unit offers its strongest patterns to the units it is bonded to. */
export function gossipGrammar(S) {
  const inbox = new Map();
  for (const u of S.units) { if (u.broken || !u.grammar) continue;
    const offer = [...u.grammar.patterns].sort((a, b) => b[1] - a[1]).slice(0, READ.OFFER);
    for (const e of u.bonds ?? []) { const n = S.units[e.a === u.id ? e.b : e.a]; if (!n || n.broken) continue;
      (inbox.get(n.id) ?? inbox.set(n.id, []).get(n.id)).push(...offer.map(([p, f]) => [p, f * (e.strength ?? 0.5) * 0.5])); } }
  for (const [id, offers] of inbox) { const g = grammar(S.units[id]);
    for (const [p, f] of offers) { g.patterns.set(p, (g.patterns.get(p) ?? 0) + f); for (const t of p.split(" ")) if (t !== "$") g.frame.add(t); } }
}

/** Which units can place a line (hold its pattern) — the swarm answering "can you say this?" */
export function whoCanSay(S, line) {
  const known = new Set(); for (const u of S.units) for (const t of u.grammar?.frame ?? []) known.add(t);
  const p = patternOf(line, known); return S.units.filter(u => u.grammar?.patterns.has(p)).map(u => u.id);
}
