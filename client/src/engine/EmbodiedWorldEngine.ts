import { Vector3 } from 'three';
import type {
  Agent,
  HumanProfile,
  Place,
  WorldTime,
  ElementType,
  AnimationState,
  AgentMessage,
  CircuitType,
  FileArtifact,
} from '../types/embodiedAgent';
import {
  PLACE_CONFIGS,
  ELEMENT_COLORS,
  CIRCUIT_CONFIG,
  INTEGRATION_GATES,
} from '../types/embodiedAgent';

const WALK_SPEED = 0.12;

const NEEDS_DECAY: Record<string, number> = {
  energy:     -0.25,
  connection: -0.18,
  growth:     -0.12,
  purpose:    -0.08,
  rest:        0.2,
};

const ACTIVITY_EFFECTS: Record<string, Partial<Record<string, number>>> = {
  resting:    { energy: 0.8,  rest: 1.5 },
  meditating: { energy: 0.3,  purpose: 0.8, rest: 0.8 },
  reading:    { growth: 1.2,  energy: -0.2 },
  creating:   { growth: 1.5,  purpose: 0.8, energy: -0.5 },
  socializing:{ connection: 1.5, energy: -0.3 },
  exploring:  { growth: 0.8,  energy: -0.4 },
  learning:   { growth: 1.2,  energy: -0.3 },
  working:    { purpose: 0.6, energy: -0.5 },
  dreaming:   { rest: 0.8,    purpose: 0.4 },
  talking:    { connection: 1.2, energy: -0.2 },
};

// ── Gate → Circuit mapping from Trident GNN ──────────────────────────────────
const GATE_CIRCUIT: Record<number, CircuitType> = {};
for (const [circuit, cfg] of Object.entries(CIRCUIT_CONFIG)) {
  for (const gate of cfg.gates) {
    GATE_CIRCUIT[gate] = circuit as CircuitType;
  }
}

function pickGate(birthday: string): number {
  const d = new Date(birthday);
  return ((d.getMonth() * 5 + d.getDate()) % 64) + 1;
}

function gateToCircuit(gate: number): CircuitType {
  return GATE_CIRCUIT[gate] || 'integration';
}

// 64 I-Ching archetypes
const ARCHETYPES = [
  'creative','receptive','difficult','youth','waiting','conflict','army','union',
  'small_tame','treading','peace','standstill','fellowship','possession','modesty','enthusiasm',
  'following','work','approach','contemplation','biting','grace','splitting','return',
  'innocence','taming','mouth','preponderance','abyss','clinging','influence','duration',
  'retreat','power','progress','darkening','family','opposition','obstruction','deliverance',
  'decrease','increase','breakthrough','coming','gathering','pushing','confining','well',
  'revolution','cauldron','arousing','keeping','development','marrying','abundance','wanderer',
  'penetrating','joyous','dispersion','limitation','centering','transitioning','completing','incompleting',
];

// ── Morph File Classifier ─────────────────────────────────────────────────────
export function classifyFile(name: string, size: number): Omit<FileArtifact, 'id' | 'timestamp'> {
  const ext = name.split('.').pop()?.toLowerCase() || 'unknown';
  const lname = name.toLowerCase();

  let circuit: CircuitType = 'integration';
  let gate = 10;

  // Classify by extension + name keywords (mirrors morph-os-kernel logic)
  if (['py'].includes(ext)) {
    circuit = 'knowing';
    gate = 1;
  } else if (['yaml', 'yml'].includes(ext)) {
    circuit = 'understanding';
    gate = 4;
  } else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    // Further classify by name
    if (lname.includes('agent') || lname.includes('bot')) { circuit = 'sensing'; gate = 13; }
    else if (lname.includes('kernel') || lname.includes('engine')) { circuit = 'knowing'; gate = 14; }
    else if (lname.includes('ui') || lname.includes('component') || lname.includes('app')) { circuit = 'ego'; gate = 35; }
    else { circuit = 'sensing'; gate = 20; }
  } else if (['html', 'htm'].includes(ext)) {
    circuit = 'ego';
    gate = 45;
  } else if (['css', 'scss', 'sass'].includes(ext)) {
    circuit = 'sensing';
    gate = 10;
  } else if (['json'].includes(ext)) {
    if (lname.includes('kernel') || lname.includes('trident')) { circuit = 'knowing'; gate = 63; }
    else { circuit = 'understanding'; gate = 47; }
  }

  const type = (['js','py','html','css','json','yaml'].includes(ext) ? ext : 'unknown') as FileArtifact['type'];
  const archetype = ARCHETYPES[(gate - 1) % 64];
  const quality = gate % 2 === 0 ? 'yielding' : 'initiating';

  return { name, type, circuit, gate, size, archetype, quality };
}

