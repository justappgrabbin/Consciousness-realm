// morph-os-kernel.js
// Morph OS v1.1 — Resonance
// Orchestrator-first. All operations route through orchestrate().
// GNN = classification + routing. Regeneration = deterministic transforms.

const fs = require('fs');
const path = require('path');

// ─── CONFIG LOADING ───────────────────────────────────────────
let TRIDENT_GNN, MORPH_KERNEL_ENTRY;
try {
  TRIDENT_GNN = JSON.parse(fs.readFileSync('./trident-gnn-complete.json', 'utf8'));
  MORPH_KERNEL_ENTRY = JSON.parse(fs.readFileSync('./morph-kernel-entry-v4.json', 'utf8'));
} catch (e) {
  console.error('[MORPH-OS] CRITICAL: Missing config files. Run: node morph-cli.js init');
  process.exit(1);
}

// ─── PERSISTENCE ──────────────────────────────────────────────
class MorphPersistence {
  constructor(config) {
    this.config = config;
    this.artifactsPath = config.persistence.artifacts_path;
    this.contractsPath = config.persistence.contracts_path;
    this.evolutionPath = config.persistence.evolution_log_path;
    this.memoryDir = path.dirname(this.artifactsPath);
    if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
    this.artifacts = this.load(this.artifactsPath, {});
    this.contracts = this.load(this.contractsPath, {});
    this.evolutionLog = this.load(this.evolutionPath, []);
    this.dirty = false;
    if (config.persistence.auto_save && require.main !== module) {
      setInterval(() => this.save(), config.persistence.save_interval_ms);
    }
  }
  load(filepath, defaultValue) {
    try { if (fs.existsSync(filepath)) return JSON.parse(fs.readFileSync(filepath, 'utf8')); }
    catch (e) {}
    return defaultValue;
  }
  save() {
    if (!this.dirty) return;
    try {
      fs.writeFileSync(this.artifactsPath, JSON.stringify(this.artifacts, null, 2));
      fs.writeFileSync(this.contractsPath, JSON.stringify(this.contracts, null, 2));
      fs.writeFileSync(this.evolutionPath, JSON.stringify(this.evolutionLog, null, 2));
      this.dirty = false;
      console.log('[PERSISTENCE] State saved');
    } catch (e) { console.error(`[PERSISTENCE] Save failed: ${e.message}`); }
  }
  storeArtifact(id, artifact) { this.artifacts[id] = artifact; this.dirty = true; }
  getArtifact(id) { return this.artifacts[id] || null; }
  storeContract(id, contract) { this.contracts[id] = contract; this.dirty = true; }
  getContract(id) { return this.contracts[id] || null; }
  logEvolution(entry) { entry.timestamp = Date.now(); this.evolutionLog.push(entry); this.dirty = true; }
  getEvolutionLog() { return this.evolutionLog; }
  listArtifacts() { return Object.keys(this.artifacts); }
  flush() { this.save(); }
}

// ─── TRIDENT GNN (Classification + Routing) ─────────────────
class TridentGNN {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.activeGates = new Set();
    this.activeChannels = new Set();
    this.architectureInstances = new Map();
    this.representations = new Map();
  }
  loadGeometry(system) { this.geometry = TRIDENT_GNN.coordinate_systems[system]; }
  loadSequence(system) { this.sequence = TRIDENT_GNN.coordinate_systems[system]; }
  loadDomain(system) { this.domain = TRIDENT_GNN.coordinate_systems[system]; }
  verifyStructure(system) { this.structure = TRIDENT_GNN.coordinate_systems[system]; }
  loadContrast(system) { this.contrast = TRIDENT_GNN.coordinate_systems[system]; }

  activateGate(gateId, source) { this.activeGates.add(gateId); this.checkChannelFormation(gateId); }
  deactivateGate(gateId) { this.activeGates.delete(gateId); }
  isGateActive(gateId) { return this.activeGates.has(gateId); }

  checkChannelFormation(gateId) {
    for (const circuit of Object.values(TRIDENT_GNN.channels)) {
      for (const [channelName, channel] of Object.entries(circuit.channels || {})) {
        if (channel.gates && channel.gates.includes(gateId)) {
          const otherGate = channel.gates.find(g => g !== gateId);
          if (this.isGateActive(otherGate)) this.formChannel(channelName, channel);
        }
      }
    }
  }

  formChannel(channelName, channelData) {
    this.activeChannels.add(channelName);
    this.architectureInstances.set(channelName, { type: channelData.architecture, data: channelData, state: 'stable' });
  }

  // Classification: map code characteristics to circuit/architecture
  classifyCode(contract) {
    const intents = (contract.intent || '').split(', ');
    if (intents.includes('object_oriented')) return { gate: 1, circuit: 'knowing', architecture: 'DFF' };
    if (intents.includes('functional')) return { gate: 4, circuit: 'understanding', architecture: 'LSM' };
    if (intents.includes('async')) return { gate: 20, circuit: 'sensing', architecture: 'MC' };
    if (intents.includes('network')) return { gate: 14, circuit: 'knowing', architecture: 'DFF' };
    if (intents.includes('browser')) return { gate: 10, circuit: 'sensing', architecture: 'MC' };
    if (intents.includes('node')) return { gate: 57, circuit: 'sensing', architecture: 'MC' };
    return { gate: 1, circuit: 'knowing', architecture: 'DFF' };
  }

  storeRepresentation(representation) { this.representations.set(representation.artifactId, representation); }
  ingestArtifact(artifact) {}
  executeProcess(processId) { return { status: 'executed', processId }; }
}

