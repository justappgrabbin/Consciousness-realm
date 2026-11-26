// formation.js — the swarm reads its own shape from the inside (Badalov 2026, UMD MS thesis,
// "Distributed Swarm Formation Recognition via Local Features and Gossip-Averaged GNNs", ch. 3-4).
// Each unit knows only neighbours within radius r and the distance to them.
// Kept from the thesis exactly: the 10D feature (5 distance + 5 structural, Table 3.1) and weight-free gossip averaging (§4.2).
// NOT from the thesis: the 3 trained message-passing layers and the trained classifier are left out (user: no training first).
// In their place, message passing is plain neighbourhood averaging (same as gossip, no weights), and the averaged
// vector is matched against formations the swarm has already lived through (experience), not a trained label set.

function neighbours(units, r) {
  const cell = r, grid = new Map(), key = (i, j) => i * 100003 + j;
  units.forEach((u, k) => { const kk = key(Math.floor(u.x / cell), Math.floor(u.y / cell)); (grid.get(kk) ?? grid.set(kk, []).get(kk)).push(k); });
  return units.map((u, k) => { const gi = Math.floor(u.x / cell), gj = Math.floor(u.y / cell), out = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const m of grid.get(key(gi + a, gj + b)) ?? []) {
      if (m === k) continue; const d = Math.hypot(units[m].x - u.x, units[m].y - u.y); if (d <= r) out.push([m, d]); }
    return out; });
}

/** 10D per unit: (mean d, min d, max d, std d, degree) ‖ (degree, λ unlinked neighbour pairs, γ linked pairs, ρ two-hop reach, η hub). Distances in units of r. */
export function features(units, r) {
  const N = neighbours(units, r), sets = N.map(n => new Set(n.map(x => x[0])));
  return units.map((u, v) => {
    const ds = N[v].map(x => x[1] / r), deg = ds.length;
    const mean = deg ? ds.reduce((a, b) => a + b, 0) / deg : 0, min = deg ? Math.min(...ds) : 0, max = deg ? Math.max(...ds) : 0;
    const sd = deg ? Math.sqrt(ds.reduce((a, b) => a + (b - mean) ** 2, 0) / deg) : 0;
    const nb = N[v].map(x => x[0]); let lam = 0, gam = 0;
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) sets[nb[i]].has(nb[j]) ? gam++ : lam++;
    const two = new Set(); for (const j of nb) for (const w of sets[j]) if (w !== v && !sets[v].has(w)) two.add(w);
    const eta = deg >= 3 && lam > gam ? 1 : 0;
    return [mean, min, max, sd, deg, deg, lam, gam, two.size, eta];
  });
}

/** Weight-free rounds: every unit takes the mean of itself and its neighbours (thesis §4.2). */
export function gossip(units, vecs, r, rounds = 5, N = neighbours(units, r)) {
  let h = vecs.map(v => v.slice());
  for (let t = 0; t < rounds; t++) h = h.map((hv, v) => { const s = hv.slice(); for (const [m] of N[v]) for (let i = 0; i < s.length; i++) s[i] += h[m][i];
    return s.map(x => x / (N[v].length + 1)); });
  return h;
}

/** The whole reading: 3 plain passing rounds (thesis has 3 trained layers here) + 5 gossip rounds = 8 hops of reach per unit. */
export function readFormation(units, r, { passing = 3, rounds = 5 } = {}) {
  const live = units.filter(u => !u.broken), N = neighbours(live, r);
  const h = gossip(live, gossip(live, features(live, r), r, passing, N), r, rounds, N);
  const whole = h[0].map((_, i) => h.reduce((a, v) => a + v[i], 0) / (h.length || 1));
  return { perUnit: h, whole, units: live };   // perUnit = what each unit believes about the part of the swarm it can reach
}

const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

/** Recognition by experience: the nearest formation already lived through. No labels exist until the swarm has formed something. */
export class FormationMemory {
  constructor(list = []) { this.list = list; }
  remember(name, vec) { this.list.push({ name, vec: vec.map(x => +x.toFixed(4)) }); }
  recognize(vec) { let best = null; for (const f of this.list) { const d = dist(vec, f.vec); if (!best || d < best.distance) best = { name: f.name, distance: d }; } return best; }
  export() { return this.list; }
}
