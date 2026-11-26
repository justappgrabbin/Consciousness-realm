// bond.js — who connects to whom, and what becomes visible.
// Source: user's BHANTUGH spec (Drive 1j1Bd7b..., §19 Resonance & Opposite-Trigram Harmony and
// §20 Five Swarm Levels), ported exactly from its TypeScript.
//
// This is where the DRESSING acts. Planet / dimension / zodiac stay out of the vector math
// (form, sound, meaning, ATO, clusters), but they decide bonds and levels:
//   dimension equality is a bond condition (§19); level 4 = dimension + planetary,
//   level 5 = zodiac, house, arc-time (§20). So particles from different places never come out alike.

export const isHarmonic6 = (a, b) => a === b || Math.abs(a - b) === 3;      // 1-4, 2-5, 3-6
export const isHarmonicBase = (a, b) => a === b || a + b === 6;              // 1-5, 2-4, 3-3

/** evaluateSwarmBond — exact port. Takes particles (reads dimension from dress). */
export function evaluateSwarmBond(A, B) {
  let validConnections = 0;
  const conditions = [];
  if (A.dress.dimension === B.dress.dimension) { validConnections++; conditions.push("dimension"); }
  if (isHarmonic6(A.line, B.line)) { validConnections++; conditions.push("line"); }
  if (isHarmonic6(A.color, B.color)) { validConnections++; conditions.push("color"); }
  if (isHarmonic6(A.tone, B.tone)) { validConnections++; conditions.push("tone"); }
  if (isHarmonicBase(A.base, B.base)) { validConnections++; conditions.push("base"); }
  return {
    beneficial: validConnections > 0,
    connectionCount: validConnections,
    isVisible: validConnections >= 3,
    unlockedLevel: Math.min(5, validConnections),
    conditions,
  };
}

/** §20 — the five nested levels and what governs each. */
export const LEVELS = [
  { level: 1, name: "Root Vector", governs: ["base"], does: "anchor points, image-edge positioning" },
  { level: 2, name: "Sensory Field", governs: ["tone", "color"], does: "color, spacing, curve tension" },
  { level: 3, name: "Structural Line", governs: ["line", "gate"], does: "Unicode connectors, sentence rendering" },
  { level: 4, name: "Dimensional Manifold", governs: ["dimension", "planetary"], does: "sentence grouping, contour alignment" },
  { level: 5, name: "Macro Interface", governs: ["zodiac", "house", "arc"], does: "interactive HTML/SVG" },
];

/** Bond every pair in a field; returns the edges that are beneficial (>=1 connection). */
export function bondField(particles) {
  const edges = [];
  for (let i = 0; i < particles.length; i++)
    for (let j = i + 1; j < particles.length; j++) {
      const b = evaluateSwarmBond(particles[i], particles[j]);
      if (b.beneficial) edges.push({ a: particles[i].id, b: particles[j].id, ...b });
    }
  return edges;
}
