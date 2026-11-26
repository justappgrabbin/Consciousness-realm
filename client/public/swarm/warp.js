// warp.js — see a surface straight on (port of the user's perspective_warper.py + the perspective repo's corner step).
// Original: OpenCV getPerspectiveTransform + warpPerspective. Here: the same 8-unknown homography solved directly
// (Gaussian elimination), bilinear sampling, output size = longest top/bottom width × longest left/right height (as the original).

const dist = (p, q) => Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]));

/** Homography mapping 4 src points to 4 dst points. Returns 3x3 as a flat array [h0..h7, 1]. */
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const n = 8, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-12) throw new Error("points are degenerate (three on a line?)");
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return [...M.map((r, i) => r[n] / r[i]), 1];
}
export const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };

/** Corners of a set of pixels, ordered tl, tr, br, bl (extreme x+y and x−y, the usual four-corner rule). */
export function cornersOf(pixels) {
  let tl, tr, br, bl, a = Infinity, b = -Infinity, c = -Infinity, d = Infinity;
  for (const [x, y] of pixels) { const s = x + y, t = x - y;
    if (s < a) { a = s; tl = [x, y]; } if (s > c) { c = s; br = [x, y]; } if (t > b) { b = t; tr = [x, y]; } if (t < d) { d = t; bl = [x, y]; } }
  return [tl, tr, br, bl];
}

/** Warp the quad in an RGBA image to a straight-on rectangle. Returns {w, h, data}. */
export function warp(rgba, W, Hh, quad) {
  const [tl, tr, br, bl] = quad, w = Math.max(1, Math.max(dist(tl, tr), dist(bl, br))), h = Math.max(1, Math.max(dist(tl, bl), dist(tr, br)));
  const Hinv = homography([[0, 0], [w, 0], [w, h], [0, h]], quad), out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [sx, sy] = apply(Hinv, x + 0.5, y + 0.5), x0 = Math.floor(sx - 0.5), y0 = Math.floor(sy - 0.5), fx = sx - 0.5 - x0, fy = sy - 0.5 - y0;
    for (let k = 0; k < 4; k++) { let v = 0;
      for (const [dx, dy, wt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
        const px = Math.min(W - 1, Math.max(0, x0 + dx)), py = Math.min(Hh - 1, Math.max(0, y0 + dy)); v += rgba[(py * W + px) * 4 + k] * wt; }
      out[(y * w + x) * 4 + k] = v; } }
  return { w, h, data: out };
}
