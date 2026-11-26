// loshu.js — the nine centers: four dualities around one middle.
//
// From the user's doc ("5-layer matrix, 9 centers", Drive 1Xe5mB...): within each layer the nine
// centers sit as the Lo Shu square — Qian/Kun on the vertical axis, Li/Kan on the horizontal,
// Zhen, Xun, Dui, Gen as diagonal bridges at the corners, and the ninth center is not a coordinate
// but the emergent field (Taiji) that ripples when any other center flips.
//
// What the code proves (test_kernel): each opposite pair is an exact bitwise complement, so the
// four dualities are the 8 trigrams folded by "x ~ NOT x" — and that fold IS Klein's Boolean
// Klein-4 group (Z2^3 / <111> = Z2^2). The user's four dualities + middle = Klein-4 + Taiji.
//
// Note (flagged, not resolved): Qian/Kun vertical and Li/Kan horizontal is the Former-Heaven (Fu Xi)
// arrangement; the classical Lo Shu NUMBERS (4 9 2 / 3 5 7 / 8 1 6) are traditionally paired with
// the Later-Heaven (King Wen) arrangement. The doc combines the two; the user decides which.

import { xnor, xor, bits, str } from "./klein4.js";

// bottom line first (line 1, 2, 3), 1 = yang
export const TRIGRAM_BITS = {
  Qian: "111", Dui: "110", Li: "101", Zhen: "100", Xun: "011", Kan: "010", Gen: "001", Kun: "000",
};
export const DUALITIES = [
  { axis: "vertical", pair: ["Qian", "Kun"] },
  { axis: "horizontal", pair: ["Li", "Kan"] },
  { axis: "diagonal", pair: ["Zhen", "Xun"] },
  { axis: "diagonal", pair: ["Dui", "Gen"] },
];
export const LO_SHU = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

export const complement = (t) => str(bits(t).map(b => 1 - b));
/** The duality a trigram belongs to = the class {x, NOT x}; its label is the member starting with 0. */
export const dualityClass = (t) => (t[0] === "0" ? t : complement(t));
/** The 2-bit Klein-4 element of a duality class: drop the leading 0 of its representative. */
export const k4Of = (t) => dualityClass(t).slice(1);
/** Which pole of its duality a trigram is: + (leading 1) or - (leading 0). */
export const pole = (t) => (t[0] === "1" ? "+" : "-");

export const trigramName = (t) => Object.keys(TRIGRAM_BITS).find(k => TRIGRAM_BITS[k] === t);

/** Place a hexagram's two trigrams (from a 6-bit form, line 1 first) on the nine centers. */
export function placeHexagram(form) {
  const lower = str(form.slice(0, 3)), upper = str(form.slice(3, 6));
  return {
    lower: { trigram: trigramName(lower), duality: k4Of(lower), pole: pole(lower) },
    upper: { trigram: trigramName(upper), duality: k4Of(upper), pole: pole(upper) },
    // the hexagram is a bridge between two centers; same duality = it spans one axis
    spansOneAxis: k4Of(lower) === k4Of(upper),
  };
}

/** Taiji: the middle has no coordinate; it is what changes when centers flip. Given the 8 centers'
 *  states before/after, the middle's ripple = which dualities flipped (XOR of before/after). */
export function taijiRipple(before, after) {
  return Object.fromEntries(Object.keys(before).map(k => [k, str(xor(bits(before[k]), bits(after[k])))]));
}

export { xnor };
