// scene.js — what is where, and how the pieces relate (port of Morph3D v10's model-free parts:
// buildFromImage's colour-region split and inferRelationships). The learned detector and depth model in Morph3D
// download from CDNs (TensorFlow COCO-SSD, transformers depth) — those are AI models and are NOT ported.

const NAMES = ["dark neutral", "mid neutral", "light neutral", "bright neutral", "warm yellow", "warm red", "green", "blue"];
/** Morph3D's 8 colour labels: low-saturation pixels by brightness, others by dominant channel. */
export function labelOf(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), lum = (r + g + b) / 3;
  return max - min < 28 ? (lum < 65 ? 0 : lum < 130 ? 1 : lum < 205 ? 2 : 3) : max === r ? (g > r * 0.75 ? 4 : 5) : max === g ? 6 : 7;
}

/** Connected same-label regions (4-neighbour flood fill), largest first; regions under minSize are dropped (Morph3D: 12). */
export function regions(rgba, W, H, minSize = 12) {
  const ids = new Int8Array(W * H), seen = new Uint8Array(W * H), owner = new Int32Array(W * H).fill(-1), out = [];
  for (let k = 0; k < W * H; k++) ids[k] = labelOf(rgba[k * 4], rgba[k * 4 + 1], rgba[k * 4 + 2]);
  for (let k = 0; k < W * H; k++) { if (seen[k]) continue; const label = ids[k], q = [k]; seen[k] = 1;
    let minx = W, maxx = 0, miny = H, maxy = 0, sr = 0, sg = 0, sb = 0, n = 0;
    for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
      sr += rgba[c * 4]; sg += rgba[c * 4 + 1]; sb += rgba[c * 4 + 2]; n++;
      for (const v of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) if (v >= 0 && v < W * H && !seen[v] && ids[v] === label) { seen[v] = 1; q.push(v); } }
    if (n >= minSize) { const r = { label, name: NAMES[label], n, bbox: [minx, miny, maxx - minx + 1, maxy - miny + 1], color: [sr / n, sg / n, sb / n], cx: 0, cy: 0 };
      for (const c of q) { owner[c] = out.length; r.cx += c % W; r.cy += (c / W) | 0; } r.cx /= n; r.cy /= n; out.push(r); } }
  const order = out.map((r, i) => i).sort((a, b) => out[b].n - out[a].n), newId = new Map(order.map((i, k) => [i, k + 1]));
  for (const [i, r] of out.entries()) r.id = newId.get(i);
  for (let k = 0; k < W * H; k++) if (owner[k] >= 0) owner[k] = newId.get(owner[k]); else owner[k] = 0;
  const R = order.map(i => out[i]); Object.defineProperty(R, "map2d", { value: { owner, W, H } }); return R;
}

/** Morph3D's pairwise relations from boxes (kept as it was, not used by readScene any more). */
export function relationsByBox(items) {
  const e = [], tag = o => `${o.name} #${o.id}`;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], A = a.bbox, B = b.bbox;
    const ix = Math.max(0, Math.min(A[0] + A[2], B[0] + B[2]) - Math.max(A[0], B[0])), iy = Math.max(0, Math.min(A[1] + A[3], B[1] + B[3]) - Math.max(A[1], B[1]));
    if ((ix * iy) / Math.max(1, Math.min(A[2] * A[3], B[2] * B[3])) > 0.16) { const f = A[2] * A[3] > B[2] * B[3] ? a : b, k = f === a ? b : a;
      e.push({ s: f.id, rel: "possibly in front of", o: k.id, text: `${tag(f)} possibly in front of ${tag(k)}`, basis: "overlapping boxes and apparent size" }); }
    else { const l = A[0] + A[2] / 2 < B[0] + B[2] / 2 ? a : b, r = l === a ? b : a;
      e.push({ s: l.id, rel: "left of", o: r.id, text: `${tag(l)} left of ${tag(r)}`, basis: "image coordinates" }); }
  }
  return e;
}

