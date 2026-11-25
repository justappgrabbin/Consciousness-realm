import { create } from "zustand";

interface TouchControlState {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  interact: boolean;
  openTraits: boolean;
  jump: boolean;
  joystickX: number; // -1 to 1
  joystickY: number; // -1 to 1
  
  // Actions
  updateJoystick: (x: number, y: number) => void;
  setButtonState: (button: 'interact' | 'openTraits' | 'jump', pressed: boolean) => void;
  resetJoystick: () => void;
}

export const useTouchControls = create<TouchControlState>((set) => ({
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  interact: false,
  openTraits: false,
  jump: false,
  joystickX: 0,
  joystickY: 0,
  
  updateJoystick: (x: number, y: number) => {
    const deadzone = 0.2;
    
    set({
      joystickX: x,
      joystickY: y,
      forward: y < -deadzone,
      backward: y > deadzone,
      leftward: x < -deadzone,
      rightward: x > deadzone
    });
  },
  
  setButtonState: (button, pressed) => {
    set({ [button]: pressed });
  },
  
  resetJoystick: () => {
    set({
      joystickX: 0,
      joystickY: 0,
      forward: false,
      backward: false,
      leftward: false,
      rightward: false
    });
  }
}));
