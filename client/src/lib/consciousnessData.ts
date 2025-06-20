export interface ConsciousnessField {
  id: string;
  name: string;
  description: string;
  color: string;
  particleColor: string;
  avatarColor: string;
  unlocked: boolean;
  level: number;
  experience: number;
  traits: Trait[];
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  type: 'major' | 'minor';
  level: number;
  experience: number;
  maxLevel: number;
  requirements: string[];
  effects: TraitEffect[];
  cooldown: number;
  lastUsed: number;
}

export interface TraitEffect {
  type: 'movement' | 'interaction' | 'dialogue' | 'visual' | 'combat';
  value: number;
  duration?: number;
}

export const CONSCIOUSNESS_FIELDS: ConsciousnessField[] = [
  {
    id: 'mind',
    name: 'Mind',
    description: 'The field of intellect, analysis, and strategic thinking',
    color: '#4A90E2',
    particleColor: '#7BB3F0',
    avatarColor: '#2E5A87',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'mind_analysis',
        name: 'Deep Analysis',
        description: 'Analyze objects and NPCs to reveal hidden information',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'interaction', value: 1.5 }],
        cooldown: 5000,
        lastUsed: 0
      },
      {
        id: 'mind_focus',
        name: 'Mental Focus',
        description: 'Increased concentration enhances all mental activities',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 1.2 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'mind_clarity',
        name: 'Clarity of Thought',
        description: 'Clear thinking reduces confusion effects',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['mind_focus'],
        effects: [{ type: 'visual', value: 1.1 }],
        cooldown: 0,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'The field of emotions, empathy, and connection',
    color: '#E74C3C',
    particleColor: '#F1948A',
    avatarColor: '#A93226',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'heart_empathy',
        name: 'Empathic Connection',
        description: 'Feel and understand the emotions of others',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 1.8 }],
        cooldown: 3000,
        lastUsed: 0
      },
      {
        id: 'heart_compassion',
        name: 'Compassionate Healing',
        description: 'Heal others through emotional connection',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'interaction', value: 2.0 }],
        cooldown: 10000,
        lastUsed: 0
      },
      {
        id: 'heart_warmth',
        name: 'Emotional Warmth',
        description: 'Your presence brings comfort to others',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['heart_empathy'],
        effects: [{ type: 'visual', value: 1.3 }],
        cooldown: 0,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'body',
    name: 'Body',
    description: 'The field of physical prowess, instinct, and earthly connection',
    color: '#8B4513',
    particleColor: '#D2B48C',
    avatarColor: '#654321',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'body_strength',
        name: 'Physical Strength',
        description: 'Enhanced physical power and endurance',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'movement', value: 1.5 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'body_agility',
        name: 'Enhanced Agility',
        description: 'Improved speed and reflexes',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'movement', value: 1.3 }],
        cooldown: 2000,
        lastUsed: 0
      },
      {
        id: 'body_instinct',
        name: 'Primal Instinct',
        description: 'Trust your gut feelings and intuition',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['body_agility'],
        effects: [{ type: 'interaction', value: 1.2 }],
        cooldown: 0,
        lastUsed: 0
      }
    ]
  }
];

export const RITUAL_ZONES = [
  {
    id: 'mind_altar',
    name: 'Mind Altar',
    fieldId: 'mind',
    position: [10, 0, 10],
    description: 'A crystalline altar that resonates with mental energy'
  },
  {
    id: 'heart_grove',
    name: 'Heart Grove',
    fieldId: 'heart',
    position: [-10, 0, 10],
    description: 'A sacred grove where emotional energies flow freely'
  },
  {
    id: 'body_training',
    name: 'Training Ground',
    fieldId: 'body',
    position: [0, 0, -15],
    description: 'An ancient training ground that strengthens the physical form'
  }
];

export const NPC_DATA = [
  {
    id: 'sage',
    name: 'The Sage',
    position: [5, 0, 5],
    dialogues: {
      mind: [
        "Ah, I sense the clarity of thought within you. Seek knowledge in the ancient texts.",
        "Your analytical mind serves you well. Have you considered the deeper mysteries?",
        "Logic and reason are powerful tools, but remember - not all truths can be reasoned."
      ],
      heart: [
        "I feel the warmth of your compassion. It is a rare gift in these times.",
        "Your empathy opens doors that force cannot. Trust in your emotional wisdom.",
        "The heart knows truths that the mind cannot fathom. Listen to its whispers."
      ],
      body: [
        "Your physical presence commands respect. Strength has its own wisdom.",
        "I see the power in your movements. Channel that energy wisely.",
        "The body remembers what the mind forgets. Trust your instincts."
      ]
    }
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    position: [-5, 0, -5],
    dialogues: {
      mind: [
        "Strategic thinking will serve you well in the trials ahead.",
        "I have puzzles that would challenge even the sharpest minds. Are you ready?",
        "Knowledge without action is empty. What will you do with what you learn?"
      ],
      heart: [
        "Your compassion is your greatest strength and your greatest vulnerability.",
        "I have seen warriors with hearts of stone. You are different. That is good.",
        "Protect what you love, but do not let love make you weak."
      ],
      body: [
        "Your strength is evident, but true power comes from discipline.",
        "I could train you in the ancient ways, if you prove yourself worthy.",
        "Physical prowess without wisdom is mere brutality. Show me you understand."
      ]
    }
  }
];
