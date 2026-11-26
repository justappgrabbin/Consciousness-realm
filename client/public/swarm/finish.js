// finish.js — the live swarm finishes a dropped app (browser; selfhost.js does the same for its own folder in Node).
// Reads the dropped files, finds functions the app imports or asserts on but nothing defines, takes the examples from
// the app's own asserts (assert(JSON.stringify(f(...)) === "...")), and lets the UNITS construct each one
// (morphogenesis.enter over softwareHost) from the toolbox plus abilities learned from repositories plus what it grew
// before. Only a function that meets every example — and the one held back, when there are 3+ — is handed back.
import { enter } from "./morphogenesis.js";
import { softwareHost } from "./hosts.js";
import { runHost } from "./lifecycle.js";
import { TOOLBOX, TYPES } from "./toolbox.js";

const typeOf = v => Object.keys(TYPES).find(t => TYPES[t](v)) ?? null;

/** every needed function: name, the file that wants it, examples from asserts */
export function needsOf(files) {
  const defined = new Set(), wanted = new Map();
  for (const f of files) {
    for (const m of f.text.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
    for (const m of f.text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g))
      for (const n of m[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (!wanted.has(n)) wanted.set(n, { name: n, path: m[2].replace(/^\.\//, ""), examples: [] });
    for (const m of f.text.matchAll(/assert\(\s*JSON\.stringify\(\s*([A-Za-z_$][\w$]*)\((.*?)\)\s*\)\s*===\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g)) {
      let args, out; try { args = JSON.parse("[" + m[2] + "]"); out = JSON.parse(JSON.parse(m[3].startsWith("'") ? '"' + m[3].slice(1, -1).replace(/"/g, '\\"') + '"' : m[3])); } catch { continue; }
      const w = wanted.get(m[1]) ?? { name: m[1], path: m[1] + ".js", examples: [] }; w.examples.push({ args, out }); wanted.set(m[1], w);
    }
  }
  return [...wanted.values()].filter(w => !defined.has(w.name) && w.examples.length);
}

export function finishApp(O, files, { abilities = [], grown = [], budget = 4000 } = {}) {
  const report = [];
  for (const need of needsOf(files)) {
    const ex0 = need.examples[0], params = ex0.args.map((v, i) => ({ id: "p" + i, type: typeOf(v) })), outType = typeOf(ex0.out);
    if (params.some(p => !p.type) || !outType) { report.push({ name: need.name, ok: false, why: "best guess impossible: its examples use kinds of values the swarm has no parts for yet (" + JSON.stringify(ex0).slice(0, 80) + ")" }); continue; }
    const ex = need.examples.map(e => ({ args: Object.fromEntries(e.args.map((v, i) => ["p" + i, v])), out: e.out }));
    const seen = ex.length >= 3 ? ex.slice(0, -1) : ex, held = ex.length >= 3 ? ex.at(-1) : null;
    const consts = new Set(); for (const e of ex) if (typeof e.out === "string") { const inT = JSON.stringify(e.args); for (const ch of new Set(e.out)) if (!inT.includes(ch) && !/[A-Za-z0-9]/.test(ch)) consts.add(ch); for (const v of Object.values(e.args)) if (typeof v === "string" && v.includes(" ")) consts.add(" "); }
    const mats = [...params.map(p => ({ id: p.id, type: p.type, value: seen[0].args[p.id] })), ...[...consts].map((v, i) => ({ id: "c" + i, type: "text", value: v }))];
    const ops = [...grown, ...TOOLBOX, ...abilities].filter(p => Object.values(p.inputs).every(t => t in TYPES) && p.output in TYPES);
    const call = a => `${need.name}(${params.map(p => JSON.stringify(a[p.id])).join(", ")})`;
    const testOf = list => `import { ${need.name} } from './${need.path}';\n` + list.map(e => `assert(JSON.stringify(${call(e.args)}) === ${JSON.stringify(JSON.stringify(e.out))});`).join("\n") + "\n";
    const host = softwareHost({ name: "app:" + need.name, types: TYPES, files: [{ path: "test.js", text: testOf(seen) }], materials: mats, operations: ops,
      requirement: { name: need.name, path: need.path, params: params.map(p => p.id), outType, cases: seen.map(e => ({ args: e.args, out: e.out })) } });
    let r; try { r = enter(O, host, { budget }); } catch (e) { report.push({ name: need.name, ok: false, why: "construction error: " + e.message }); continue; }
    const st = n => r.steps.filter(s => s.step === n).at(-1);
    if (!r.ok) { report.push({ name: need.name, ok: false, why: st("fail")?.reason ?? "not built", steps: r.steps }); continue; }
    const code = host.app.files.find(f => f.path === need.path).text;
    if (held && !runHost([{ path: need.path, text: code }, { path: "test.js", text: testOf([held]) }]).ok) { report.push({ name: need.name, ok: false, why: "fits the examples it saw, fails the one held back — not handed over" }); continue; }
    report.push({ name: need.name, ok: true, path: need.path, code, plan: st("construct").plan, by: st("construct").by, cases: `${need.examples.length}/${need.examples.length}` });
  }
  return report;
}