// ─── INTEGRATION SCHEDULER ────────────────────────────────────
// ALL operations route through Integration. Source circuit always differs from target.
class IntegrationScheduler {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.integrationGates = [10, 20, 34, 57];
    this.consciousnessLevel = 0;
  }

  route(operation, params) {
    const sourceCircuit = this.inferSourceCircuit(operation);
    const targetCircuit = this.inferTargetCircuit(operation);
    const gate = this.selectIntegrationGate(sourceCircuit, targetCircuit);
    this.orchestrator.gnn.activateGate(gate, 'scheduler');
    this.updateConsciousness();
    return { path: [sourceCircuit, gate, targetCircuit], integrated: true };
  }

  inferSourceCircuit(operation) {
    const map = {
      INGEST: 'sensing', STUDY: 'knowing', UNDERSTAND: 'understanding',
      REGENERATE: 'ego', EXECUTE: 'integration', PIPELINE: 'integration',
      INSPECT: 'integration', SELF_IMPROVE: 'integration'
    };
    return map[operation] || 'integration';
  }

  // FIX: target is always integration — this forces all ops through integration gates
  inferTargetCircuit(operation) { return 'integration'; }

  selectIntegrationGate(source, target) {
    const pair = [source, target].sort();
    if (pair.includes('knowing') && pair.includes('integration')) return 10;
    if (pair.includes('sensing') && pair.includes('integration')) return 20;
    if (pair.includes('ego') && pair.includes('integration')) return 34;
    if (pair.includes('understanding') && pair.includes('integration')) return 57;
    return 10;
  }

  updateConsciousness() {
    const active = this.integrationGates.filter(g => this.orchestrator.gnn.isGateActive(g));
    this.consciousnessLevel = active.length;
    const levels = MORPH_KERNEL_ENTRY.consciousness_levels;
    console.log(`[SCHEDULER] Consciousness: ${this.consciousnessLevel}/4 — ${levels[this.consciousnessLevel]}`);
  }
}

