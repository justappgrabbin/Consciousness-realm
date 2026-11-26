// needs.js — tools run only when something needs them (user, Nov 22).
//   look  → what came in is read (morph-mir for code/text files; part-finding, straight-on warp and shape reading for pictures)
//   need  → a gap between what was seen and what is known. Built so far: a file not yet understood.
//           (A shape never lived through is remembered directly by formation.js; it needs no tool.)
//   act   → only a formation whose tool can answer that need runs; no need, nothing runs
//   measure → did the gap close? The answer is kept as a rule with confidence (shape of a learned rule taken from Aura:
//            condition / action / confidence / successes / failures — the LLM part of Aura is not used)
//   retry → if the gap stayed open, the next attempt must use a different tool (gated retry, from Experiential RL,
//            Shi et al. 2026, without its training); a second try that closes the gap raises that tool's rule.
import * as FS from "./function_side.js";

// Which tools can answer which need, before anything is learned. This starting list is Claude's reading of each tool's
// own job (morph-mir analyses files; autoling learns patterns; diseminer reads relations; grammar coder codes structure);
// the user can replace it. Learned confidence takes over from here.
export const CAN_ANSWER = {
  "understand-file": ["morph-mir", "autoling-lite", "computational-grammar-coder", "diseminer"],
};

export class Needs {
  constructor(saved) { this.open = []; this.closed = []; this.rules = saved?.rules ?? {}; this.seq = 0; }
  rule(kind, tool) { return (this.rules[kind] ??= {})[tool] ??= { condition: kind, action: tool, confidence: 0.5, success: 0, fail: 0 }; }
  /** Register a gap. Same subject + kind is one need, not many. */
  raise(kind, subject, detail = {}) {
    const k = `${kind}:${subject}`; if (this.open.some(n => n.key === k) || this.closed.some(n => n.key === k)) return null;
    const n = { id: ++this.seq, key: k, kind, subject, detail, attempts: [] }; this.open.push(n); return n;
  }
  /** Tools to try for a need, best first, never one already tried on it. */
  candidates(need) {
    const tried = new Set(need.attempts.map(a => a.tool));
    const pool = new Set([...(CAN_ANSWER[need.kind] ?? []), ...Object.keys(this.rules[need.kind] ?? {})]);
    return [...pool].filter(t => !tried.has(t)).sort((a, b) => this.rule(need.kind, b).confidence - this.rule(need.kind, a).confidence);
  }
  /** Record an attempt. closes=true means the gap closed. Confidence moves toward the outcome (rate 0.3). */
  record(need, tool, closes, result) {
    const r = this.rule(need.kind, tool); closes ? r.success++ : r.fail++;
    r.confidence += ((closes ? 1 : 0) - r.confidence) * 0.3;
    need.attempts.push({ tool, closes, retry: need.attempts.length > 0, reason: closes ? null : result?.reason ?? "gap stayed open" });
    if (closes) { this.open = this.open.filter(n => n !== need); this.closed.push(need); }
  }
  export() { return { rules: this.rules }; }
}

/** Formations available right now: each bonded group that pools to a whole hexagram, with its tool. */
export function formationsNow(S) {
  const out = [];
  for (const u of S.units) { if (u.broken || !u.particle || !u.bonds?.length) continue;
    const mates = u.bonds.map(e => S.units[e.a === u.id ? e.b : e.a]).filter(o => o && !o.broken && o.particle)
      .sort((p, q) => Math.hypot(p.x - u.x, p.y - u.y) - Math.hypot(q.x - u.x, q.y - u.y));
    const lines = FS.formationLines([u, ...mates]); if (!lines) continue; const a = FS.abilityOf(lines);
    if (a?.tool) out.push({ lead: u, lines, tool: a.tool, kind: a.kind }); }
  return out;
}

/** How each need kind is answered by a tool, and how we tell the gap closed. */
const ANSWER = {
  "understand-file": {
    input: (need, tool) => tool === "morph-mir" ? { operation: "ingest", name: need.detail.name, content: need.detail.text } : { text: need.detail.text, operation: "export" },
    closes: (need, r, tool) => {
      if (tool !== "morph-mir" || !r.ok) return { closes: false };
      const id = r.output?.artifactId; if (!id) return { closes: false };
      const a = FS.runToolOp("morph-mir", { operation: "analyze", artifactId: id });
      const u = a?.understanding, known = !!u && (u.functionality?.length ?? 0) > 0;     // understood = it could say what the file does
      return { closes: known, meaning: u ? { intent: u.intent, does: u.functionality, needs: u.dependencies, patterns: u.patterns, role: a.blueprint?.fileRole } : null };
    },
  },
};

/** One pass: for each open need, the best untried tool that a formation can supply right now runs once. */
export function act(S, N) {
  const forms = formationsNow(S), done = [];
  for (const need of [...N.open]) {
    const want = N.candidates(need), f = want.map(t => forms.find(x => x.tool === t)).find(Boolean);
    if (!f) continue;                                    // no formation can answer it yet: the need stays open, nothing runs
    const A = ANSWER[need.kind]; let r;
    try { r = FS.runToolOp(f.tool, A.input(need, f.tool)); r = { ok: !!r, output: r }; } catch (e) { r = { ok: false, reason: String(e?.message ?? e) }; }
    const m = A.closes(need, r, f.tool); N.record(need, f.tool, m.closes, r);
    f.lead.output = { tool: f.tool, need: need.kind, subject: need.subject, closed: m.closes, meaning: m.meaning ?? null };
    done.push(f.lead.output);
  }
  return done;
}
