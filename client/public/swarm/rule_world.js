// rule_world.js — the rule book (resonance_rules.js) driving the living swarm. Attaches to a LivingSwarm; changes
// nothing in living.js. Each tick:
//   touch    two units touch when within reach; reach comes from the address's arc (the user: "the arc-second tells you
//            how far outside it travels") — here reach = base + arc/99 × span, in screen units.          [user]
//   sides    Personality and Design units only exchange through the Linknodes (Design North Node, Personality
//            South Node) — "the only place where they are linked to each other".                   [bt:primenode_linknode]
//   contact  resonance_rules.contact(): colour first, transference crosses but is a blind spot, line, and (inside
//            the same body) tone/base; no match = one unit of wear.                                       [user + bt]
//   carry    when a contact crosses, what the unit wears (its face = a function) travels by the exchange of the
//            channel the two gates make, if they make one: Collective shares one way, Communal is a deal (swap),
//            Individualistic rubs off (copy, nothing taken); no channel = the face is shared.   [bt:circuits_overview]
//   gates    units whose gates form a channel are drawn together a little — the gates are where it starts. [user]
//   mood     resonant contacts / all contacts, per unit, over time ("mood is how in resonance it is").        [user]
// Everything is one person's swarm here, so every contact is "inside"; outside contacts start when two swarms meet.
import { contact, channelBehaviour, loadRules, rules } from "./resonance_rules.js";
const isLinknode = u => (u.address?.side === "Design" && /north/i.test(u.address?.planetary ?? "")) || (u.address?.side === "Personality" && /south/i.test(u.address?.planetary ?? ""));
const CHANNEL_OF = new Map();
function channelKey(a, b) { if (!CHANNEL_OF.size && rules()) for (const k of Object.keys(rules().channels)) { const [x, y] = k.split("-").map(Number); CHANNEL_OF.set(x + ":" + y, k); CHANNEL_OF.set(y + ":" + x, k); } return CHANNEL_OF.get(a + ":" + b) ?? null; }

export class RuleWorld {
  constructor({ base = 0.03, span = 0.06, wear = 0.0015, pull = 0.0008 } = {}) { Object.assign(this, { base, span, wear, pull }); this.stats = { contacts: 0, crossed: 0, blind: 0, worn: 0, carried: 0, channelPulls: 0 }; this.mood = new Map(); }
  static async ready() { await loadRules(); return new RuleWorld(); }
  reach(u) { const arc = Number(u.address?.arcsecond ?? u.address?.arc ?? 0); return this.base + (Math.min(99, Math.max(0, arc)) / 99) * this.span; }
  tick(S) {
    const U = S.units.filter(u => !u.broken && u.address?.gate);
    for (let i = 0; i < U.length; i++) for (let j = i + 1; j < U.length; j++) {
      const a = U[i], b = U[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      const ch = channelKey(a.address.gate, b.address.gate);
      if (ch) { const k = this.pull * (1 - Math.min(1, d)); a.x += (b.x - a.x) * k; a.y += (b.y - a.y) * k; b.x += (a.x - b.x) * k; b.y += (a.y - b.y) * k; this.stats.channelPulls++; }
      if (d > Math.max(this.reach(a), this.reach(b))) continue;                              // not touching
      if (a.address.side !== b.address.side && !isLinknode(a) && !isLinknode(b)) continue;   // Design↔Personality only via Linknodes
      const c = contact(a.address, b.address, { inside: true, side: a.address.side ?? "Personality" });
      this.stats.contacts++; this.note(a, c.crosses); this.note(b, c.crosses);
      if (!c.crosses) { a.health = Math.max(0, (a.health ?? 1) - this.wear); b.health = Math.max(0, (b.health ?? 1) - this.wear); this.stats.worn++; continue; }
      this.stats.crossed++; if (c.by.blindSpot) this.stats.blind++;
      this.carry(a, b, ch, c.by);
    }
    return this.stats;
  }
  note(u, good) { const m = this.mood.get(u.id) ?? { good: 0, all: 0 }; m.good = m.good * 0.98 + (good ? 1 : 0); m.all = m.all * 0.98 + 1; this.mood.set(u.id, m); u.mood = m.good / m.all; }
  carry(a, b, ch, by) {
    if (!a.face && !b.face) return;
    const ex = ch ? channelBehaviour(...ch.split("-").map(Number))?.exchange : "share-one-way";
    const tag = f => f && ({ ...f, caught: true, blindSpot: !!by.blindSpot, via: ch ?? by.level });
    if (ex === "deal") { if (a.face && b.face) { const t = a.face; a.face = tag(b.face); b.face = tag(t); this.stats.carried++; } return; }   // nothing is free: both give
    const [from, to] = a.face && !b.face ? [a, b] : !a.face && b.face ? [b, a] : [null, null];
    if (!from) return;
    to.face = tag(from.face); this.stats.carried++;                                          // share one way, or rub off (copy, nothing taken)
  }
  moodOf(u) { const m = this.mood.get(u.id); return m ? m.good / m.all : null; }
}