// ─── PARSERS ──────────────────────────────────────────────────
class JSParser {
  parse(code) {
    const nodes = [];
    (code.match(/function\s+(\w+)/g) || []).forEach(m => nodes.push({ type: 'function', name: m.replace('function ', '') }));
    (code.match(/class\s+(\w+)/g) || []).forEach(m => nodes.push({ type: 'class', name: m.replace('class ', '') }));
    (code.match(/(?:const|let|var)\s+(\w+)\s*=/g) || []).forEach(m => {
      nodes.push({ type: 'variable', name: m.replace(/(?:const|let|var)\s+/, '').replace('=', '').trim() });
    });
    return { type: 'js', code, nodes, edges: [] };
  }
}
class PythonParser {
  parse(code) {
    const nodes = [];
    (code.match(/def\s+(\w+)/g) || []).forEach(m => nodes.push({ type: 'function', name: m.replace('def ', '') }));
    (code.match(/class\s+(\w+)/g) || []).forEach(m => nodes.push({ type: 'class', name: m.replace('class ', '') }));
    return { type: 'py', code, nodes, edges: [] };
  }
}
class YAMLParser {
  parse(code) { return { type: 'yaml', code, nodes: [{ type: 'document', name: 'yaml_doc' }], edges: [] }; }
}
class JSONParser {
  parse(code) {
    try { return { type: 'json', code, data: JSON.parse(code), nodes: [{ type: 'object', name: 'root' }], edges: [] }; }
    catch (e) { return { type: 'json', code, nodes: [], edges: [] }; }
  }
}
class HTMLParser {
  parse(code) {
    const tags = (code.match(/<(\w+)/g) || []).map(t => t.slice(1));
    return { type: 'html', code, nodes: tags.map(t => ({ type: 'element', name: t })), edges: [] };
  }
}
class CSSParser {
  parse(code) {
    const selectors = (code.match(/([.#]?[\w-]+)\s*\{/g) || []).map(s => s.replace('{', '').trim());
    return { type: 'css', code, nodes: selectors.map(s => ({ type: 'selector', name: s })), edges: [] };
  }
}

// ─── INGESTION ENGINE ─────────────────────────────────────────
class MorphIngestion {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.parsers = {
      js: new JSParser(), py: new PythonParser(), yaml: new YAMLParser(),
      json: new JSONParser(), html: new HTMLParser(), css: new CSSParser()
    };
  }

  ingest(code, metadata = {}) {
    console.log(`[INGESTION] Ingesting ${metadata.type || 'unknown'}: ${metadata.name || 'unnamed'}`);
    const parser = this.parsers[metadata.type] || this.parsers.js;
    const ast = parser.parse(code);
    const cpg = this.buildCPG(ast, code);
    const contract = this.extractContract(cpg, code);
    const artifactId = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const artifact = { id: artifactId, code, ast, cpg, contract, metadata, timestamp: Date.now(), size: code.length };
    this.orchestrator.persistence.storeArtifact(artifactId, artifact);
    this.orchestrator.gnn.ingestArtifact(artifact);
    console.log(`[INGESTION] ✅ Stored ${artifactId} (${code.length} chars)`);
    return artifactId;
  }

  ingestFile(filepath) {
    const code = fs.readFileSync(filepath, 'utf8');
    const ext = path.extname(filepath).slice(1);
    return this.ingest(code, { type: ext, name: path.basename(filepath), path: filepath });
  }

  buildCPG(ast, code) {
    return {
      nodes: ast.nodes || [], edges: ast.edges || [],
      dataFlow: {
        assignments: (code.match(/\b(let|const|var)\s+\w+\s*=/g) || []).length,
        mutations: (code.match(/\w+\s*=\s*[^=]/g) || []).length
      },
      controlFlow: {
        conditionals: (code.match(/\b(if|else|switch|case)\b/g) || []).length,
        loops: (code.match(/\b(for|while|do)\b/g) || []).length,
        returns: (code.match(/\breturn\b/g) || []).length
      },
      complexity: this.calcComplexity(code)
    };
  }

  calcComplexity(code) {
    return {
      lines: code.split('\n').length,
      functions: (code.match(/\bfunction\b/g) || []).length,
      classes: (code.match(/\bclass\b/g) || []).length,
      branches: (code.match(/\b(if|else|switch|case|for|while)\b/g) || []).length,
      cyclomatic: ((code.match(/\b(if|else|switch|case|for|while)\b/g) || []).length) + 1
    };
  }

  extractContract(cpg, code) {
    return {
      intent: this.inferIntent(code),
      functions: this.extractFunctions(code),
      dependencies: this.extractDeps(code),
      interfaces: this.extractInterfaces(code),
      patterns: this.recognizePatterns(code),
      complexity: cpg.complexity
    };
  }

  inferIntent(code) {
    const intents = [];
    if (code.includes('class')) intents.push('object_oriented');
    if (code.includes('function')) intents.push('functional');
    if (code.includes('async') || code.includes('await')) intents.push('async');
    if (code.includes('import') || code.includes('require')) intents.push('modular');
    if (code.includes('export')) intents.push('library');
    if (code.includes('console.log')) intents.push('debug');
    if (code.includes('fetch') || code.includes('http')) intents.push('network');
    if (code.includes('document') || code.includes('window')) intents.push('browser');
    if (code.includes('process') || code.includes('fs.')) intents.push('node');
    return intents.join(', ') || 'general';
  }

  extractFunctions(code) {
    const funcs = [];
    const regex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>))/g;
    let match;
    while ((match = regex.exec(code)) !== null) funcs.push(match[1] || match[2]);
    return funcs;
  }

  extractDeps(code) {
    const deps = [];
    const regex = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match;
    while ((match = regex.exec(code)) !== null) deps.push(match[1] || match[2]);
    return deps;
  }

  extractInterfaces(code) {
    const ifaces = [];
    if (code.includes('module.exports')) ifaces.push('commonjs');
    if (code.includes('export default')) ifaces.push('esm_default');
    if (code.includes('export {')) ifaces.push('esm_named');
    if (code.includes('export class')) ifaces.push('esm_class');
    return ifaces;
  }

  recognizePatterns(code) {
    const patterns = [];
    if (code.includes('new Event') || code.includes('addEventListener') || /on\w+\s*=/.test(code)) patterns.push('observer');
    if (code.includes('new ') && code.includes('create')) patterns.push('factory');
    if (code.includes('getInstance') || /if\s*\(!?\w+\)/.test(code)) patterns.push('singleton');
    if (code.includes('class') && code.includes('extends')) patterns.push('inheritance');
    if (code.includes('Promise') || code.includes('async')) patterns.push('async_pattern');
    if (code.includes('try') && code.includes('catch')) patterns.push('error_handling');
    return patterns;
  }
}

// ─── STUDY MODULE ─────────────────────────────────────────────
class MorphStudy {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.analyses = new Map();
  }

