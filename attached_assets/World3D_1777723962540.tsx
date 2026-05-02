/**
 * WORLD 3D - Three.js scene with places and agents
 */

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3 } from 'three';
import type { EmbodiedWorldEngine } from '@/engine/EmbodiedWorldEngine';
import type { Agent, Place } from '@/types/embodiedAgent';
import { ELEMENT_COLORS } from '@/types/embodiedAgent';

// ============================================================================
// PLACE COMPONENT
// ============================================================================

function Place3D({ place }: { place: Place }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <group position={[place.position.x, 0, place.position.z]}>
      {/* Ground */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[place.size.width, place.size.depth]} />
        <meshStandardMaterial 
          color={place.color} 
          transparent 
          opacity={0.3}
          roughness={0.8}
        />
      </mesh>
      
      {/* Border */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[
          new (window as any).THREE.PlaneGeometry(place.size.width, place.size.depth)
        ]} />
        <lineBasicMaterial color={place.color} opacity={0.6} transparent />
      </lineSegments>
      
      {/* Name label */}
      <mesh position={[0, 0.1, -place.size.depth / 2 - 2]}>
        <planeGeometry args={[place.size.width * 0.8, 1]} />
        <meshBasicMaterial color="#000" transparent opacity={0.5} />
      </mesh>
      
      {/* Glow effect */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[place.size.width + 2, place.size.depth + 2]} />
        <meshBasicMaterial 
          color={place.color} 
          transparent 
          opacity={0.1}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// AGENT AVATAR COMPONENT
// ============================================================================

function AgentAvatar({ 
  agent, 
  isSelected,
  onClick 
}: { 
  agent: Agent; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const colors = ELEMENT_COLORS[agent.element];
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Bobbing animation for all states
    const bobOffset = Math.sin(time * 3 + agent.id.charCodeAt(0)) * 0.05;
    
    // State-specific animations
    switch (agent.animationState) {
      case 'walking':
      case 'running':
        // Walking bob
        groupRef.current.position.y = Math.abs(Math.sin(time * 10)) * 0.1 + bobOffset;
        break;
      case 'meditating':
        // Gentle float
        groupRef.current.position.y = Math.sin(time * 1) * 0.1 + 0.3;
        break;
      case 'talking':
        // Subtle gesture
        groupRef.current.rotation.z = Math.sin(time * 4) * 0.05;
        break;
      default:
        // Idle breathing
        groupRef.current.position.y = bobOffset;
    }
    
    // Smooth rotation
    const targetRotation = agent.rotation;
    groupRef.current.rotation.y += (targetRotation - groupRef.current.rotation.y) * 0.1;
  });
  
  return (
    <group 
      ref={groupRef}
      position={[agent.position.x, 0, agent.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Aura */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color={colors.aura} 
          transparent 
          opacity={0.2}
        />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial 
          color={colors.primary}
          emissive={colors.glow}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color={colors.primary}
          emissive={colors.glow}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.1, 1.65, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.1, 1.65, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      
      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial 
            color={isSelected ? '#fff' : colors.glow} 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Name tag */}
      {(isSelected || hovered) && (
        <group position={[0, 2.2, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.4]} />
            <meshBasicMaterial color="#000" transparent opacity={0.7} />
          </mesh>
          {/* Text would go here - simplified for now */}
        </group>
      )}
      
      {/* Activity indicator */}
      {agent.currentActivity && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial 
            color={agent.animationState === 'talking' ? '#0f0' : 
                   agent.animationState === 'meditating' ? '#88f' : '#ff0'}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// ENVIRONMENT COMPONENT
// ============================================================================

function Environment3D() {
  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      
      {/* Grid */}
      <Grid
        position={[0, -0.09, 0]}
        args={[500, 500]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#333355"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#444466"
        fadeDistance={200}
        fadeStrength={1}
        infiniteGrid
      />
      
      {/* Sky */}
      <Sky 
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#88f" />
    </>
  );
}

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

function CameraController({ 
  mode, 
  targetAgent 
}: { 
  mode: 'orbit' | 'follow' | 'pov';
  targetAgent: Agent | null;
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (mode === 'follow' && targetAgent) {
      const targetPos = new Vector3(
        targetAgent.position.x,
        targetAgent.position.y + 5,
        targetAgent.position.z + 10
      );
      camera.position.lerp(targetPos, 0.05);
      camera.lookAt(targetAgent.position);
    } else if (mode === 'pov' && targetAgent) {
      const povPos = new Vector3(
        targetAgent.position.x,
        targetAgent.position.y + 1.7,
        targetAgent.position.z
      );
      camera.position.copy(povPos);
      camera.rotation.y = targetAgent.rotation;
    }
  });
  
  return null;
}

// ============================================================================
// MAIN WORLD COMPONENT
// ============================================================================

interface World3DProps {
  engine: EmbodiedWorldEngine;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  cameraMode: 'orbit' | 'follow' | 'pov';
}

export function World3D({ engine, selectedAgent, onSelectAgent, cameraMode }: World3DProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  
  useEffect(() => {
    engine.onUpdate(() => {
      setAgents(Array.from(engine.agents.values()));
      setPlaces(Array.from(engine.places.values()));
    });
  }, [engine]);
  
  return (
    <div className="w-full h-full">
      <Canvas 
        shadows
        camera={{ position: [0, 50, 100], fov: 60 }}
        style={{ background: '#0a0a15' }}
      >
        <Environment3D />
        
        {/* Places */}
        {places.map(place => (
          <Place3D key={place.id} place={place} />
        ))}
        
        {/* Agents */}
        {agents.map(agent => (
          <AgentAvatar 
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
        
        {/* Camera */}
        <CameraController mode={cameraMode} targetAgent={selectedAgent} />
        
        {cameraMode === 'orbit' && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2 - 0.1}
          />
        )}
      </Canvas>
    </div>
  );
}
