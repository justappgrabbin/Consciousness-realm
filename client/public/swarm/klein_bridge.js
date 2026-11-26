// klein_bridge.js — the swarm and the Klein Mesh Game Engine (v5.1, user's) working as one.
// The engine is not a separate program here: the swarm's own life is its "game", and the engine's Klein tools
// are how the swarm learns from what it has been.
//   AUTOLING    learns the swarm's grammar of interaction from every touch: [touch, <part>, <what happened>]
//   DISEMINER   keeps the dependency web: part -> action -> result, transitive closure (what can lead to what)
//   Comp-Gram-Coder classifies each element it meets (part, action, result) into its word classes
//   Historical Change can evolve what was learned (not run automatically)
// When a part is touched, the swarm ASKS the engine first ("what did touching a part like this do before?");
// only when nothing has been learned does it fall back to the default rule (open about the hinge).
import KMGE from "./vendor/kmge.js";
const { KleinMeshGameEngine } = KMGE;

/** A part's kind, from its own shape: tall and narrow = upright panel (door-like), wide = lid/drawer-like, small = fitting. */
export function partKind(part, w, h) {
  const pw = (part.x1 - part.x0) * w, ph = ((part.y1 ?? part.x1) - (part.y0 ?? part.x0)) * h;
  if (part.size < 40) return "fitting";
  return ph > pw * 1.4 ? "upright" : pw > ph * 1.4 ? "wide" : "square";
}

export class SwarmKlein {
  constructor() {
    const log = console.log; console.log = () => {};                 // the engine prints a lot; keep the page quiet
    this.engine = new KleinMeshGameEngine(); this.engine.createGame("swarm", "Synthia swarm", "simulation"); this.engine.switchGame("swarm");
    console.log = log; this.events = 0;
  }
  get ctx() { return this.engine.getActiveGame(); }

  /** Feed one interaction the swarm went through. sequence = [action, part kind, result]. */
  learn(sequence) {
    const log = console.log; console.log = () => {};
    try { this.engine.ingestGameplay("swarm", { actions: sequence });
      for (let i = 0; i + 1 < sequence.length; i++) this.ctx.diseMiner.addLink(sequence[i], sequence[i + 1], true, "swarm", 1);
      this.ctx.diseMiner.computeTransitiveClosure(); }
    finally { console.log = log; }
    this.events++;
  }

  /** What the engine has learned a touch on this kind of part does (null if nothing learned yet). */
  suggest(action, kind) {
    const rules = this.ctx.grammar.getRules().filter(r => r.isSentenceRule && r.rhs[0] === action && r.rhs[1] === kind);
    if (!rules.length) return null;
    const tally = new Map(); for (const r of rules) tally.set(r.rhs[2], (tally.get(r.rhs[2]) ?? 0) + Math.max(0.0001, r.frequency));
    return [...tally].sort((a, b) => b[1] - a[1])[0][0];
  }
  /** DISEMINER: can this lead to that (directly or through other things)? */
  canLeadTo(a, b) { return this.ctx.diseMiner.isPossible(a, b); }
  /** Does AUTOLING's grammar accept this sequence as something the swarm "can say"? */
  canSay(seq) { return this.ctx.grammar.canYouSay(seq); }
  stats() { const g = this.ctx.grammar.getStats(); return { events: this.events, rules: g.rules, links: this.ctx.diseMiner.exportDirectLinks().length }; }

  /** Save / restore what was learned (rules + links), so it lives with the swarm's memory. */
  export() { return { rules: this.ctx.grammar.getRules(), links: this.ctx.diseMiner.exportDirectLinks(), events: this.events }; }
  import(state) {
    if (!state) return;
    for (const r of state.rules ?? []) this.ctx.grammar.importRule(r, r.sourceContext ?? "swarm", 1);
    for (const l of state.links ?? []) this.ctx.diseMiner.addLink(l.from, l.to, l.transitive ?? true, "swarm", l.weight ?? 1);
    this.ctx.diseMiner.computeTransitiveClosure(); this.events += state.events ?? 0;
  }
}
