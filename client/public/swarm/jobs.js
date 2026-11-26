// jobs.js — the swarm works out what it has to do; the tools are qualities its units already carry.
// No manual switch needed: what came in + what the swarm already holds = the job.
// Which units answer a job comes from their own address: the unit's ASCII byte (opcodeOf, from its bits)
// is compared to the spec's opcode bytes (bhantugh_ops.OPCODES); closer byte = stronger answer.
import { OPCODES } from "./bhantugh_ops.js";

// Which spec opcodes each job is made of. This grouping is Claude's reading of the opcode names — not from the user's pages; correct it freely.
export const JOB_OPCODES = {
  form:   ["attract", "flock", "orbit"],   // gather into the picture
  reskin: ["morph"],                       // change surface, keep body
  open:   ["branch", "exit"],              // part swings away
  lift:   ["spiral", "repel"],             // part moves off
  finish: ["align", "flock"],              // close gaps from neighbours
};
const BYTE = Object.fromEntries(Object.entries(OPCODES).map(([b, n]) => [n, +b]));
const ham = (a, b) => { let x = (a ^ b) & 0x7f, n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

/** How strongly one unit answers a job: 1 = its byte is that opcode, 0 = every bit differs. */
export function affinity(u, job) {
  const ops = JOB_OPCODES[job]; if (!ops) return 0;
  return Math.max(...ops.map(o => 1 - ham(u.opcode.byte, BYTE[o]) / 7));
}

/** Units in the order they take up a job: strongest first, ties broken by the leader's depth then id. */
export function answerOrder(units, job) {
  return units.map(u => [u, affinity(u, job)]).sort((a, b) => b[1] - a[1] || a[0].id - b[0].id).map(x => x[0]);
}

/**
 * Read the job from what came in and what the swarm already holds.
 * input: { files: [{kind}], touch: bool }   state: { hasPicture: bool }
 */
export function readJob(input, state) {
  if (input.touch) return state.hasPicture ? "touch-part" : "touch-unit";
  const kinds = (input.files ?? []).map(f => f.kind);
  if (!kinds.length) return null;
  if (!state.hasPicture) return "form";
  if (kinds.every(k => k === "color")) return "reskin";   // only surface came in: body stays, surface changes
  return "form";                                         // new body (normal/packed/mask) = a new thing to form
}

/** A job spreading through the swarm: each tick the next band of units takes it up. */
export class JobWave {
  constructor(units, job, perTick = null) { this.job = job; this.order = answerOrder(units, job); this.i = 0; this.per = perTick ?? Math.max(1, Math.ceil(this.order.length / 40)); }
  tick(apply) { const end = Math.min(this.order.length, this.i + this.per); for (; this.i < end; this.i++) apply(this.order[this.i]); return this.done; }
  /** Spread by time instead of frames, so a slow phone still finishes in about `ms`. */
  tickTimed(apply, now = Date.now(), ms = 2500) { this.t0 ??= now; const want = Math.min(this.order.length, Math.ceil(this.order.length * (now - this.t0) / ms));
    for (; this.i < want; this.i++) apply(this.order[this.i]); return this.done; }
  get done() { return this.i >= this.order.length; }
  get progress() { return this.order.length ? this.i / this.order.length : 1; }
}
