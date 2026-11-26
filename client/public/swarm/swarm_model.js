// swarm_model.js — the trained five-dimension swarm, run in pure JS (no deps).
// Same math as swarm5d.py / hd_swarm.py: features -> 3 GNN layers -> 5 gossip rounds -> classifier.
import { PARTNERS, CENTER, CENTERS, matchDepth, arc } from "./address.js";

const PRIMARIES = [[0, 4], [1, 7], [2, 8], [3, 6]];   // Size, Closeness, Reach, Gaps (metric col, topological col)
export const PRIMARY_NAMES = ["Size", "Closeness", "Reach", "Gaps", "Perspective"];

/** Communication graph under the three laws (CHANNEL, CENTER, WHEEL r) + match-law weights. */
export function buildGraph(addresses, r) {
  const n = addresses.length, A = [], W = [], D = [];
  for (let i = 0; i < n; i++) { A.push(new Array(n).fill(0)); W.push(new Array(n).fill(0)); D.push(new Array(n).fill(0)); }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = addresses[i], b = addresses[j], d = arc(a.longitude, b.longitude);
    if (PARTNERS[a.gate].has(b.gate) || CENTER[a.gate] === CENTER[b.gate] || d <= r) {
      A[i][j] = A[j][i] = 1; W[i][j] = W[j][i] = (1 + matchDepth(a, b)) / 6; }
    D[i][j] = D[j][i] = Math.max(d, 1e-3);
  }
  return { A, W, D };
}

/** The paper's 10 raw local features per robot. */
export function rawFeatures(A, D) {
  const n = A.length;
  return A.map((row, v) => {
    const N = row.map((x, j) => x ? j : -1).filter(j => j >= 0), deg = N.length, d = N.map(j => D[v][j]);
    const mean = d.reduce((s, x) => s + x, 0) / deg, std = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / deg);
    let gamma = 0; for (let a = 0; a < deg; a++) for (let b = a + 1; b < deg; b++) gamma += A[N[a]][N[b]];
    const lam = deg * (deg - 1) / 2 - gamma, two = new Set();
    for (const j of N) for (let w = 0; w < n; w++) if (A[j][w] && w !== v && !row[w]) two.add(w);
    return [mean, Math.min(...d), Math.max(...d), std, deg, deg, lam, gamma, two.size, +(deg >= 3 && lam > gamma)];
  });
}

/** Five dimensions: four fused primaries + Perspective (interplay). */
export function fiveDims(R, mu, sd) {
  return R.map(row => {
    const Z = row.map((x, k) => (x - mu[k]) / sd[k]);
    const P = PRIMARIES.map(([a, b]) => (Z[a] + Z[b]) / Math.SQRT2);
    let s = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) s += P[i] * P[j];
    return [...P, s / 6];
  });
}

/** What each robot IS: center, own channel defined, where it leads. */
export function identity(gates) {
  const gs = new Set(gates);
  return gates.map(g => { const v = new Array(19).fill(0); v[CENTERS.indexOf(CENTER[g])] = 1;
    const def = [...PARTNERS[g]].filter(p => gs.has(p)); v[9] = +(def.length > 0);
    for (const p of def) v[10 + CENTERS.indexOf(CENTER[p])] = 1; return v; });
}

const matvec = (M, X) => M.map(row => X[0].map((_, c) => row.reduce((s, m, k) => s + m * X[k][c], 0)));
const dense = (X, Wt, b, relu) => X.map(x => Wt.map((w, o) => { const z = w.reduce((s, wi, i) => s + wi * x[i], b[o]); return relu ? Math.max(z, 0) : z; }));
export function meanOp(W) { return W.map((row, i) => { const r = row.map((x, j) => x + (i === j ? 1 : 0)), s = r.reduce((a, b) => a + b, 0); return r.map(x => x / s); }); }

export class SwarmModel {
  constructor(bundle) { this.p = bundle.weights; this.stats = bundle.stats; this.gossip = bundle.gossip; this.types = bundle.types; }
  /** Inputs for a graph: standardized five dims + identity. */
  inputs(A, D, gates) {
    const F = fiveDims(rawFeatures(A, D), this.stats.mu, this.stats.sd).map(f => f.map((x, k) => (x - this.stats.fmu[k]) / this.stats.fsd[k]));
    const I = identity(gates); return { five: F, X: F.map((f, i) => [...f, ...I[i]]) };
  }
  /** Forward pass. Returns per-robot embedding (after gossip), probabilities, prediction. */
  forward(W, X) {
    const M = meanOp(W); let h = X;
    for (let k = 0; k < 3; k++) h = dense(matvec(M, h), this.p[`W${k}`], this.p[`b${k}`], true);
    const local = h; for (let r = 0; r < this.gossip; r++) h = matvec(M, h);
    const z = dense(dense(h, this.p.C1, this.p.c1, true), this.p.C2, this.p.c2, false);
    const probs = z.map(l => { const m = Math.max(...l), e = l.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); });
    return { local, embedding: h, probs, pred: probs.map(p => p.indexOf(Math.max(...p))) };
  }
}
