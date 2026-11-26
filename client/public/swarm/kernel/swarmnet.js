// swarmnet.js — the swarm IS the neural network (user's BHANTUGH spec §22-24).
//
// §22: "Connected agents can assemble executable computational graphs. Each agent acts as an operator
// or computational node. Each valid connection acts as an edge carrying data between nodes."
//   Gate -> activation function     Tone -> edge weight     Color -> edge weight / parameter
//   Base -> bias                    Dimension -> computational pipeline
// §23: the leading dimension (highest connection density) selects the output pipeline.
// §24: compositional pattern-producing networks — coordinates in, color/intensity/position/motion out.
//
// Nothing here is trained or imported: the network is built from the particles' own addresses and the
// bonds they form. MY choices (flagged, correct them):
//   - which activation a gate gives: its LOWER trigram picks one of 8 CPPN functions (below)
//   - weight = tone polarity (tones 1-3 negative, 4-6 positive) x color magnitude (color / 6)
//   - bias = (base - 3) / 2   -> base 1..5 maps to -1 .. +1
//   - edge direction: lower line -> higher line, ties broken by longitude (keeps the graph acyclic)
//   - input nodes: every line-1 particle (the foundation line) reads one input coordinate, chosen by its TONE (tone = the senses;
//     house is empty without an ascendant), in addition to whatever its bonds carry in; nodes with no incoming edge read one too

import { evaluateSwarmBond } from "./bond.js";
import { trigramName } from "./loshu.js";

export const ACTIVATIONS = {
  Qian: ["identity", (x) => x],
  Kun: ["gaussian", (x) => Math.exp(-x * x)],
  Zhen: ["relu", (x) => Math.max(0, x)],
  Xun: ["sigmoid", (x) => 1 / (1 + Math.exp(-x))],
  Kan: ["sin", (x) => Math.sin(x)],
  Li: ["tanh", (x) => Math.tanh(x)],
  Gen: ["abs", (x) => Math.abs(x)],
  Dui: ["cos", (x) => Math.cos(x)],
};
export const DIMENSIONS = ["Movement", "Evolution", "Being", "Design", "Space"];

const activationOf = (p) => trigramName(p.form.slice(0, 3).join(""));
const weightOf = (p) => (p.tone <= 3 ? -1 : 1) * (p.color / 6);
const biasOf = (p) => (p.base - 3) / 2;
const before = (a, b) => a.line < b.line || (a.line === b.line && a.longitude < b.longitude);

/** Build the network from a field of particles. Only VISIBLE bonds (>=3 connections) become edges. */
export function buildNet(particles, inputNames = ["x", "y", "d", "t"]) {
  const nodes = new Map(particles.map(p => [p.id, {
    id: p.id, particle: p, act: activationOf(p), bias: biasOf(p), dimension: p.dress.dimension,
    inputs: [], outputs: [],
  }]));
  const density = Object.fromEntries(DIMENSIONS.map(d => [d, 0]));
  for (let i = 0; i < particles.length; i++)
    for (let j = i + 1; j < particles.length; j++) {
      const A = particles[i], B = particles[j];
      const bond = evaluateSwarmBond(A, B);
      if (!bond.isVisible) continue;
      const [from, to] = before(A, B) ? [A, B] : [B, A];
      const w = weightOf(from) * (bond.connectionCount / 5);   // stronger bond carries more
      nodes.get(to.id).inputs.push({ from: from.id, w });
      nodes.get(from.id).outputs.push(to.id);
      density[A.dress.dimension]++; density[B.dress.dimension]++;
    }
  const live = [...nodes.values()].filter(n => n.inputs.length || n.outputs.length);
  live.forEach(n => { if (!n.inputs.length || n.particle.line === 1) n.reads = inputNames[(n.particle.tone - 1) % inputNames.length]; });
  const order = [...live].sort((a, b) => a.particle.line - b.particle.line || a.particle.longitude - b.particle.longitude);   // topological
  const leading = Object.entries(density).sort((a, b) => b[1] - a[1])[0][0];
  const outputs = live.filter(n => !n.outputs.length);
  return { nodes, order, outputs, density, leading, edges: live.reduce((s, n) => s + n.inputs.length, 0), inputNames };
}

/** One forward pass. `input` = { x, y, d, t }. Returns the output nodes' values. */
export function forward(net, input) {
  const v = new Map();
  for (const n of net.order) {
    // fan-in normalised (mean, scaled by sqrt of fan-in) so a node with many bonds is not pinned at saturation
    const carried = n.inputs.length ? n.inputs.reduce((a, e) => a + e.w * (v.get(e.from) ?? 0), 0) * 3 / Math.sqrt(n.inputs.length) : 0;
    const s = carried + (n.reads !== undefined ? 2 * input[n.reads] : 0);
    v.set(n.id, ACTIVATIONS[n.act][1](s + n.bias));
  }
  return net.outputs.map(n => v.get(n.id));
}

/** Squash a list of output values to one number in 0..1. */
const squash = (vals) => { const s = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length); return (Math.tanh(s) + 1) / 2; };

/** §23 — the leading dimension picks what the network produces. */
export const PIPELINES = {
  // motion: a trajectory over time
  Movement: (net, n = 60) => Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1) * 2 - 1, o = forward(net, { x: Math.cos(t * Math.PI), y: Math.sin(t * Math.PI), d: 1, t });
    return { t, x: squash(o.filter((_, k) => k % 2 === 0)), y: squash(o.filter((_, k) => k % 2 === 1)) };
  }),
  // recurrent refinement: the output is fed back in as the next input
  Evolution: (net, steps = 30) => {
    let s = { x: 0.1, y: -0.1, d: 0, t: 0 }; const seq = [];
    for (let i = 0; i < steps; i++) { const o = squash(forward(net, s)); seq.push(o); s = { x: o * 2 - 1, y: s.x, d: Math.hypot(s.x, s.y), t: i / steps }; }
    return seq;
  },
  // image: a CPPN over the plane
  Being: (net, w = 96, h = 96) => {
    const px = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = i / (w - 1) * 2 - 1, y = j / (h - 1) * 2 - 1;
      px[j * w + i] = Math.round(255 * squash(forward(net, { x, y, d: Math.hypot(x, y), t: 0 })));
    }
    return { w, h, px };
  },
  // structure: a layout of the network's own output nodes, sized by their response
  Design: (net) => ({ layout: net.outputs.map((n, k) => ({ node: n.id, gate: n.particle.gate, line: n.particle.line,
    weight: +squash(forward(net, { x: k / net.outputs.length, y: 0, d: 0, t: 0 })).toFixed(3) })) }),
  // space: 3-D points sampled from the network
  Space: (net, n = 200) => Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996, r = Math.sqrt(i / n), x = r * Math.cos(a), y = r * Math.sin(a);
    return { x, y, z: squash(forward(net, { x, y, d: r, t: 0 })) * 2 - 1 };
  }),
};

export function run(net) { return { leading: net.leading, output: PIPELINES[net.leading](net) }; }
