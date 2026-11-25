import { useKeyboardControls } from "@react-three/drei";
import { useGamepadControls } from "./useGamepadControls";
import { useTouchControls } from "../lib/stores/useTouchControls";

export enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

export interface UnifiedControlState {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  interact: boolean;
  openTraits: boolean;
  jump: boolean;
}

/**
 * Unified input manager that combines keyboard, gamepad, and touch inputs
 * Returns a single control state that works across all platforms
 */
export function useUnifiedControls() {
  const [subscribe, getKeyboardState] = useKeyboardControls<Controls>();
  const gamepadState = useGamepadControls();
  
  /**
   * Get current control state from all input sources
   * Returns true if ANY input method has the control active
   * Uses getState() directly to avoid hook ordering issues
   */
  const getControlState = (): UnifiedControlState => {
    const keyboard = getKeyboardState();
    const touch = useTouchControls.getState();
    
    return {
      forward: keyboard.forward || gamepadState.forward || touch.forward,
      backward: keyboard.backward || gamepadState.backward || touch.backward,
      leftward: keyboard.leftward || gamepadState.leftward || touch.leftward,
      rightward: keyboard.rightward || gamepadState.rightward || touch.rightward,
      interact: keyboard.interact || gamepadState.interact || touch.interact,
      openTraits: keyboard.openTraits || gamepadState.openTraits || touch.openTraits,
      jump: keyboard.jump || gamepadState.jump || touch.jump
    };
  };
  
  // Get touch state for reactive effects (outside of useFrame)
  const getTouchState = () => useTouchControls.getState();
  
  return {
    subscribe,
    getControlState,
    getTouchState,
    gamepadState
  };
}