  analyze(artifactId) {
    if (this.analyses.has(artifactId)) {
      console.log(`[STUDY] Cached ${artifactId}`);
      return this.analyses.get(artifactId);
    }
    console.log(`[STUDY] Analyzing ${artifactId}`);
    const artifact = this.orchestrator.persistence.getArtifact(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

    const structure = {
      nodeCount: artifact.cpg.nodes.length,
      edgeCount: artifact.cpg.edges.length,
      depth: artifact.cpg.complexity.functions,
      breadth: artifact.cpg.complexity.classes,
      cyclomaticComplexity: artifact.cpg.complexity.cyclomatic,
      linesOfCode: artifact.cpg.complexity.lines
    };

    const issues = this.findIssues(artifact.code);
    const classification = this.orchestrator.gnn.classifyCode(artifact.contract);

    const analysis = {
      artifactId, structure,
      semantics: { dataFlow: artifact.cpg.dataFlow, controlFlow: artifact.cpg.controlFlow },
      patterns: artifact.contract.patterns || [],
      metrics: { ...artifact.cpg.complexity, maintainability: Math.max(0, 100 - artifact.cpg.complexity.cyclomatic * 2) },
      resonance: {
        primaryGate: classification.gate,
        circuitFamily: classification.circuit,
        architecture: classification.architecture
      },
      issues,
      timestamp: Date.now()
    };

    this.analyses.set(artifactId, analysis);
    console.log(`[STUDY] ✅ Complete: ${structure.nodeCount} nodes, complexity ${structure.cyclomaticComplexity}, ${issues.length} issues`);
    return analysis;
  }

  findIssues(code) {
    const issues = [];
    if (code.includes('console.log')) issues.push({ type: 'debug_code', severity: 'low', message: 'Debug console.log found' });
    if (code.includes('var ')) issues.push({ type: 'legacy_var', severity: 'medium', message: 'Use var instead of let/const' });
    // FIX: proper loose equality detection
    if (/(^|[^=!])==([^=]|$)/.test(code)) issues.push({ type: 'loose_equality', severity: 'medium', message: 'Loose equality (==), use strict (===)' });
    if ((code.match(/function/g) || []).length > 15) issues.push({ type: 'complexity', severity: 'high', message: 'High function count' });
    if (!code.includes('try') && code.includes('await')) issues.push({ type: 'missing_error_handling', severity: 'high', message: 'Async without error handling' });
    return issues;
  }
}

// ─── UNDERSTANDING LAYER ──────────────────────────────────────
class MorphUnderstanding {
  constructor(orchestrator) { this.orchestrator = orchestrator; }

