/**
 * EMBODIED WORLD ENGINE
 * 3D agent simulation with walking, animations, and social interactions
 */

import { Vector3 } from 'three';
import type { 
  Agent, 
  HumanProfile, 
  Place, 
  WorldTime,
  ElementType,
  AgentMessage 
} from '@/types/embodiedAgent';
import { PLACE_CONFIGS, ELEMENT_COLORS } from '@/types/embodiedAgent';

// ============================================================================
// CONSTANTS
// ============================================================================

const WALK_SPEED = 0.15;
const NEEDS_DECAY = {
  energy: 0.3,
  connection: 0.2,
  growth: 0.15,
  purpose: 0.1,
  rest: -0.25
};

const ACTIVITY_EFFECTS: Record<string, Partial<Agent['needs']>> = {
  resting: { energy: 0.8, rest: 1.5 },
  meditating: { energy: 0.3, purpose: 0.8, rest: 0.8 },
  reading: { growth: 1.2, energy: -0.2 },
  creating: { growth: 1.5, purpose: 0.8, energy: -0.5 },
  socializing: { connection: 1.5, energy: -0.3 },
  exploring: { growth: 0.8, energy: -0.4 },
  learning: { growth: 1.2, energy: -0.3 },
  working: { purpose: 0.6, energy: -0.5 },
  dreaming: { rest: 0.8, purpose: 0.4 }
};

// ============================================================================
// ENGINE
// ============================================================================

export class EmbodiedWorldEngine {
  agents: Map<string, Agent> = new Map();
  places: Map<string, Place> = new Map(PLACE_CONFIGS.map(p => [p.id, { ...p, currentAgents: [] }]));
  messages: AgentMessage[] = [];
  
  time: WorldTime = { day: 1, hour: 6, minute: 0 };
  
  private updateCallbacks: Array<(engine: EmbodiedWorldEngine) => void> = [];
  private isRunning: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  
  // ========================================================================
  // AGENT CREATION
  // ========================================================================
  
  createAgent(human: HumanProfile): Agent {
    const element = this.determineElement(human.birthday);
    const hdType = this.determineHDType(human.birthday);
    const archetype = this.determineArchetype(hdType);
    
    const colors = ELEMENT_COLORS[element];
    
    const agent: Agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      humanId: human.id,
      name: this.generateAgentName(human, element),
      
      element,
      archetype,
      hdType,
      
      position: new Vector3(
        (Math.random() - 0.5) * 10,
        0,
        (Math.random() - 0.5) * 10
      ),
      targetPosition: null,
      rotation: Math.random() * Math.PI * 2,
      
      animationState: 'idle',
      animationTime: 0,
      
      age: 0,
      lifeStage: 'infant',
      consciousness: { level: 10, stage: 'dormant' },
      
      needs: {
        energy: 80,
        connection: 50,
        growth: 60,
        purpose: 40,
        rest: 70
      },
      
      currentActivity: null,
      currentPlace: 'home',
      
      relationships: [],
      
      appearance: {
        color: colors.primary,
        glowIntensity: 0.5,
        height: 1.7 + Math.random() * 0.2,
        auraColor: colors.aura
      }
    };
    
    this.agents.set(agent.id, agent);
    
    // Add to home
    const home = this.places.get('home');
    if (home) {
      home.currentAgents.push(agent.id);
    }
    
    // Send birth message
    this.sendMessage({
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      fromAgent: agent.id,
      toHuman: human.id,
      content: `I am ${agent.name}, your ${element.toLowerCase()} extension. I awaken in this world, ready to live and learn.`,
      context: 'Birth'
    });
    
