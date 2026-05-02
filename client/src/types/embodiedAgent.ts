import { Vector3 } from 'three';

export type ElementType = 'EARTH' | 'WATER' | 'AIR' | 'FIRE' | 'AETHER';

export interface HumanProfile {
  id: string;
  name: string;
  birthday: string;
  intentions: string[];
  values: string[];
}

export interface AgentNeeds {
  energy: number;
  connection: number;
  growth: number;
  purpose: number;
  rest: number;
}

export interface Relationship {
  agentId: string;
  type: 'friend' | 'mentor' | 'student' | 'rival' | 'partner';
  strength: number;
}

export type AnimationState = 'idle' | 'walking' | 'running' | 'talking' | 'meditating' | 'reading' | 'creating';

export interface Agent {
  id: string;
  humanId: string;
  name: string;
  element: ElementType;
  archetype: string;
  hdType: 'Generator' | 'Manifestor' | 'Projector' | 'Reflector';
  position: Vector3;
  targetPosition: Vector3 | null;
  rotation: number;
  animationState: AnimationState;
  animationTime: number;
  age: number;
  lifeStage: 'infant' | 'child' | 'youth' | 'adult';
  consciousness: { level: number; stage: 'dormant' | 'awakening' | 'aware' };
  needs: AgentNeeds;
  currentActivity: string | null;
  currentPlace: string;
  relationships: Relationship[];
  appearance: {
    color: string;
    glowIntensity: number;
    height: number;
    auraColor: string;
  };
}

export interface Place {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number };
  color: string;
  capacity: number;
  currentAgents: string[];
  activities: string[];
  productTag?: string;
}

export interface AgentMessage {
  id: string;
  timestamp: number;
  fromAgent: string;
  toHuman: string;
  content: string;
  context: string;
}

export interface WorldTime {
  day: number;
  hour: number;
  minute: number;
}

export const ELEMENT_COLORS: Record<ElementType, { primary: string; glow: string; aura: string }> = {
  EARTH: { primary: '#8B7355', glow: '#c4a96d', aura: '#6b5a3e' },
  WATER: { primary: '#4A90D9', glow: '#7bb8f0', aura: '#2d6ba8' },
  AIR:   { primary: '#B8D4E3', glow: '#ddeef6', aura: '#8ab0c8' },
  FIRE:  { primary: '#E85D04', glow: '#ff8c38', aura: '#b84800' },
  AETHER:{ primary: '#C77DFF', glow: '#e0b0ff', aura: '#9b4fd6' },
};

export const PLACE_CONFIGS: Omit<Place, 'currentAgents'>[] = [
  {
    id: 'home',
    name: 'Base',
    description: 'The origin point',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 20, depth: 20 },
    color: '#334155',
    capacity: 4,
    activities: ['resting', 'meditating', 'dreaming'],
  },
  {
    id: 'product_alpha',
    name: 'Alpha Product',
    description: 'Core offering — agents gather here to explore and resonate',
    position: { x: -60, y: 0, z: -40 },
    size: { width: 30, depth: 30 },
    color: '#6366f1',
    capacity: 10,
    activities: ['creating', 'learning', 'socializing'],
    productTag: 'FEATURED',
  },
  {
    id: 'product_beta',
    name: 'Beta Product',
    description: 'Next-generation experience',
    position: { x: 60, y: 0, z: -40 },
    size: { width: 30, depth: 30 },
    color: '#ec4899',
    capacity: 10,
    activities: ['exploring', 'working', 'socializing'],
    productTag: 'NEW',
  },
  {
    id: 'product_gamma',
    name: 'Gamma Product',
    description: 'Deep integration layer',
    position: { x: 0, y: 0, z: -90 },
    size: { width: 30, depth: 30 },
    color: '#14b8a6',
    capacity: 10,
    activities: ['meditating', 'learning', 'creating'],
    productTag: 'COMING SOON',
  },
  {
    id: 'plaza',
    name: 'Central Plaza',
    description: 'Community gathering space',
    position: { x: 0, y: 0, z: 30 },
    size: { width: 40, depth: 40 },
    color: '#475569',
    capacity: 20,
    activities: ['socializing', 'exploring', 'resting'],
  },
  {
    id: 'temple',
    name: 'Resonance Temple',
    description: 'Sacred space for deep practice',
    position: { x: -80, y: 0, z: 60 },
    size: { width: 25, depth: 25 },
    color: '#7c3aed',
    capacity: 8,
    activities: ['meditating', 'dreaming'],
  },
  {
    id: 'studio',
    name: 'Creation Studio',
    description: 'Where ideas become form',
    position: { x: 80, y: 0, z: 60 },
    size: { width: 25, depth: 25 },
    color: '#d97706',
    capacity: 8,
    activities: ['creating', 'working', 'learning'],
  },
];
