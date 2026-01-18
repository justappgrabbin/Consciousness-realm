import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";

export default function Avatar() {
  const groupRef = useRef<THREE.Group>(null);
  const { getActiveField } = useConsciousness();
  
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.03;
  });
  
  const activeField = getActiveField();
  const primaryColor = activeField?.avatarColor || '#4a90d9';
  const secondaryColor = activeField?.color || '#2d5a87';
  
  const skinColor = '#e8c4a0';
  const hairColor = '#3d2314';
  const shoeColor = '#1a1a1a';
  
  return (
    <group ref={groupRef}>
      <group scale={[0.8, 0.8, 0.8]}>
        {/* Head */}
        <group position={[0, 1.6, 0]}>
          {/* Face/Head shape */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
          
          {/* Hair */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.24, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.02, -0.1]} castShadow>
            <boxGeometry args={[0.4, 0.2, 0.15]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          
          {/* Eyes */}
          <mesh position={[-0.08, 0.02, 0.18]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.08, 0.02, 0.18]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.08, 0.02, 0.21]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#2a4a6a" />
          </mesh>
          <mesh position={[0.08, 0.02, 0.21]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#2a4a6a" />
          </mesh>
          
          {/* Eyebrows */}
          <mesh position={[-0.08, 0.08, 0.19]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.08, 0.015, 0.02]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.08, 0.08, 0.19]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.08, 0.015, 0.02]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          
          {/* Nose */}
          <mesh position={[0, -0.02, 0.2]}>
            <boxGeometry args={[0.03, 0.05, 0.04]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
          
          {/* Mouth */}
          <mesh position={[0, -0.08, 0.19]}>
            <boxGeometry args={[0.06, 0.015, 0.02]} />
            <meshStandardMaterial color="#c4756a" />
          </mesh>
          
          {/* Neck */}
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.15, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
        </group>
        
        {/* Torso - Shirt/Top */}
        <group position={[0, 0.85, 0]}>
          {/* Main torso */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
            <meshStandardMaterial color={primaryColor} roughness={0.6} />
          </mesh>
          
          {/* Collar detail */}
          <mesh position={[0, 0.35, 0.1]}>
            <boxGeometry args={[0.15, 0.08, 0.08]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.6} />
          </mesh>
          
          {/* Shoulders */}
          <mesh position={[-0.3, 0.25, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={primaryColor} roughness={0.6} />
          </mesh>
          <mesh position={[0.3, 0.25, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={primaryColor} roughness={0.6} />
          </mesh>
        </group>
        
        {/* Arms */}
        <group>
          {/* Left Arm */}
          <mesh position={[-0.38, 0.7, 0]} rotation={[0, 0, 0.15]} castShadow>
            <capsuleGeometry args={[0.07, 0.4, 6, 12]} />
            <meshStandardMaterial color={primaryColor} roughness={0.6} />
          </mesh>
          <mesh position={[-0.45, 0.3, 0]} rotation={[0, 0, 0.1]} castShadow>
            <capsuleGeometry args={[0.06, 0.35, 6, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
          {/* Left Hand */}
          <mesh position={[-0.48, 0.05, 0]} castShadow>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
          
          {/* Right Arm */}
          <mesh position={[0.38, 0.7, 0]} rotation={[0, 0, -0.15]} castShadow>
            <capsuleGeometry args={[0.07, 0.4, 6, 12]} />
            <meshStandardMaterial color={primaryColor} roughness={0.6} />
          </mesh>
          <mesh position={[0.45, 0.3, 0]} rotation={[0, 0, -0.1]} castShadow>
            <capsuleGeometry args={[0.06, 0.35, 6, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
          {/* Right Hand */}
          <mesh position={[0.48, 0.05, 0]} castShadow>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
        </group>
        
        {/* Pants/Lower body */}
        <group position={[0, 0.15, 0]}>
          {/* Hip area */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.22, 0.3, 8, 16]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.7} />
          </mesh>
          
          {/* Belt */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.06, 16]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.5} />
          </mesh>
          {/* Belt buckle */}
          <mesh position={[0, 0.2, 0.22]}>
            <boxGeometry args={[0.06, 0.05, 0.02]} />
            <meshStandardMaterial color="#c4a050" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        
        {/* Legs */}
        <group>
          {/* Left Leg */}
          <mesh position={[-0.12, -0.35, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.7} />
          </mesh>
          <mesh position={[-0.12, -0.85, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.4, 6, 12]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.7} />
          </mesh>
          {/* Left Shoe */}
          <mesh position={[-0.12, -1.15, 0.05]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.22]} />
            <meshStandardMaterial color={shoeColor} roughness={0.4} />
          </mesh>
          
          {/* Right Leg */}
          <mesh position={[0.12, -0.35, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.12, -0.85, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.4, 6, 12]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.7} />
          </mesh>
          {/* Right Shoe */}
          <mesh position={[0.12, -1.15, 0.05]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.22]} />
            <meshStandardMaterial color={shoeColor} roughness={0.4} />
          </mesh>
        </group>
      </group>
      
      {/* Field-specific aura effect */}
      {activeField && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial
            color={activeField.color}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Field energy ring at feet */}
      {activeField && (
        <mesh position={[0, -0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial
            color={activeField.particleColor}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
