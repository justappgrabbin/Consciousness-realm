import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { CONSCIOUSNESS_FIELDS, type ConsciousnessField } from "../consciousnessData";

interface ConsciousnessState {
  activeField: string;
  fields: ConsciousnessField[];
  switchCooldown: number;
  lastSwitchTime: number;
  energeticSignature: string[];
  
  // Actions
  switchField: (fieldId: string) => boolean;
  gainExperience: (fieldId: string, amount: number) => void;
  gainTraitExperience: (fieldId: string, traitId: string, amount: number) => void;
  updateEnergeticSignature: () => void;
  canUseField: (fieldId: string) => boolean;
  getActiveField: () => ConsciousnessField | undefined;
  getFieldTraits: (fieldId: string) => any[];
}

export const useConsciousness = create<ConsciousnessState>()(
  subscribeWithSelector((set, get) => ({
    activeField: 'mind',
    fields: [...CONSCIOUSNESS_FIELDS],
    switchCooldown: 30000, // 30 seconds
    lastSwitchTime: 0,
    energeticSignature: ['mind_analysis', 'heart_empathy', 'body_strength'],
    
    switchField: (fieldId: string) => {
      const state = get();
      const now = Date.now();
      
      // Check if field exists and is unlocked
      const field = state.fields.find(f => f.id === fieldId);
      if (!field || !field.unlocked) {
        console.log(`Cannot switch to field ${fieldId}: not found or locked`);
        return false;
      }
      
      // Check cooldown
      if (now - state.lastSwitchTime < state.switchCooldown && state.activeField !== fieldId) {
        console.log(`Field switch on cooldown: ${Math.ceil((state.switchCooldown - (now - state.lastSwitchTime)) / 1000)}s remaining`);
        return false;
      }
      
      set({
        activeField: fieldId,
        lastSwitchTime: now
      });
      
      console.log(`Switched to field: ${field.name}`);
      return true;
    },
    
    gainExperience: (fieldId: string, amount: number) => {
      set((state) => ({
        fields: state.fields.map(field => {
          if (field.id === fieldId) {
            const newExp = field.experience + amount;
            const newLevel = Math.floor(newExp / 100) + 1;
            return {
              ...field,
              experience: newExp,
              level: Math.max(field.level, newLevel)
            };
          }
          return field;
        })
      }));
    },
    
    gainTraitExperience: (fieldId: string, traitId: string, amount: number) => {
      set((state) => ({
        fields: state.fields.map(field => {
          if (field.id === fieldId) {
            return {
              ...field,
              traits: field.traits.map(trait => {
                if (trait.id === traitId) {
                  const newExp = trait.experience + amount;
                  const newLevel = Math.min(
                    Math.floor(newExp / 50) + 1,
                    trait.maxLevel
                  );
                  return {
                    ...trait,
                    experience: newExp,
                    level: Math.max(trait.level, newLevel)
                  };
                }
                return trait;
              })
            };
          }
          return field;
        })
      }));
    },
    
    updateEnergeticSignature: () => {
      // Simulate daily energetic signature change
      const allTraitIds = get().fields.flatMap(f => f.traits.map(t => t.id));
      const shuffled = [...allTraitIds].sort(() => Math.random() - 0.5);
      const newSignature = shuffled.slice(0, Math.min(3 + Math.floor(Math.random() * 3), allTraitIds.length));
      
      set({ energeticSignature: newSignature });
      console.log('Energetic signature updated:', newSignature);
    },
    
    canUseField: (fieldId: string) => {
      const field = get().fields.find(f => f.id === fieldId);
      return field ? field.unlocked : false;
    },
    
    getActiveField: () => {
      const state = get();
      return state.fields.find(f => f.id === state.activeField);
    },
    
    getFieldTraits: (fieldId: string) => {
      const field = get().fields.find(f => f.id === fieldId);
      if (!field) return [];
      
      const signature = get().energeticSignature;
      return field.traits.filter(trait => signature.includes(trait.id));
    }
  }))
);
