// resonance_rules.js — how particles meet, cross, wear and pass on. Every rule carries where it comes from:
//   "user"  = the user's own statements in chat (Nov 24)
//   "bt:<file>" = the user's Bhan Tugh source texts in vocab_src/bhantugh/ (tables extracted by build_bhantugh.py)
// Nothing here is invented: where a source gives an ORDER but no NUMBER, the order is kept and the number is marked
// ORDINAL_ONLY so the user can set it.
let R = null;
export async function loadRules(url = new URL("./bhantugh_rules.json", import.meta.url)) {
  if (R) return R; R = typeof window === "undefined" ? JSON.parse((await import("node:fs")).readFileSync(url, "utf8")) : await (await fetch(url)).json(); return R; }
export const rules = () => R;

/** Colour: same = resonance · three up/down = transference (looks like resonance, is a blind spot) · else neutral.
 *  [bt:resonance_magic_square "Same Colour = Resonance / Colour 3 up/down = Blind Spot/Distraction / Everything else = no influence"] */
export function colourRelation(a, b) {
  if (a === b) return "resonance";
  return Math.abs(a - b) === 3 ? "transference" : "neutral";
}
/** Colour transference target: 1↔4, 2↔5, 3↔6. [bt:crystals_neutrinos_centres "Colour 1 would transfer into a 4, and Colour 6 into a 3"] */
export const transferred = c => ((c - 1 + 3) % 6) + 1;
/** Tone never transfers. [bt:resonance_magic_square, bt:crystals] — Tone 1–3 human-like (active), 4–6 Rave-like (passive). [bt:resonance_magic_square] */
export const toneFamily = t => (t <= 3 ? "human" : "rave");
/** Line harmony across the trigrams: 1–4, 2–5, 3–6 "like notes an octave higher". Lower trigram (1–3) self-absorbed,
 *  upper (4–6) looks across to the other. [bt:definition_types_roles_lines] */
export const lineHarmony = (a, b) => Math.abs(a - b) === 3;
export const lineFacing = l => (l <= 3 ? "self" : "other");

/** Which levels can touch which: neighbours only, in the order line–colour–tone–base. [user] */
const ORDER = ["line", "color", "tone", "base"];
export const canTouch = (x, y) => Math.abs(ORDER.indexOf(x) - ORDER.indexOf(y)) <= 1;
/** Reach of each level: line and colour touch inside AND outside the body; tone and base only within self. [user] */
export const reachesOutside = level => level === "line" || level === "color";

/** Base: resonance (exact match) but no harmony, plus a reach map (pyramid). Personality: 5 in the centre, diagonals 1–2
 *  and 3–4 blocked, sides connect, centre sees out but is hard to see into. [bt:resonance-base text, pasted in chat]
 *  Design = "the inversion of the 3-5 system": 3 in the centre. Its diagonals are NOT spelled out in the text — the
 *  pairs below for Design are PROVISIONAL (swap of 3 and 5), to confirm from the Base illustrations. */
const PYRAMID = { Personality: { centre: 5, diagonals: [[1, 2], [3, 4]] }, Design: { centre: 3, diagonals: [[1, 2], [5, 4]], provisional: true } };
export function baseReach(from, to, side = "Personality") {
  const P = PYRAMID[side];
  if (from === to) return "resonance";
  if (from === P.centre) return "reaches";             // the centre looks out to every other number
  if (to === P.centre) return "weak";                  // others can't really see in (one-way window)
  if (P.diagonals.some(([a, b]) => (a === from && b === to) || (b === from && a === to))) return "blocked";
  return "reaches";                                    // along the sides of the pyramid
}

/** The order in which kinds of contact matter: Colour–Colour first, then transference, Colour–Tone, Colour–Line.
 *  Tone resonance "is significant because it changes the cognitive process". [bt:resonance_magic_square]
 *  The text gives the ORDER only — the weights are placeholders in that order, to be set by the user. */
