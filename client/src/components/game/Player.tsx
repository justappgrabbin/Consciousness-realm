import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import Avatar from "./Avatar";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { useNPCs } from "../../lib/stores/useNPCs";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

export default function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(new THREE.Vector3());
  const [subscribe, getState] = useKeyboardControls<Controls>();
  const { camera } = useThree();
  const { activeField, getActiveField, getFieldTraits } = useConsciousness();
  const { startInteraction, npcs } = useNPCs();
  
  const moveSpeed = 5;
  const jumpPower = 8;
  const gravity = -20;
  const groundLevel = 1;
  
  // Handle interactions
  useEffect(() => {
    const unsubscribeInteract = subscribe(
      (state) => state.interact,
      (pressed) => {
        if (pressed && playerRef.current) {
          // Check for nearby NPCs
          const playerPos = playerRef.current.position;
          const nearbyNPC = npcs.find(npc => {
            const npcPos = new THREE.Vector3(...npc.position);
            const distance = playerPos.distanceTo(npcPos);
            return distance < 3; // Interaction range
          });
          
          if (nearbyNPC) {
            startInteraction(nearbyNPC.id, activeField);
            
            // Gain experience from NPC interactions
            const { gainExperience } = useConsciousness.getState();
            gainExperience(activeField, 25);
            
            console.log(`Interacting with ${nearbyNPC.name} as ${activeField} - gained 25 XP`);
          }
        }
      }
    );
    
    return unsubscribeInteract;
  }, [subscribe, activeField, npcs, startInteraction]);
  
  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    const controls = getState();
    const player = playerRef.current;
    const velocity = velocityRef.current;
    const activeFieldData = getActiveField();
    
    // Calculate movement based on active field traits
    let speedMultiplier = 1;
    if (activeFieldData) {
      const traits = getFieldTraits(activeFieldData.id);
      const strengthTrait = traits.find(t => t.id.includes('strength') || t.id.includes('agility'));
      if (strengthTrait) {
        const movementEffect = strengthTrait.effects.find(e => e.type === 'movement');
        if (movementEffect) {
          speedMultiplier = movementEffect.value;
        }
      }
    }
    
    const currentMoveSpeed = moveSpeed * speedMultiplier;
    
    // Handle horizontal movement
    const moveVector = new THREE.Vector3();
    
    if (controls.forward) moveVector.z -= 1;
    if (controls.backward) moveVector.z += 1;
    if (controls.leftward) moveVector.x -= 1;
    if (controls.rightward) moveVector.x += 1;
    
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(currentMoveSpeed * delta);
      player.position.add(moveVector);
    }
    
    // Handle jumping
    if (controls.jump && player.position.y <= groundLevel + 0.1) {
      velocity.y = jumpPower;
    }
    
    // Apply gravity
    velocity.y += gravity * delta;
    player.position.y += velocity.y * delta;
    
    // Ground collision
    if (player.position.y < groundLevel) {
      player.position.y = groundLevel;
      velocity.y = 0;
    }
    
    // Update camera to follow player
    const idealCameraPosition = new THREE.Vector3(
      player.position.x,
      player.position.y + 8,
      player.position.z + 12
    );
    
    camera.position.lerp(idealCameraPosition, 2 * delta);
    camera.lookAt(player.position);
    
    // Log position for debugging
    if (Math.floor(state.clock.elapsedTime) % 5 === 0 && Math.floor(state.clock.elapsedTime * 10) % 10 === 0) {
      console.log(`Player position: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`);
    }
  });
  
  return (
    <group ref={playerRef} position={[0, groundLevel, 0]}>
      <Avatar />
    </group>
  );
}
