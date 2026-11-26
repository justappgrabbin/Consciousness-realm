// repo_abilities.js — new abilities from a GitHub repository, tried ONLY in the sealed chamber (chamber.js).
// Harvest: exported functions from self-contained JS modules (no imports/require) + the examples their own tests state
// (expect(fn(...)).toBe/toEqual(...), assert.equal/deepEqual/strictEqual(fn(...), ...)). Adopt: every example is run in the
// chamber; only functions passing ALL their own examples (at least 2), with consistent types, become operations.
// They are marked sandboxed: only Movement units carry them (user's chamber idea), and they always run through the chamber.
import { getText } from "./research.js";

export async function repoFiles(fullName, { maxFiles = 400, filter = p => /\.(m?js)$/.test(p) && !/node_modules|dist\/|\.min\./.test(p) } = {}) {
  const meta = JSON.parse(await getText(`https://api.github.com/repos/${fullName}`)), branch = meta.default_branch;
  const tree = JSON.parse(await getText(`https://api.github.com/repos/${fullName}/git/trees/${branch}?recursive=1`));
  const paths = (tree.tree ?? []).filter(t => t.type === "blob" && filter(t.path)).map(t => t.path).slice(0, maxFiles), files = [];
  for (const p of paths) { try { files.push({ path: p, text: await getText(`https://raw.githubusercontent.com/${fullName}/${branch}/${p}`) }); } catch {} }
  return { files, branch, truncated: !!tree.truncated };
}

function splitArgs(s) { const out = []; let d = 0, q = null, cur = "";
  for (const c of s) { if (q) { cur += c; if (c === q) q = null; continue; } if (c === "'" || c === '"' || c === "`") { q = c; cur += c; continue; }
    if ("([{".includes(c)) d++; if (")]}".includes(c)) d--; if (c === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += c; }
  if (cur.trim()) out.push(cur.trim()); return out; }
export const strip = src => src.replace(/export\s+default\s+function/g, "function").replace(/export\s+(function|const|let|class)/g, "$1");

export function harvest(files) {
  const tests = files.filter(f => /test|spec/i.test(f.path)), fns = [];
  for (const f of files) { if (tests.includes(f) || /^\s*import\s/m.test(f.text) || /require\(/.test(f.text)) continue;
    for (const m of f.text.matchAll(/export\s+(?:default\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g))
      fns.push({ name: m[1], params: m[2].split(",").map(s => s.trim().replace(/=.*$/, "")).filter(Boolean), path: f.path, source: f.text, examples: [] }); }
  for (const fn of fns) for (const t of tests) { if (!t.text.includes(fn.name)) continue;
    for (const m of t.text.matchAll(new RegExp(`expect\\(\\s*${fn.name}\\(([^;]*?)\\)\\s*\\)\\.(?:toBe|toEqual|toStrictEqual)\\(([^;]*?)\\)\\s*;`, "g"))) fn.examples.push({ args: m[1], out: m[2] });
    for (const m of t.text.matchAll(new RegExp(`assert\\.(?:equal|strictEqual|deepEqual|deepStrictEqual)\\(\\s*${fn.name}\\(([^;]*?)\\)\\s*,\\s*([^;]*?)\\)\\s*;`, "g"))) fn.examples.push({ args: m[1], out: m[2] }); }
  return fns.filter(f => f.examples.length);
}
const typeOf = v => typeof v === "number" ? "number" : typeof v === "string" ? "text" : typeof v === "boolean" ? "boolean" : Array.isArray(v) ? (v.every(x => typeof x === "number") ? "numbers" : "list") : v && typeof v === "object" ? "record" : null;

/** Adopt through the chamber. Returns { kept: [operations], refused: [{name, why}] }. Every call of a kept operation also runs in the chamber. */
export async function adopt(chamber, fns, { minExamples = 2, timeout = 800 } = {}) {
  const kept = [], refused = [];
  for (const fn of fns) {
    const body = strip(fn.source), call = async args => { const r = await chamber.run(`${body}\nreturn ${fn.name}(...args.list);`, { list: args }, { timeout }); if (!r.ok) throw Error(r.error); return r.result; };
    const ex = []; for (const e of fn.examples) { const a = await chamber.run(`return [[${splitArgs(e.args).join(",")}], (${e.out})];`, {}, { timeout });
      if (a.ok) ex.push({ args: a.result[0], out: a.result[1] }); }
    let pass = 0; for (const e of ex) { try { if (JSON.stringify(await call(e.args)) === JSON.stringify(e.out)) pass++; } catch {} }
    const sig = ex[0]?.args.map(typeOf), outT = ex[0] && typeOf(ex[0].out);
    if (ex.length < minExamples || pass < ex.length || !sig || sig.some(t => !t) || !outT || ex.some(e => e.args.map(typeOf).join() !== sig.join() || typeOf(e.out) !== outT)) {
      refused.push({ name: fn.name, from: fn.path, why: `${pass}/${ex.length} of its own examples pass in the chamber, or its types vary` }); continue; }
    const inputs = Object.fromEntries(sig.map((t, i) => [fn.params[i] ?? "p" + i, t]));
    kept.push({ id: "gh." + fn.name, inputs, output: outT, dimension: "Movement", sandboxed: true, source: fn.source, fnName: fn.name, from: fn.path, examples: ex.length,
      call: list => call(list) });
  }
  return { kept, refused };
}
