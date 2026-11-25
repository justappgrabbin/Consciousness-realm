import { useRef, useEffect, useState } from "react";
import type { TouchEvent, MouseEvent } from "react";
import { useTouchControls } from "../../lib/stores/useTouchControls";
import { isMobileDevice } from "../../utils/deviceDetection";

export default function TouchControls() {
  const { updateJoystick, setButtonState, resetJoystick } = useTouchControls();
  const [isMobile, setIsMobile] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Joystick handlers
  const handleJoystickStart = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    setJoystickActive(true);
    updateJoystickPosition(clientX, clientY);
  };
  
  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickActive) return;
    updateJoystickPosition(clientX, clientY);
  };
  
  const handleJoystickEnd = () => {
    setJoystickActive(false);
    resetJoystick();
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = 'translate(-50%, -50%)';
    }
  };
  
  const updateJoystickPosition = (clientX: number, clientY: number) => {
    if (!joystickRef.current || !joystickThumbRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    const maxDistance = rect.width / 2;
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    
    const thumbX = Math.cos(angle) * distance;
    const thumbY = Math.sin(angle) * distance;
    
    joystickThumbRef.current.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
    
    // Normalize to -1 to 1
    const normalizedX = thumbX / maxDistance;
    const normalizedY = thumbY / maxDistance;
    
    updateJoystick(normalizedX, normalizedY);
  };
  
  // Touch event handlers
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickStart(touch.clientX, touch.clientY);
  };
  
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  };
  
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleJoystickEnd();
  };
  
  // Mouse event handlers for testing on desktop
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    handleJoystickStart(e.clientX, e.clientY);
  };
  
  useEffect(() => {
    if (!joystickActive) return;
    
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      handleJoystickMove(e.clientX, e.clientY);
    };
    
    const handleMouseUp = () => {
      handleJoystickEnd();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [joystickActive]);
  
  // Button press handlers
  const handleButtonPress = (button: 'interact' | 'openTraits' | 'jump') => {
    setButtonState(button, true);
    setTimeout(() => setButtonState(button, false), 100);
  };
  
  if (!isMobile) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Virtual Joystick - Left Side */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <div
          ref={joystickRef}
          className="relative w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full border-2 border-white/30"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          <div
            ref={joystickThumbRef}
            className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 transition-none"
          />
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-semibold">
            MOVE
          </div>
        </div>
      </div>
      
      {/* Action Buttons - Right Side */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 pointer-events-auto">
        {/* Jump Button */}
        <button
          className="w-16 h-16 bg-yellow-500/80 backdrop-blur-sm rounded-full border-2 border-yellow-300/50 active:bg-yellow-600/90 flex items-center justify-center text-white font-bold shadow-lg"
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('jump');
          }}
          onClick={() => handleButtonPress('jump')}
        >
          <span className="text-sm">JUMP</span>
        </button>
        
        {/* Interact Button */}
        <button
          className="w-16 h-16 bg-green-500/80 backdrop-blur-sm rounded-full border-2 border-green-300/50 active:bg-green-600/90 flex items-center justify-center text-white font-bold shadow-lg"
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('interact');
          }}
          onClick={() => handleButtonPress('interact')}
        >
          <span className="text-xs">TALK</span>
        </button>
      </div>
      
      {/* Traits Button - Top Right */}
      <div className="absolute top-20 right-8 pointer-events-auto">
        <button
          className="w-14 h-14 bg-purple-500/80 backdrop-blur-sm rounded-full border-2 border-purple-300/50 active:bg-purple-600/90 flex items-center justify-center text-white font-bold shadow-lg"
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('openTraits');
          }}
          onClick={() => handleButtonPress('openTraits')}
        >
          <span className="text-xs">TRAITS</span>
        </button>
      </div>
    </div>
  );
}
