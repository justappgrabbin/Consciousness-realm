/**
 * Trident - Resonance Reality Engine
 * No scripts. Only resonance. Everything emerges from harmonic interaction.
 */

import type {
  ResonanceSignature,
  Being,
  BeingType,
  Attraction,
  InteractionType,
  ResonanceEvent,
  ResonanceExperience,
  ResonanceSpace,
  Cultivator
} from '@/types/resonance';

// ============================================================================
// RESONANCE MATH - The physics of this reality
// ============================================================================

export class ResonanceMath {
  /** Calculate how similar two frequencies are (0-1) */
  static harmonicSimilarity(a: number, b: number): number {
    const diff = Math.abs(a - b);
    const maxFreq = Math.max(a, b, 1);
    return 1 - (diff / maxFreq);
  }
  
  /** Calculate complementary resonance (opposites attract) */
  static complementarity(a: ResonanceSignature, b: ResonanceSignature): number {
    const mindComp = 1 - Math.abs(a.composition.mind - b.composition.mind);
    const bodyComp = 1 - Math.abs(a.composition.body - b.composition.body);
    const spiritComp = 1 - Math.abs(a.composition.spirit - b.composition.spirit);
    return (mindComp + bodyComp + spiritComp) / 3;
  }
  
  /** Calculate the beat frequency (rhythm of interaction) */
  static beatFrequency(a: number, b: number): number {
    return Math.abs(a - b);
  }
  
  /** Calculate field strength at a distance */
  static fieldStrength(
    amplitude: number,
    distance: number,
    falloff: 'linear' | 'exponential' | 'inverse_square' = 'inverse_square'
  ): number {
    switch (falloff) {
      case 'linear':
        return amplitude * Math.max(0, 1 - distance / 100);
      case 'exponential':
        return amplitude * Math.exp(-distance / 50);
      case 'inverse_square':
        return amplitude / (1 + distance * distance / 1000);
    }
  }
  
  /** Calculate total attraction between two beings */
  static calculateAttraction(a: Being, b: Being): number {
    const distance = this.distance(a.field.center, b.field.center);
    
    // Base frequency match
    const freqMatch = this.harmonicSimilarity(
      a.resonance.frequency,
      b.resonance.frequency
    );
    
    // Complementary resonance
    const complement = this.complementarity(a.resonance, b.resonance);
    
    // Field strength at this distance
    const fieldA = this.fieldStrength(a.resonance.amplitude, distance);
    const fieldB = this.fieldStrength(b.resonance.amplitude, distance);
    
    // Phase alignment (synchronized phases = stronger attraction)
    const phaseDiff = Math.abs(a.resonance.phase - b.resonance.phase);
    const phaseAlignment = 1 - (phaseDiff / 360);
    
    // Combine factors
    const baseAttraction = (freqMatch * 0.4 + complement * 0.3 + phaseAlignment * 0.3);
    const fieldEffect = (fieldA + fieldB) / 200;
    
    // Receptivity modulates attraction
    const receptivity = (a.state.receptivity + b.state.receptivity) / 2;
    
    return baseAttraction * fieldEffect * receptivity;
  }
  
  /** Calculate distance between two points */
  static distance(
    a: { x: number; y: number; z?: number },
    b: { x: number; y: number; z?: number }
  ): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /** Determine what type of interaction would occur */
  static predictInteraction(a: Being, b: Being): InteractionType {
    const attraction = this.calculateAttraction(a, b);
    const freqDiff = Math.abs(a.resonance.frequency - b.resonance.frequency);
    const harmonicRatio = a.resonance.harmonics / (b.resonance.harmonics + 1);
    
    if (attraction > 0.9) return 'merging';
    if (attraction > 0.8 && freqDiff < 10) return 'catalysis';
    if (attraction > 0.7) return 'harmonization';
    if (attraction > 0.5 && harmonicRatio > 1.5) return 'teaching';
    if (attraction > 0.5 && harmonicRatio < 0.7) return 'learning';
    if (attraction > 0.3) return 'exchange';
    if (attraction > 0) return 'recognition';
    if (attraction > -0.3) return 'mirroring';
    return 'challenge';
  }
  
