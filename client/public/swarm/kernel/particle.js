// particle.js — one particle with its own individual qualities.
//
// Address: the FULL 13-field address is kept on every particle as its dressing — planet, dimension
// and zodiac tell it where it is and where it is from in the swarm (user, Nov 24 correction).
// They are NOT counted in the calculation: every vector, ATO, cluster and coupling below uses only
//   1. gate . line . color . tone . base
//   2. degree . minute . second . arc
//   3. house
// `dress` holds the full address; `calc` holds exactly the fields allowed into math.
// Every particle is made from a real longitude through v61's addressOf(), so no two need be alike.
//
// Three Boolean vectors per particle — Klein's own form (Creativity paper: "each element of the
// morphological database is represented by three Boolean vectors, (for phonological features,
// morphological codes, and semantic features)"). Mapping onto the address is MY reading, correct it:
//   form    (morphological) = the 6-bit King Wen mask of the particle's gate
//   sound   (phonological)  = color, tone, base as 3 bits each (9 bits); tone = the senses
//   meaning (semantic)      = starts all 0; filled only by what the particle learns (nothing invented)
//
// Pitch: the arc-second value. 0 = closed orbit, spins but cannot be grabbed (no coupling).
// > 0 = angles outward, can couple. (User: "it would just be zero".)

import { addressOf, formatAddress, ADDRESS_FIELDS } from "../address.js";

/** The only address fields allowed into calculation. Planet, dimension, zodiac are dressing. */
export const CALC_FIELDS = ["gate", "line", "color", "tone", "base", "degree", "minute", "second", "arc", "house"];
export const DRESS_ONLY = ["planetary", "dimension", "zodiac"];
import { maskFromKingWen } from "../kingwen.js";
import { toBits } from "./klein4.js";

export const MEANING_WIDTH = 16;

export function makeParticle(id, longitude, { body = 0, ascendant = null } = {}) {
  const a = addressOf(body, longitude, ascendant);
  const mask = maskFromKingWen(a.gate);                       // bit0 = bottom line
  const form = Array.from({ length: 6 }, (_, i) => (mask >> i) & 1);   // index 0 = line 1
  const sound = [...toBits(a.color - 1, 3), ...toBits(a.tone - 1, 3), ...toBits(a.base - 1, 3)];
  const dress = Object.fromEntries(ADDRESS_FIELDS.map(k => [k, a[k]]));
  dress.side = a.side;
  return {
    id,
    dress,                                  // full address: where it is / where it is from
    address: formatAddress(a),
    calc: Object.fromEntries(CALC_FIELDS.map(k => [k, a[k]])),
    gate: a.gate, line: a.line, color: a.color, tone: a.tone, base: a.base,
    degree: a.degree, minute: a.minute, second: a.second, arc: a.arc,
    house: a.house,
    yang: form[a.line - 1],                 // this particle's own line in its hexagram
    form, sound, meaning: new Array(MEANING_WIDTH).fill(0),
    pitch: a.arc,                           // 0..99
    longitude: a.longitude,
  };
}

export const canCouple = (p) => p.pitch !== 0;
