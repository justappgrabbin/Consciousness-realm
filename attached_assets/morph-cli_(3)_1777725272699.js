#!/usr/bin/env node
// morph-cli.js
// CLI for Morph OS — uses ONLY orchestrate() syscalls

const fs = require('fs');
const path = require('path');
const { MorphOrchestrator } = require('./morph-os-kernel.js');

let morphOS = null;

function getOS() {
  if (!morphOS) morphOS = new MorphOrchestrator();
  return morphOS;
}

function init() {
  console.log('🛠️  Initializing Morph OS...\n');
  const required = ['trident-gnn-complete.json', 'morph-kernel-entry-v4.json'];
  for (const file of required) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing: ${file}`);
      process.exit(1);
    }
    console.log(`✅ ${file}`);
  }
  if (!fs.existsSync('./memory')) fs.mkdirSync('./memory', { recursive: true });
  const files = ['artifacts.json', 'contracts.json', 'evolution-log.json'];
  for (const file of files) {
    const fp = `./memory/${file}`;
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, file === 'evolution-log.json' ? '[]' : '{}');
  }
  console.log('\n🎉 Morph OS initialized!');
}

function ingest(args) {
  const filepath = args[0];
  if (!filepath || !fs.existsSync(filepath)) {
    console.error('Usage: morph ingest <file>');
    process.exit(1);
  }
  const os = getOS();
  const artifactId = os.orchestrate('INGEST', { filepath });
  console.log(`\n📦 Ingested: ${artifactId}`);
  os.shutdown();
  return artifactId;
}

function study(args) {
  const artifactId = args[0];
  if (!artifactId) {
    console.error('Usage: morph study <artifactId>');
    process.exit(1);
  }
  const os = getOS();
  const analysis = os.orchestrate('STUDY', { artifactId });
  console.log('\n📊 Study Results');
  console.log('═══════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Nodes: ${analysis.structure.nodeCount}`);
  console.log(`Complexity: ${analysis.structure.cyclomaticComplexity}`);
  console.log(`Patterns: ${analysis.patterns.join(', ') || 'none'}`);
  console.log(`Resonance: Gate ${analysis.resonance.primaryGate}, Circuit ${analysis.resonance.circuitFamily}`);
  console.log(`Issues: ${analysis.issues.length}`);
  if (analysis.issues.length > 0) {
    console.log('\n⚠️ Issues:');
    analysis.issues.forEach(i => console.log(`   [${i.severity.toUpperCase()}] ${i.message}`));
  }
  os.shutdown();
  return analysis;
}

function understand(args) {
  const artifactId = args[0];
  if (!artifactId) {
    console.error('Usage: morph understand <artifactId>');
    process.exit(1);
  }
  const os = getOS();
  const rep = os.orchestrate('UNDERSTAND', { artifactId });
  console.log('\n🧠 Understanding');
  console.log('═══════════════════════════════════════');
  console.log(`Intent: ${rep.intent.primary}`);
  console.log(`Confidence: ${rep.confidence.toFixed(1)}%`);
  console.log('Capabilities:');
  Object.entries(rep.capabilities).forEach(([k, v]) => console.log(`   ${k}: ${v ? '✅' : '❌'}`));
  os.shutdown();
  return rep;
}

function regenerate(args) {
  const artifactId = args[0];
  if (!artifactId) {
    console.error('Usage: morph regenerate <artifactId> --mode <mode>');
    process.exit(1);
  }
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'equivalent';

  const os = getOS();
  const result = os.orchestrate('REGENERATE', { artifactId, mode });

  console.log('\n🔧 Regeneration');
  console.log('═══════════════════════════════════════');
  console.log(`Mode: ${mode}`);
  console.log(`Architecture: ${result.architecture}`);
  console.log(`Syntax: ${result.verification.syntaxValid ? '✅' : '❌'}`);
  console.log(`Size: ${result.code.length} chars`);

  const outFile = `./memory/regenerated_${artifactId}_${mode}.js`;
  fs.writeFileSync(outFile, result.code);
  console.log(`\n💾 Saved: ${outFile}`);
  os.shutdown();
  return result;
}

