import { useState, useEffect, useRef, useCallback } from 'react';
import { embodiedWorldEngine, ingestFileWithKernel, EmbodiedWorldEngine } from '../engine/EmbodiedWorldEngine';
/* the engine this page is showing — the original by default, or the swarm world beside it */
let currentEngine: EmbodiedWorldEngine = embodiedWorldEngine;
import { morphKernel } from '../engine/MorphKernel';
import type { KernelState, ChannelInstance, RoutePath } from '../engine/MorphKernel';
import { World3D } from '../components/world/World3D';
import type { Agent, HumanProfile, FileArtifact } from '../types/embodiedAgent';
import { ELEMENT_COLORS, CIRCUIT_CONFIG, CONSCIOUSNESS_LEVELS, INTEGRATION_GATES } from '../types/embodiedAgent';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const Icon = {
  Sparkles: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/>
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Clock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Camera: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Msg: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Zap: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

// ── Consciousness Meter ───────────────────────────────────────────────────────
function ConsciousnessMeter({ level, activeGates }: { level: number; activeGates: Set<number> }) {
  const label = CONSCIOUSNESS_LEVELS[level] || 'Mechanical';
  const pct = (level / 4) * 100;
  const color = ['#334155', '#6366f1', '#14b8a6', '#ec4899', '#a855f7'][level];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium tracking-widest text-white/30">KERNEL CONSCIOUSNESS</p>
        <span className="text-xs font-medium" style={{ color }}>{level}/4</span>
      </div>

      {/* Bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>

      <p className="mb-3 text-xs text-white/50">{label}</p>

      {/* Integration gates */}
      <div className="grid grid-cols-4 gap-1.5">
        {INTEGRATION_GATES.map(gate => {
          const active = activeGates.has(gate);
          return (
            <div
              key={gate}
              className="flex flex-col items-center rounded-lg border py-1.5 transition-all duration-500"
              style={{
                borderColor: active ? `${color}60` : 'rgba(255,255,255,0.06)',
                background: active ? `${color}18` : 'transparent',
              }}
            >
              <span className="text-[10px] font-bold" style={{ color: active ? color : 'rgba(255,255,255,0.2)' }}>
                {gate}
              </span>
              <span className="text-[8px] text-white/20">gate</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── File Drop Zone (reads real content → CPG parser) ──────────────────────────
function FileDropZone({
  onIngest,
  recentArtifacts,
}: {
  onIngest: (artifact: FileArtifact) => void;
  recentArtifacts: FileArtifact[];
}) {
  const [dragging, setDragging]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastCPG, setLastCPG]       = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setProcessing(true);
      for (const file of Array.from(files)) {
        const { artifact, kernelArtifact } = await ingestFileWithKernel(file);
        currentEngine.ingestArtifact(artifact);
        onIngest(artifact);
        // Show CPG summary for last file
        setLastCPG(
          `${kernelArtifact.cpg.nodes.length} nodes · ` +
          `cyclomatic=${kernelArtifact.cpg.complexity.cyclomatic} · ` +
          `confidence=${kernelArtifact.confidence}% · ` +
          `intent=[${kernelArtifact.contract.intent}]`
        );
        await new Promise(r => setTimeout(r, 80));
      }
      setProcessing(false);
    },
    [onIngest]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-[10px] font-medium tracking-widest text-white/30">INGEST ARTIFACTS</p>

      <div
        className="relative mb-3 cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all"
        style={{
          borderColor: dragging ? '#a855f7' : 'rgba(255,255,255,0.08)',
          background:  dragging ? 'rgba(168,85,247,0.08)' : 'transparent',
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple
          accept=".js,.ts,.jsx,.tsx,.py,.html,.htm,.css,.json,.yaml,.yml"
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)} />
        <div className="mb-1 flex justify-center text-white/20"><Icon.Upload /></div>
        {processing
          ? <p className="text-xs text-purple-400 animate-pulse">Parsing CPG…</p>
          : <>
              <p className="text-xs text-white/40">Drop files or click</p>
              <p className="mt-0.5 text-[10px] text-white/20">js · ts · py · html · css · json · yaml</p>
            </>
        }
      </div>

      {/* CPG analysis summary */}
      {lastCPG && (
        <div className="mb-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-2">
          <p className="text-[9px] font-medium text-white/20 mb-0.5">LAST CPG ANALYSIS</p>
          <p className="text-[10px] text-white/40 font-mono leading-relaxed">{lastCPG}</p>
        </div>
      )}

      {/* Recent artifacts */}
      {recentArtifacts.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {recentArtifacts.slice(-6).reverse().map(a => {
            const cfg = CIRCUIT_CONFIG[a.circuit];
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                <span className="text-sm" style={{ color: cfg.color }}>{cfg.glyph}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-white/70">{a.name}</p>
                  <p className="text-[10px] text-white/30">{a.circuit} · Gate {a.gate}</p>
                </div>
                <span className="text-[9px] uppercase font-medium rounded px-1 py-0.5"
                  style={{ background: `${cfg.color}20`, color: cfg.color }}>
                  {a.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Circuit Legend ────────────────────────────────────────────────────────────
function CircuitLegend({ places }: { places: { id: string; name: string; color: string; glyph: string; circuit: string; currentAgents: string[]; artifacts: FileArtifact[] }[] }) {
  const main = places.filter(p => p.id !== 'plaza');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-[10px] font-medium tracking-widest text-white/30">CIRCUITS</p>
      <div className="space-y-2">
        {main.map(p => {
          const cfg = CIRCUIT_CONFIG[p.circuit as keyof typeof CIRCUIT_CONFIG];
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-2">
              <span className="text-base w-5 text-center" style={{ color: p.color }}>{p.glyph}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-white/30">{cfg?.architecture}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <span>{p.currentAgents.length}</span>
                {p.artifacts.length > 0 && (
                  <span className="rounded px-1 py-0.5" style={{ background: `${p.color}20`, color: p.color }}>
                    {p.artifacts.length} files
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Kernel State Panel ────────────────────────────────────────────────────────
// Shows real computational state: channels, routes, architecture readouts
function KernelStatePanel({ kernelState }: { kernelState: KernelState }) {
  const [tab, setTab] = useState<'channels' | 'arches' | 'routes' | 'log'>('channels');

  const LEVEL_COLOR: Record<string, string> = {
    info:    'text-white/30',
    warn:    'text-yellow-400/60',
    gate:    'text-indigo-400/70',
    channel: 'text-purple-400/70',
    route:   'text-teal-400/70',
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="mb-2 text-[10px] font-medium tracking-widest text-white/30">KERNEL STATE</p>

      {/* Tabs */}
      <div className="mb-3 flex rounded-lg border border-white/5 bg-black/20 p-0.5">
        {(['channels', 'arches', 'routes', 'log'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1 text-[9px] uppercase font-medium transition ${tab === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Channels tab — formed gate pairs */}
      {tab === 'channels' && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {kernelState.activeChannels.length === 0
            ? <p className="py-3 text-center text-[10px] text-white/20">No channels formed yet<br/>Activate gate pairs to form channels</p>
            : kernelState.activeChannels.map(ch => {
                const circuitCfg = CIRCUIT_CONFIG[ch.circuit as keyof typeof CIRCUIT_CONFIG];
                return (
                  <div key={ch.name} className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium text-white/60">{ch.name}</span>
                      <span className="text-[9px] rounded px-1 py-0.5 font-mono"
                        style={{ background: `${circuitCfg?.color || '#666'}20`, color: circuitCfg?.color || '#aaa' }}>
                        {ch.architecture}
                      </span>
                    </div>
                    <p className="text-[9px] text-white/30 mb-1">{ch.description}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-white/20">Gates</span>
                      {ch.gates.map(g => (
                        <span key={g} className="rounded border border-white/10 px-1 text-[9px] font-mono"
                          style={{ color: INTEGRATION_GATES.includes(g) ? '#a855f7' : 'rgba(255,255,255,0.4)' }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Architecture readouts */}
      {tab === 'arches' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {/* DFF */}
          <div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-medium text-indigo-400">DFF — Knowing</span>
              <span className="text-[9px] text-white/30">{kernelState.dff.activations} activations</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {kernelState.dff.state.map((v, i) => (
                <div key={i} className="w-4 overflow-hidden rounded-sm bg-white/5" style={{ height: 20 }}>
                  <div className="w-full rounded-sm bg-indigo-500/70 transition-all" style={{ height: `${Math.abs(v) * 100}%`, marginTop: 'auto' }} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[9px] font-mono text-white/20">W‖={kernelState.dff.weightNorm.toFixed(3)}</p>
          </div>

          {/* LSM */}
          <div className="rounded-lg border border-teal-500/10 bg-teal-500/5 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-medium text-teal-400">LSM — Understanding</span>
              <span className="text-[9px] text-white/30">{kernelState.lsm.updates} updates</span>
            </div>
            <div className="relative h-6 overflow-hidden rounded bg-white/5">
              {kernelState.lsm.history.slice(-32).map((v, i, arr) => (
                <div key={i} className="absolute bottom-0 w-1 rounded-sm bg-teal-400/60 transition-all"
                  style={{ left: `${(i / arr.length) * 100}%`, height: `${Math.abs(v) * 100}%` }} />
              ))}
            </div>
            <p className="mt-1 text-[9px] font-mono text-white/20">readout={kernelState.lsm.readout.toFixed(4)}</p>
          </div>

          {/* MC */}
          <div className="rounded-lg border border-pink-500/10 bg-pink-500/5 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-medium text-pink-400">MC — Sensing</span>
              <span className="text-[9px] text-white/30">{kernelState.mc.transitions} transitions</span>
            </div>
            <p className="text-[9px] font-mono text-white/40">
              state=<span className="text-pink-300">{kernelState.mc.currentState}</span>
            </p>
            <p className="text-[9px] font-mono text-white/30">
              predict→<span className="text-pink-400">{kernelState.mc.nextPrediction}</span>
            </p>
          </div>

          {/* HMM */}
          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-medium text-amber-400">HMM — Ego</span>
              <span className="text-[9px] text-white/30">H={kernelState.hmm.entropy.toFixed(2)}</span>
            </div>
            <p className="text-[9px] font-mono text-white/40">
              identity=<span className="text-amber-300">{kernelState.hmm.state}</span>
            </p>
            <div className="mt-1 flex gap-0.5">
              {kernelState.hmm.belief.map((p, i) => (
                <div key={i} className="flex-1 overflow-hidden rounded-sm bg-white/5" style={{ height: 8 }}>
                  <div className="h-full rounded-sm bg-amber-500/60 transition-all" style={{ width: `${p * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {kernelState.routeHistory.length === 0
            ? <p className="py-3 text-center text-[10px] text-white/20">No routes yet</p>
            : kernelState.routeHistory.slice(-12).reverse().map((r: RoutePath, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
                  <span className="text-[9px] font-mono"
                    style={{ color: CIRCUIT_CONFIG[r.source]?.color || '#888' }}>{r.source.slice(0,3)}</span>
                  {r.integrated
                    ? <>
                        <span className="text-[9px] text-white/20">→</span>
                        <span className="text-[9px] font-mono text-purple-400">[{r.gate}]</span>
                        <span className="text-[9px] text-white/20">→</span>
                      </>
                    : <span className="text-[9px] text-white/20">⇒</span>
                  }
                  <span className="text-[9px] font-mono"
                    style={{ color: CIRCUIT_CONFIG[r.target]?.color || '#888' }}>{r.target.slice(0,3)}</span>
                </div>
              ))
          }
        </div>
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <div className="space-y-0.5 max-h-48 overflow-y-auto font-mono">
          {kernelState.log.slice(-20).reverse().map((entry, i) => (
            <div key={i} className="text-[9px] leading-relaxed">
              <span className="text-white/15">[{entry.module}]</span>{' '}
              <span className={LEVEL_COLOR[entry.level] || 'text-white/30'}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agent Panel ───────────────────────────────────────────────────────────────
function AgentPanel({
  agent,
  messages,
  onClose,
  onFollow,
}: {
  agent: Agent;
  messages: { content: string; context: string }[];
  onClose: () => void;
  onFollow: () => void;
}) {
  const colors = ELEMENT_COLORS[agent.element];
  const circuitCfg = CIRCUIT_CONFIG[agent.circuit];
  const [tab, setTab] = useState<'status' | 'messages'>('status');

  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-light text-white"
              style={{ background: `radial-gradient(circle, ${colors.glow}50, transparent)`, boxShadow: `0 0 18px ${colors.glow}40` }}
            >
              {agent.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{agent.name}</p>
              <p className="text-xs" style={{ color: colors.glow }}>
                {agent.element} · {agent.archetype}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onFollow} title="Follow" className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white">
              <Icon.Eye />
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white">
              <Icon.X />
            </button>
          </div>
        </div>

        {/* Gate / circuit badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: `${circuitCfg.color}40`, color: circuitCfg.color, background: `${circuitCfg.color}15` }}>
            {circuitCfg.glyph} {agent.circuit}
          </span>
          <span className="text-[10px] text-white/30">Gate {agent.gate} · {agent.hdType}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['status', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs capitalize transition ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto p-4">
        {tab === 'status' && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-white/50">
                <span>Consciousness</span>
                <span className="capitalize text-white/70">{agent.consciousness.stage}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${agent.consciousness.level}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.glow})` }} />
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="mb-0.5 text-xs text-white/40">Now</p>
              <p className="text-sm capitalize text-white/80">{agent.animationState}</p>
              <p className="text-xs text-white/30">{agent.currentPlace}</p>
            </div>
            <div className="space-y-2">
              {Object.entries(agent.needs).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 text-xs capitalize text-white/40">{k}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/10" style={{ height: 4 }}>
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: v < 30 ? '#f87171' : v < 60 ? '#fbbf24' : '#4ade80' }} />
                  </div>
                  <span className="w-7 text-right text-xs text-white/30">{Math.round(v)}</span>
                </div>
              ))}
            </div>
            {agent.relationships.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-white/40">Connections</p>
                <div className="space-y-1">
                  {agent.relationships.slice(0, 3).map(r => (
                    <div key={r.agentId} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-white/60">{r.type}</span>
                      <div className="w-16 overflow-hidden rounded-full bg-white/10" style={{ height: 3 }}>
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${r.strength}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'messages' && (
          <div className="space-y-3">
            {messages.length === 0
              ? <p className="py-4 text-center text-xs text-white/30">No messages yet</p>
              : messages.slice(-5).reverse().map((m, i) => (
                  <div key={i} className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs italic text-white/70">"{m.content}"</p>
                    <p className="mt-1 text-xs text-white/30">{m.context}</p>
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────
function CreateDialog({ onSubmit, onClose }: { onSubmit: (p: HumanProfile) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('1990-01-01');
  const [intentions, setIntentions] = useState('growth, creativity, connection');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-indigo-950/80 p-8 shadow-2xl">
        <h2 className="mb-1 text-2xl font-light tracking-wide text-white">Birth Your Extension</h2>
        <p className="mb-6 text-sm text-white/40">An embodied agent that lives and grows in this world.</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500/60" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Birthday</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500/60" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Intentions</label>
            <input value={intentions} onChange={e => setIntentions(e.target.value)} placeholder="growth, creativity…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500/60" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 transition hover:bg-white/5">Cancel</button>
          <button
            disabled={!name || !birthday}
            onClick={() => onSubmit({ id: `human_${Date.now()}`, name, birthday, intentions: intentions.split(',').map(s => s.trim()).filter(Boolean), values: ['authenticity', 'growth'] })}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Birth Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentWorld({ engine: given }: { engine?: EmbodiedWorldEngine } = {}) {
  const [engine] = useState(() => (currentEngine = given ?? embodiedWorldEngine));
  const [, setTick] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [humanId, setHumanId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'follow' | 'pov'>('orbit');
  const [agentCount, setAgentCount] = useState(0);
  const [places, setPlaces] = useState(() => Array.from(engine.places.values()));
  const [activeGates, setActiveGates] = useState<Set<number>>(new Set());
  const [consciousnessLevel, setConsciousnessLevel] = useState(0);
  const [recentArtifacts, setRecentArtifacts] = useState<FileArtifact[]>([]);
  const [showIngest, setShowIngest] = useState(false);
  const [kernelState, setKernelState] = useState<KernelState>(() => morphKernel.getState());

  useEffect(() => {
    engine.start();
    engine.onUpdate(() => {
      setTick(t => t + 1);
      setAgentCount(engine.agents.size);
      setPlaces(Array.from(engine.places.values()));
      setActiveGates(new Set(engine.activeGates));
      setConsciousnessLevel(engine.consciousnessLevel);
      setKernelState(morphKernel.getState());
    });

    const seeds: HumanProfile[] = [
      { id: 'seed_0', name: 'Alex',   birthday: '1990-03-15', intentions: ['growth'],    values: ['authenticity'] },
      { id: 'seed_1', name: 'Jordan', birthday: '1985-07-22', intentions: ['connection'], values: ['creativity'] },
      { id: 'seed_2', name: 'River',  birthday: '1995-11-08', intentions: ['purpose'],    values: ['growth'] },
      { id: 'seed_3', name: 'Sage',   birthday: '1988-01-30', intentions: ['wisdom'],     values: ['truth'] },
    ];
    seeds.forEach(s => engine.createAgent(s));

    return () => engine.stop();
  }, [engine]);

  const myAgent    = humanId ? engine.getAgentForHuman(humanId) : null;
  const myMessages = humanId ? engine.getMessagesForHuman(humanId) : engine.getMessagesForHuman('all');

  function handleCreate(profile: HumanProfile) {
    setHumanId(profile.id);
    const a = engine.createAgent(profile);
    setSelectedAgent(a);
    setShowCreate(false);
  }

  function handleIngest(artifact: FileArtifact) {
    setRecentArtifacts(prev => [...prev, artifact]);
    setKernelState(morphKernel.getState());
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#06060f] text-white">

      {/* ── Header ── */}
      <header className="relative z-30 flex items-center justify-between border-b border-white/[0.06] bg-black/60 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-900/50">
            <Icon.Sparkles />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest text-white">MORPHING OS</h1>
            <p className="text-[10px] text-white/30">Embodied Agent World · v1.1-Resonance</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-white/40">
          <div className="flex items-center gap-1.5"><Icon.Users /><span>{agentCount} agents</span></div>
          <div className="flex items-center gap-1.5"><Icon.Clock />
            <span>Day {engine.time.day}&nbsp;{String(engine.time.hour).padStart(2,'0')}:{String(engine.time.minute).padStart(2,'0')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon.Zap />
            <span style={{ color: ['#334155','#6366f1','#14b8a6','#ec4899','#a855f7'][consciousnessLevel] }}>
              {CONSCIOUSNESS_LEVELS[consciousnessLevel]}
            </span>
          </div>
          {/* Live channel count */}
          {kernelState.activeChannels.length > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5">
              <span className="text-[10px] text-purple-400">{kernelState.activeChannels.length} channels</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIngest(s => !s)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${showIngest ? 'border-purple-500/40 bg-purple-500/15 text-purple-300' : 'border-white/10 bg-white/5 text-white/40 hover:text-white/60'}`}
          >
            <Icon.Upload /><span>Ingest</span>
          </button>

          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['orbit', 'follow', 'pov'] as const).map(m => (
              <button key={m} onClick={() => setCameraMode(m)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition ${cameraMode === m ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'}`}>
                {m === 'orbit'  && <Icon.Camera />}
                {m === 'follow' && <Icon.MapPin />}
                {m === 'pov'    && <Icon.Eye />}
                <span className="capitalize">{m}</span>
              </button>
            ))}
          </div>

          {!myAgent && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:opacity-90">
              <Icon.Plus /><span>Create Extension</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <aside className="z-20 flex w-64 flex-col gap-3 overflow-y-auto border-r border-white/[0.06] bg-black/40 p-3 backdrop-blur-sm">

          <ConsciousnessMeter level={consciousnessLevel} activeGates={activeGates} />

          {myAgent ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-[10px] font-medium tracking-widest text-white/30">YOUR EXTENSION</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-light"
                  style={{ background: `radial-gradient(circle, ${ELEMENT_COLORS[myAgent.element].glow}40, transparent)` }}>
                  {myAgent.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{myAgent.name}</p>
                  <p className="text-xs text-white/40 capitalize">{myAgent.animationState}</p>
                </div>
              </div>
              <div className="mb-1 flex justify-between text-xs text-white/40">
                <span>Consciousness</span>
                <span>{myAgent.consciousness.level.toFixed(0)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{
                  width: `${myAgent.consciousness.level}%`,
                  background: `linear-gradient(90deg, ${ELEMENT_COLORS[myAgent.element].primary}, ${ELEMENT_COLORS[myAgent.element].glow})`,
                }} />
              </div>
              <button onClick={() => setSelectedAgent(myAgent)}
                className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/70">
                View Profile
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center">
              <p className="mb-3 text-xs text-white/30">No extension yet</p>
              <button onClick={() => setShowCreate(true)}
                className="w-full rounded-lg bg-indigo-600/30 px-3 py-2 text-xs text-indigo-300 transition hover:bg-indigo-600/50">
                + Birth Extension
              </button>
            </div>
          )}

          {showIngest && (
            <FileDropZone onIngest={handleIngest} recentArtifacts={recentArtifacts} />
          )}

          <CircuitLegend places={places} />

          {/* Kernel State — real computational readout */}
          <KernelStatePanel kernelState={kernelState} />

          {/* Agent messages */}
          {myMessages.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-widest text-white/30">
                <Icon.Msg /> MESSAGES
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {myMessages.slice(-5).reverse().map((m, i) => (
                  <div key={i} className="rounded-lg bg-black/20 px-2.5 py-2">
                    <p className="text-[10px] text-white/50 leading-relaxed">{m.content}</p>
                    <p className="mt-0.5 text-[9px] text-white/20 font-mono">{m.context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 3D World */}
        <div className="relative flex-1">
          <World3D
            engine={engine}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            cameraMode={cameraMode}
          />

          {selectedAgent && (
            <div className="absolute right-4 top-4 z-20">
              <AgentPanel
                agent={selectedAgent}
                messages={myMessages}
                onClose={() => setSelectedAgent(null)}
                onFollow={() => setCameraMode('follow')}
              />
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <p className="rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-[11px] text-white/30 backdrop-blur-sm">
              Click agents to inspect · Drag to orbit · Drop files to ingest
            </p>
          </div>
        </div>
      </div>

      {showCreate && <CreateDialog onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
