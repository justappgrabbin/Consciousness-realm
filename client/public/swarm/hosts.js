// hosts.js — two kinds of host, written the way a HOST would describe itself to the organism. These are not the organism.
// Each offers: materials (typed observations), what its world allows (pure primitives), its own check, how a descendant lives.
import { World } from "./hostworld.js";
import { UnitSystem, trial } from "./morph.js";
import { observe as obsApp, discover as discApp, runHost } from "./lifecycle.js";

// ---------- a world simulation ----------
export function worldHost(W, check, { enough = 0.9 } = {}) {
  W.checks = [check];
  const ids = Array.from({ length: 24 }, (_, i) => `trial-${i}`);
  return { name: W.name, kind: "world", enough,
    check: () => W.fork().run(120).score(), checkAlone: () => W.fork().run(120).score(),
    materials: () => ({
      types: { edge: x => ["top", "bottom", "left", "right", "anywhere"].includes(x), heading: x => Array.isArray(x) && x.length === 2,
        mode: x => ["no", "trail", "contact"].includes(x), colour: x => Array.isArray(x) && x.length === 3, fit: x => x && typeof x.score === "number" },
      // what this world has to offer: its edges, directions on its grid, ways a thing can leave a mark, the colours it can show
      observations: [...["top", "bottom", "left", "right", "anywhere"].map(v => ({ id: "edge_" + v, type: "edge", value: v })),
        ...[[0, 1], [0, -1], [-1, 0], [1, 0]].map((v, i) => ({ id: "heading_" + i, type: "heading", value: v })),
        ...["no", "trail", "contact"].map(v => ({ id: "mode_" + v, type: "mode", value: v })),
        ...W.palette.map((v, i) => ({ id: "colour_" + i, type: "colour", value: v }))],
      // the world allows a thing to appear, move, and leave a mark; trying it here means running a fork of the world
      primitives: [{ id: "behave", dimension: "Movement", inputs: { appear: "edge", move: "heading", mark: "mode", colour: "colour" }, output: "fit",
        run: ({ appear, move, mark, colour }) => { const b = { appear, move, wander: 0, stopOnContact: 0, leaveColour: mark, colour };
          return { score: +trial(W, b, ids).toFixed(2), behaviour: b }; } }],
      need: "the world's own check is below " + enough, goal: { type: "fit", constraints: [{ path: ["score"], minimum: enough }] } }),
    descend: ({ result, carry }) => ({ label: `${carry.length} unit(s) as one of the world's systems`, standalone: true,
      system: new UnitSystem(result.behaviour, carry.map((c, i) => `${W.name}-descendant-${i}`), { seed: 11 }) }),
    integrate: d => W.systems.push(d.system), world: W };
}

// ---------- an incomplete application ----------
const IMPL = { xor: "a.map((x,i)=>x^b[i])", equivalence: "a.map((x,i)=>x===b[i]?1:0)", nand: "a.map((x,i)=>(x&&b[i])?0:1)", not: "v.map(x=>x?0:1)" };
export function appHost(files, { enough = 1 } = {}) {
  const host = { files: files.map(f => ({ ...f })) }, need = () => discApp(obsApp(host.files))[0];
  return { name: files.map(f => f.path).join("+"), kind: "app", enough,
    check: () => runHost(host.files).ok ? 1 : 0, checkAlone: () => runHost(host.files.map(f => ({ path: f.path, text: f.text }))).ok ? 1 : 0,
    materials: () => { const n = need(), cols = Array.from({ length: n.arity }, (_, k) => n.cases.map(c => c.args[k]));
      return { observations: cols.map((v, k) => ({ id: "arg" + k, type: "bits", value: v })), primitives: [],
        need: `${n.name} (${n.cases.length} cases)`, goal: { type: "bits", constraints: [{ path: [], equals: n.cases.map(c => c.out) }] }, fn: n }; },
    descend: ({ graph, builder }) => { const n = need(), ins = Array.from({ length: n.arity }, (_, k) => "arg" + k), body = [];
      const val = (env, r) => env[r] ?? (r.startsWith("$") && ins.includes(r.replace(/^\$(a_|z_)?/, "")) ? `[${r.replace(/^\$(a_|z_)?/, "")}]` : undefined);
      const emit = (g, env) => { for (const s of g.steps) { const a = Object.values(s.inputs).map(r => val(env, r));
          const reg = builder.registry.get(s.primitive);
          if (reg?.formation) { const ext = Object.keys(reg.inputs), subEnv = Object.fromEntries(ext.map((k, i) => ["$" + k, a[i]]));
            env[s.id] = emit({ steps: reg.formation.plan.map(p => ({ id: p.id, primitive: p.op, inputs: p.inputs })), output: reg.formation.output }, subEnv); continue; }
          if (s.primitive.startsWith("cluster.")) { const sub = builder.core.require(builder.registry.get(s.primitive).entityId).state;
            const subEnv = Object.fromEntries(Object.keys(sub.inputs).map((k, i) => ["$" + k, a[i]])); env[s.id] = emit(sub.graph, subEnv); continue; }
          const v = "v" + body.length; const impl = IMPL[s.primitive]; if (!impl) throw Error("no standalone form for " + s.primitive);
          body.push(`  const ${v} = ((a, b, v) => ${impl})(${a[0]}, ${a[1] ?? "null"}, ${a[0]});`); env[s.id] = v; }
        return env[g.output]; };
      const out = emit(graph, {});
      const code = `// descendant of the swarm: ${graph.steps.map(s => s.primitive).join(" → ")}; standalone\nexport function ${n.name}(${ins.join(", ")}) {\n${body.join("\n")}\n  return ${out}[0];\n}\n`;
      return { label: `${n.path} grown into the app`, standalone: !/swarm|organism/.test(code.split("\n").slice(1).join("\n")), path: n.path, code }; },
    integrate: d => { const f = host.files.find(x => x.path === d.path); if (f) f.text += "\n" + d.code; else host.files.push({ path: d.path, text: d.code }); },
    app: host };
}