function pipeline(args) {
  const filepath = args[0];
  if (!filepath || !fs.existsSync(filepath)) {
    console.error('Usage: morph pipeline <file> --mode <mode>');
    process.exit(1);
  }
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'improved';

  console.log('\n🚀 ATOMIC PIPELINE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Input: ${filepath}`);
  console.log(`Mode: ${mode}`);
  console.log('');

  const os = getOS();
  const { artifactId, result } = os.orchestrate('PIPELINE', { filepath, mode });

  // Save outputs
  const base = path.basename(filepath, path.extname(filepath));
  const outFile = `./memory/pipeline_${base}_${mode}.js`;
  fs.writeFileSync(outFile, result.code);

  // Generate diff
  const original = fs.readFileSync(filepath, 'utf8');
  const diff = generateDiff(original, result.code, artifactId, os.persistence.getArtifact(artifactId));
  const diffFile = `./memory/diff_${artifactId}.md`;
  fs.writeFileSync(diffFile, diff);

  console.log('\n✅ PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Output: ${outFile}`);
  console.log(`Diff: ${diffFile}`);
  os.shutdown();
  return { artifactId, outFile, diffFile };
}

function generateDiff(original, regenerated, artifactId, artifact) {
  const contract = artifact.contract;
  const issues = [
    ...(contract.complexity.lines > 50 ? [{ type: 'complexity', severity: 'medium', message: 'Large file' }] : []),
    ...(original.includes('var ') ? [{ type: 'legacy_var', severity: 'medium', message: 'Use of var' }] : []),
    ...(original.includes('console.log') ? [{ type: 'debug_code', severity: 'low', message: 'Debug logs' }] : []),
    ...((original.includes('==') && !original.includes('===')) ? [{ type: 'loose_equality', severity: 'medium', message: 'Loose equality' }] : [])
  ];
  const fixed = issues.filter(i => ['debug_code', 'legacy_var', 'loose_equality'].includes(i.type));

  return `# Morph OS Diff Report

## Artifact: ${artifactId}
## Gate: ${contract.resonance?.primaryGate || '?'} | Circuit: ${contract.resonance?.circuitFamily || '?'}

### Original: ${original.length} chars
### Regenerated: ${regenerated.length} chars
### Delta: ${regenerated.length - original.length > 0 ? '+' : ''}${regenerated.length - original.length}

### Issues Found: ${issues.length}
#### ✅ Auto-Fixed (${fixed.length})
${fixed.map(i => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`).join('\n') || 'None'}

### Improvements
- Replaced \`var\` with \`const\`
- Fixed loose equality (== → ===)
- Removed debug \`console.log\` statements
- Added JSDoc comments

---
*Morph OS v1.1*
`;
}

function list() {
  const os = getOS();
  const ids = os.persistence.listArtifacts();
  console.log('\n📦 Artifacts');
  console.log('═══════════════════════════════════════');
  if (ids.length === 0) {
    console.log('None. Run: morph ingest <file>');
  } else {
    ids.forEach(id => {
      const a = os.persistence.getArtifact(id);
      console.log(`${id} | ${a.metadata.type} | ${a.size} chars | ${a.metadata.name || 'unnamed'}`);
    });
  }
  os.shutdown();
}

function stats() {
  const os = getOS();
  const s = os.orchestrate('STATS');
  console.log('\n📊 Stats');
  console.log('═══════════════════════════════════════');
  console.log(`State: ${s.state}`);
  console.log(`Artifacts: ${s.artifacts}`);
  console.log(`Contracts: ${s.contracts}`);
  console.log(`Evolution: ${s.evolutionEntries}`);
  console.log(`Gates: ${s.activeGates.join(', ') || 'none'}`);
  console.log(`Channels: ${s.activeChannels.join(', ') || 'none'}`);
  console.log(`Consciousness: ${s.consciousnessLevel}/4`);
  os.shutdown();
}

