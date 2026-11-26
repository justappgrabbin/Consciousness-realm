// klein4.js — Klein's Analogical Transformation Operator (ATO) and the Boolean Klein-4 group.
// Source: S. Klein, "The Analogical Foundations of Creativity in Language, Culture & the Arts"
// (CSNLP-8 1999 / Language, Vision & Music 2002), Table 3 and the ATO section, read directly.
//   strong equivalence (XNOR): 1 where bits match, 0 where they differ.
//   *ab = *ba     *a*ab = b     *b*ab = a
// Vectors are plain arrays of 0/1 so any length works (6-bit hexagram, 9-bit sound, n-bit meaning).

export const xnor = (a, b) => {
  if (a.length !== b.length) throw new Error(`ATO length mismatch ${a.length} vs ${b.length}`);
  return a.map((x, i) => (x === b[i] ? 1 : 0));
};

/** *ab — the operator that carries a onto b (Klein's emergent third value). */
export const ato = xnor;

/** A : B :: C : ?  ->  D = *C(*AB) */
export const analogy = (A, B, C, op = "xnor") => OPS[op](C, OPS[op](A, B));

/** Fold any number of vectors through the ATO (a cluster's own emergent vector). */
export const fold = (vs, op = "xnor") => vs.reduce((acc, v) => OPS[op](acc, v));
const OPS = { xnor: (a, b) => xnor(a, b), xor: (a, b) => xor(a, b) };

export const bits = (s) => [...s].map(Number);
export const str = (v) => v.join("");
export const toBits = (n, width) => Array.from({ length: width }, (_, i) => (n >> (width - 1 - i)) & 1);
export const fromBits = (v) => v.reduce((n, b) => (n << 1) | b, 0);
export const hamming = (a, b) => a.reduce((d, x, i) => d + (x !== b[i]), 0);

// ---- NAND: the universal primitive underneath ---------------------------------------------
// NAND alone can build every Boolean function. It is NOT invertible (NAND(a,b) cannot give back
// a or b), so it is not an ATO and does not form the Klein-4 group — it is the matter the
// reversible operators are built from. XOR = 4 NANDs, XNOR = XOR + 1 NAND (as NOT).
export const nand1 = (a, b) => (a & b) ? 0 : 1;
export const nand = (a, b) => a.map((x, i) => nand1(x, b[i]));
export const xorFromNand1 = (a, b) => { const n = nand1(a, b); return nand1(nand1(a, n), nand1(b, n)); };
export const xnorFromNand1 = (a, b) => { const x = xorFromNand1(a, b); return nand1(x, x); };
export const xorFromNand = (a, b) => a.map((x, i) => xorFromNand1(x, b[i]));
export const xnorFromNand = (a, b) => a.map((x, i) => xnorFromNand1(x, b[i]));

// ---- All gates (user's logic-gate charts, Nov 24) -------------------------------------------
// Every 2-input Boolean function is its 4-row output column read as a number 0..15
// (rows a,b = 00,01,10,11). Derived, not tabled: gate(n)(a,b) = bit (2a+b) of n.
export const gate1 = (n) => (a, b) => (n >> (2 * a + b)) & 1;
export const GATE_CODES = { FALSE: 0, NOR: 1, XOR: 6, NAND: 7, AND: 8, XNOR: 9, OR: 14, TRUE: 15 };
export const gate = (name) => { const f = gate1(GATE_CODES[name]); return (a, b) => a.map((x, i) => f(x, b[i])); };
export const not = (a) => a.map(x => 1 - x);
export const buffer = (a) => a.slice();
/** Tri-state buffer: EN=1 passes A, EN=0 gives "Z" (high impedance, disconnected). */
export const triState = (a, en) => a.map((x, i) => (en[i] ? x : "Z"));
/** Invertible gates = the ones that can be an ATO (can give an input back). Only XOR and XNOR. */
export const invertible = (n) =>
  [0, 1].every(a => new Set([0, 1].map(b => gate1(n)(a, b))).size === 2) &&   // b recoverable from a
  [0, 1].every(b => new Set([0, 1].map(a => gate1(n)(a, b))).size === 2);     // a recoverable from b
// NOR is universal too: NOT = NOR(a,a), OR = NOT(NOR), AND = NOR(NOT a, NOT b)
export const nor1 = gate1(1);
export const andFromNor1 = (a, b) => nor1(nor1(a, a), nor1(b, b));

// ---- Klein's three tables (Creativity paper p.2, read from the page image) ----------------
// TABLE 1: two truth tables side by side — Exclusive Or ("a or b, but not both") and
// Strong Equivalence ("a if and only if b"). Both operators are kept; Klein: "the truth table for
// either exclusive-OR, or strong equivalence may be used to compute analogical operators".
export const xor = (a, b) => {
  if (a.length !== b.length) throw new Error(`XOR length mismatch ${a.length} vs ${b.length}`);
  return a.map((x, i) => (x === b[i] ? 0 : 1));
};
export const OPERATORS = { xnor, xor };
export const table1 = () => [[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b]) =>
  ({ a, b, xor: xor([a], [b])[0], xnor: xnor([a], [b])[0] }));

// TABLE 2: the arithmetic behind them. The printed table shows mod-2 addition (non-carry) and
// mod-2 subtraction — both give XOR. Klein's text says strong equivalence is "the rules for
// multiplying the signs, + and -", which the printed table does not show; it is added here so the
// +/- polarity reading exists: 1 = +, 0 = -, and (+)(+)=+, (-)(-)=+, (+)(-)=-  ==  XNOR.
export const mod2add = (a, b) => (a + b) % 2;
export const mod2sub = (a, b) => ((a - b) % 2 + 2) % 2;
export const signMul = (a, b) => ((a ? 1 : -1) * (b ? 1 : -1)) > 0 ? 1 : 0;
export const table2 = () => [[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b]) =>
  ({ a, b, add: mod2add(a, b), sub: mod2sub(a, b), signs: signMul(a, b) }));

// TABLE 3: "a 4-valued truth table using binary integers, and the logic of either operator" =
// the Klein-4 group. Klein prints the XNOR version; the XOR version is the same group relabelled.
export const K4 = ["00", "01", "10", "11"];
export const k4table = (op = "xnor") => K4.map(r => K4.map(c => str(OPERATORS[op](bits(r), bits(c)))));
export const PRINTED_TABLE3 = [["11", "10", "01", "00"], ["10", "11", "00", "01"],
  ["01", "00", "11", "10"], ["00", "01", "10", "11"]];

/** Which of the three flips relates two elements of the Klein-4 group (or "same"). */
export function k4Relation(a, b) {
  const d = str(xnor(bits(a), bits(b)));   // 11 = identical under XNOR
  return { "11": "same", "10": "flip-second", "01": "flip-first", "00": "flip-both" }[d];
}
