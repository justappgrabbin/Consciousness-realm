import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { KeyboardControls } from "@react-three/drei";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Game from "./components/game/Game";
import FieldResonanceHUD from "./components/ui/FieldResonanceHUD";
import TraitPanel from "./components/ui/TraitPanel";
import DialogueBox from "./components/ui/DialogueBox";
import QuestSystem from "./components/ui/QuestSystem";
import GameInstructions from "./components/ui/GameInstructions";
import ExperienceNotification from "./components/ui/ExperienceNotification";
import GamepadHelpOverlay from "./components/ui/GamepadHelpOverlay";
import TouchControls from "./components/ui/TouchControls";
import AgentWorld from "./pages/AgentWorld";
import { getDevicePixelRatio, getPerformanceTier } from "./utils/deviceDetection";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.interact, keys: ["KeyE"] },
  { name: Controls.openTraits, keys: ["KeyT"] },
  { name: Controls.jump, keys: ["Space"] },
];

type AppMode = 'world' | 'game';

function ModeToggle({ mode, onChange }: { mode: AppMode; onChange: (m: AppMode) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        gap: 0,
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 3,
        backdropFilter: 'blur(12px)',
      }}
    >
      {(['world', 'game'] as AppMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: '6px 14px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            background: mode === m ? 'rgba(99,102,241,0.8)' : 'transparent',
            color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
          }}
        >
          {m === 'world' ? '◎ Agent World' : '⬡ Game'}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>('world');
  const [performanceTier, setPerformanceTier] = useState<'low' | 'medium' | 'high'>('high');
  const [pixelRatio, setPixelRatio] = useState(1);

  useEffect(() => {
    const tier = getPerformanceTier();
    const ratio = getDevicePixelRatio();
    setPerformanceTier(tier);
    setPixelRatio(ratio);
  }, []);

  const shadows = performanceTier !== 'low';
  const antialias = performanceTier === 'high';

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

        <ModeToggle mode={mode} onChange={setMode} />

        {mode === 'world' ? (
          <AgentWorld />
        ) : (
          <KeyboardControls map={controls}>
            <Canvas
              shadows={shadows}
              camera={{ position: [0, 8, 12], fov: 45, near: 0.1, far: 1000 }}
              gl={{
                antialias,
                powerPreference: performanceTier === 'low' ? "low-power" : "high-performance"
              }}
              dpr={pixelRatio}
            >
              <color attach="background" args={["#0a0a0f"]} />
              <Suspense fallback={null}>
                <Game />
              </Suspense>
            </Canvas>

            <ExperienceNotification />
            <FieldResonanceHUD />
            <TraitPanel />
            <DialogueBox />
            <QuestSystem />
            <GameInstructions />
            <GamepadHelpOverlay />
            <TouchControls />
          </KeyboardControls>
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