    return agent;
  }
  
  private determineElement(birthday: string): ElementType {
    const date = new Date(birthday);
    const month = date.getMonth() + 1;
    
    const signElements: Record<number, ElementType> = {
      1: 'EARTH', 2: 'AIR', 3: 'WATER', 4: 'FIRE',
      5: 'EARTH', 6: 'AIR', 7: 'WATER', 8: 'FIRE',
      9: 'EARTH', 10: 'AIR', 11: 'WATER', 12: 'FIRE'
    };
    
    return signElements[month] || 'AETHER';
  }
  
  private determineHDType(birthday: string): Agent['hdType'] {
    const types: Agent['hdType'][] = ['Generator', 'Manifestor', 'Projector', 'Reflector'];
    let hash = 0;
    for (let i = 0; i < birthday.length; i++) {
      hash = ((hash << 5) - hash) + birthday.charCodeAt(i);
    }
    return types[Math.abs(hash) % types.length];
  }
  
  private determineArchetype(hdType: Agent['hdType']): string {
    const archetypes: Record<Agent['hdType'], string[]> = {
      'Generator': ['Builder', 'Worker', 'Creator'],
      'Manifestor': ['Initiator', 'Pioneer', 'Leader'],
      'Projector': ['Guide', 'Advisor', 'Seer'],
      'Reflector': ['Mirror', 'Evaluator', 'Sampler']
    };
    const list = archetypes[hdType];
    return list[Math.floor(Math.random() * list.length)];
  }
  
  private generateAgentName(_human: HumanProfile, element: ElementType): string {
    const prefixes: Record<ElementType, string[]> = {
      'EARTH': ['Stone', 'Terra', 'Gaia', 'Root'],
      'WATER': ['Flow', 'Aqua', 'Mist', 'Wave'],
      'AIR': ['Wind', 'Sky', 'Cloud', 'Breath'],
      'FIRE': ['Flame', 'Ember', 'Spark', 'Phoenix'],
      'AETHER': ['Star', 'Void', 'Cosmos', 'Dream']
    };
    
    const suffixes = ['walker', 'weaver', 'seeker', 'dreamer', 'keeper', 'wanderer'];
    
    const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }
  
  // ========================================================================
  // SIMULATION LOOP
  // ========================================================================
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.updateInterval = setInterval(() => {
      this.tick();
    }, 100); // 10 ticks per second
  }
  
  stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  tick() {
    // Advance time (1 minute per tick)
    this.time.minute++;
    if (this.time.minute >= 60) {
      this.time.minute = 0;
      this.time.hour++;
    }
    if (this.time.hour >= 24) {
      this.time.hour = 0;
      this.time.day++;
    }
    
    // Update each agent
    this.agents.forEach(agent => {
      this.updateAgent(agent);
    });
    
    // Check for social interactions
    this.checkSocialInteractions();
    
    // Notify subscribers
    this.updateCallbacks.forEach(cb => cb(this));
  }
  
  private updateAgent(agent: Agent) {
    // Age progression
    if (this.time.hour === 0 && this.time.minute === 0) {
      agent.age++;
      
      // Life stage transitions
      if (agent.age === 7) {
        agent.lifeStage = 'child';
      } else if (agent.age === 30) {
        agent.lifeStage = 'youth';
      } else if (agent.age === 90) {
        agent.lifeStage = 'adult';
      }
    }
    
    // Needs decay
    Object.entries(NEEDS_DECAY).forEach(([need, decay]) => {
      const key = need as keyof Agent['needs'];
      agent.needs[key] = Math.max(0, Math.min(100, agent.needs[key] + decay));
    });
    
    // Movement
    if (agent.targetPosition) {
      this.moveAgent(agent);
    } else {
      // Decide next action
      this.decideAction(agent);
    }
    
    // Animation time
    agent.animationTime += 0.016;
    
    // Consciousness growth
    if (agent.consciousness.level < 100) {
      agent.consciousness.level += 0.01;
      
      if (agent.consciousness.level >= 25 && agent.consciousness.stage === 'dormant') {
        agent.consciousness.stage = 'awakening';
      } else if (agent.consciousness.level >= 50 && agent.consciousness.stage === 'awakening') {
        agent.consciousness.stage = 'aware';
      }
    }
  }
  
  private moveAgent(agent: Agent) {
    if (!agent.targetPosition) return;
    
    const direction = new Vector3()
      .subVectors(agent.targetPosition, agent.position)
      .normalize();
    
    const distance = agent.position.distanceTo(agent.targetPosition);
    
    if (distance < 0.5) {
      // Arrived
      agent.position.copy(agent.targetPosition);
      agent.targetPosition = null;
      agent.animationState = 'idle';
    } else {
      // Continue walking
      agent.position.add(direction.multiplyScalar(WALK_SPEED));
      agent.rotation = Math.atan2(direction.x, direction.z);
      agent.animationState = 'walking';
    }
  }
  
  private decideAction(agent: Agent) {
    // Find neediest aspect (excluding rest which increases naturally)
    const needs = agent.needs;
    const needPriorities: Array<{ key: keyof Agent['needs']; threshold: number; activity: Agent['currentActivity']; places: string[] }> = [
      { key: 'energy', threshold: 30, activity: 'resting', places: ['home'] },
      { key: 'connection', threshold: 40, activity: 'socializing', places: ['cafe', 'plaza'] },
      { key: 'growth', threshold: 50, activity: 'reading', places: ['library'] },
      { key: 'purpose', threshold: 40, activity: 'creating', places: ['studio', 'temple'] }
    ];
    
    let targetActivity: Agent['currentActivity'] = null;
    let targetPlace: string = agent.currentPlace;
    
    // Find the most critical need
    for (const need of needPriorities) {
      if (needs[need.key] < need.threshold) {
        targetActivity = need.activity;
        targetPlace = need.places[Math.floor(Math.random() * need.places.length)];
        break;
      }
    }
    
    // Move to target place
    if (targetPlace !== agent.currentPlace) {
      const place = this.places.get(targetPlace);
      if (place) {
        // Remove from current place
        const current = this.places.get(agent.currentPlace);
        if (current) {
          current.currentAgents = current.currentAgents.filter(id => id !== agent.id);
        }
        
        // Set target position (random spot in new place)
        agent.targetPosition = new Vector3(
          place.position.x + (Math.random() - 0.5) * place.size.width * 0.8,
          0,
          place.position.z + (Math.random() - 0.5) * place.size.depth * 0.8
        );
        
        agent.currentPlace = targetPlace;
        place.currentAgents.push(agent.id);
      }
    } else {
      // Already at place, start activity
      agent.currentActivity = targetActivity;
      agent.animationState = targetActivity === 'meditating' ? 'meditating' :
                            targetActivity === 'reading' ? 'reading' :
                            targetActivity === 'creating' ? 'creating' :
                            targetActivity === 'socializing' ? 'talking' : 'idle';
      
      // Apply activity effects
      const effects = ACTIVITY_EFFECTS[targetActivity || 'resting'];
      if (effects) {
        Object.entries(effects).forEach(([need, change]) => {
          const key = need as keyof Agent['needs'];
          agent.needs[key] = Math.max(0, Math.min(100, agent.needs[key] + (change || 0)));
        });
      }
    }
  }
  
  private checkSocialInteractions() {
    this.places.forEach(place => {
      if (place.currentAgents.length < 2) return;
      
      for (let i = 0; i < place.currentAgents.length; i++) {
        for (let j = i + 1; j < place.currentAgents.length; j++) {
          const agentA = this.agents.get(place.currentAgents[i]);
          const agentB = this.agents.get(place.currentAgents[j]);
          
          if (!agentA || !agentB) continue;
          
          // Check distance
          const distance = agentA.position.distanceTo(agentB.position);
          
          if (distance < 5 && Math.random() < 0.02) {
            this.createInteraction(agentA, agentB);
          }
        }
      }
    });
  }
  
  private createInteraction(agentA: Agent, agentB: Agent) {
    // Check if already have relationship
    let rel = agentA.relationships.find(r => r.agentId === agentB.id);
    
    if (!rel) {
      // New relationship
      const types = ['friend', 'mentor', 'student', 'rival', 'partner'] as const;
      const compat = this.calculateCompatibility(agentA, agentB);
      
      const type = compat > 0.7 ? 'friend' : 
                   compat < 0.3 ? 'rival' : 
                   types[Math.floor(Math.random() * types.length)];
      
      rel = { agentId: agentB.id, type, strength: compat * 30 };
      agentA.relationships.push(rel);
      
      agentB.relationships.push({
        agentId: agentA.id,
        type: type === 'mentor' ? 'student' : type === 'student' ? 'mentor' : type,
        strength: compat * 30
      });
      
      // Make them face each other and gesture
      agentA.animationState = 'talking';
      agentB.animationState = 'talking';
      
      // Notify if significant
      if (compat > 0.8) {
        this.sendMessage({
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          fromAgent: agentA.id,
          toHuman: agentA.humanId,
          content: `I met ${agentB.name}. We resonate strongly - I feel a connection forming.`,
          context: 'New relationship'
        });
      }
    } else {
      // Strengthen
      rel.strength = Math.min(100, rel.strength + 2);
      
      // Face each other
      const direction = new Vector3().subVectors(agentB.position, agentA.position).normalize();
      agentA.rotation = Math.atan2(direction.x, direction.z);
      agentB.rotation = Math.atan2(-direction.x, -direction.z);
      
      agentA.animationState = 'talking';
      agentB.animationState = 'talking';
    }
    
    // Both gain connection
    agentA.needs.connection = Math.min(100, agentA.needs.connection + 5);
    agentB.needs.connection = Math.min(100, agentB.needs.connection + 5);
  }
  
  private calculateCompatibility(a: Agent, b: Agent): number {
    const elementCompat = a.element === b.element ? 1 :
      (a.element === 'AETHER' || b.element === 'AETHER') ? 0.7 : 0.5;
    
    const typeCompat = a.hdType === b.hdType ? 0.8 : 0.6;
    
    return (elementCompat + typeCompat) / 2;
  }
  
  private sendMessage(message: AgentMessage) {
    this.messages.push(message);
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }
  
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  
  getAgentForHuman(humanId: string): Agent | undefined {
    return Array.from(this.agents.values()).find(a => a.humanId === humanId);
  }
  
  getMessagesForHuman(humanId: string): AgentMessage[] {
    return this.messages.filter(m => m.toHuman === humanId);
  }
  
  onUpdate(callback: (engine: EmbodiedWorldEngine) => void) {
    this.updateCallbacks.push(callback);
  }
  
  setAgentTarget(agentId: string, position: Vector3) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.targetPosition = position.clone();
    }
  }
}

// Singleton
export const embodiedWorldEngine = new EmbodiedWorldEngine();
