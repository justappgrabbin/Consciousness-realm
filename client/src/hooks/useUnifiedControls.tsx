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
  const touchState = useTouchControls((state) => ({
    forward: state.forward,
    backward: state.backward,
    leftward: state.leftward,
    rightward: state.rightward,
    interact: state.interact,
    openTraits: state.openTraits,
    jump: state.jump
  }));
  
  /**
   * Get current control state from all input sources
   * Returns true if ANY input method has the control active
   */
  const getControlState = (): UnifiedControlState => {
    const keyboard = getKeyboardState();
    
    return {
      forward: keyboard.forward || gamepadState.forward || touchState.forward,
      backward: keyboard.backward || gamepadState.backward || touchState.backward,
      leftward: keyboard.leftward || gamepadState.leftward || touchState.leftward,
      rightward: keyboard.rightward || gamepadState.rightward || touchState.rightward,
      interact: keyboard.interact || gamepadState.interact || touchState.interact,
      openTraits: keyboard.openTraits || gamepadState.openTraits || touchState.openTraits,
      jump: keyboard.jump || gamepadState.jump || touchState.jump
    };
  };
  
  return {
    subscribe,
    getControlState,
    touchState,
    gamepadState
  };
}
