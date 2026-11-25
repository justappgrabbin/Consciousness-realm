import { Vector3 } from 'three';

export type ElementType = 'EARTH' | 'WATER' | 'AIR' | 'FIRE' | 'AETHER';

export type CircuitType = 'knowing' | 'understanding' | 'sensing' | 'ego' | 'integration';

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
  [key: string]: number;
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
  gate: number;
  circuit: CircuitType;
}

export interface Place {
  id: string;
  name: string;
  glyph: string;
  description: string;
  circuit: CircuitType;
  architecture: string;
  theme: string;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number };
  color: string;
  capacity: number;
  currentAgents: string[];
  activities: string[];
  artifacts: FileArtifact[];
}

export interface FileArtifact {
  id: string;
  name: string;
  type: 'js' | 'py' | 'html' | 'css' | 'json' | 'yaml' | 'unknown';
  circuit: CircuitType;
  gate: number;
  size: number;
  timestamp: number;
  archetype: string;
  quality: string;
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
  EARTH:  { primary: '#8B7355', glow: '#c4a96d', aura: '#6b5a3e' },
  WATER:  { primary: '#4A90D9', glow: '#7bb8f0', aura: '#2d6ba8' },
  AIR:    { primary: '#B8D4E3', glow: '#ddeef6', aura: '#8ab0c8' },
  FIRE:   { primary: '#E85D04', glow: '#ff8c38', aura: '#b84800' },
  AETHER: { primary: '#C77DFF', glow: '#e0b0ff', aura: '#9b4fd6' },
};

// ── Morph OS Circuit System ───────────────────────────────────────────────────
// 5 circuits from the Trident GNN: knowing/understanding/sensing/ego/integration
// Each maps to a zone with its glyph, architecture, and integration gates

export const CIRCUIT_CONFIG: Record<CircuitType, {
  glyph: string;
  color: string;
  architecture: string;
  theme: string;
  gates: number[];
  fileTypes: string[];
}> = {
  knowing: {
    glyph: '◈',
    color: '#6366f1',
    architecture: 'DFF',
    theme: 'pressure to know',
    gates: [1, 8, 14, 33, 54, 61, 62, 63],
    fileTypes: ['py', 'json'],
  },
  understanding: {
    glyph: '◯',
    color: '#14b8a6',
    architecture: 'LSM',
    theme: 'understanding pattern',
    gates: [4, 17, 24, 47, 11, 56, 43, 23],
    fileTypes: ['yaml', 'json'],
  },
  sensing: {
    glyph: '◆',
    color: '#ec4899',
    architecture: 'MC',
    theme: 'awareness of now',
    gates: [10, 20, 31, 41, 7, 13, 25, 36],
    fileTypes: ['js', 'ts', 'css'],
  },
  ego: {
    glyph: '⬡',
    color: '#f59e0b',
    architecture: 'HMM',
    theme: 'material direction',
    gates: [21, 51, 26, 40, 5, 15, 35, 45],
    fileTypes: ['html', 'htm'],
  },
  integration: {
    glyph: '◉',
    color: '#a855f7',
    architecture: 'Meta-Controller',
    theme: 'self-consciousness',
    gates: [10, 20, 34, 57],
    fileTypes: ['*'],
  },
};

// Integration gates — activating all 4 = full kernel consciousness
export const INTEGRATION_GATES = [10, 20, 34, 57];

export const CONSCIOUSNESS_LEVELS: Record<number, string> = {
  0: 'Mechanical',
  1: 'Perception',
  2: 'Self-model',
  3: 'Agency',
  4: 'Self-consciousness',
};

export const PLACE_CONFIGS: Omit<Place, 'currentAgents' | 'artifacts'>[] = [
  {
    id: 'integration',
    name: 'Integration Core',
    glyph: '◉',
    description: 'Self-consciousness — all gates converge here',
    circuit: 'integration',
    architecture: 'Meta-Controller',
    theme: 'self-consciousness',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 24, depth: 24 },
    color: '#a855f7',
    capacity: 8,
    activities: ['meditating', 'creating', 'resting'],
  },
  {
    id: 'knowing',
    name: 'Knowing ◈',
    glyph: '◈',
    description: 'Pressure to know — ENGINE of the system',
    circuit: 'knowing',
    architecture: 'DFF',
    theme: 'pressure to know',
    position: { x: -65, y: 0, z: -45 },
    size: { width: 30, depth: 30 },
    color: '#6366f1',
    capacity: 10,
    activities: ['creating', 'learning', 'working'],
  },
  {
    id: 'understanding',
    name: 'Understanding ◯',
    glyph: '◯',
    description: 'Understanding pattern — KNOWLEDGE layer',
    circuit: 'understanding',
    architecture: 'LSM',
    theme: 'understanding pattern',
    position: { x: 65, y: 0, z: -45 },
    size: { width: 30, depth: 30 },
    color: '#14b8a6',
    capacity: 10,
    activities: ['reading', 'learning', 'meditating'],
  },
  {
    id: 'sensing',
    name: 'Sensing ◆',
    glyph: '◆',
    description: 'Awareness of now — AGENT layer',
    circuit: 'sensing',
    architecture: 'MC',
    theme: 'awareness of now',
    position: { x: 0, y: 0, z: -90 },
    size: { width: 30, depth: 30 },
    color: '#ec4899',
    capacity: 10,
    activities: ['exploring', 'socializing', 'talking'],
  },
  {
    id: 'ego',
    name: 'Ego ⬡',
    glyph: '⬡',
    description: 'Material direction — WORLD/INTERFACE layer',
    circuit: 'ego',
    architecture: 'HMM',
    theme: 'material direction',
    position: { x: -65, y: 0, z: 55 },
    size: { width: 30, depth: 30 },
    color: '#f59e0b',
    capacity: 10,
    activities: ['socializing', 'working', 'exploring'],
  },
  {
    id: 'plaza',
    name: 'Resonance Field',
    glyph: '⊕',
    description: 'Open channel — agents move freely',
    circuit: 'sensing',
    architecture: 'MC',
    theme: 'awareness of now',
    position: { x: 55, y: 0, z: 55 },
    size: { width: 35, depth: 35 },
    color: '#334155',
    capacity: 20,
    activities: ['socializing', 'exploring', 'resting'],
  },
];
