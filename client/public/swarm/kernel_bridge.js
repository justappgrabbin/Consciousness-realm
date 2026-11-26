// kernel_bridge.js — the v63 kernel running ON the live swarm's own units (not a second swarm).
// Every unit gets its kernel particle (kernel/particle.js: form/sound/meaning vectors from its address). On those:
//   ternary.js   +/0/- charge per unit and Klein Table-2 sign multiplication when two units are near: like draws in,
//                unlike pushes off, 0 only registers the contact (a nudge on the live positions, nothing else).
//   emergent.js  channels emerge (Hamming 1, 3-2-1 line pairs), nets form and are selected by channel kind; dissonance
//                builds tension → a changing line → the line flips. The flip is the unit's CURRENT gate (u.current);
//                its birth address is never overwritten (user: fixed birth address + seen as its progression).
//   sentence.js  the unit's address written as a sentence (shown when tapped).
// Latent gates (no longitude of their own) sit at the middle of their line on the wheel.
import { makeParticle } from "./kernel/particle.js";
import { chargeOf, meet } from "./kernel/ternary.js";
import { Field } from "./kernel/emergent.js";
import { addressSentence } from "./kernel/sentence.js";
import { WHEEL, WHEEL_START } from "./address.js";

const lonOf = a => a.longitude ?? (WHEEL_START + WHEEL.indexOf(a.gate) * 5.625 + ((a.line ?? 1) - 0.5) * 0.9375) % 360;

export class KernelBridge {
  constructor(S) { this.S = S; this.field = null; this.n = 0; this.flips = 0; this.meetings = 0; this.rebuild(); }
  rebuild() {
    const live = this.S.units.filter(u => !u.broken);
    for (const u of live) { u.kp ??= makeParticle(u.id, lonOf(u.address), { body: 0 }); u.charge = chargeOf(u.kp); }
    this.field = new Field(live.map(u => u.kp)); this.n = live.length; this.byId = new Map(live.map(u => [u.id, u]));
  }
  /** one kernel event: nets run, tension, changing lines; flips become each unit's current gate */
  step() {
    if (this.S.units.filter(u => !u.broken).length !== this.n) this.rebuild();
    const before = this.field.shadow.length; this.field.step();
    for (const ev of this.field.shadow.slice(before)) if (ev.kind === "line-flip") { const u = this.byId.get(ev.particle); if (u) { u.current = { gate: ev.to, line: ev.line, from: ev.from, cause: ev.cause }; this.flips++; } }
    for (const u of this.byId.values()) u.tension = u.kp.tension ?? 0;
    if (this.field.shadow.length > 3000) this.field.shadow.splice(0, this.field.shadow.length - 1500);   /* keep memory bounded in a live page */
    return { formations: this.field.formations?.size ?? 0, flips: this.flips, shadow: this.field.shadow.length };
  }
  /** the +/0/- meeting rule on live positions */
  meetAll(radius = 0.06, push = 0.0015) {
    const us = [...this.byId.values()]; let m = 0;
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (!d || d > radius) continue;
      const s = meet(a.charge, b.charge); m++; if (!s) continue;                  // 0: contact registers limits only
      const f = s * push / d; a.x += dx * f; a.y += dy * f; b.x -= dx * f; b.y -= dy * f; }   // +: closer · -: apart
    this.meetings += m; return m;
  }
  sentence(u) { try { return addressSentence(u.kp, { frame: u.address.field && u.address.field !== "sample chart" ? u.address.field : u.kp.dress.dimension }).sentence; } catch (e) { return ""; } }
}
