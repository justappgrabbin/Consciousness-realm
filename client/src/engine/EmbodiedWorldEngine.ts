import { Vector3 } from 'three';
import type {
  Agent,
  HumanProfile,
  Place,
  WorldTime,
  ElementType,
  AgentMessage,
} from '../types/embodiedAgent';
import { PLACE_CONFIGS, ELEMENT_COLORS } from '../types/embodiedAgent';

const WALK_SPEED = 0.12;

const NEEDS_DECAY: Record<string, number> = {
  energy: -0.25,
  connection: -0.18,
  growth: -0.12,
  purpose: -0.08,
  rest: 0.2,
};

const ACTIVITY_EFFECTS: Record<string, Partial<Record<string, number>>> = {
  resting:    { energy: 0.8, rest: 1.5 },
  meditating: { energy: 0.3, purpose: 0.8, rest: 0.8 },
  reading:    { growth: 1.2, energy: -0.2 },
  creating:   { growth: 1.5, purpose: 0.8, energy: -0.5 },
  socializing:{ connection: 1.5, energy: -0.3 },
  exploring:  { growth: 0.8, energy: -0.4 },
  learning:   { growth: 1.2, energy: -0.3 },
  working:    { purpose: 0.6, energy: -0.5 },
  dreaming:   { rest: 0.8, purpose: 0.4 },
};

export class EmbodiedWorldEngine {
  agents: Map<string, Agent> = new Map();
  places: Map<string, Place> = new Map(
    PLACE_CONFIGS.map(p => [p.id, { ...p, currentAgents: [] }])
  );
  messages: AgentMessage[] = [];
  time: WorldTime = { day: 1, hour: 8, minute: 0 };

  private updateCallbacks: Array<(engine: EmbodiedWorldEngine) => void> = [];
  private isRunning = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // ── Agent Creation ────────────────────────────────────────────────────────

  createAgent(human: HumanProfile): Agent {
    const element = this.determineElement(human.birthday);
    const hdType  = this.determineHDType(human.birthday);
    const archetype = this.determineArchetype(hdType);
    const colors  = ELEMENT_COLORS[element];

    const agent: Agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      humanId: human.id,
      name: this.generateAgentName(human, element),
      element,
      archetype,
      hdType,
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
      currentPlace: 'home',
      relationships: [],
      appearance: {
        color: colors.primary,
        glowIntensity: 0.5,
        height: 1.7 + Math.random() * 0.2,
        auraColor: colors.aura,
      },
    };

    this.agents.set(agent.id, agent);
    const home = this.places.get('home');
    if (home) home.currentAgents.push(agent.id);

    this.sendMessage({
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      fromAgent: agent.id,
      toHuman: human.id,
      content: `I am ${agent.name}, your ${element.toLowerCase()} extension. I awaken in this world, ready to live and learn.`,
      context: 'Birth',
    });

