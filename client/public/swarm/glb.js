// glb.js — read a .glb model and sample points on its surface (port of morphing-particle-swarm's _sampleSurface,
// without Three.js: the GLB container is parsed directly — 12-byte header, JSON chunk, BIN chunk — per the glTF 2.0 spec).
// Sampling is area-weighted over triangles, as in the original, with a seeded generator so the same model gives the same points.

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function parseGLB(buf) {
  const dv = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a .glb file");
  let off = 12, json = null, bin = null;
  while (off < dv.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), start = off + 8;
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(dv.buffer, start, len)));
    else if (type === 0x004e4942) bin = new DataView(dv.buffer, start, len);
    off = start + len; }
  if (!json || !bin) throw new Error("glb has no JSON or BIN chunk");
  const read = (ai, comps) => { const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType], stride = bv.byteStride || size * comps, out = [];
    for (let i = 0; i < a.count; i++) for (let c = 0; c < comps; c++) { const p = base + i * stride + c * size;
      out.push(a.componentType === 5126 ? bin.getFloat32(p, true) : a.componentType === 5125 ? bin.getUint32(p, true) : a.componentType === 5123 ? bin.getUint16(p, true) : bin.getUint8(p)); }
    return out; };
  const tris = [];
  for (const m of json.meshes ?? []) for (const pr of m.primitives) { if ((pr.mode ?? 4) !== 4) continue;
    const P = read(pr.attributes.POSITION, 3), I = pr.indices !== undefined ? read(pr.indices, 1) : P.map((_, i) => i).slice(0, P.length / 3);
    for (let i = 0; i + 2 < I.length; i += 3) tris.push([0, 1, 2].map(k => [P[I[i + k] * 3], P[I[i + k] * 3 + 1], P[I[i + k] * 3 + 2]])); }
  return tris;   // node transforms are not applied (the original samples mesh space too)
}

const area = ([a, b, c]) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]); };

/** n points on the surface, area-weighted, normalised to fit a unit cube centred on 0. */
export function sampleSurface(tris, n, seed = 1, normalise = true) {
  const r = rng(seed), cum = []; let tot = 0; for (const t of tris) cum.push(tot += area(t));
  const pts = [];
  for (let i = 0; i < n; i++) { const x = r() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; cum[m] < x ? lo = m + 1 : hi = m; }
    const [a, b, c] = tris[lo]; let s = r(), t = r(); if (s + t > 1) { s = 1 - s; t = 1 - t; }
    pts.push([0, 1, 2].map(k => a[k] + s * (b[k] - a[k]) + t * (c[k] - a[k]))); }
  if (!normalise) return pts;
  const mn = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k]))), mx = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])));
  const sc = Math.max(...mx.map((v, k) => v - mn[k])) || 1;
  return pts.map(p => p.map((v, k) => (v - (mn[k] + mx[k]) / 2) / sc));
}

/** Seen from an angle (radians about the vertical axis), as 2-D screen targets in 0..1. */
export const project = (pts, yaw = 0.6, pitch = 0.35) => pts.map(([x, y, z]) => {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw), y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  return { x: 0.5 + x1 * 0.5, y: 0.5 - y1 * 0.5, depth: z1 }; });   // 0.5: a unit cube turned any way stays on screen
