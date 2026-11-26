// ternary.js — particles with +/0/- charge, motion vectors, and one meeting rule.
//
// USER (Nov 24): put the two swarms together and they fit as a ternary (+, 0, -); the charge tells an agent
// what kind of interaction it is in; particles float, cluster, react, limit, by their vectors; set the rules,
// let it go.
// CHARGE (my reading, flagged): a particle's bigram = its own line bit + its partner line's bit (1-4, 2-5, 3-6).
//   both yang -> +, both yin -> -, mixed -> 0 (the two sides read together, order not counted).
// MEETING RULE: Klein Table 2, multiplication of signs: (+)(+)=+, (-)(-)=+, (+)(-)=-, anything with 0 -> 0.
//   +  : pull together (harmony)
//   -  : push apart (dissonance)
//   0  : touch without force -> CONTACT: reaction and limitation are registered here
// PHYSICS FLAG: like signs ATTRACT here (sameness pulls together). That is NOT electric charge, where like
//   charges repel. It is a declared rule of this system.
// Every parameter below is declared, not sourced.

export const T = { range: 0.35, contact: 0.04, strength: 0.0006, damping: 0.92, maxSpeed: 0.02, minDist: 0.015 };

export const PARTNER = { 1: 4, 2: 5, 3: 6, 4: 1, 5: 2, 6: 3 };
export function chargeOf(p) {
  const own = p.form[p.line - 1], other = p.form[PARTNER[p.line] - 1];
  return own === other ? (own ? 1 : -1) : 0;
}
export const meet = (a, b) => a * b;                 // sign multiplication; 0 absorbs

export class TernaryWorld {
  constructor(particles) {
    this.ps = particles.map(p => {
      const a = p.longitude * Math.PI / 180, r = 0.35 + 0.1 * p.line;      // start on the wheel, line = ring
      return { id: p.id, gate: p.gate, line: p.line, address: p.address, dimension: p.dress.dimension,
        q: chargeOf(p), x: r * Math.cos(a), y: r * Math.sin(a), vx: 0, vy: 0, contacts: 0, limits: new Set() };
    });
    this.t = 0; this.log = [];
  }
  step() {
    this.t++;
    const P = this.ps, events = { harmony: 0, dissonance: 0, contact: 0 };
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const A = P[i], B = P[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d > T.range) continue;
      const m = meet(A.q, B.q);
      if (m === 0) {                                   // contact: no force, but it registers
        if (d < T.contact) { A.contacts++; B.contacts++; A.limits.add(B.id); B.limits.add(A.id); events.contact++;
          if (A.gate !== B.gate && this.log.length < 400) this.log.push({ t: this.t, kind: "contact", a: A.id, b: B.id,
            sentence: `gate ${A.gate}.${A.line} (${sym(A.q)}) met gate ${B.gate}.${B.line} (${sym(B.q)}): contact — neither pulled nor pushed; each found a limit.` }); }
        continue;
      }
      const f = (m * T.strength) / Math.max(d * d, T.minDist * T.minDist) * Math.min(1, d / T.minDist);
      const ux = dx / (d || 1), uy = dy / (d || 1);
      A.vx += f * ux; A.vy += f * uy; B.vx -= f * ux; B.vy -= f * uy;     // m>0 pulls together, m<0 pushes apart
      if (d < T.contact * 2) { m > 0 ? events.harmony++ : events.dissonance++;
        if (A.gate !== B.gate && this.log.length < 400 && (this.t % 10 === 0)) this.log.push({ t: this.t, kind: m > 0 ? "harmony" : "dissonance", a: A.id, b: B.id,
          sentence: m > 0 ? `gate ${A.gate}.${A.line} and gate ${B.gate}.${B.line} (${sym(A.q)}${sym(B.q)}): harmony — they pull together.`
                          : `gate ${A.gate}.${A.line} and gate ${B.gate}.${B.line} (${sym(A.q)}${sym(B.q)}): dissonance — they push apart.` }); }
    }
    for (const p of P) {
      p.vx *= T.damping; p.vy *= T.damping;
      const s = Math.hypot(p.vx, p.vy); if (s > T.maxSpeed) { p.vx *= T.maxSpeed / s; p.vy *= T.maxSpeed / s; }
      p.x += p.vx; p.y += p.vy;
      const r = Math.hypot(p.x, p.y); if (r > 1) { p.x /= r; p.y /= r; p.vx *= -0.5; p.vy *= -0.5; }   // the field has an edge
    }
    return events;
  }
  /** clusters = groups of particles closer than `link` (what you'd see as clumps) */
  clusters(link = 0.05) {
    const seen = new Set(), out = [];
    for (const p of this.ps) { if (seen.has(p.id)) continue;
      const stack = [p], c = []; seen.add(p.id);
      while (stack.length) { const a = stack.pop(); c.push(a);
        for (const b of this.ps) if (!seen.has(b.id) && Math.hypot(a.x - b.x, a.y - b.y) < link) { seen.add(b.id); stack.push(b); } }
      out.push(c); }
    return out;
  }
  snapshot() { return this.ps.map(p => [+p.x.toFixed(4), +p.y.toFixed(4), p.q]); }
}
const sym = (q) => (q > 0 ? "+" : q < 0 ? "−" : "0");