// ---------- ANY software environment: observable state, operations it allows, constraints, evaluable requirements ----------
// spec: { name, files:[{path,text}] (its own tests assert what it needs), materials:[{id,type,value}],
//         operations:[{id,inputs,output,run,dimension?}], types:{name:validator},
//         requirement:{ name, path, params:[materialIds], outType, cases:[{args:{id:value}, out}] } }
export function softwareHost(spec, { enough = 1 } = {}) {
  const files = spec.files.map(f => ({ ...f })), R = spec.requirement;
  return { name: spec.name, kind: "software:" + R.outType, enough,
    check: () => runHost(files).ok ? 1 : 0, checkAlone: () => runHost(files.map(f => ({ path: f.path, text: f.text }))).ok ? 1 : 0,
    materials: () => ({ types: spec.types ?? {}, observations: spec.materials, primitives: spec.operations, need: `${R.name}(${R.params.join(", ")}) → ${R.outType}`,
      goal: { type: R.outType, constraints: [{ path: [], equals: R.cases[0].out }] },
      cases: R.cases.map(c => ({ inputs: { ...Object.fromEntries(spec.materials.map(o => [o.id, o.value])), ...c.args }, goal: { type: R.outType, constraints: [{ path: [], equals: c.out }] } })) }),
    descend: ({ formation, ops, rename }) => {
      // the descendant carries its own executable operations (their source), the formation's wiring, and the constants it used
      const flat = []; const expand = (plan, output, env) => { for (const s of plan) { const op = ops.get(s.op), ins = Object.fromEntries(Object.entries(s.inputs).map(([p, r]) => [p, env[r] ?? r]));
          if (op?.formation?.plan?.length) { const sub = Object.fromEntries(Object.keys(op.inputs).map(k => ["$" + k, ins[k]])); env[s.id] = expand(op.formation.plan, op.formation.output, { ...sub }); continue; }
          const id = "s" + flat.length; flat.push({ id, op: s.op, inputs: ins }); env[s.id] = id; } return env[output]; };
      const out = expand(formation.plan, formation.output, {});
      const used = [...new Set(flat.map(s => s.op))], src = used.map(id => `  ${JSON.stringify(id)}: ${ops.get(id).run.toString()}`);
      const params = R.params.map(p => rename(p)), consts = spec.materials.filter(o => !R.params.includes(o.id)).map(o => [rename(o.id), o.value]);
      const code = `// descendant of the swarm (formation: ${flat.map(s => s.op).join(" → ")}). Standalone: its operations travel with it.\n`
        + `const OPS = {\n${src.join(",\n")}\n};\nconst CONST = ${JSON.stringify(Object.fromEntries(consts.map(([k, v]) => ["$" + k, v])))};\nconst STEPS = ${JSON.stringify(flat)};\n`
        + `export function ${R.name}(${R.params.join(", ")}) {\n  const v = { ...CONST, ${params.map((p, i) => `${JSON.stringify("$" + p)}: ${R.params[i]}`).join(", ")} };\n`
        + `  for (const s of STEPS) { const a = {}; for (const [k, r] of Object.entries(s.inputs)) a[k] = v[r]; v[s.id] = OPS[s.op](a); }\n  return v[${JSON.stringify(out)}];\n}\n`;
      return { label: `${R.path} grown into ${spec.name}`, standalone: true, path: R.path, code }; },
    integrate: d => { const f = files.find(x => x.path === d.path); if (f) f.text += "\n" + d.code; else files.push({ path: d.path, text: d.code }); },
    app: { files } };
}