/** Relations from the regions' own pixels (fixes the box weakness: a background box no longer "contains" everything).
 *  Shared border is counted pixel by pixel. A region whose border is mostly another region is ON it (enclosed: in front of it);
 *  touching vertically → above; not touching → left of / above by where their pixels' centres are. */
export function relations(items, ENCLOSED = 0.75) {
  const { owner, W, H } = items.map2d, byId = new Map(items.map(r => [r.id, r])), tag = o => `${o.name} #${o.id}`;
  const border = new Map(), pair = new Map(), vert = new Map(), key = (a, b) => a + ":" + b;
  const add = (m, k, v = 1) => m.set(k, (m.get(k) ?? 0) + v);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = owner[y * W + x]; if (!a || !byId.has(a)) continue;
    for (const [nx, ny, down] of [[x + 1, y, false], [x, y + 1, true], [x - 1, y, false], [x, y - 1, false]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) { add(border, a); continue; }      // the picture's edge is border too
      const b = owner[ny * W + nx]; if (b === a) continue; add(border, a);
      if (b && byId.has(b)) { add(pair, key(a, b)); if (down) add(vert, key(a, b)); } } }
  const e = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], ab = pair.get(key(a.id, b.id)) ?? 0;
    const fa = ab / (border.get(a.id) || 1), fb = ab / (border.get(b.id) || 1);
    if (fb >= ENCLOSED || fa >= ENCLOSED) { const on = fb >= fa ? b : a, under = on === b ? a : b, f = Math.max(fa, fb);
      e.push({ s: on.id, rel: "on", o: under.id, text: `${tag(on)} on ${tag(under)}`, basis: `${Math.round(f * 100)}% of its border is the other` }); continue; }
    if (ab > 0) { const down = vert.get(key(a.id, b.id)) ?? 0, up = vert.get(key(b.id, a.id)) ?? 0;
      if (down + up > ab * 0.3) { const top = down >= up ? a : b, bot = top === a ? b : a;
        e.push({ s: top.id, rel: "above", o: bot.id, text: `${tag(top)} above ${tag(bot)} (touching)`, basis: `shares ${ab} border pixels, mostly top to bottom` }); continue; }
      const l = a.cx < b.cx ? a : b, r = l === a ? b : a;
      e.push({ s: l.id, rel: "beside", o: r.id, text: `${tag(l)} beside ${tag(r)} (touching, left)`, basis: `shares ${ab} border pixels side to side` }); continue; }
    const inBox = (p, q) => q.bbox[0] >= p.bbox[0] && q.bbox[1] >= p.bbox[1] && q.bbox[0] + q.bbox[2] <= p.bbox[0] + p.bbox[2] && q.bbox[1] + q.bbox[3] <= p.bbox[1] + p.bbox[3];
    if (inBox(a, b) || inBox(b, a)) { const out = inBox(a, b) ? a : b, inn = out === a ? b : a;   // a surround's centre says nothing about direction
      e.push({ s: inn.id, rel: "within", o: out.id, text: `${tag(inn)} within ${tag(out)}`, basis: "inside its extent, not touching" }); continue; }
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    if (Math.abs(dx) >= Math.abs(dy)) { const l = dx > 0 ? a : b, r = l === a ? b : a;
      e.push({ s: l.id, rel: "left of", o: r.id, text: `${tag(l)} left of ${tag(r)}`, basis: "pixel centres, not touching" }); }
    else { const t = dy > 0 ? a : b, d = t === a ? b : a; e.push({ s: t.id, rel: "above", o: d.id, text: `${tag(t)} above ${tag(d)}`, basis: "pixel centres, not touching" }); }
  }
  return e;
}

/** The whole reading of a picture: regions (top `keep`) and their relations. */
export function readScene(rgba, W, H, keep = 24) { const all = regions(rgba, W, H), R = all.slice(0, keep); Object.defineProperty(R, "map2d", { value: all.map2d });
  return { regions: R, relations: relations(R) }; }