  /** Generate a color from frequency */
  static frequencyToColor(frequency: number, amplitude: number = 1): string {
    // Map frequency to hue (0-360)
    const hue = (frequency * 0.36) % 360;
    // Amplitude affects saturation and lightness
    const saturation = 50 + amplitude * 30;
    const lightness = 30 + amplitude * 40;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  /** Generate description of form from resonance */
  static resonanceToForm(resonance: ResonanceSignature): string {
    const { frequency, harmonics, amplitude, composition } = resonance;
    
    const forms: string[] = [];
    
    // Base form from frequency range
    if (frequency < 100) forms.push('primordial');
    else if (frequency < 250) forms.push('elemental');
    else if (frequency < 400) forms.push('organic');
    else if (frequency < 600) forms.push('crystalline');
    else if (frequency < 800) forms.push('luminous');
    else forms.push('transcendent');
    
    // Complexity from harmonics
    if (harmonics > 80) forms.push('multidimensional');
    else if (harmonics > 60) forms.push('intricate');
    else if (harmonics > 40) forms.push('detailed');
    else if (harmonics > 20) forms.push('simple');
    else forms.push('pure');
    
    // Intensity from amplitude
    if (amplitude > 80) forms.push('blazing');
    else if (amplitude > 60) forms.push('radiant');
    else if (amplitude > 40) forms.push('glowing');
    else if (amplitude > 20) forms.push('dim');
    else forms.push('subtle');
    
    // Character from composition
    const dominant = Object.entries(composition)
      .sort((a, b) => b[1] - a[1])[0][0];
    forms.push(dominant);
    
    return forms.join(' ');
  }
}

// ============================================================================
// RESONANCE ENGINE - The beating heart of the simulation
// ============================================================================

export class ResonanceEngine {
  beings: Map<string, Being> = new Map();
  spaces: Map<string, ResonanceSpace> = new Map();
  events: ResonanceEvent[] = [];
  
  private lastUpdate: number = Date.now();
  
  // ========================================================================
  // BEING MANAGEMENT
  // ========================================================================
  
