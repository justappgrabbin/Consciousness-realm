// sentence.js — writing the ontological address as a sentence, and the swarm narrating itself in it.
//
// SOURCE TEXT (user's pages, read from the images, Nov 24 2026):
//   p.5  "The Crystals and the Monopole" — macrocosmic chains + keynotes per component
//   p.115 Macrocosmic/Microcosmic table — microcosmic natures, keynote word + "I ..." keynote
//   p.(JUT) Being's chain prints "Matter is" as its own statement — kept as its own term, not invented
// USER (this conversation): Movement starts at line 1, at the bottom. Every dimension starts at ITS OWN line 1;
//   from a crossed frame the same position reads from the other end (Movement looks up, Being looks down,
//   they cross). The attractor = the gate of the day. Evolution = memory (gives the gate its meaning).
//   The sentences tell what the SWARM is doing. One's Creation becomes another's Environment.
// MY READINGS (flagged, correct them):
//   - line 1..6 -> the six terms of the dimension's macrocosmic chain (line 1 = first term)
//   - base 1..5 -> the five microcosmic natures (the counts match: 5 bases, 5 natures)
//   - up-facing frames: Movement, Evolution, Space (Monopole + Personality Crystal, triangle up);
//     down-facing: Being, Design (Design Crystal, triangle down). Up reading down (or down reading up)
//     crosses: line L reads as 7-L. Same-facing frames read straight.
//   - color/tone/base "established by the binary with hexadecimal, relative to the hexagram in play":
//     hex = the hexagram's 6 bits followed by color, tone, base (3 bits each) -> 15 bits -> 4 hex digits

export const DIMENSIONS = {
  Movement: { chain: ["Movement", "Energy", "Creation", "Seeing", "Landscape", "Environment"],
    human: "Individuality", natures: ["Activity", "Reaction", "Limitation", "Perspective", "Relation"],
    keyword: "Uniqueness", keynote: "I Define", componentKeynote: "I Create", component: "Magnetic Monopole", faces: "up" },
  Evolution: { chain: ["Evolution", "Gravity", "Memory", "Taste", "Love", "Light"],
    human: "Mind", natures: ["Character", "Separation", "Nature", "Integration", "Spirit"],
    keyword: "Role", keynote: "I Remember", componentKeynote: "I Remember", component: "Personality Crystal", faces: "up" },
  Being: { chain: ["Being", "Matter", "Matter is", "Touch", "Sex", "Survival"],
    human: "Body", natures: ["Biology", "Chemistry", "Objectivity", "Geometry", "Trajectory"],
    keyword: "Genetics", keynote: "I am", componentKeynote: "I Am", component: "The Atom", faces: "down" },
  Design: { chain: ["Design", "Structure", "Progress", "Smell", "Life", "Art"],
    human: "Ego", natures: ["Homo Sapiens", "Growth", "Decay", "Continuity", "Manifestation"],
    keyword: "Self", keynote: "I Design", componentKeynote: "I Design", component: "Design Crystal", faces: "down" },
  Space: { chain: ["Space", "Form", "Illusion", "Hearing", "Music", "Freedom"],
    human: "Personality", natures: ["Type", "Fantasy", "Subjectivity", "Rhythm", "Timing"],
    keyword: "Presence", keynote: "I Think", componentKeynote: "I Communicate", component: "Personality Crystal", faces: "up" },
};
export const SOURCES = { chains: "Crystals & Monopole p.5; p.115 macrocosmic column", natures: "p.115 microcosmic column",
  keynote: "p.115 keynote column", componentKeynote: "Crystals & Monopole p.5" };

/** Which line a position reads as, seen from `frame`. Own frame or same-facing frame: straight. Crossed: 7-L. */
export function lineFrom(frame, ownDimension, line) {
  return DIMENSIONS[frame].faces === DIMENSIONS[ownDimension].faces ? line : 7 - line;
}

/** The hex reading: hexagram bits (line 1 first) then color, tone, base as 3 bits each. */
export function hexOf(p) {
  const bits = [...p.form, ...[p.color - 1, p.tone - 1, p.base - 1].flatMap(v => [(v >> 2) & 1, (v >> 1) & 1, v & 1])];
  return parseInt(bits.join(""), 2).toString(16).toUpperCase().padStart(4, "0");
}

/** A particle's address written as a sentence, read from a frame (default: its own dimension). */
export function addressSentence(p, { frame = p.dress.dimension, attractor = null } = {}) {
  const own = p.dress.dimension, D = DIMENSIONS[frame], L = lineFrom(frame, own, p.line);
  const term = D.chain[L - 1], nature = DIMENSIONS[own].natures[p.base - 1];
  const crossed = L !== p.line;
  const parts = [`${DIMENSIONS[own].componentKeynote}`,
    `${term}`,
    `gate ${p.gate}.${p.line}${crossed ? ` (read as line ${L} from ${frame})` : ""}`,
    `${nature}`,
    `color ${p.color} tone ${p.tone} base ${p.base} = ${hexOf(p)}`];
  let s = `${parts[0]} — ${parts[1]}, at ${parts[2]}; ${DIMENSIONS[own].human} through ${parts[3]}; ${parts[4]}`;
  if (attractor) {
    const d = attractor.form.reduce((n, b, i) => n + (b !== p.form[i]), 0);
    s += d === 0 ? `; it IS the attractor (gate ${attractor.gate})` : `; ${d} line${d > 1 ? "s" : ""} from the attractor (gate ${attractor.gate})`;
  }
  return { sentence: s, frame, own, line: p.line, readAs: L, term, nature, hex: hexOf(p), crossed,
    meaning: p.meaning.some(Boolean) ? "remembered" : "not yet remembered (Evolution = memory, fills from experience)" };
}

/** The swarm narrating itself: turn engine events (emergent.js Field) into sentences, each in its own frame. */
export function narrate(field, { since = 0 } = {}) {
  const out = [];
  const P = (id) => field.p.get(id);
  for (const s of field.shadow.filter(x => x.t > since)) {
    if (s.kind === "line-flip") {
      const p = P(s.particle), D = DIMENSIONS[p.dress.dimension];
      out.push({ t: s.t, frame: p.dress.dimension,
        sentence: `${D.componentKeynote}: line ${s.line} changed — ${D.chain[s.line - 1]} turned gate ${s.from} into gate ${s.to} (${s.cause}).` });
    } else if (s.kind === "bond-erased") {
      const [a, b] = s.edge.split(">").map(Number), A = P(a), B = P(b);
      out.push({ t: s.t, frame: A.dress.dimension,
        sentence: `${DIMENSIONS[A.dress.dimension].keynote}: the bond from gate ${A.gate}.${A.line} to gate ${B.gate}.${B.line} let go (${s.cause}).` });
    }
  }
  // recursion: within a living bond, what one side CREATES becomes the other side's ENVIRONMENT
  for (const e of [...field.edges.values()].filter(e => e.alive && e.bond.isVisible).slice(0, 50)) {
    const A = P(e.from), B = P(e.to);
    if (A.dress.dimension !== "Movement" && B.dress.dimension !== "Movement") continue;
    const LA = lineFrom("Movement", A.dress.dimension, A.line), LB = lineFrom("Movement", B.dress.dimension, B.line);
    if (DIMENSIONS.Movement.chain[LA - 1] === "Creation" && DIMENSIONS.Movement.chain[LB - 1] === "Environment")
      out.push({ t: field.t, frame: "Movement",
        sentence: `I Create: what gate ${A.gate}.${A.line} creates becomes the environment of gate ${B.gate}.${B.line}.` });
  }
  return out;
}
