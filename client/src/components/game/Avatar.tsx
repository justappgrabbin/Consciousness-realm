import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";

export default function Avatar() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { getActiveField } = useConsciousness();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle floating animation
    meshRef.current.rotation.y += 0.01;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  
  const activeField = getActiveField();
  const avatarColor = activeField?.avatarColor || '#888888';
  
  return (
    <group>
      {/* Main avatar body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.6, 0.4]} />
        <meshLambertMaterial color={avatarColor} />
      </mesh>
      
      {/* Avatar head */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshLambertMaterial color={avatarColor} />
      </mesh>
      
      {/* Field-specific aura effect */}
      {activeField && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial
            color={activeField.color}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Field energy rings */}
      {activeField && (
        <>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.4, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