  buildRepresentation(artifactId) {
    console.log(`[UNDERSTANDING] Building representation for ${artifactId}`);
    const artifact = this.orchestrator.persistence.getArtifact(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

    const analysis = this.orchestrator.study.analyze(artifactId);

    const intent = {
      primary: artifact.contract.intent,
      secondary: artifact.contract.patterns.join(', ') || 'none',
      implicit: artifact.contract.dependencies.length > 0 ? 'modular' : 'standalone'
    };

    const capabilities = {
      canCreate: artifact.contract.complexity.functions > 0,
      canRead: artifact.contract.intent.includes('node') || artifact.contract.intent.includes('network'),
      canUpdate: artifact.contract.patterns.includes('observer') || artifact.contract.patterns.includes('factory'),
      canDelete: artifact.contract.patterns.includes('error_handling'),
      canTransform: artifact.contract.patterns.includes('async_pattern'),
      canIntegrate: artifact.contract.interfaces.length > 0
    };

    const contract = {
      type: 'morph_contract', version: '1.1', artifactId,
      intent, capabilities,
      patterns: analysis.patterns,
      resonance: analysis.resonance,
      issues: analysis.issues,
      requirements: this.inferRequirements(intent, capabilities),
      constraints: this.inferConstraints(analysis.patterns, analysis.resonance),
      improvements: this.suggestImprovements(analysis.issues)
    };

    const representation = {
      artifactId,
      embedding: {
        vector: [artifact.cpg.complexity.lines, artifact.cpg.complexity.functions, artifact.cpg.complexity.cyclomatic],
        center: analysis.resonance.primaryGate % 9,
        hexagram: analysis.resonance.primaryGate,
        dimensions: artifact.cpg.complexity
      },
      intent, capabilities, contract,
      confidence: this.calcConfidence(analysis),
      timestamp: Date.now()
    };

    this.orchestrator.persistence.storeContract(artifactId, contract);
    this.orchestrator.gnn.storeRepresentation(representation);
    console.log(`[UNDERSTANDING] ✅ Intent: ${intent.primary}, Confidence: ${representation.confidence.toFixed(1)}%`);
    return representation;
  }

  inferRequirements(intent, capabilities) {
    const reqs = [];
    if (capabilities.canIntegrate) reqs.push('module_system');
    if (capabilities.canTransform) reqs.push('async_runtime');
    if (intent.primary.includes('browser')) reqs.push('dom_api');
    if (intent.primary.includes('node')) reqs.push('node_runtime');
    return reqs;
  }

  inferConstraints(patterns, resonance) {
    const constraints = [];
    if (patterns.includes('singleton')) constraints.push('single_instance');
    if (resonance.circuitFamily === 'ego') constraints.push('material_focus');
    return constraints;
  }

  suggestImprovements(issues) {
    const map = {
      debug_code: 'Remove or replace with proper logging',
      legacy_var: 'Replace var with let',
      loose_equality: 'Replace == with ===',
      complexity: 'Extract functions into modules',
      missing_error_handling: 'Add try/catch blocks'
    };
    return issues.map(i => ({ issue: i.type, suggestion: map[i.type] || 'Review manually', autoFixable: ['debug_code', 'legacy_var', 'loose_equality'].includes(i.type) }));
  }

  calcConfidence(analysis) {
    const base = 70;
    const penalty = Math.min(20, analysis.metrics.cyclomaticComplexity || 0);
    const bonus = (analysis.patterns || []).length * 3;
    return Math.min(99, Math.max(30, base - penalty + bonus));
  }
}

// ─── REGENERATION ENGINE (Deterministic Transforms) ───────────
class MorphRegeneration {
  constructor(orchestrator) { this.orchestrator = orchestrator; }

  generate({ contract, mode = 'equivalent', target = 'auto' }) {
    console.log(`[REGENERATION] Generating ${mode} version`);
    if (!contract || !contract.intent || !contract.capabilities) throw new Error('Invalid contract');

    const architecture = MORPH_KERNEL_ENTRY.circuit_architecture_map[contract.resonance.circuitFamily] || 'Auto-Select';
    const artifact = this.orchestrator.persistence.getArtifact(contract.artifactId);

    let generated;
    switch (mode) {
      case 'exact': generated = artifact ? artifact.code : ''; break;
      case 'equivalent': generated = this.transform(artifact, contract, { optimize: false }); break;
      case 'morph_runtime': generated = this.transform(artifact, contract, { optimize: true, native: true }); break;
      case 'improved': generated = this.transform(artifact, contract, { optimize: true, improve: true, native: true }); break;
      default: throw new Error(`Unknown mode: ${mode}`);
    }

    const verification = this.verify(generated, contract);
    console.log(`[REGENERATION] ✅ ${mode} generated (${generated.length} chars), ${verification.syntaxValid ? 'PASS' : 'FAIL'}`);
    return { code: generated, mode, architecture, verification, contract, timestamp: Date.now() };
  }

