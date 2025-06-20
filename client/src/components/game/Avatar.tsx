import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";

export default function Avatar() {
  const groupRef = useRef<THREE.Group>(null);
  const { getActiveField } = useConsciousness();
  
  // Load the human character model
  const { scene } = useGLTF('/models/human_character.glb');
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Gentle floating animation
    groupRef.current.rotation.y += 0.01;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });
  
  const activeField = getActiveField();
  
  return (
    <group ref={groupRef}>
      {/* Human character model */}
      <primitive 
        object={scene.clone()} 
        scale={[1, 1, 1]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Field-specific aura effect */}
      {activeField && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1.8, 32, 32]} />
          <meshBasicMaterial
            color={activeField.color}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Field energy rings */}
      {activeField && (
        <>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.4, 1.6, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.0, 1.2, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/human_character.glb');
