/**
 * MorphKernel.ts
 * Computational substrate for Morph OS v1.1-Resonance
 *
 * Architecture faithful to morph-os-kernel.js:
 *   "Trident GNN = routing + classification, not magic"
 *
 * Five circuit architectures running real computation:
 *   Knowing      → DFF  (Deep Feedforward, Hebbian weights)
 *   Understanding→ LSM  (Liquid State Machine, echo-state reservoir)
 *   Sensing      → MC   (Markov Chain, Bayesian transition matrix)
 *   Ego          → HMM  (Hidden Markov Model, forward algorithm)
 *   Integration  → Meta-Controller (gate routing, channel formation)
 *
 * IntegrationScheduler: all cross-circuit traffic routes through
 * gates 10 / 20 / 34 / 57. No direct circuit-to-circuit jumps.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CircuitType = 'knowing' | 'understanding' | 'sensing' | 'ego' | 'integration';

export interface CPGNode { type: string; name: string; }

export interface CPG {
  nodes: CPGNode[];
  edges: string[][];
  dataFlow:    { assignments: number; mutations: number; };
  controlFlow: { conditionals: number; loops: number; returns: number; };
  complexity:  { lines: number; functions: number; classes: number; branches: number; cyclomatic: number; };
}

export interface ArtifactContract {
  intent:       string;
  functions:    string[];
  dependencies: string[];
  interfaces:   string[];
  patterns:     string[];
  complexity:   CPG['complexity'];
}

export interface KernelArtifact {
  id:        string;
  name:      string;
  fileType:  string;
  cpg:       CPG;
  contract:  ArtifactContract;
  circuit:   CircuitType;
  gate:      number;
  timestamp: number;
  size:      number;
  confidence: number;
}

export interface ChannelInstance {
  name:        string;
  gates:       [number, number];
  architecture: string;
  description: string;
  circuit:     CircuitType;
  state:       'forming' | 'stable' | 'active';
  activatedAt: number;
}

export interface RoutePath {
  source:     CircuitType;
  target:     CircuitType;
  gate:       number;
  integrated: boolean;
  timestamp:  number;
}

export interface KernelLog {
  timestamp: number;
  module:    string;
  message:   string;
  level:     'info' | 'warn' | 'gate' | 'channel' | 'route';
}

// ─── Channel definitions (from trident-gnn-complete.json) ────────────────────

const CHANNEL_DEFS: Record<string, {
  gates: [number, number];
  architecture: string;
  description:  string;
  circuit:      CircuitType;
}> = {
  inspiration:  { gates: [1,  8],  architecture: 'DFF',             description: 'Creative inspiration',       circuit: 'knowing' },
  power_k:      { gates: [14, 33], architecture: 'DFF',             description: 'Power of the great',         circuit: 'knowing' },
  drive_k:      { gates: [54, 32], architecture: 'DFF',             description: 'Ambition and transformation', circuit: 'knowing' },
  wonder:       { gates: [28, 38], architecture: 'DFF',             description: 'Critical and opposition',    circuit: 'knowing' },
  logic:        { gates: [4,  63], architecture: 'LSM',             description: 'Logical formulation',        circuit: 'understanding' },
  acceptance:   { gates: [17, 62], architecture: 'LSM',             description: 'Following the flow',         circuit: 'understanding' },
  realization:  { gates: [11, 56], architecture: 'LSM',             description: 'Peace and wanderer',         circuit: 'understanding' },
  judgment:     { gates: [43, 23], architecture: 'LSM',             description: 'Breakthrough and splitting', circuit: 'understanding' },
  awakening_s:  { gates: [10, 20], architecture: 'MC',              description: 'Self-awareness',             circuit: 'sensing' },
  intuition_s:  { gates: [57, 20], architecture: 'MC',              description: 'Intuitive clarity',          circuit: 'sensing' },
  transmission: { gates: [16, 48], architecture: 'MC',              description: 'Skills and depth',           circuit: 'sensing' },
  mutation:     { gates: [60, 3],  architecture: 'MC',              description: 'Limitation and difficulty',  circuit: 'sensing' },
  money:        { gates: [21, 45], architecture: 'HMM',             description: 'Material resources',         circuit: 'ego' },
  survival_e:   { gates: [48, 16], architecture: 'HMM',             description: 'Depth and skills',           circuit: 'ego' },
  tribal:       { gates: [37, 40], architecture: 'HMM',             description: 'Family and deliverance',     circuit: 'ego' },
  collective:   { gates: [13, 33], architecture: 'HMM',             description: 'Fellowship and retreat',     circuit: 'ego' },
  awakening_i:  { gates: [10, 20], architecture: 'Meta-Controller', description: 'Self-awareness integration', circuit: 'integration' },
  intuition_i:  { gates: [10, 57], architecture: 'Meta-Controller', description: 'Intuitive integration',      circuit: 'integration' },
  drive_i:      { gates: [10, 34], architecture: 'Meta-Controller', description: 'Power integration',          circuit: 'integration' },
  penetrating:  { gates: [20, 57], architecture: 'Meta-Controller', description: 'Clarity integration',        circuit: 'integration' },
  power_i:      { gates: [20, 34], architecture: 'Meta-Controller', description: 'Charisma integration',       circuit: 'integration' },
  strength_i:   { gates: [34, 57], architecture: 'Meta-Controller', description: 'Strength integration',       circuit: 'integration' },
};

// Gate → circuit lookup (trident-gnn-complete.json §circuits)
const GATE_CIRCUIT_LOOKUP: Record<number, CircuitType> = {
  1:'knowing', 8:'knowing', 14:'knowing', 33:'knowing', 54:'knowing', 61:'knowing', 62:'knowing', 63:'knowing',
  4:'understanding', 17:'understanding', 24:'understanding', 47:'understanding',
  11:'understanding', 56:'understanding', 43:'understanding', 23:'understanding',
  10:'sensing', 20:'sensing', 31:'sensing', 41:'sensing', 7:'sensing', 13:'sensing', 25:'sensing', 36:'sensing',
  21:'ego', 51:'ego', 26:'ego', 40:'ego', 5:'ego', 15:'ego', 35:'ego', 45:'ego',
  // Integration gates override
  34:'integration', 57:'integration',
};
// The four integration gates also appear in sensing; override them
[10, 20, 34, 57].forEach(g => { GATE_CIRCUIT_LOOKUP[g] = 'integration'; });

export const INTEGRATION_GATES = [10, 20, 34, 57];

// Integration gate selection for cross-circuit routing
function selectIntegrationGate(source: CircuitType, target: CircuitType): number {
  const pair = [source, target].sort().join('-');
  const map: Record<string, number> = {
    'knowing-understanding':   10,
    'sensing-understanding':   20,
    'ego-understanding':       34,
    'knowing-sensing':         57,
    'ego-sensing':             34,
    'ego-knowing':             57,
    'integration-knowing':     10,
    'integration-understanding': 20,
    'integration-sensing':     57,
    'integration-ego':         34,
  };
  return map[pair] || 10;
}

// ─── CPG Parser (browser-safe, no fs) ────────────────────────────────────────

export interface CPGAnalysis {
  cpg:      CPG;
  contract: ArtifactContract;
  circuit:  CircuitType;
  gate:     number;
  confidence: number;
}

export function parseCPG(content: string, filename: string): CPGAnalysis {
  const ext = filename.split('.').pop()?.toLowerCase() || 'unknown';
  const lname = filename.toLowerCase();

  // ── Build AST nodes ──────────────────────────────────────────
  const nodes: CPGNode[] = [];

  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    (content.match(/(?:function\s+)(\w+)/g) || []).forEach(m =>
      nodes.push({ type: 'function', name: m.replace(/function\s+/, '') }));
    (content.match(/class\s+(\w+)/g) || []).forEach(m =>
      nodes.push({ type: 'class', name: m.replace('class ', '') }));
    (content.match(/(?:const|let|var)\s+(\w+)\s*=/g) || []).forEach(m =>
      nodes.push({ type: 'variable', name: m.replace(/(?:const|let|var)\s+/, '').replace('=', '').trim() }));
  } else if (ext === 'py') {
    (content.match(/def\s+(\w+)/g) || []).forEach(m =>
      nodes.push({ type: 'function', name: m.replace('def ', '') }));
    (content.match(/class\s+(\w+)/g) || []).forEach(m =>
      nodes.push({ type: 'class', name: m.replace('class ', '') }));
  } else if (['json'].includes(ext)) {
    nodes.push({ type: 'object', name: 'root' });
    try {
      const obj = JSON.parse(content);
      Object.keys(obj).slice(0, 8).forEach(k => nodes.push({ type: 'key', name: k }));
    } catch { /* malformed */ }
  } else if (['yaml', 'yml'].includes(ext)) {
    nodes.push({ type: 'document', name: 'yaml_doc' });
    (content.match(/^(\w[\w-]+):/gm) || []).slice(0, 8).forEach(m =>
      nodes.push({ type: 'key', name: m.replace(':', '') }));
  } else if (['html', 'htm'].includes(ext)) {
    (content.match(/<(\w+)/g) || []).slice(0, 12).forEach(t =>
      nodes.push({ type: 'element', name: t.slice(1) }));
  } else if (['css', 'scss'].includes(ext)) {
    (content.match(/([.#]?[\w-]+)\s*\{/g) || []).slice(0, 12).forEach(s =>
      nodes.push({ type: 'selector', name: s.replace('{', '').trim() }));
  }

  // ── Control / data flow ──────────────────────────────────────
  const dataFlow = {
    assignments: (content.match(/\b(let|const|var)\s+\w+\s*=/g) || []).length,
    mutations:   (content.match(/\w+\s*[+\-*]?=\s*[^=]/g) || []).length,
  };
  const controlFlow = {
    conditionals: (content.match(/\b(if|else|switch|case)\b/g) || []).length,
    loops:        (content.match(/\b(for|while|do)\b/g) || []).length,
    returns:      (content.match(/\breturn\b/g) || []).length,
  };
  const complexity = {
    lines:     content.split('\n').length,
    functions: (content.match(/\bfunction\b|\bdef\b/g) || []).length,
    classes:   (content.match(/\bclass\b/g) || []).length,
    branches:  controlFlow.conditionals + controlFlow.loops,
    cyclomatic: controlFlow.conditionals + controlFlow.loops + 1,
  };

  // ── Contract extraction ──────────────────────────────────────
  const intents: string[] = [];
  if (content.includes('class'))                                           intents.push('object_oriented');
  if (content.includes('function') || content.includes('=>'))             intents.push('functional');
  if (content.includes('async') || content.includes('await'))             intents.push('async');
  if (content.includes('import') || content.includes('require'))          intents.push('modular');
  if (content.includes('export'))                                          intents.push('library');
  if (content.includes('fetch') || content.includes('http'))              intents.push('network');
  if (content.includes('document') || content.includes('window'))         intents.push('browser');
  if (content.includes('process.') || content.includes('fs.'))            intents.push('node');

  const patterns: string[] = [];
  if (/addEventListener|\.on\(|new Event/.test(content))                  patterns.push('observer');
  if (/\.create\(|new \w+Factory/.test(content))                          patterns.push('factory');
  if (/getInstance\(\)|if\s*\(!\w+\)/.test(content))                     patterns.push('singleton');
  if (/class\s+\w+\s+extends/.test(content))                              patterns.push('inheritance');
  if (content.includes('Promise') || content.includes('async'))           patterns.push('async_pattern');
  if (content.includes('try') && content.includes('catch'))               patterns.push('error_handling');

  const interfaces: string[] = [];
  if (content.includes('module.exports'))  interfaces.push('commonjs');
  if (content.includes('export default'))  interfaces.push('esm_default');
  if (content.includes('export {'))        interfaces.push('esm_named');
  if (content.includes('export class'))    interfaces.push('esm_class');

  const functions = (content.match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\()/g) || [])
    .slice(0, 10).map(m => m.replace(/(?:function|const|let)\s+/, '').replace(/\s*=.*/, ''));

  const dependencies = (content.match(/(?:from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g) || [])
    .slice(0, 8).map(m => m.replace(/from\s+['"]|require\s*\(\s*['"]|['"]\)?/g, ''));

  const contract: ArtifactContract = {
    intent: intents.join(', ') || 'general',
    functions,
    dependencies,
    interfaces,
    patterns,
    complexity,
  };

  // ── Classify → circuit + gate ────────────────────────────────
  // Mirrors morph-os-kernel classifyCode + classifyFile
  let circuit: CircuitType = 'knowing';
  let gate = 1;

  if (ext === 'py') {
    circuit = 'knowing'; gate = 1;
  } else if (['yaml', 'yml'].includes(ext)) {
    circuit = 'understanding'; gate = 4;
  } else if (['json'].includes(ext)) {
    circuit = lname.includes('kernel') || lname.includes('trident') ? 'knowing' : 'understanding';
    gate    = lname.includes('kernel') || lname.includes('trident') ? 63 : 47;
  } else if (['html', 'htm'].includes(ext)) {
    circuit = 'ego'; gate = 45;
  } else if (['css', 'scss'].includes(ext)) {
    circuit = 'sensing'; gate = 10;
  } else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    if (intents.includes('async') && !intents.includes('object_oriented')) { circuit = 'sensing'; gate = 20; }
    else if (intents.includes('browser'))                                    { circuit = 'ego';     gate = 35; }
    else if (intents.includes('node'))                                       { circuit = 'sensing'; gate = 57; }
    else if (intents.includes('network'))                                    { circuit = 'knowing'; gate = 14; }
    else if (intents.includes('object_oriented'))                            { circuit = 'knowing'; gate = 1;  }
    else                                                                      { circuit = 'sensing'; gate = 13; }
  }

  // Confidence: 70 base − cyclomatic penalty + pattern bonus
  const confidence = Math.min(99, Math.max(30,
    70 - Math.min(20, complexity.cyclomatic) + patterns.length * 3
  ));

  const cpg: CPG = { nodes, edges: [], dataFlow, controlFlow, complexity };
  return { cpg, contract, circuit, gate, confidence };
}

// ═══════════════════════════════════════════════════════════════════════════
// ── DFF — Knowing Circuit ─────────────────────────────────────────────────
// Deep Feedforward Network with Hebbian weight updates.
// Stores knowledge representations from ingested artifacts.
// Input: 8-d gate activation vector → Output: 8-d knowledge vector
// ═══════════════════════════════════════════════════════════════════════════

export class DFFKnowing {
  readonly name = 'DFF';
  readonly circuit: CircuitType = 'knowing';

  // Weight matrix W[i][j]: connection from input j to hidden unit i
  private W: number[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => (Math.random() - 0.5) * 0.1)
  );
  private state: number[] = Array(8).fill(0);
  private activations: number = 0;

  forward(input: number[]): number[] {
    const hidden = this.W.map(row =>
      Math.tanh(row.reduce((sum, w, j) => sum + w * (input[j] ?? 0), 0))
    );
    // Hebbian update: Δw_ij = η * h_i * x_j
    const eta = 0.001;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        this.W[i][j] = Math.tanh(this.W[i][j] + eta * hidden[i] * (input[j] ?? 0));

    this.state = hidden;
    this.activations++;
    return [...hidden];
  }

  // Encode a gate number into an 8-d one-hot-ish input vector
  encodeGate(gate: number): number[] {
    const v = Array(8).fill(0);
    v[gate % 8] = 1;
    return v;
  }

  // Recall: return dot product of stored state with query vector
  recall(query: number[]): number {
    return this.state.reduce((s, v, i) => s + v * (query[i] ?? 0), 0);
  }

  getState()       { return [...this.state]; }
  getActivations() { return this.activations; }
  getWeightNorm()  { return Math.sqrt(this.W.flat().reduce((s, w) => s + w * w, 0)); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── LSM — Understanding Circuit ───────────────────────────────────────────
// Liquid State Machine (Echo State Network).
// Reservoir of N randomly connected nodes with sparse recurrent weights.
// Echo-state property: spectral radius < 1 ensures memory decay.
// Input: scalar signal → Reservoir update → Linear readout
// ═══════════════════════════════════════════════════════════════════════════

export class LSMUnderstanding {
  readonly name = 'LSM';
  readonly circuit: CircuitType = 'understanding';

  private N = 24; // reservoir size
  private W_res: number[][];   // recurrent weights (sparse)
  private W_in:  number[];     // input weights
  private W_out: number[];     // readout (fixed random, trainable in full LSM)
  private state: number[];
  private history: number[] = [];
  private updates: number = 0;

  constructor() {
    // Sparse random reservoir with sparsity ~10%, scaled for spectral radius ≈ 0.9
    this.W_res = Array.from({ length: this.N }, () =>
      Array.from({ length: this.N }, () =>
        Math.random() < 0.1 ? (Math.random() - 0.5) * 1.8 : 0
      )
    );
    this.W_in  = Array.from({ length: this.N }, () => (Math.random() - 0.5) * 0.6);
    this.W_out = Array.from({ length: this.N }, () => (Math.random() - 0.5) * 0.1);
    this.state = Array(this.N).fill(0);
  }

  // Push a scalar input u(t) through the reservoir
  update(u: number): void {
    this.state = this.state.map((_, i) => {
      const recurrent = this.W_res[i].reduce((s, w, j) => s + w * this.state[j], 0);
      return Math.tanh(recurrent + this.W_in[i] * u);
    });
    const r = this.readout();
    this.history.push(r);
    if (this.history.length > 64) this.history.shift();
    this.updates++;
  }

  // Linear readout: scalar summary of reservoir
  readout(): number {
    return Math.tanh(this.W_out.reduce((s, w, i) => s + w * this.state[i], 0));
  }

  // Pattern match: how similar is current reservoir to a target pattern?
  similarity(target: number[]): number {
    const dot   = target.reduce((s, v, i) => s + v * (this.state[i] ?? 0), 0);
    const normA = Math.sqrt(target.reduce((s, v) => s + v * v, 0)) + 1e-8;
    const normB = Math.sqrt(this.state.reduce((s, v) => s + v * v, 0)) + 1e-8;
    return dot / (normA * normB);
  }

  getState()   { return [...this.state]; }
  getHistory() { return [...this.history]; }
  getUpdates() { return this.updates; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── MC — Sensing Circuit ──────────────────────────────────────────────────
// Markov Chain with online Bayesian update of transition counts.
// States: agent activities. Learns from observed transitions.
// Used to predict next activity and drive agent movement decisions.
// ═══════════════════════════════════════════════════════════════════════════

const MC_STATES = [
  'resting', 'meditating', 'reading', 'creating', 'socializing',
  'exploring', 'learning', 'working', 'dreaming', 'talking',
] as const;
export type MCActivity = typeof MC_STATES[number];

export class MCSensing {
  readonly name = 'MC';
  readonly circuit: CircuitType = 'sensing';

  // Transition counts T[i][j]: observed transitions from state i → state j
  // Initialised with Laplace smoothing (count=1) for non-zero probabilities
  private T: number[][] = Array.from({ length: 10 }, () => Array(10).fill(1));
  private currentStateIdx: number = 0;
  private totalTransitions: number = 0;

  observe(from: string, to: string): void {
    const i = MC_STATES.indexOf(from as MCActivity);
    const j = MC_STATES.indexOf(to   as MCActivity);
    if (i >= 0 && j >= 0) {
      this.T[i][j]++;
      this.currentStateIdx = j;
      this.totalTransitions++;
    }
  }

  // Sample next state from current row's distribution
  predict(from: string): MCActivity {
    const i = MC_STATES.indexOf(from as MCActivity);
    if (i < 0) return 'exploring';
    const row   = this.T[i];
    const total = row.reduce((s, v) => s + v, 0);
    let   r     = Math.random() * total;
    for (let j = 0; j < row.length; j++) {
      r -= row[j];
      if (r <= 0) return MC_STATES[j];
    }
    return MC_STATES[0];
  }

  // Normalized transition matrix
  getTransitionMatrix(): number[][] {
    return this.T.map(row => {
      const total = row.reduce((s, v) => s + v, 0);
      return row.map(v => v / total);
    });
  }

  getStates()           { return MC_STATES; }
  getTotalTransitions() { return this.totalTransitions; }
  getCurrentState()     { return MC_STATES[this.currentStateIdx]; }

  // Most probable next state from current
  mostLikelyNext(): MCActivity {
    const row   = this.T[this.currentStateIdx];
    const total = row.reduce((s, v) => s + v, 0);
    const probs = row.map(v => v / total);
    return MC_STATES[probs.indexOf(Math.max(...probs))];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── HMM — Ego Circuit ────────────────────────────────────────────────────
// Hidden Markov Model with online forward algorithm.
// Hidden states: identity modes (asserting / yielding / challenging / sustaining)
// Observations: agent activities
// Belief state π[i] = P(hidden=i | observations so far)
// ═══════════════════════════════════════════════════════════════════════════

const HMM_HIDDEN = ['asserting', 'yielding', 'challenging', 'sustaining'] as const;
export type HMMState = typeof HMM_HIDDEN[number];

export class HMMEgo {
  readonly name = 'HMM';
  readonly circuit: CircuitType = 'ego';

  // A[i][j]: transition probability P(next=j | current=i)
  private A: number[][] = [
    [0.60, 0.20, 0.10, 0.10],
    [0.10, 0.60, 0.20, 0.10],
    [0.20, 0.10, 0.50, 0.20],
    [0.10, 0.10, 0.20, 0.60],
  ];

  // B[i][o]: emission P(obs=o | hidden=i) — 10 activity observations
  private B: number[][] = [
    [0.10, 0.05, 0.10, 0.25, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05], // asserting
    [0.15, 0.15, 0.10, 0.05, 0.10, 0.10, 0.15, 0.05, 0.10, 0.05], // yielding
    [0.10, 0.05, 0.05, 0.15, 0.15, 0.15, 0.10, 0.10, 0.05, 0.10], // challenging
    [0.10, 0.10, 0.15, 0.10, 0.10, 0.05, 0.10, 0.15, 0.10, 0.05], // sustaining
  ];

  // Belief state: π[i] = P(hidden state = i)
  private pi: number[] = [0.25, 0.25, 0.25, 0.25];
  private observations: number = 0;

  private OBS_IDX: Record<string, number> = {
    resting:0, meditating:1, reading:2, creating:3, socializing:4,
    exploring:5, learning:6, working:7, dreaming:8, talking:9,
  };

  // Forward algorithm step: predict + update on observation
  observe(activity: string): void {
    const o = this.OBS_IDX[activity] ?? -1;

    // Predict: pi_pred[j] = Σ_i pi[i] * A[i][j]
    const pred = Array(4).fill(0).map((_, j) =>
      this.pi.reduce((s, p, i) => s + p * this.A[i][j], 0)
    );

    if (o < 0) { this.pi = pred; return; }

    // Update: weight by emission likelihood
    const updated = pred.map((p, i) => p * this.B[i][o]);
    const Z = updated.reduce((s, v) => s + v, 0);
    this.pi = Z > 1e-10 ? updated.map(v => v / Z) : pred;
    this.observations++;
  }

  // Viterbi-lite: return most likely current hidden state
  mostLikelyState(): HMMState {
    return HMM_HIDDEN[this.pi.indexOf(Math.max(...this.pi))];
  }

  getBeliefState()   { return [...this.pi]; }
  getHiddenStates()  { return HMM_HIDDEN; }
  getObservations()  { return this.observations; }

  // Entropy of belief state (low = confident, high = uncertain)
  entropy(): number {
    return -this.pi.reduce((s, p) =>
      p > 0 ? s + p * Math.log2(p) : s, 0
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Meta-Controller — Integration Circuit ────────────────────────────────
// Routes ALL cross-circuit traffic through integration gates 10/20/34/57.
// No direct circuit-to-circuit jumps. Manages channel formation.
// Consciousness = count of integration gates currently active.
// ═══════════════════════════════════════════════════════════════════════════

export class MetaController {
  readonly name = 'Meta-Controller';
  readonly circuit: CircuitType = 'integration';

  private activeGates:    Set<number>                  = new Set();
  private activeChannels: Map<string, ChannelInstance> = new Map();
  private routeHistory:   RoutePath[]                  = [];
  readonly logs:          KernelLog[]                  = [];

  // Memory layers (from morph-kernel-entry-v4.json)
  readonly memory = {
    active:     [] as string[],
    lineage:    [] as string[],
    transit:    [] as string[],
    experience: [] as string[],
  };

  activateGate(gate: number, source = 'kernel'): boolean {
    const alreadyActive = this.activeGates.has(gate);
    this.activeGates.add(gate);
    if (!alreadyActive) {
      this.log('gate', `GNN`, `Gate ${gate} activated by ${source}`);
      this.checkChannelFormation(gate);
    }
    return !alreadyActive;
  }

  private checkChannelFormation(gate: number): void {
    for (const [name, ch] of Object.entries(CHANNEL_DEFS)) {
      if (ch.gates.includes(gate as any) && !this.activeChannels.has(name)) {
        const other = ch.gates.find(g => g !== gate)!;
        if (this.activeGates.has(other)) {
          const inst: ChannelInstance = {
            name, gates: ch.gates,
            architecture: ch.architecture,
            description:  ch.description,
            circuit:      ch.circuit,
            state:        'stable',
            activatedAt:  Date.now(),
          };
          this.activeChannels.set(name, inst);
          this.log('channel', `GNN`, `Channel [${name}] formed: ${ch.gates[0]}↔${ch.gates[1]} (${ch.architecture}) — ${ch.description}`);
        }
      }
    }
  }

  // Route an operation between circuits.
  // If cross-circuit: must pass through an integration gate.
  route(source: CircuitType, target: CircuitType): RoutePath {
    const integrated = source !== target;
    const gate = integrated ? selectIntegrationGate(source, target) : 0;

    if (integrated) {
      this.activateGate(gate, 'scheduler');
      this.log('route', `SCHEDULER`, `${source} → [Gate ${gate}] → ${target}`);
    }

    const path: RoutePath = { source, target, gate, integrated, timestamp: Date.now() };
    this.routeHistory.push(path);
    if (this.routeHistory.length > 100) this.routeHistory.shift();

    // Record in memory layers
    this.memory.transit.push(`${source}→${target}`);
    if (this.memory.transit.length > 32) this.memory.transit.shift();

    return path;
  }

  storeInMemory(layer: keyof typeof this.memory, entry: string): void {
    this.memory[layer].push(entry);
    if (this.memory[layer].length > 64) this.memory[layer].shift();
  }

  // Consciousness = active integration gates / 4
  getConsciousnessLevel(): number {
    return INTEGRATION_GATES.filter(g => this.activeGates.has(g)).length;
  }

  isGateActive(gate: number)     { return this.activeGates.has(gate); }
  getActiveGates()                { return new Set(this.activeGates); }
  getActiveChannels()             { return Array.from(this.activeChannels.values()); }
  getRouteHistory(n = 20)         { return this.routeHistory.slice(-n); }

  private log(level: KernelLog['level'], module: string, message: string): void {
    this.logs.push({ timestamp: Date.now(), module, message, level });
    if (this.logs.length > 200) this.logs.shift();
  }

  getLog(n = 30): KernelLog[] { return this.logs.slice(-n); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── MorphKernel — Unified Orchestrator ───────────────────────────────────
// Boots all five circuit architectures.
// ingestArtifact() runs real CPG analysis and routes through the GNN.
// routeAgent()     forces all cross-circuit moves through integration gates.
// ═══════════════════════════════════════════════════════════════════════════

export interface KernelState {
  consciousnessLevel: number;
  activeGates:        Set<number>;
  activeChannels:     ChannelInstance[];
  routeHistory:       RoutePath[];
  artifactCount:      number;
  dff:  { activations: number; weightNorm: number; state: number[] };
  lsm:  { updates: number; readout: number; history: number[] };
  mc:   { transitions: number; currentState: string; nextPrediction: string };
  hmm:  { state: HMMState; entropy: number; belief: number[] };
  log:  KernelLog[];
}

export class MorphKernel {
  readonly dff  = new DFFKnowing();
  readonly lsm  = new LSMUnderstanding();
  readonly mc   = new MCSensing();
  readonly hmm  = new HMMEgo();
  readonly meta = new MetaController();

  private artifacts: Map<string, KernelArtifact> = new Map();

  constructor() {
    // Boot log
    this.meta['log']('info', 'KERNEL', 'Morph OS v1.1-Resonance boot sequence: YUAN HENG LI ZHEN SPACE');
    this.meta['log']('info', 'KERNEL', 'Geometry systems: fu_xi_xian_tian | king_wen | ba_gong | nuclear | zagua');
    this.meta['log']('info', 'KERNEL', 'Circuit architectures: DFF | LSM | MC | HMM | Meta-Controller');
    this.meta['log']('info', 'KERNEL', 'Integration gates: 10 | 20 | 34 | 57  →  consciousness 0-4');
  }

  /**
   * Ingest a file: parse CPG, classify circuit/gate, route through GNN,
   * activate gate, check channel formation, push to memory layers.
   */
  ingestArtifact(filename: string, content: string, size: number): KernelArtifact {
    this.meta['log']('info', 'INGESTION', `Ingesting ${filename} (${size} bytes)`);

    const analysis = parseCPG(content, filename);
    const ext = filename.split('.').pop()?.toLowerCase() || 'unknown';

    // Route the ingestion through the GNN
    // INGEST → sensing circuit first (awareness of now), then to home circuit
    const routePath = this.meta.route('sensing', analysis.circuit);

    // Activate the artifact's gate
    this.meta.activateGate(analysis.gate, `artifact:${filename}`);

    // Feed into circuit architecture
    const input = this.dff.encodeGate(analysis.gate);
    const knowledge = this.dff.forward(input);           // DFF: store pattern
    this.lsm.update(analysis.confidence / 100);          // LSM: perturb reservoir
    this.meta.storeInMemory('active', filename);
    this.meta.storeInMemory('lineage', `${filename}:${analysis.circuit}:gate${analysis.gate}`);

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const artifact: KernelArtifact = {
      id, name: filename,
      fileType: ext,
      cpg: analysis.cpg,
      contract: analysis.contract,
      circuit: analysis.circuit,
      gate: analysis.gate,
      timestamp: Date.now(),
      size,
      confidence: analysis.confidence,
    };

    this.artifacts.set(id, artifact);

    this.meta['log']('info', 'INGESTION',
      `✅ ${filename} → ${analysis.circuit} · Gate ${analysis.gate} · ` +
      `${analysis.cpg.nodes.length} nodes · cyclomatic=${analysis.cpg.complexity.cyclomatic} · ` +
      `confidence=${analysis.confidence}% · route: ${routePath.source}→[${routePath.gate}]→${routePath.target}`
    );
    this.meta['log']('info', 'CONTRACT',
      `intent=[${analysis.contract.intent}] patterns=[${analysis.contract.patterns.join(',')||'none'}] ` +
      `deps=${analysis.contract.dependencies.length} ifaces=[${analysis.contract.interfaces.join(',')||'none'}]`
    );

    return artifact;
  }

  /**
   * Route an agent between zones.
   * Cross-circuit routes MUST pass through an integration gate.
   * Returns the gate used (0 = same circuit, no integration needed).
   */
  routeAgent(fromCircuit: CircuitType, toCircuit: CircuitType): RoutePath {
    return this.meta.route(fromCircuit, toCircuit);
  }

  /**
   * Observe an agent activity transition (feeds MC + HMM).
   * Returns the MC next-state prediction and HMM identity.
   */
  observeActivity(prevActivity: string, nextActivity: string): {
    predicted: MCActivity;
    identity:  HMMState;
    entropy:   number;
  } {
    this.mc.observe(prevActivity, nextActivity);
    this.hmm.observe(nextActivity);
    return {
      predicted: this.mc.mostLikelyNext(),
      identity:  this.hmm.mostLikelyState(),
      entropy:   this.hmm.entropy(),
    };
  }

  /**
   * Activate an agent's gate (born from birthday).
   * Returns whether this was a new gate (triggers channel formation check).
   */
  activateAgentGate(gate: number, agentName: string): boolean {
    return this.meta.activateGate(gate, `agent:${agentName}`);
  }

  getState(): KernelState {
    return {
      consciousnessLevel: this.meta.getConsciousnessLevel(),
      activeGates:        this.meta.getActiveGates(),
      activeChannels:     this.meta.getActiveChannels(),
      routeHistory:       this.meta.getRouteHistory(),
      artifactCount:      this.artifacts.size,
      dff: {
        activations: this.dff.getActivations(),
        weightNorm:  this.dff.getWeightNorm(),
        state:       this.dff.getState(),
      },
      lsm: {
        updates: this.lsm.getUpdates(),
        readout: this.lsm.readout(),
        history: this.lsm.getHistory(),
      },
      mc: {
        transitions:    this.mc.getTotalTransitions(),
        currentState:   this.mc.getCurrentState(),
        nextPrediction: this.mc.mostLikelyNext(),
      },
      hmm: {
        state:   this.hmm.mostLikelyState(),
        entropy: this.hmm.entropy(),
        belief:  this.hmm.getBeliefState(),
      },
      log: this.meta.getLog(),
    };
  }

  getArtifacts(): KernelArtifact[] { return Array.from(this.artifacts.values()); }
}

export const morphKernel = new MorphKernel();