  createBeing(
    type: BeingType,
    resonance: Partial<ResonanceSignature> = {},
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): Being {
    const fullResonance: ResonanceSignature = {
      frequency: resonance.frequency ?? Math.random() * 500 + 100,
      harmonics: resonance.harmonics ?? Math.random() * 50 + 10,
      phase: resonance.phase ?? Math.random() * 360,
      amplitude: resonance.amplitude ?? Math.random() * 40 + 10,
      composition: resonance.composition ?? {
        mind: Math.random(),
        body: Math.random(),
        spirit: Math.random()
      }
    };
    
    const being: Being = {
      id: `being_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      resonance: fullResonance,
      field: {
        center: position,
        radius: fullResonance.amplitude * 2,
        signature: fullResonance,
        falloff: 'inverse_square',
        interference: []
      },
      state: {
        mood: 'dormant',
        receptivity: Math.random() * 0.5 + 0.3,
        stability: Math.random() * 0.4 + 0.4,
        seeking: Math.random() > 0.7,
        attunedTo: []
      },
      evolution: {
        experiences: [],
        drift: (Math.random() - 0.5) * 0.1,
        shifts: []
      },
      appearance: {
        form: ResonanceMath.resonanceToForm(fullResonance),
        color: ResonanceMath.frequencyToColor(fullResonance.frequency, fullResonance.amplitude / 100),
        luminosity: fullResonance.amplitude / 100,
        complexity: fullResonance.harmonics / 100
      }
    };
    
    this.beings.set(being.id, being);
    return being;
  }
  
  createCultivator(name?: string): Cultivator {
    const baseBeing = this.createBeing('cultivator', {
      frequency: 300,
      harmonics: 30,
      amplitude: 50,
      composition: { mind: 0.33, body: 0.33, spirit: 0.34 }
    });
    
    const cultivator: Cultivator = {
      ...baseBeing,
      type: 'cultivator',
      name: name || 'Cultivator',
      realms: {
        mind: { frequency: 300, stability: 0.5, growth: 0 },
        body: { frequency: 250, stability: 0.5, growth: 0 },
        spirit: { frequency: 350, stability: 0.5, growth: 0 }
      },
      practices: [],
      emergentAgent: {
        coherence: 0,
        resonance: { ...baseBeing.resonance },
        learnedPatterns: [],
        divergence: 0
      },
      perception: {
        seeFields: false,
        hearHarmonics: false,
        feelAttractions: true,
        readEchoes: false
      }
    };
    
    this.beings.set(cultivator.id, cultivator);
    return cultivator;
  }
  
  // ========================================================================
  // RESONANCE CALCULATIONS
  // ========================================================================
  
  findAttractions(forBeingId: string, maxDistance: number = 200): Attraction[] {
    const being = this.beings.get(forBeingId);
    if (!being) return [];
    
    const attractions: Attraction[] = [];
    
    for (const [id, other] of this.beings) {
      if (id === forBeingId) continue;
      
      const distance = ResonanceMath.distance(being.field.center, other.field.center);
      if (distance > maxDistance) continue;
      
      const strength = ResonanceMath.calculateAttraction(being, other);
      
      // Only include meaningful attractions
      if (Math.abs(strength) < 0.1) continue;
      
      const interactionType = ResonanceMath.predictInteraction(being, other);
      
      attractions.push({
        beings: [forBeingId, id],
        strength,
        resonance: {
          harmonicSimilarity: ResonanceMath.harmonicSimilarity(
            being.resonance.frequency,
            other.resonance.frequency
          ),
          complementary: ResonanceMath.complementarity(being.resonance, other.resonance),
          rhythm: ResonanceMath.beatFrequency(being.resonance.frequency, other.resonance.frequency)
        },
        potential: {
          interactionType,
          growthPotential: {
            [forBeingId]: strength * being.state.receptivity,
            [id]: strength * other.state.receptivity
          },
          significance: Math.abs(strength)
        }
      });
    }
    
    // Sort by strength
    return attractions.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));
  }
  
  findStrongestAttraction(forBeingId: string): Attraction | null {
    const attractions = this.findAttractions(forBeingId);
    return attractions[0] || null;
  }
  
  // ========================================================================
  // INTERACTIONS - What happens when beings meet through resonance
  // ========================================================================
  
  interact(beingAId: string, beingBId: string): ResonanceEvent | null {
    const beingA = this.beings.get(beingAId);
    const beingB = this.beings.get(beingBId);
    if (!beingA || !beingB) return null;
    
    const attraction = this.findStrongestAttraction(beingAId);
    if (!attraction || attraction.beings[1] !== beingBId) return null;
    
    const interactionType = attraction.potential.interactionType;
    
    // Calculate effects based on interaction type
    const effects: ResonanceEvent['effects'] = [];
    
    switch (interactionType) {
      case 'merging':
        // Both beings shift toward each other's frequency
        const midFreq = (beingA.resonance.frequency + beingB.resonance.frequency) / 2;
        effects.push(
          { beingId: beingAId, frequencyShift: (midFreq - beingA.resonance.frequency) * 0.3 },
          { beingId: beingBId, frequencyShift: (midFreq - beingB.resonance.frequency) * 0.3 }
        );
        break;
        
      case 'teaching':
        // Higher harmonic being elevates the other
        const teacher = beingA.resonance.harmonics > beingB.resonance.harmonics ? beingA : beingB;
        const student = teacher === beingA ? beingB : beingA;
        effects.push({
          beingId: student.id,
          frequencyShift: (teacher.resonance.frequency - student.resonance.frequency) * 0.2,
          insight: `Learned from ${teacher.name || 'another being'}`
        });
        break;
        
      case 'learning':
        // Reversed teaching
        const learner = beingA.resonance.harmonics < beingB.resonance.harmonics ? beingA : beingB;
        const source = learner === beingA ? beingB : beingA;
        effects.push({
          beingId: learner.id,
          frequencyShift: (source.resonance.frequency - learner.resonance.frequency) * 0.15,
          insight: `Absorbed resonance from ${source.name || 'another being'}`
        });
        break;
        
      case 'catalysis':
        // Both transform into something new
        effects.push(
          { 
            beingId: beingAId, 
            frequencyShift: (Math.random() - 0.5) * 20,
            newAbility: 'transformed_resonance'
          },
          { 
            beingId: beingBId, 
            frequencyShift: (Math.random() - 0.5) * 20,
            newAbility: 'transformed_resonance'
          }
        );
        break;
        
      case 'challenge':
        // Dissonance forces growth through resistance
        effects.push(
          { 
            beingId: beingAId, 
            frequencyShift: (Math.random() - 0.5) * 5,
            insight: 'Growth through resistance'
          },
          { 
            beingId: beingBId, 
            frequencyShift: (Math.random() - 0.5) * 5,
            insight: 'Growth through resistance'
          }
        );
        break;
        
      default:
        // Recognition, exchange, harmonization - gentle shifts
        effects.push(
          { beingId: beingAId, frequencyShift: (Math.random() - 0.5) * 3 },
          { beingId: beingBId, frequencyShift: (Math.random() - 0.5) * 3 }
        );
    }
    
    // Apply effects
    effects.forEach(effect => {
      const being = this.beings.get(effect.beingId);
      if (being) {
        being.resonance.frequency += effect.frequencyShift;
        being.resonance.frequency = Math.max(10, Math.min(1000, being.resonance.frequency));
        
        // Record experience
        const otherId = effect.beingId === beingAId ? beingBId : beingAId;
        being.evolution.experiences.push({
          timestamp: Date.now(),
          otherBeing: otherId,
          interactionType: this.mapInteractionToExperience(interactionType),
          frequencyChange: effect.frequencyShift,
          lesson: effect.insight
        });
        
        // Update appearance
        being.appearance.color = ResonanceMath.frequencyToColor(
          being.resonance.frequency,
          being.resonance.amplitude / 100
        );
      }
    });
    
    // Create event
    const event: ResonanceEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      cause: {
        type: 'being_encounter',
        beings: [beingAId, beingBId],
        space: 'default'
      },
      manifestation: {
        type: interactionType,
        description: this.describeInteraction(beingA, beingB, interactionType),
        visual: this.visualizeInteraction(interactionType)
      },
      effects
    };
    
    this.events.push(event);
    return event;
  }
  
  private mapInteractionToExperience(type: InteractionType): ResonanceExperience['interactionType'] {
    const map: Record<InteractionType, ResonanceExperience['interactionType']> = {
      recognition: 'attraction',
      exchange: 'attraction',
      teaching: 'teaching',
      learning: 'learning',
      merging: 'harmonization',
      catalysis: 'harmonization',
      mirroring: 'attraction',
      challenge: 'attraction',
      harmonization: 'harmonization'
    };
    return map[type];
  }
  
  private describeInteraction(a: Being, b: Being, type: InteractionType): string {
    const names = [a.name || 'A being', b.name || 'Another being'];
    
    const descriptions: Record<InteractionType, string> = {
      recognition: `${names[0]} and ${names[1]} recognize each other's resonance.`,
      exchange: `Resonance flows between ${names[0]} and ${names[1]}.`,
      teaching: `${names[0]} elevates ${names[1]} through harmonic transmission.`,
      learning: `${names[0]} receives wisdom from ${names[1]}'s resonance.`,
      merging: `${names[0]} and ${names[1]} achieve temporary harmonic union.`,
      catalysis: `The meeting of ${names[0]} and ${names[1]} transforms them both.`,
      mirroring: `${names[0]} sees themselves reflected in ${names[1]}.`,
      challenge: `${names[0]} and ${names[1]} clash, forcing growth through resistance.`,
      harmonization: `${names[0]} and ${names[1]} fall into perfect resonance.`
    };
    
    return descriptions[type];
  }
  
