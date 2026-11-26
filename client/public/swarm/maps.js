// maps.js — each level has its own colour schema (user, Nov 22). The same red/green/blue numbers mean different
// things per level, the way 3D texture maps do:
//   Being     -> COLOR  map: the actual colour (what it is made of)
//   Movement  -> NORMAL map: which way the surface faces (r = left/right, g = up/down, b = toward you)
//   Evolution -> GLOW   map: light it gives off / catches (added on top)
//   Design    -> MASK   map: which part is which (used to find parts like doors)
//   Space     -> results from the four (the combined picture)
// The pairing of level to map is Claude's guess the user agreed to try. Detection is from the numbers themselves.
export const LEVEL_OF_MAP = { color: "Being", normal: "Movement", glow: "Evolution", mask: "Design", packed: "not assigned yet" };

/** Which kind of map an RGBA image is, from its own numbers. */
export function classifyMap(d) {
  let r = 0, g = 0, b = 0, a = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; }
  r /= n; g /= n; b /= n; a /= n;
  if (Math.abs(r - 128) < 30 && Math.abs(g - 128) < 30 && b > 200) return "normal";
  if (b < 4 && a < 230) return "packed";            // packed material map: R metallic, G occlusion, B detail (empty), A smoothness
  if (a < 220) return r / Math.max(1, g) > 0.1 ? "glow" : "mask";
  return "color";
}

/** Combine the levels into what is seen: colour lit by the normal map, glow added; mask kept for parts. */
export function combineMaps(maps, w, h, light = [-0.4, -0.5, 0.77]) {
  const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L, lz = light[2] / L, out = new Uint8ClampedArray(w * h * 4);
  const hx = lx, hy = ly, hz = lz + 1, H = Math.hypot(hx, hy, hz);          // half-way vector, viewer straight on
  for (let i = 0; i < w * h; i++) { const q = i * 4;
    let r = 128, g = 128, b = 128;
    if (maps.color) { r = maps.color[q]; g = maps.color[q + 1]; b = maps.color[q + 2]; }
    else if (maps.mask) { r = maps.mask[q]; g = maps.mask[q + 1]; b = maps.mask[q + 2]; }
    let nx = 0, ny = 0, nz = 1;
    if (maps.normal) { nx = maps.normal[q] / 127.5 - 1; ny = -(maps.normal[q + 1] / 127.5 - 1); nz = maps.normal[q + 2] / 127.5 - 1; }
    const diffuse = maps.normal ? Math.max(0.25, nx * lx + ny * ly + nz * lz) * 1.15 : 1;
    if (maps.packed) {
      const metal = maps.packed[q] / 255, ao = 0.35 + 0.65 * maps.packed[q + 1] / 255, smooth = maps.packed[q + 3] / 255;
      const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / H), 8 + 56 * smooth) * smooth;
      const base = [r, g, b].map(v => v * diffuse * ao * (1 - 0.5 * metal));            // metal shows less of its own diffuse
      const tint = metal > 0.5 ? [r, g, b].map(v => Math.min(255, v * 2.2)) : [255, 255, 255];   // metal reflects in its own colour
      r = base[0] + tint[0] * spec * 0.8; g = base[1] + tint[1] * spec * 0.8; b = base[2] + tint[2] * spec * 0.8;
    } else { r *= diffuse; g *= diffuse; b *= diffuse; }
    if (maps.glow) { const al = maps.glow[q + 3] / 255 * 0.6; r += maps.glow[q] * al; g += maps.glow[q + 1] * al; b += maps.glow[q + 2] * al; }
    out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = 255; }
  return out;
}
