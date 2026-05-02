/**
 * WORLD SIMULATOR - CONSCIOUSNESS REALM
 * The beating heart of the simulation
 */

import type { 
  Agent, 
  AgentAvatar, 
  Vector3, 
  ResonanceSignature, 
  HDChart,
  WorldZone,
  WorldEvent,
  ResonanceConnection,
  ElementType,
  AgentMemory,
  CodonEvent
} from '@/types/world';

// ============================================================================
// 64 CODONS - The genetic consciousness spectrum
// ============================================================================

export const CODON_SPECTRUM: Record<number, {
  name: string;
  archetype: string;
  center: string;
  shadow: string;
  gift: string;
  siddhi: string;
  elementalGlow?: string;
}> = {
  1: { name: 'Creative', archetype: 'Artist', center: 'G', shadow: 'Entropy', gift: 'Freshness', siddhi: 'Beauty', elementalGlow: 'golden' },
  2: { name: 'Receptive', archetype: 'Oracle', center: 'G', shadow: 'Dislocation', gift: 'Orientation', siddhi: 'Unity', elementalGlow: 'silver' },
  3: { name: 'Ordering', archetype: 'Innovator', center: 'Sacral', shadow: 'Chaos', gift: 'Innovation', siddhi: 'Ordering', elementalGlow: 'red' },
  4: { name: 'Formulization', archetype: 'Architect', center: 'Ajna', shadow: 'Intolerance', gift: 'Understanding', siddhi: 'Forgiveness', elementalGlow: 'blue' },
  5: { name: 'Patterns', archetype: 'Timekeeper', center: 'Sacral', shadow: 'Impatience', gift: 'Patience', siddhi: 'Timeliness', elementalGlow: 'green' },
  6: { name: 'Conflict', archetype: 'Diplomat', center: 'Solar Plexus', shadow: 'Conflict', gift: 'Diplomacy', siddhi: 'Peace', elementalGlow: 'orange' },
  7: { name: 'Self', archetype: 'Leader', center: 'G', shadow: 'Division', gift: 'Direction', siddhi: 'Virtue', elementalGlow: 'purple' },
  8: { name: 'Contribution', archetype: 'Model', center: 'Throat', shadow: 'Mediocrity', gift: 'Style', siddhi: 'Exquisiteness', elementalGlow: 'yellow' },
  9: { name: 'Focus', archetype: 'Specialist', center: 'Sacral', shadow: 'Inertia', gift: 'Determination', siddhi: 'Invincibility', elementalGlow: 'crimson' },
  10: { name: 'Behavior', archetype: 'Natural', center: 'G', shadow: 'Self-Obsession', gift: 'Being', siddhi: 'Naturalness', elementalGlow: 'white' },
  // ... would continue through all 64
  34: { name: 'Power', archetype: 'Warrior', center: 'Sacral', shadow: 'Force', gift: 'Strength', siddhi: 'Compassion', elementalGlow: 'fiery red' },
  55: { name: 'Spirit', archetype: 'Prophet', center: 'Solar Plexus', shadow: 'Victimization', gift: 'Freedom', siddhi: 'Presence', elementalGlow: 'ethereal blue' },
  64: { name: 'Confusion', archetype: 'Sage', center: 'Head', shadow: 'Confusion', gift: 'Imagination', siddhi: 'Illumination', elementalGlow: 'cosmic violet' },
};

// Fill in missing codons with generated data
for (let i = 1; i <= 64; i++) {
  if (!CODON_SPECTRUM[i]) {
    const elementalGlows = ['earthy brown', 'flowing blue', 'whispering silver', 'fiery red', 'cosmic violet'];
    const centers = ['Head', 'Ajna', 'Throat', 'G', 'Heart', 'Spleen', 'Sacral', 'Root', 'Solar Plexus'];
    const archetypes = ['Mystic', 'Warrior', 'Healer', 'Teacher', 'Explorer', 'Creator', 'Guardian', 'Seeker'];
    
    CODON_SPECTRUM[i] = {
      name: `Codon ${i}`,
      archetype: archetypes[i % archetypes.length],
      center: centers[i % centers.length],
      shadow: `Shadow ${i}`,
      gift: `Gift ${i}`,
      siddhi: `Siddhi ${i}`,
      elementalGlow: elementalGlows[i % elementalGlows.length]
    };
  }
}