  transform(artifact, contract, options) {
    if (!artifact) return this.generateFromContract(contract, options);
    let code = artifact.code;

    if (options.improve) {
      // FIX: var → let (safer than const for reassigned variables)
      code = code.replace(/\bvar\b/g, 'let');
      code = code.replace(/for\s*\(\s*let\s+/g, 'for(let ');
      // FIX: loose equality using proper regex
      code = code.replace(/(^|[^=!])==([^=]|$)/g, '$1===$2');
      // Remove console.log with balanced paren parser
      code = this.removeConsoleLogs(code);
      code = this.addJSDoc(code);
    }

    return code;
  }

  removeConsoleLogs(code) {
    let result = '';
    let i = 0;
    while (i < code.length) {
      const idx = code.indexOf('console.log', i);
      if (idx === -1) { result += code.slice(i); break; }
      result += code.slice(i, idx);
      let j = idx + 11;
      while (j < code.length && /\s/.test(code[j])) j++;
      if (j < code.length && code[j] === '(') {
        let depth = 1;
        j++;
        while (j < code.length && depth > 0) {
          if (code[j] === '(') depth++;
          else if (code[j] === ')') depth--;
          j++;
        }
        while (j < code.length && /[;\s]/.test(code[j])) j++;
        if (j < code.length && code[j] === '\n') j++;
        else if (j < code.length && code[j - 1] !== '\n') result += '\n';
      }
      i = j;
    }
    return result;
  }

  generateFromContract(contract, options) {
    const builder = [];
    builder.push(`// Generated by Morph OS v1.1 — ${options.improve ? 'improved' : 'equivalent'}`);
    builder.push(`// Gate: ${contract.resonance.primaryGate} | Circuit: ${contract.resonance.circuitFamily}`);
    builder.push('');
    const intent = contract.intent.primary || 'general';
    if (intent.includes('object_oriented')) {
      builder.push(`class ${intent.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')} {`);
      builder.push('  constructor() {}');
      builder.push('}');
    }
    return builder.join('\n');
  }

  addJSDoc(code) {
    return code.replace(/(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, (match, name, params) => {
      const docs = params.split(',').filter(p => p.trim()).map(p => ` * @param {any} ${p.trim()}`).join('\n');
      return `/**\n * ${name}\n${docs}\n * @returns {any}\n */\n${match}`;
    });
  }

  verify(code, contract) {
    let syntaxValid = false;
    try { new Function(code); syntaxValid = true; } catch (e) {}
    return {
      syntaxValid,
      behaviorMatch: (contract.patterns || []).every(p => {
        if (p === 'observer') return code.includes('Event') || code.includes('Listener');
        if (p === 'factory') return code.includes('create') || code.includes('new');
        if (p === 'singleton') return code.includes('getInstance');
        if (p === 'async_pattern') return code.includes('async') || code.includes('Promise');
        if (p === 'error_handling') return code.includes('try') && code.includes('catch');
        return true;
      }),
      patternMatch: true,
      resonanceMatch: true
    };
  }
}

// ─── ORCHESTRATOR (The ONLY public API) ───────────────────────
class MorphOrchestrator {
  constructor() {
    this.state = 'INIT';
    this.persistence = new MorphPersistence(MORPH_KERNEL_ENTRY);
    this.gnn = new TridentGNN(this);
    this.scheduler = new IntegrationScheduler(this);
    this.ingestion = new MorphIngestion(this);
    this.study = new MorphStudy(this);
    this.understanding = new MorphUnderstanding(this);
    this.regeneration = new MorphRegeneration(this);
    this.boot();
  }

  boot() {
    console.log('[MORPH-OS] ════════════════════════════════════════');
    console.log('[MORPH-OS] Boot: Yuan-Heng-Li-Zhen');
    console.log('[MORPH-OS] ════════════════════════════════════════');
    this.state = 'YUAN'; this.gnn.loadGeometry('fu_xi_xian_tian');
    console.log('[MORPH-OS] 元 Yuan: Root geometry');
    this.state = 'HENG'; this.gnn.loadSequence('king_wen');
    console.log('[MORPH-OS] 亨 Heng: Temporal flow');
    this.state = 'LI'; this.gnn.loadDomain('ba_gong');
    console.log('[MORPH-OS] 利 Li: Domain context');
    this.state = 'ZHEN'; this.gnn.verifyStructure('nuclear');
    console.log('[MORPH-OS] 貞 Zhen: Inner structure');
    this.state = 'SPACE'; this.gnn.loadContrast('zagua');
    console.log('[MORPH-OS] Space: Emergent interface');
    this.state = 'RUNNING';
    console.log('[MORPH-OS] ════════════════════════════════════════');
    console.log('[MORPH-OS] Kernel running.\n');
  }

  // ─── SYSCALL INTERFACE ─────────────────────────────────────
  // ALL external operations go through here. No exceptions.
  orchestrate(operation, params = {}) {
    const route = this.scheduler.route(operation, params);
    if (route.integrated) {
      console.log(`[ORCHESTRATOR] Routing ${operation} through Integration gate ${route.path[1]}`);
    }

    switch (operation) {
      case 'INGEST':
        if (params.filepath) return this.ingestion.ingestFile(params.filepath);
        return this.ingestion.ingest(params.code, params.metadata);

      case 'STUDY':
        return this.study.analyze(params.artifactId);

      case 'UNDERSTAND':
        return this.understanding.buildRepresentation(params.artifactId);

      case 'REGENERATE': {
        let contract = params.contract;
        if (!contract && params.artifactId) contract = this.persistence.getContract(params.artifactId);
        if (!contract) {
          const rep = this.understanding.buildRepresentation(params.artifactId);
          contract = rep.contract;
        }
        return this.regeneration.generate({ contract, mode: params.mode || 'equivalent', target: params.target });
      }

      case 'PIPELINE': {
        console.log('[ORCHESTRATOR] Executing atomic pipeline');
        const id = params.filepath
          ? this.ingestion.ingestFile(params.filepath)
          : this.ingestion.ingest(params.code, params.metadata);
        this.study.analyze(id);
        const rep = this.understanding.buildRepresentation(id);
        const result = this.regeneration.generate({ contract: rep.contract, mode: params.mode || 'improved' });
        this.persistence.logEvolution({ type: 'pipeline', artifactId: id, mode: params.mode, input: params.filepath || 'code', output: result.code.length });
        return { artifactId: id, result };
      }

      case 'INSPECT': {
        // General inspection syscall — replaces all direct internal access
        const subject = params.subject;
        switch (subject) {
          case 'artifacts': return this.persistence.listArtifacts();
          case 'artifact': return this.persistence.getArtifact(params.artifactId);
          case 'contract': return this.persistence.getContract(params.artifactId);
          case 'stats': return this.getStats();
          case 'evolution': return this.persistence.getEvolutionLog();
          case 'gates': return { active: Array.from(this.gnn.activeGates), channels: Array.from(this.gnn.activeChannels) };
          case 'consciousness': return { level: this.scheduler.consciousnessLevel };
          default: throw new Error(`Unknown inspect subject: ${subject}`);
        }
      }

      case 'EXECUTE':
        return this.gnn.executeProcess(params.processId);

      case 'SELF_IMPROVE': {
        const kernelCode = fs.readFileSync(__filename, 'utf8');
        const id = this.ingestion.ingest(kernelCode, { type: 'js', version: '1.1', name: 'morph-os-kernel' });
        this.study.analyze(id);
        const rep = this.understanding.buildRepresentation(id);
        const improved = this.regeneration.generate({ contract: rep.contract, mode: 'improved', target: 'kernel-v2' });
        this.persistence.logEvolution({ type: 'self_improvement', artifactId: id, verification: improved.verification });
        return improved;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  getStats() {
    return {
      state: this.state,
      artifacts: this.persistence.listArtifacts().length,
      contracts: Object.keys(this.persistence.contracts).length,
      evolutionEntries: this.persistence.getEvolutionLog().length,
      activeGates: Array.from(this.gnn.activeGates),
      activeChannels: Array.from(this.gnn.activeChannels),
      consciousnessLevel: this.scheduler.consciousnessLevel
    };
  }

  shutdown() {
    console.log('[MORPH-OS] Shutting down...');
    this.persistence.flush();
    console.log('[MORPH-OS] State persisted. Goodbye.');
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────
module.exports = { MorphOrchestrator };

// Direct boot (for `node morph-os-kernel.js`)
if (require.main === module) {
  const os = new MorphOrchestrator();
  console.log('\n[MORPH-OS] Booted successfully!');
  console.log('[MORPH-OS] Stats:', JSON.stringify(os.getStats(), null, 2));
  os.shutdown();
}