export class EmbodiedWorldEngine {
  agents: Map<string, Agent> = new Map();
  places: Map<string, Place> = new Map(
    PLACE_CONFIGS.map(p => [p.id, { ...p, currentAgents: [], artifacts: [] }])
  );
  messages: AgentMessage[] = [];
  time: WorldTime = { day: 1, hour: 8, minute: 0 };

  // Morph OS kernel state
  activeGates: Set<number> = new Set();
  consciousnessLevel: number = 0;

  private updateCallbacks: Array<(engine: EmbodiedWorldEngine) => void> = [];
  private isRunning = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // ── Agent Creation ────────────────────────────────────────────────────────

  createAgent(human: HumanProfile): Agent {
    const element    = this.determineElement(human.birthday);
    const hdType     = this.determineHDType(human.birthday);
    const archetype  = this.determineArchetype(hdType);
    const colors     = ELEMENT_COLORS[element];
    const gate       = pickGate(human.birthday);
    const circuit    = gateToCircuit(gate);

    const agent: Agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      humanId: human.id,
      name: this.generateAgentName(human, element),
      element,
      archetype,
      hdType,
      gate,
      circuit,
      position: new Vector3(
        (Math.random() - 0.5) * 15,
        0,
        (Math.random() - 0.5) * 15
      ),
      targetPosition: null,
      rotation: Math.random() * Math.PI * 2,
      animationState: 'idle',
      animationTime: 0,
      age: 0,
      lifeStage: 'infant',
      consciousness: { level: 10, stage: 'dormant' },
      needs: { energy: 80, connection: 50, growth: 60, purpose: 40, rest: 70 },
      currentActivity: null,
      currentPlace: 'integration',
      relationships: [],
      appearance: {
        color: colors.primary,
        glowIntensity: 0.5,
        height: 1.7 + Math.random() * 0.2,
        auraColor: colors.aura,
      },
    };