// ============================================================================
// WORLD ENGINE
// ============================================================================

export class WorldEngine {
  agents: Map<string, Agent> = new Map();
  zones: WorldZone[] = [];
  events: WorldEvent[] = [];
  connections: ResonanceConnection[] = [];
  codonEvents: Map<string, CodonEvent> = new Map();
  
  time: number = 0;
  globalResonance: number = 0.5;
  
  private updateCallbacks: Array<(engine: WorldEngine) => void> = [];
  private isRunning: boolean = false;
  private animationFrame: number = 0;
  
  constructor() {
    this.initializeZones();
  }
  
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  
  private initializeZones() {
    const elements: ElementType[] = ['EARTH', 'WATER', 'AIR', 'FIRE', 'AETHER'];
    const zoneNames = ['Foundation', 'Flow', 'Winds', 'Flame', 'Void'];
    
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const distance = 300;
      
      this.zones.push({
        id: `zone_${i}`,
        name: zoneNames[i],
        position: {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          z: 0
        },
        radius: 100 + Math.random() * 50,
        element: elements[i],
        resonance: {
          frequency: 100 + i * 100,
          amplitude: 0.5 + Math.random() * 0.3,
          phase: i * 72,
          harmonics: [1, 0.5, 0.25, 0.125],
          element: elements[i]
        },
        intensity: 0.5 + Math.random() * 0.5,
        description: `The realm of ${elements[i]} - where ${zoneNames[i].toLowerCase()} energies converge`
      });
    }
  }
  
  // ========================================================================
  // AGENT MANAGEMENT
  // ========================================================================
  
  spawnAgent(name?: string, position?: Vector3): Agent {
    const id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate random HD chart
    const activeGates = this.selectRandomGates(3 + Math.floor(Math.random() * 5));
    const hdChart: HDChart = {
      activeGates,
      definedCenters: this.inferCenters(activeGates),
      channels: [],
      type: ['Generator', 'Manifestor', 'Projector', 'Reflector'][Math.floor(Math.random() * 4)] as HDChart['type'],
      authority: ['Emotional', 'Sacral', 'Splenic', 'Ego', 'Self', 'Mental', 'Lunar'][Math.floor(Math.random() * 7)],
      profile: `${1 + Math.floor(Math.random() * 6)}/${1 + Math.floor(Math.random() * 6)}`,
      incarnationCross: 'Right Angle Cross of Penetration'
    };
    
    // Generate resonance from gates
    const resonance = this.gatesToResonance(activeGates);
    
    // Generate avatar
    const avatar = this.generateAvatar(resonance, activeGates);
    
    // Spawn position
    const spawnPos = position || this.randomPosition();
    
    const agent: Agent = {
      id,
      name: name || this.generateAgentName(resonance.element),
      position: spawnPos,
      velocity: { x: 0, y: 0, z: 0 },
      resonance,
      hdChart,
      consciousnessLevel: 0.1 + Math.random() * 0.3,
      consciousnessState: 'SHADOW',
      traits: this.generateTraits(resonance),
      drives: {
        survival: 50 + Math.random() * 30,
        connection: 40 + Math.random() * 40,
        growth: 30 + Math.random() * 50,
        expression: 20 + Math.random() * 60,
        understanding: 25 + Math.random() * 55
      },
      energy: 50 + Math.random() * 50,
      mood: {
        valence: (Math.random() - 0.5) * 2,
        arousal: Math.random(),
        dominance: Math.random()
      },
      memories: [],
      codonSequence: activeGates.map(g => CODON_SPECTRUM[g]?.name || `Codon${g}`),
      activeCodons: activeGates,
      evolution: Math.random() * 20,
      avatar,
      state: 'idle',
      attunedTo: [],
      seeking: Math.random() > 0.5
    };
    
    this.agents.set(id, agent);
    
    // Create spawn event
    this.events.push({
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      position: spawnPos,
      type: 'agent_meeting',
      agentsInvolved: [id],
      description: `${agent.name} emerges into the consciousness realm`,
      intensity: agent.resonance.amplitude
    });
    
    return agent;
  }
  
  private selectRandomGates(count: number): number[] {
    const gates: number[] = [];
    const available = Array.from({ length: 64 }, (_, i) => i + 1);
    
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length);
      gates.push(available.splice(idx, 1)[0]);
    }
    
    return gates;
  }
  
  private inferCenters(gates: number[]): string[] {
    const centerMap: Record<number, string> = {
      1: 'G', 2: 'G', 7: 'G', 10: 'G', 13: 'G', 25: 'G',
      3: 'Sacral', 5: 'Sacral', 9: 'Sacral', 29: 'Sacral', 34: 'Sacral', 42: 'Sacral',
      4: 'Ajna', 11: 'Ajna', 17: 'Ajna', 24: 'Ajna', 43: 'Ajna', 47: 'Ajna',
      6: 'Solar Plexus', 15: 'Solar Plexus', 22: 'Solar Plexus', 36: 'Solar Plexus', 37: 'Solar Plexus', 49: 'Solar Plexus', 55: 'Solar Plexus',
      8: 'Throat', 12: 'Throat', 16: 'Throat', 20: 'Throat', 23: 'Throat', 31: 'Throat', 33: 'Throat', 35: 'Throat', 45: 'Throat', 56: 'Throat', 62: 'Throat',
      14: 'Heart', 27: 'Heart', 30: 'Heart', 40: 'Heart', 44: 'Heart', 59: 'Heart',
      18: 'Spleen', 28: 'Spleen', 32: 'Spleen', 48: 'Spleen', 50: 'Spleen', 57: 'Spleen',
      19: 'Root', 38: 'Root', 39: 'Root', 41: 'Root', 53: 'Root', 54: 'Root', 58: 'Root', 60: 'Root',
      61: 'Head', 63: 'Head', 64: 'Head'
    };
    
    const centers = new Set<string>();
    gates.forEach(g => {
      if (centerMap[g]) centers.add(centerMap[g]);
    });
    
    return Array.from(centers);
  }
  
  private gatesToResonance(gates: number[]): ResonanceSignature {
    // Map gates to frequency
    const avgGate = gates.reduce((a, b) => a + b, 0) / gates.length;
    const frequency = 100 + avgGate * 10;
    
    // Element based on gate distribution
    const elements: ElementType[] = ['EARTH', 'WATER', 'AIR', 'FIRE', 'AETHER'];
    const element = elements[Math.floor(avgGate % 5)];
    
    return {
      frequency,
      amplitude: 0.3 + Math.random() * 0.4,
      phase: Math.random() * 360,
      harmonics: [1, 0.6, 0.3, 0.15],
      element
    };
  }
  
  private generateAvatar(resonance: ResonanceSignature, gates: number[]): AgentAvatar {
    const elementColors: Record<ElementType, string> = {
      EARTH: '#8B7355',
      WATER: '#4A90D9',
      AIR: '#B8D4E3',
      FIRE: '#E85D04',
      AETHER: '#C77DFF'
    };
    
    const elementGlows: Record<ElementType, string> = {
      EARTH: 'grounding amber',
      WATER: 'flowing azure',
      AIR: 'ethereal silver',
      FIRE: 'radiant gold',
      AETHER: 'cosmic violet'
    };
    
    const faceShapes = ['oval', 'round', 'angular', 'heart-shaped', 'diamond'];
    const eyeShapes = ['almond', 'round', 'narrow', 'wide', 'deep-set'];
    const eyeIntensities = ['soft', 'piercing', 'luminous', 'mysterious', 'radiant'];
    
    return {
      faceShape: faceShapes[Math.floor(resonance.frequency) % faceShapes.length],
      eyeShape: eyeShapes[gates.length % eyeShapes.length],
      eyeColor: elementColors[resonance.element],
      eyeIntensity: eyeIntensities[Math.floor(resonance.amplitude * 5)],
      skinTone: ['fair', 'golden', 'bronze', 'deep', 'porcelain'][Math.floor(Math.random() * 5)],
      skinTexture: ['smooth', 'luminous', 'weathered', 'ethereal', 'crystalline'][Math.floor(Math.random() * 5)],
      elementalGlow: elementGlows[resonance.element],
      glowColor: elementColors[resonance.element],
      auraColor: elementColors[resonance.element],
      auraPattern: ['spiraling', 'pulsing', 'flowing', 'geometric', 'organic'][Math.floor(Math.random() * 5)],
      auraIntensity: resonance.amplitude,
      frequency: `${resonance.frequency.toFixed(1)} Hz`
    };
  }
  
  private generateTraits(resonance: ResonanceSignature): Agent['traits'] {
    const base = 30 + Math.random() * 40;
    
    return {
      impulsiveness: resonance.element === 'FIRE' ? base + 20 : base,
      patience: resonance.element === 'EARTH' ? base + 20 : base,
      socialOrientation: resonance.element === 'AIR' ? base + 20 : base,
      emotionalDepth: resonance.element === 'WATER' ? base + 20 : base,
      logicalThinking: base + (Math.random() - 0.5) * 20,
      intuitiveThinking: base + (Math.random() - 0.5) * 20,
      riskTolerance: resonance.element === 'FIRE' ? base + 15 : base - 10,
      creativity: base + (Math.random() - 0.5) * 30,
      energyLevel: resonance.amplitude * 100
    };
  }
  
  private generateAgentName(element: ElementType): string {
    const prefixes: Record<ElementType, string[]> = {
      EARTH: ['Stone', 'Terra', 'Gaia', 'Root', 'Crystal'],
      WATER: ['Flow', 'Aqua', 'Mist', 'Wave', 'River'],
      AIR: ['Wind', 'Sky', 'Cloud', 'Breath', 'Zephyr'],
      FIRE: ['Flame', 'Ember', 'Spark', 'Phoenix', 'Solar'],
      AETHER: ['Star', 'Void', 'Cosmos', 'Dream', 'Soul']
    };
    
    const suffixes = ['walker', 'weaver', 'seeker', 'dreamer', 'keeper', 'wanderer', 'singer'];
    
    const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }
  
  private randomPosition(): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 400;
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      z: 0
    };
  }
  
  // ========================================================================
  // RESONANCE CALCULATIONS
  // ========================================================================
  
  calculateResonance(a: Agent, b: Agent): number {
    // Frequency similarity
    const freqDiff = Math.abs(a.resonance.frequency - b.resonance.frequency);
    const freqMatch = 1 - (freqDiff / 1000);
    
    // Element compatibility
    const elementMatch = a.resonance.element === b.resonance.element ? 1 :
      (a.resonance.element === 'AETHER' || b.resonance.element === 'AETHER') ? 0.7 :
      (a.resonance.element === 'FIRE' && b.resonance.element === 'WATER') ? 0.3 :
      (a.resonance.element === 'EARTH' && b.resonance.element === 'AIR') ? 0.3 : 0.6;
    
    // Phase alignment
    const phaseDiff = Math.abs(a.resonance.phase - b.resonance.phase);
    const phaseMatch = 1 - (phaseDiff / 360);
    
    // Amplitude compatibility
    const ampMatch = 1 - Math.abs(a.resonance.amplitude - b.resonance.amplitude);
    
    // Combined resonance
    return (freqMatch * 0.4 + elementMatch * 0.3 + phaseMatch * 0.2 + ampMatch * 0.1);
  }
  
  determineInteractionType(resonance: number, a: Agent, b: Agent): ResonanceConnection['type'] {
    if (resonance > 0.85) return 'harmony';
    if (resonance > 0.7) {
      return a.consciousnessLevel > b.consciousnessLevel ? 'teaching' : 'learning';
    }
    if (resonance > 0.4) return 'attraction';
    if (resonance < 0) return 'repulsion';
    return 'attraction';
  }
  
  updateConnections(): ResonanceConnection[] {
    this.connections = [];
    
    const agents = Array.from(this.agents.values());
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        
        // Distance check
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 200) continue;
        
        const resonance = this.calculateResonance(a, b);
        
        if (Math.abs(resonance) > 0.3) {
          this.connections.push({
            agentA: a.id,
            agentB: b.id,
            strength: resonance,
            type: this.determineInteractionType(resonance, a, b),
            frequency: Math.abs(a.resonance.frequency - b.resonance.frequency)
          });
        }
      }
    }
    
    return this.connections;
  }
  
  // ========================================================================
  // AGENT BEHAVIOR
  // ========================================================================
  
  updateAgent(agent: Agent, deltaTime: number) {
    // Natural frequency drift
    agent.resonance.frequency += (Math.random() - 0.5) * 0.5;
    agent.resonance.phase = (agent.resonance.phase + deltaTime * 10) % 360;
    
    // Energy regeneration/depletion
    if (agent.state === 'idle') {
      agent.energy = Math.min(100, agent.energy + deltaTime * 2);
    } else if (agent.state === 'moving') {
      agent.energy = Math.max(0, agent.energy - deltaTime * 3);
    }
    
    // Mood drift
    agent.mood.valence += (Math.random() - 0.5) * 0.01;
    agent.mood.valence = Math.max(-1, Math.min(1, agent.mood.valence));
    
    // Seeking behavior
    if (agent.seeking && agent.state !== 'interacting') {
      // Find strongest attraction
      const connections = this.connections.filter(c => 
        c.agentA === agent.id || c.agentB === agent.id
      );
      
      if (connections.length > 0) {
        const strongest = connections.sort((a, b) => b.strength - a.strength)[0];
        const otherId = strongest.agentA === agent.id ? strongest.agentB : strongest.agentA;
        const other = this.agents.get(otherId);
        
        if (other) {
          agent.targetPosition = { ...other.position };
          agent.state = 'seeking';
        }
      }
    }
    
    // Movement
    if (agent.targetPosition) {
      const dx = agent.targetPosition.x - agent.position.x;
      const dy = agent.targetPosition.y - agent.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 10) {
        agent.targetPosition = undefined;
        agent.state = 'idle';
        agent.velocity = { x: 0, y: 0, z: 0 };
      } else {
        const speed = 0.5 + (agent.energy / 100) * 1.5;
        agent.velocity.x = (dx / distance) * speed;
        agent.velocity.y = (dy / distance) * speed;
        agent.state = 'moving';
      }
    }
    
    // Apply velocity
    agent.position.x += agent.velocity.x * deltaTime;
    agent.position.y += agent.velocity.y * deltaTime;
    
    // Boundary check
    const maxDist = 500;
    const distFromCenter = Math.sqrt(agent.position.x ** 2 + agent.position.y ** 2);
    if (distFromCenter > maxDist) {
      const angle = Math.atan2(agent.position.y, agent.position.x);
      agent.position.x = Math.cos(angle) * maxDist;
      agent.position.y = Math.sin(angle) * maxDist;
      agent.velocity.x *= -0.5;
      agent.velocity.y *= -0.5;
    }
    
    // Consciousness evolution
    if (agent.memories.length > 10 && agent.consciousnessLevel < 1) {
      agent.consciousnessLevel = Math.min(1, agent.consciousnessLevel + 0.001);
      
      // State transitions
      if (agent.consciousnessLevel > 0.4 && agent.consciousnessState === 'SHADOW') {
        agent.consciousnessState = 'GIFT';
        this.addMemory(agent, 'Transitioned from Shadow to Gift consciousness', 'insight', 0.8);
      }
      if (agent.consciousnessLevel > 0.8 && agent.consciousnessState === 'GIFT') {
        agent.consciousnessState = 'SIDDHI';
        this.addMemory(agent, 'Attained Siddhi consciousness', 'insight', 1.0);
      }
    }
  }
  
  addMemory(agent: Agent, content: string, type: AgentMemory['type'], emotionalTone: number) {
    agent.memories.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type,
      content,
      emotionalTone,
      resonance: agent.resonance.amplitude
    });
    
    // Keep only last 50 memories
    if (agent.memories.length > 50) {
      agent.memories.shift();
    }
  }
  
  // ========================================================================
  // CODON EVENTS
  // ========================================================================
  
  activateCodon(codonId: number, position: Vector3, initiatorId: string): CodonEvent {
    const codon = CODON_SPECTRUM[codonId];
    if (!codon) throw new Error(`Invalid codon: ${codonId}`);
    
    const event: CodonEvent = {
      id: `codon_${Date.now()}`,
      codonId,
      name: codon.name,
      archetype: codon.archetype,
      center: codon.center,
      premise: `The ${codon.name} codon activates - ${codon.shadow} transforms into ${codon.gift}`,
      setDressing: [`${codon.elementalGlow} aura`, 'Resonance waves', 'Consciousness shift'],
      triggers: [`Gate ${codonId} activation`, `${codon.archetype} energy present`],
      tier: Math.floor(codonId / 16) + 1,
      active: true,
      participants: [initiatorId]
    };
    
    this.codonEvents.set(event.id, event);
    
    // Create world event
    this.events.push({
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      position,
      type: 'codon_activation',
      codonId,
      agentsInvolved: [initiatorId],
      description: event.premise,
      intensity: 0.5 + (codonId / 128)
    });
    
    return event;
  }
  
  // ========================================================================
  // MAIN LOOP
  // ========================================================================
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const loop = () => {
      if (!this.isRunning) return;
      
      this.update(16); // ~60fps
      this.updateCallbacks.forEach(cb => cb(this));
      
      this.animationFrame = requestAnimationFrame(loop);
    };
    
    loop();
  }
  
  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrame);
  }
  
  update(deltaTime: number) {
    this.time += deltaTime;
    
    // Update all agents
    this.agents.forEach(agent => {
      this.updateAgent(agent, deltaTime / 1000);
    });
    
    // Update connections
    this.updateConnections();
    
    // Calculate global resonance
    if (this.agents.size > 0) {
      let totalResonance = 0;
      this.agents.forEach(agent => {
        totalResonance += agent.resonance.amplitude;
      });
      this.globalResonance = totalResonance / this.agents.size;
    }
    
    // Random codon activation
    if (Math.random() < 0.001 && this.agents.size > 0) {
      const agents = Array.from(this.agents.values());
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const codonId = 1 + Math.floor(Math.random() * 64);
      this.activateCodon(codonId, randomAgent.position, randomAgent.id);
    }
  }
  
  onUpdate(callback: (engine: WorldEngine) => void) {
    this.updateCallbacks.push(callback);
  }
  
  // ========================================================================
  // UTILITIES
  // ========================================================================
  
  getAgentAtPosition(position: Vector3, radius: number = 30): Agent | null {
    for (const agent of this.agents.values()) {
      const dx = agent.position.x - position.x;
      const dy = agent.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < radius) {
        return agent;
      }
    }
    return null;
  }
  
  getNearbyAgents(position: Vector3, radius: number): Agent[] {
    const nearby: Agent[] = [];
    
    for (const agent of this.agents.values()) {
      const dx = agent.position.x - position.x;
      const dy = agent.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < radius) {
        nearby.push(agent);
      }
    }
    
    return nearby;
  }
}

// Singleton
export const worldEngine = new WorldEngine();