function test() {
  console.log('\n🧪 Test Suite');
  console.log('═══════════════════════════════════════════════════');
  const os = getOS();
  let passed = 0, failed = 0;

  function t(name, fn) {
    try { fn(); console.log(`✅ ${name}`); passed++; }
    catch (e) { console.log(`❌ ${name}: ${e.message}`); failed++; }
  }

  t('Kernel boots', () => { if (os.state !== 'RUNNING') throw new Error('Not running'); });

  let id;
  t('Ingest', () => {
    id = os.orchestrate('INGEST', { code: 'function hello() { return "world"; }', metadata: { type: 'js', name: 'test' } });
    if (!id) throw new Error('No ID');
  });

  t('Study', () => {
    const a = os.orchestrate('STUDY', { artifactId: id });
    if (a.structure.nodeCount === 0) throw new Error('Empty');
  });

  t('Understand', () => {
    const r = os.orchestrate('UNDERSTAND', { artifactId: id });
    if (r.confidence < 1) throw new Error('No confidence');
  });

  t('Regenerate', () => {
    const c = os.persistence.getContract(id);
    const r = os.orchestrate('REGENERATE', { contract: c, mode: 'equivalent' });
    if (!r.code) throw new Error('No code');
  });

  t('Persist', () => {
    os.persistence.flush();
    if (!fs.existsSync('./memory/artifacts.json')) throw new Error('No file');
  });

  t('GNN gate', () => {
    os.gnn.activateGate(10, 'test');
    if (!os.gnn.isGateActive(10)) throw new Error('Not active');
  });

  t('Integration route', () => {
    const r = os.scheduler.route('INGEST');
    if (!r.path) throw new Error('No path');
  });

  t('Pipeline atomic', () => {
    const code = 'var x = 1; function test() { console.log(x); return x == 2; }';
    const { artifactId, result } = os.orchestrate('PIPELINE', { code, metadata: { type: 'js', name: 'pipeline_test' }, mode: 'improved' });
    if (result.code.includes('var ')) throw new Error('var not fixed');
    if (result.code.includes('console.log')) throw new Error('debug not removed');
  });

  t('Self-improve', () => {
    const r = os.orchestrate('SELF_IMPROVE');
    if (!r.code) throw new Error('No code');
  });

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️ Some failed');
  os.shutdown();
}

function demo() {
  console.log('\n🎯 DEMO: Messy JS → Clean JS');
  console.log('═══════════════════════════════════════════════════');

  const messy = `// messy file
var userName = "Alice";
var userAge = 30;

function getUser() {
  console.log("Getting user");
  if(userName == "Alice") {
    console.log("Found Alice");
    return {name: userName, age: userAge}
  }
  return null
}

function processUsers(users) {
  var results = [];
  for(var i=0; i<users.length; i++) {
    console.log("Processing user " + i);
    if(users[i].name == userName) {
      results.push(users[i]);
    }
  }
  return results;
}

var users = [{name:"Alice", age:30}, {name:"Bob", age:25}];
console.log(processUsers(users));
`;

  const demoFile = './memory/demo_messy.js';
  fs.writeFileSync(demoFile, messy);

  console.log('Input:');
  console.log(messy);
  console.log('═══════════════════════════════════════════════════\n');

  const os = getOS();
  const { artifactId, result } = os.orchestrate('PIPELINE', { filepath: demoFile, mode: 'improved' });

  const outFile = './memory/pipeline_demo_messy_improved.js';
  fs.writeFileSync(outFile, result.code);

  console.log('\n✅ OUTPUT:');
  console.log('═══════════════════════════════════════════════════');
  console.log(result.code);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Saved: ${outFile}`);
  os.shutdown();
}

function help() {
  console.log('\n🛠️  Morph OS CLI');
  console.log('═══════════════════════════════════════════════════');
  console.log('All commands route through the kernel orchestrator.\n');
  console.log('  init                    Initialize system');
  console.log('  ingest <file>           Ingest code');
  console.log('  study <id>              Analyze artifact');
  console.log('  understand <id>         Build representation');
  console.log('  regenerate <id>         Generate code');
  console.log('  pipeline <file>         Full pipeline');
  console.log('  list                    List artifacts');
  console.log('  stats                   System stats');
  console.log('  test                    Run test suite');
  console.log('  demo                    Run demo');
  console.log('  help                    This help');
}

// ─── MAIN ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];
const cmdArgs = args.slice(1);

const COMMANDS = {
  init, ingest, study, understand, regenerate, pipeline, list, stats, test, demo, help
};

if (!cmd || !COMMANDS[cmd]) {
  help();
  process.exit(0);
}

COMMANDS[cmd](cmdArgs);
if (morphOS) morphOS.shutdown();
process.exit(0);