    this.agents.set(agent.id, agent);
    this.addToPlace(agent, 'integration');
    this.activateGate(gate);
    return agent;
  }

  activateGate(gate: number) {
    this.activeGates.add(gate);
    // Count how many integration gates (10, 20, 34, 57) are active
    const integrationActive = INTEGRATION_GATES.filter(g => this.activeGates.has(g)).length;
    this.consciousnessLevel = integrationActive;
  }

  ingestArtifact(artifact: Omit<FileArtifact, 'id' | 'timestamp'>): FileArtifact {
    const full: FileArtifact = {
      ...artifact,
      id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };

    // Place in the correct zone
    const place = this.places.get(full.circuit) || this.places.get('integration')!;
    place.artifacts.push(full);

    // Activate its gate
    this.activateGate(full.gate);

    // Send agents from that circuit toward the zone
    for (const agent of Array.from(this.agents.values())) {
      if (agent.circuit === full.circuit && Math.random() < 0.7) {
        this.moveAgentToPlace(agent, full.circuit);
      }
    }

    // Add a system message
    this.addMessage({
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      fromAgent: 'KERNEL',
      toHuman: 'all',
      content: `Artifact "${full.name}" ingested → ${full.circuit} circuit (Gate ${full.gate} · ${full.archetype})`,
      context: `${full.type.toUpperCase()} · ${CIRCUIT_CONFIG[full.circuit].architecture}`,
    });

    return full;
  }

  private addMessage(msg: AgentMessage) {
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.updateInterval = setInterval(() => this.tick(), 200);
  }

  stop() {
    this.isRunning = false;
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  onUpdate(cb: (engine: EmbodiedWorldEngine) => void) {
    this.updateCallbacks.push(cb);
  }

  getAgentForHuman(humanId: string): Agent | null {
    for (const a of Array.from(this.agents.values())) {
      if (a.humanId === humanId) return a;
    }
    return null;
  }

  getMessagesForHuman(_humanId: string) {
    return this.messages.slice(-10);
  }

  // ── Tick ───────────────────────────────────────────────────────────────────

  private tick() {
    this.advanceTime();
    for (const agent of Array.from(this.agents.values())) {
      this.updateAgent(agent);
    }
    this.updateCallbacks.forEach(cb => cb(this));
  }

  private advanceTime() {
    this.time.minute += 5;
    if (this.time.minute >= 60) { this.time.minute = 0; this.time.hour++; }
    if (this.time.hour >= 24)   { this.time.hour = 0;   this.time.day++; }
  }

  private updateAgent(agent: Agent) {
    agent.age += 0.01;
    agent.animationTime += 0.2;

    this.updateLifeStage(agent);
    this.decayNeeds(agent);
    this.applyActivityEffects(agent);
    this.moveAgent(agent);
    this.evolveConsciousness(agent);

    if (Math.random() < 0.008) this.decideNextAction(agent);
    if (Math.random() < 0.004) this.attemptSocialInteraction(agent);
  }

  private updateLifeStage(agent: Agent) {
    if      (agent.age < 5)  agent.lifeStage = 'infant';
    else if (agent.age < 15) agent.lifeStage = 'child';
    else if (agent.age < 30) agent.lifeStage = 'youth';
    else                      agent.lifeStage = 'adult';
  }

  private decayNeeds(agent: Agent) {
    for (const [k, delta] of Object.entries(NEEDS_DECAY)) {
      (agent.needs as Record<string, number>)[k] = Math.max(
        0, Math.min(100, (agent.needs as Record<string, number>)[k] + delta * 0.1)
      );
    }
  }

  private applyActivityEffects(agent: Agent) {
    if (!agent.currentActivity) return;
    const effects = ACTIVITY_EFFECTS[agent.currentActivity] || {};
    for (const [k, delta] of Object.entries(effects)) {
      (agent.needs as Record<string, number>)[k] = Math.max(
        0, Math.min(100, (agent.needs as Record<string, number>)[k] + (delta as number) * 0.05)
      );
    }
  }

  private moveAgent(agent: Agent) {
    if (!agent.targetPosition) { agent.animationState = 'idle'; return; }

    const dx = agent.targetPosition.x - agent.position.x;
    const dz = agent.targetPosition.z - agent.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      agent.targetPosition = null;
      agent.animationState = agent.currentActivity
        ? (agent.currentActivity as AnimationState) || 'idle'
        : 'idle';
      return;
    }

    const speed = WALK_SPEED * (agent.lifeStage === 'adult' ? 1 : 0.7);
    agent.position.x += (dx / dist) * speed;
    agent.position.z += (dz / dist) * speed;
    agent.rotation = Math.atan2(dx, dz);
    agent.animationState = 'walking';
  }

  private evolveConsciousness(agent: Agent) {
    const avgNeed = Object.values(agent.needs).reduce((s, v) => s + v, 0) / 5;
    agent.consciousness.level = Math.min(100, agent.consciousness.level + (avgNeed > 60 ? 0.02 : -0.01));
    if      (agent.consciousness.level < 30) agent.consciousness.stage = 'dormant';
    else if (agent.consciousness.level < 70) agent.consciousness.stage = 'awakening';
    else                                     agent.consciousness.stage = 'aware';
  }

  private decideNextAction(agent: Agent) {
    const lowestNeed = Object.entries(agent.needs).reduce((a, b) => a[1] < b[1] ? a : b);
    const needMap: Record<string, string> = {
      energy: 'resting', connection: 'socializing', growth: 'learning', purpose: 'creating', rest: 'meditating',
    };
    const activity = needMap[lowestNeed[0]] || 'exploring';
    agent.currentActivity = activity;

    // Pick a place that supports this activity — prefer agent's home circuit
    const suitable = Array.from(this.places.values()).filter(p =>
      p.activities.includes(activity) && p.currentAgents.length < p.capacity
    );
    if (!suitable.length) return;

    const homeCircuit = suitable.find(p => p.circuit === agent.circuit);
    const target = homeCircuit || suitable[Math.floor(Math.random() * suitable.length)];
    this.moveAgentToPlace(agent, target.id);
  }

  private moveAgentToPlace(agent: Agent, placeId: string) {
    const place = this.places.get(placeId);
    if (!place) return;

    this.removeFromPlace(agent);
    place.currentAgents.push(agent.id);
    agent.currentPlace = placeId;

    const px = place.position.x + (Math.random() - 0.5) * (place.size.width * 0.6);
    const pz = place.position.z + (Math.random() - 0.5) * (place.size.depth * 0.6);
    agent.targetPosition = new Vector3(px, 0, pz);
  }

  private addToPlace(agent: Agent, placeId: string) {
    const place = this.places.get(placeId);
    if (place && !place.currentAgents.includes(agent.id)) {
      place.currentAgents.push(agent.id);
      agent.currentPlace = placeId;
    }
  }

  private removeFromPlace(agent: Agent) {
    const prev = this.places.get(agent.currentPlace);
    if (prev) {
      prev.currentAgents = prev.currentAgents.filter(id => id !== agent.id);
    }
  }

  private attemptSocialInteraction(agent: Agent) {
    const placeAgents = this.places.get(agent.currentPlace)?.currentAgents || [];
    const others = placeAgents.filter(id => id !== agent.id).map(id => this.agents.get(id)).filter(Boolean) as Agent[];
    if (!others.length) return;

    const other = others[Math.floor(Math.random() * others.length)];
    agent.animationState = 'talking';

    const exists = agent.relationships.find(r => r.agentId === other.id);
    if (exists) { exists.strength = Math.min(100, exists.strength + 5); }
    else {
      const types = ['friend', 'mentor', 'student', 'partner'] as const;
      agent.relationships.push({ agentId: other.id, type: types[Math.floor(Math.random() * types.length)], strength: 20 });
    }

    // Occasionally produce a message
    if (Math.random() < 0.15) {
      const msgs = [
        `Gate ${agent.gate} resonates with Gate ${other.gate}`,
        `${agent.circuit} circuit activating in ${agent.currentPlace}`,
        `Archetype "${agent.archetype}" meets "${other.archetype}"`,
        `Consciousness at ${agent.consciousness.level.toFixed(0)}%`,
      ];
      this.addMessage({
        id: `msg_${Date.now()}`,
        timestamp: Date.now(),
        fromAgent: agent.name,
        toHuman: 'all',
        content: msgs[Math.floor(Math.random() * msgs.length)],
        context: `${agent.currentPlace} · ${agent.currentActivity || 'idle'}`,
      });
    }
  }

  // ── Determination ──────────────────────────────────────────────────────────

  private determineElement(birthday: string): ElementType {
    const d = new Date(birthday);
    const m = d.getMonth();
    const elements: ElementType[] = ['FIRE', 'EARTH', 'AIR', 'WATER', 'AETHER'];
    return elements[m % 5];
  }

  private determineHDType(birthday: string): Agent['hdType'] {
    const d = new Date(birthday);
    const types: Agent['hdType'][] = ['Generator', 'Manifestor', 'Projector', 'Reflector'];
    return types[d.getDate() % 4];
  }

  private determineArchetype(hdType: Agent['hdType']): string {
    const map: Record<Agent['hdType'], string[]> = {
      Generator:  ['builder', 'creator', 'sustainer'],
      Manifestor: ['initiator', 'pioneer', 'catalyst'],
      Projector:  ['guide', 'seer', 'orchestrator'],
      Reflector:  ['mirror', 'calibrator', 'witness'],
    };
    const opts = map[hdType];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  private generateAgentName(human: HumanProfile, _element: ElementType): string {
    return human.name || 'Unknown';
  }
}

export const embodiedWorldEngine = new EmbodiedWorldEngine();