  private visualizeInteraction(type: InteractionType): string {
    const visuals: Record<InteractionType, string> = {
      recognition: 'gentle_pulses',
      exchange: 'flowing_currents',
      teaching: 'ascending_spirals',
      learning: 'absorbing_rings',
      merging: 'overlapping_fields',
      catalysis: 'explosive_transformation',
      mirroring: 'symmetric_patterns',
      challenge: 'clashing_waves',
      harmonization: 'converging_rings'
    };
    return visuals[type];
  }
  
  // ========================================================================
  // SIMULATION UPDATE
  // ========================================================================
  
  update(): void {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    for (const being of this.beings.values()) {
      // Natural frequency drift
      being.resonance.frequency += being.evolution.drift * dt;
      being.resonance.frequency = Math.max(10, Math.min(1000, being.resonance.frequency));
      
      // Phase rotation
      being.resonance.phase = (being.resonance.phase + dt * 10) % 360;
      
      // Update field
      being.field.signature = being.resonance;
      being.field.radius = being.resonance.amplitude * 2;
      
      // Mood transitions based on state
      this.updateMood(being);
      
      // Seeking behavior
      if (being.state.seeking && being.state.mood !== 'resonating') {
        this.seekResonance(being);
      }
    }
    
    // Check for spontaneous interactions
    this.checkSpontaneousInteractions();
  }
  
