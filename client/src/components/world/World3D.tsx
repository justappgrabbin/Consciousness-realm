import { useRef, useEffect, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { EmbodiedWorldEngine } from '../../engine/EmbodiedWorldEngine';
import type { Agent, Place } from '../../types/embodiedAgent';
import { ELEMENT_COLORS } from '../../types/embodiedAgent';

// ── Error Boundary ────────────────────────────────────────────────────────────

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#06060f]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-6 text-center max-w-sm">
            <div className="mb-3 text-3xl">◎</div>
            <p className="mb-1 text-sm font-medium text-white/70">3D World Unavailable</p>
            <p className="text-xs text-white/30">WebGL context could not be created in this environment. The simulation is still running in the background.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Place ────────────────────────────────────────────────────────────────────

function Place3D({ place }: { place: Place }) {
  const color = new THREE.Color(place.color);
  return (
    <group position={[place.position.x, 0, place.position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[place.size.width, place.size.depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.18} roughness={0.9} />
      </mesh>
      {/* Glowing border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[
          Math.min(place.size.width, place.size.depth) * 0.45,
          Math.min(place.size.width, place.size.depth) * 0.5,
          64
        ]} />
        <meshBasicMaterial color={place.color} transparent opacity={0.5} />
      </mesh>
      {/* Pulsing floor glow */}
      <PulsingGlow color={place.color} size={Math.min(place.size.width, place.size.depth) * 0.4} />
    </group>
  );
}

function PulsingGlow({ color, size }: { color: string; size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.08;
    ref.current.scale.setScalar(s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.06 + Math.sin(clock.elapsedTime * 1.5) * 0.04;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[size, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} />
    </mesh>
  );
}

// ── Agent Avatar ─────────────────────────────────────────────────────────────

function AgentAvatar3D({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const auraRef   = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const colors = ELEMENT_COLORS[agent.element];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const idOff = Math.sin(t * 0.7 + agent.id.charCodeAt(0) * 0.1) * 0.04;

    switch (agent.animationState) {
      case 'walking':
        groupRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.06 + idOff;
        break;
      case 'meditating':
        groupRef.current.position.y = Math.sin(t * 0.8) * 0.12 + 0.25;
        break;
      case 'talking':
        groupRef.current.rotation.z = Math.sin(t * 5) * 0.04;
        groupRef.current.position.y = idOff;
        break;
      default:
        groupRef.current.position.y = idOff;
    }

    // Smooth rotation
    groupRef.current.rotation.y +=
      (agent.rotation - groupRef.current.rotation.y) * 0.08;

    // Aura pulse
    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(t * 2 + agent.id.charCodeAt(0)) * 0.06;
      const s = 1 + Math.sin(t * 1.5) * 0.05;
      auraRef.current.scale.setScalar(s);
    }
  });

  const emissiveIntensity = isSelected ? 0.8 : hovered ? 0.5 : 0.25;

  return (
    <group
      ref={groupRef}
      position={[agent.position.x, 0, agent.position.z]}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Aura */}
      <mesh ref={auraRef} position={[0, 1, 0]}>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshBasicMaterial color={colors.aura} transparent opacity={0.15} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 4, 8]} />
        <meshStandardMaterial
          color={colors.primary}
          emissive={colors.glow}
          emissiveIntensity={emissiveIntensity}
          roughness={0.35}
          metalness={0.55}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.23, 16, 16]} />
        <meshStandardMaterial
          color={colors.primary}
          emissive={colors.glow}
          emissiveIntensity={emissiveIntensity + 0.2}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.09, 1.6, 0.17]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.09, 1.6, 0.17]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : colors.glow}
            transparent
            opacity={isSelected ? 0.9 : 0.6}
          />
        </mesh>
      )}

      {/* Activity dot */}
      {agent.currentActivity && (
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial
            color={
              agent.animationState === 'talking'    ? '#4ade80' :
              agent.animationState === 'meditating' ? '#a78bfa' :
              agent.animationState === 'creating'   ? '#fb923c' : '#fbbf24'
            }
          />
        </mesh>
      )}
    </group>
  );
}

// ── Environment ──────────────────────────────────────────────────────────────

function Environment() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.95} />
      </mesh>

      <Grid
        position={[0, -0.04, 0]}
        args={[600, 600]}
        cellSize={10}
        cellThickness={0.4}
        cellColor="#1e1e3a"
        sectionSize={50}
        sectionThickness={0.8}
        sectionColor="#2a2a50"
        fadeDistance={220}
        fadeStrength={1.2}
        infiniteGrid
      />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[60, 100, 60]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 60, 0]} intensity={0.4} color="#8888ff" />
      <pointLight position={[-80, 20, -40]} intensity={0.3} color="#6366f1" />
      <pointLight position={[80, 20, -40]}  intensity={0.3} color="#ec4899" />
      <pointLight position={[0, 20, -90]}   intensity={0.3} color="#14b8a6" />

      {/* Fog */}
      <fog attach="fog" color="#06060f" near={120} far={280} />
    </>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────

function CameraController({
  mode,
  target,
}: {
  mode: 'orbit' | 'follow' | 'pov';
  target: Agent | null;
}) {
  const { camera } = useThree();
  useFrame(() => {
    if (mode === 'follow' && target) {
      const tp = new THREE.Vector3(target.position.x, target.position.y + 6, target.position.z + 12);
      camera.position.lerp(tp, 0.04);
      camera.lookAt(target.position.x, target.position.y + 1, target.position.z);
    } else if (mode === 'pov' && target) {
      camera.position.set(target.position.x, target.position.y + 1.7, target.position.z);
      camera.rotation.y = target.rotation;
    }
  });
  return null;
}

// ── Main World3D ──────────────────────────────────────────────────────────────

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
    // Sync initial state
    setAgents(Array.from(engine.agents.values()));
    setPlaces(Array.from(engine.places.values()));

    engine.onUpdate(() => {
      setAgents(Array.from(engine.agents.values()));
      setPlaces(Array.from(engine.places.values()));
    });
  }, [engine]);

  return (
    <div className="w-full h-full">
      <CanvasErrorBoundary>
      <Canvas
        shadows
        camera={{ position: [0, 65, 110], fov: 55 }}
        style={{ background: '#06060f' }}
        gl={{ powerPreference: 'high-performance', antialias: false }}
        onPointerMissed={() => onSelectAgent(null)}
      >
        <Environment />

        {places.map(p => (
          <Place3D key={p.id} place={p} />
        ))}

        {agents.map(a => (
          <AgentAvatar3D
            key={a.id}
            agent={a}
            isSelected={selectedAgent?.id === a.id}
            onClick={() => onSelectAgent(a)}
          />
        ))}

        <CameraController mode={cameraMode} target={selectedAgent} />

        {cameraMode === 'orbit' && (
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={15}
            maxDistance={220}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        )}
      </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