export const PRIORITY = Object.freeze({ "color-color": 4, transference: 3, "color-tone": 2, "color-line": 1, ORDINAL_ONLY: true });

/** One contact between two particles a,b (each {line,color,tone,base, inside:bool}).
 *  Crossing needs: touching [user], a level that may reach this far [user], and a match at that level [user + bt]. */
export function contact(a, b, { inside = false, side = "Personality" } = {}) {
  const found = [];
  if (a.color === b.color) found.push({ level: "color", kind: "resonance", weight: PRIORITY["color-color"] });
  else if (colourRelation(a.color, b.color) === "transference") found.push({ level: "color", kind: "transference", weight: PRIORITY.transference, blindSpot: true });
  if (a.line === b.line) found.push({ level: "line", kind: "resonance", weight: PRIORITY["color-line"] });
  if (inside && a.tone === b.tone) found.push({ level: "tone", kind: "resonance", weight: PRIORITY["color-tone"] });
  if (inside && a.base != null && b.base != null) { const r = baseReach(a.base, b.base, side); if (r === "resonance") found.push({ level: "base", kind: "resonance", weight: 1 }); }
  const usable = found.filter(f => inside || reachesOutside(f.level));
  const best = usable.sort((x, y) => y.weight - x.weight)[0] ?? null;
  return { crosses: !!best, by: best, all: usable, wear: best ? 0 : 1 };   // no match = one unit of wear [user: decay]
}

/** Exchange protocol of a channel's circuit and its firing trigger, from the channel table. [bt:circuits_overview, bt:circuit_channels]
 *  Collective = one-way sharing · Communal = a deal (something must come back) · Individualistic = rub-off empowerment, no sharing.
 *  Projected = waits for recognition/invitation · Generated = fires in response · Manifested = can start itself. */
export function channelBehaviour(a, b) {
  const c = R?.channels?.[`${a}-${b}`] ?? R?.channels?.[`${b}-${a}`]; if (!c) return null;
  const exchange = { Collective: "share-one-way", Communal: "deal", Individualistic: "rub-off", "Self-survival": "self" }[c.circuit] ?? null;
  const trigger = { Projected: "needs-invitation", Generated: "needs-response", Manifested: "self-start" }[c.type] ?? "unknown (not in the texts sent yet)";
  return { ...c, exchange, trigger };
}
/** Role from Personality and Design Sun/Earth lines. [bt:definition_types_roles_lines] */
export const roleOf = (pLine, dLine) => R?.roles?.[`${pLine}/${dLine}`] ?? null;
/** Interaction type from definition. [bt:definition_types_roles_lines] */
export function typeOf({ sacralDefined, motorToThroat, anyDefined = true }) {
  if (!anyDefined) return "Drifter";
  if (sacralDefined) return motorToThroat ? "Independent Worker" : "Team Worker";
  return motorToThroat ? "Initiator" : "Supporter";
}

/** Connection between two beings' gate sets, per channel. [dbhd: connection charts]
 *  electromagnetic = each holds one gate · dominance = one holds both, other neither
 *  compromise = one holds both, other one · companionship = both hold the same channel. */
export function connectionsOf(gatesA, gatesB) {
  const A = new Set(gatesA), B = new Set(gatesB), out = [];
  for (const key of Object.keys(R?.channels ?? {})) {
    const [x, y] = key.split("-").map(Number);
    const a = +A.has(x) + +A.has(y), b = +B.has(x) + +B.has(y);
    let kind = null;
    if (a === 2 && b === 2) kind = "companionship";
    else if (a === 2 || b === 2) kind = (a + b === 2) ? "dominance" : "compromise";
    else if (a === 1 && b === 1 && (A.has(x) !== B.has(x))) kind = "electromagnetic";
    if (kind) out.push({ channel: key, kind, holder: a === 2 && b < 2 ? "A" : b === 2 && a < 2 ? "B" : null });
  }
  return out;
}