  private updateMood(being: Being): void {
    if (being.state.attunedTo.length > 0) {
      being.state.mood = 'resonating';
    } else if (being.state.seeking) {
      being.state.mood = 'seeking';
    } else if (being.state.receptivity > 0.7) {
      being.state.mood = 'receptive';
    } else if (being.resonance.amplitude < 20) {
      being.state.mood = 'dormant';
    } else {
      being.state.mood = 'receptive';
    }
  }
  
  private seekResonance(being: Being): void {
    const attraction = this.findStrongestAttraction(being.id);
    if (attraction && attraction.strength > 0.3) {
      const otherId = attraction.beings[1];
      const other = this.beings.get(otherId);
      if (other) {
        // Move toward attractive resonance
        const dx = other.field.center.x - being.field.center.x;
        const dy = other.field.center.y - being.field.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const speed = being.resonance.amplitude * 0.01;
          being.field.center.x += (dx / dist) * speed;
          being.field.center.y += (dy / dist) * speed;
        }
      }
    }
  }
  
  private checkSpontaneousInteractions(): void {
    for (const [idA, beingA] of this.beings) {
      for (const [idB, beingB] of this.beings) {
        if (idA >= idB) continue; // Avoid duplicates
        
        const distance = ResonanceMath.distance(beingA.field.center, beingB.field.center);
        
        // If close enough and both receptive
        if (distance < 30 && 
            beingA.state.receptivity > 0.5 && 
            beingB.state.receptivity > 0.5 &&
            !beingA.state.attunedTo.includes(idB)) {
          
          // Attempt interaction
          const event = this.interact(idA, idB);
          if (event) {
            beingA.state.attunedTo.push(idB);
            beingB.state.attunedTo.push(idA);
          }
        }
      }
    }
  }
  
  // ========================================================================
  // CULTIVATION - Player actions
  // ========================================================================
  
  practice(cultivatorId: string, practiceType: string, duration: number): void {
    const cultivator = this.beings.get(cultivatorId) as Cultivator;
    if (!cultivator) return;
    
    // Different practices affect different frequencies
    const practiceEffects: Record<string, { realm: keyof Cultivator['realms']; freqShift: number }> = {
      meditation: { realm: 'spirit', freqShift: 5 },
      breathing: { realm: 'body', freqShift: 4 },
      study: { realm: 'mind', freqShift: 6 },
      movement: { realm: 'body', freqShift: 5 },
      reflection: { realm: 'mind', freqShift: 4 },
      creativity: { realm: 'spirit', freqShift: 6 }
    };
    
    const effect = practiceEffects[practiceType] || { realm: 'spirit', freqShift: 2 };
    
    // Apply to realm
    cultivator.realms[effect.realm].frequency += effect.freqShift * (duration / 10);
    cultivator.realms[effect.realm].growth += duration;
    
    // Update base resonance from realms
    cultivator.resonance.frequency = (
      cultivator.realms.mind.frequency +
      cultivator.realms.body.frequency +
      cultivator.realms.spirit.frequency
    ) / 3;
    
    // Increase agent coherence
    cultivator.emergentAgent.coherence = Math.min(
      1,
      cultivator.emergentAgent.coherence + duration * 0.001
    );
    
    // Agent learns from practice
    cultivator.emergentAgent.learnedPatterns.push(practiceType);
    
    // Update appearance
    cultivator.appearance.color = ResonanceMath.frequencyToColor(
      cultivator.resonance.frequency,
      cultivator.resonance.amplitude / 100
    );
  }
}

// Singleton instance
export const resonanceEngine = new ResonanceEngine();