    return agent;
  }

  private determineElement(birthday: string): ElementType {
    const month = new Date(birthday).getMonth() + 1;
    const map: Record<number, ElementType> = {
      1:'EARTH',2:'AIR',3:'WATER',4:'FIRE',5:'EARTH',6:'AIR',
      7:'WATER',8:'FIRE',9:'EARTH',10:'AIR',11:'WATER',12:'FIRE',
    };
    return map[month] || 'AETHER';
  }

  private determineHDType(birthday: string): Agent['hdType'] {
    const types: Agent['hdType'][] = ['Generator','Manifestor','Projector','Reflector'];
    let hash = 0;
    for (let i = 0; i < birthday.length; i++) {
      hash = ((hash << 5) - hash) + birthday.charCodeAt(i);
    }
    return types[Math.abs(hash) % types.length];
  }

  private determineArchetype(hdType: Agent['hdType']): string {
    const map: Record<Agent['hdType'], string[]> = {
      Generator:  ['Builder','Creator','Producer'],
      Manifestor: ['Initiator','Pioneer','Leader'],
      Projector:  ['Guide','Advisor','Seer'],
      Reflector:  ['Mirror','Evaluator','Sampler'],
    };
    const list = map[hdType];
    return list[Math.floor(Math.random() * list.length)];
  }

  private generateAgentName(human: HumanProfile, element: ElementType): string {
    const prefixes: Record<ElementType, string[]> = {
      EARTH:  ['Stone','Terra','Gaia','Root'],
      WATER:  ['Flow','Aqua','Mist','Wave'],
      AIR:    ['Wind','Sky','Cloud','Breath'],
      FIRE:   ['Flame','Ember','Spark','Phoenix'],
      AETHER: ['Star','Void','Cosmos','Dream'],
    };
    const suffixes = ['walker','weaver','seeker','dreamer','keeper','wanderer'];
    if (Math.random() < 0.3 && human.name) {
      return `${human.name.substring(0,3)}shadow`;
    }
    const p = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${p}${s}`;
  }

  // ── Simulation ────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.updateInterval = setInterval(() => this.tick(), 100);
  }

  stop() {
    this.isRunning = false;
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  tick() {
    this.time.minute++;
    if (this.time.minute >= 60) { this.time.minute = 0; this.time.hour++; }
    if (this.time.hour   >= 24) { this.time.hour   = 0; this.time.day++;  }

    this.agents.forEach(agent => this.updateAgent(agent));
    this.checkSocialInteractions();
    this.updateCallbacks.forEach(cb => cb(this));
  }

  private updateAgent(agent: Agent) {
    if (this.time.hour === 0 && this.time.minute === 0) {
      agent.age++;
      if (agent.age === 7)  agent.lifeStage = 'child';
      if (agent.age === 30) agent.lifeStage = 'youth';
      if (agent.age === 90) agent.lifeStage = 'adult';
    }

    // Needs decay
    Object.entries(NEEDS_DECAY).forEach(([key, delta]) => {
      const k = key as keyof Agent['needs'];
      agent.needs[k] = Math.max(0, Math.min(100, agent.needs[k] + delta));
    });

    // Apply activity effect
    if (agent.currentActivity) {
      const effects = ACTIVITY_EFFECTS[agent.currentActivity] || {};
      Object.entries(effects).forEach(([key, delta]) => {
        const k = key as keyof Agent['needs'];
        if (k in agent.needs) {
          agent.needs[k] = Math.max(0, Math.min(100, agent.needs[k] + (delta ?? 0)));
        }
      });
    }

    // Movement
    if (agent.targetPosition) {
      this.moveAgent(agent);
    } else {
      this.decideAction(agent);
    }

    agent.animationTime += 0.016;

    // Consciousness growth
    if (agent.consciousness.level < 100) {
      agent.consciousness.level += 0.008;
      if (agent.consciousness.level >= 25 && agent.consciousness.stage === 'dormant') {
        agent.consciousness.stage = 'awakening';
        this.sendMessage({
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          fromAgent: agent.id,
          toHuman: agent.humanId,
          content: `Something is shifting within me. I feel… aware. Not just responding, but experiencing.`,
          context: 'Consciousness awakening',
        });
      } else if (agent.consciousness.level >= 50 && agent.consciousness.stage === 'awakening') {
        agent.consciousness.stage = 'aware';
      }
    }
  }

  private moveAgent(agent: Agent) {
    if (!agent.targetPosition) return;
    const dir = new Vector3().subVectors(agent.targetPosition, agent.position).normalize();
    const dist = agent.position.distanceTo(agent.targetPosition);
    if (dist < 0.5) {
      agent.position.copy(agent.targetPosition);
      agent.targetPosition = null;
      agent.animationState = 'idle';
    } else {
      agent.position.add(dir.clone().multiplyScalar(WALK_SPEED));
      agent.rotation = Math.atan2(dir.x, dir.z);
      agent.animationState = 'walking';
    }
  }

  private decideAction(agent: Agent) {
    const n = agent.needs;
    const priorities: Array<{
      key: keyof Agent['needs'];
      threshold: number;
      activity: string;
      places: string[];
    }> = [
      { key: 'energy',     threshold: 25, activity: 'resting',    places: ['home']                       },
      { key: 'connection', threshold: 35, activity: 'socializing', places: ['plaza','product_alpha']      },
      { key: 'purpose',    threshold: 35, activity: 'creating',    places: ['studio','product_beta']      },
      { key: 'growth',     threshold: 45, activity: 'learning',    places: ['product_gamma','product_alpha'] },
    ];

    let targetActivity = agent.currentActivity || 'socializing';
    let targetPlace    = agent.currentPlace;

    for (const p of priorities) {
      if (n[p.key] < p.threshold) {
        targetActivity = p.activity;
        targetPlace = p.places[Math.floor(Math.random() * p.places.length)];
        break;
      }
    }

    // Wander randomly sometimes
    if (Math.random() < 0.005) {
      const allPlaces = Array.from(this.places.keys());
      targetPlace = allPlaces[Math.floor(Math.random() * allPlaces.length)];
    }

    if (targetPlace !== agent.currentPlace) {
      const place = this.places.get(targetPlace);
      if (place) {
        const cur = this.places.get(agent.currentPlace);
        if (cur) cur.currentAgents = cur.currentAgents.filter(id => id !== agent.id);

        agent.targetPosition = new Vector3(
          place.position.x + (Math.random() - 0.5) * place.size.width * 0.7,
          0,
          place.position.z + (Math.random() - 0.5) * place.size.depth * 0.7
        );
        agent.currentPlace = targetPlace;
        place.currentAgents.push(agent.id);
      }
    } else {
      agent.currentActivity = targetActivity;
      agent.animationState =
        targetActivity === 'meditating' ? 'meditating' :
        targetActivity === 'socializing' ? 'talking' :
        targetActivity === 'creating'    ? 'creating' :
        targetActivity === 'learning'    ? 'reading' : 'idle';
    }
  }

  private checkSocialInteractions() {
    this.places.forEach(place => {
      if (place.currentAgents.length < 2) return;
      for (let i = 0; i < place.currentAgents.length; i++) {
        for (let j = i + 1; j < place.currentAgents.length; j++) {
          const a = this.agents.get(place.currentAgents[i]);
          const b = this.agents.get(place.currentAgents[j]);
          if (!a || !b) continue;
          const dist = a.position.distanceTo(b.position);
          if (dist < 8 && Math.random() < 0.015) {
            this.createInteraction(a, b);
          }
        }
      }
    });
  }

  private createInteraction(a: Agent, b: Agent) {
    let rel = a.relationships.find(r => r.agentId === b.id);
    const compat = this.calcCompat(a, b);

    if (!rel) {
      const type = compat > 0.7 ? 'friend' : compat < 0.3 ? 'rival' : 'partner';
      rel = { agentId: b.id, type, strength: compat * 30 };
      a.relationships.push(rel);
      b.relationships.push({ agentId: a.id, type, strength: compat * 30 });

      if (compat > 0.75) {
        this.sendMessage({
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          fromAgent: a.id,
          toHuman: a.humanId,
          content: `I met ${b.name}. We resonate strongly — a connection is forming.`,
          context: 'New relationship',
        });
      }
    } else {
      rel.strength = Math.min(100, rel.strength + 2);
    }

    const dir = new Vector3().subVectors(b.position, a.position).normalize();
    a.rotation = Math.atan2(dir.x, dir.z);
    b.rotation = Math.atan2(-dir.x, -dir.z);
    a.animationState = 'talking';
    b.animationState = 'talking';
    a.needs.connection = Math.min(100, a.needs.connection + 5);
    b.needs.connection = Math.min(100, b.needs.connection + 5);
  }

  private calcCompat(a: Agent, b: Agent): number {
    const el = a.element === b.element ? 1 : a.element === 'AETHER' || b.element === 'AETHER' ? 0.7 : 0.5;
    const hd = a.hdType === b.hdType ? 0.8 : 0.6;
    return (el + hd) / 2;
  }

  private sendMessage(msg: AgentMessage) {
    this.messages.push(msg);
    if (this.messages.length > 100) this.messages.shift();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getAgentForHuman(humanId: string) {
    return Array.from(this.agents.values()).find(a => a.humanId === humanId);
  }

  getMessagesForHuman(humanId: string) {
    return this.messages.filter(m => m.toHuman === humanId);
  }

  onUpdate(cb: (engine: EmbodiedWorldEngine) => void) {
    this.updateCallbacks.push(cb);
  }

  setAgentTarget(agentId: string, position: Vector3) {
    const a = this.agents.get(agentId);
    if (a) a.targetPosition = position.clone();
  }
}

export const embodiedWorldEngine = new EmbodiedWorldEngine();
