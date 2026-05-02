import { useState, useEffect } from 'react';
import { embodiedWorldEngine } from '../engine/EmbodiedWorldEngine';
import { World3D } from '../components/world/World3D';
import type { Agent, HumanProfile } from '../types/embodiedAgent';
import { ELEMENT_COLORS, PLACE_CONFIGS } from '../types/embodiedAgent';

// ── Icons (inline SVG to avoid adding deps) ──────────────────────────────────

const Icon = {
  Sparkles: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/>
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z"/>
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
};

// ── Create Agent Dialog ───────────────────────────────────────────────────────

function CreateDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (p: HumanProfile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('1990-01-01');
  const [intentions, setIntentions] = useState('growth, creativity, connection');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-indigo-950/80 p-8 shadow-2xl">
        <h2 className="mb-1 text-2xl font-light tracking-wide text-white">
          Birth Your Extension
        </h2>
        <p className="mb-6 text-sm text-white/40">
          Create an embodied agent that lives and grows in this world.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Your Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Birthday</label>
            <input
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Intentions</label>
            <input
              value={intentions}
              onChange={e => setIntentions(e.target.value)}
              placeholder="growth, creativity..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            disabled={!name || !birthday}
            onClick={() =>
              onSubmit({
                id: `human_${Date.now()}`,
                name,
                birthday,
                intentions: intentions.split(',').map(s => s.trim()).filter(Boolean),
                values: ['authenticity', 'growth'],
              })
            }
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Birth Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agent Side Panel ──────────────────────────────────────────────────────────

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
        <p className="mt-2 text-xs text-white/30">
          {agent.lifeStage} · day {agent.age} · {agent.hdType}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['status', 'messages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs capitalize transition ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto p-4">
        {tab === 'status' && (
          <div className="space-y-4">
            {/* Consciousness */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-white/50">
                <span>Consciousness</span>
                <span className="capitalize text-white/70">{agent.consciousness.stage}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${agent.consciousness.level}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.glow})` }}
                />
              </div>
            </div>

            {/* Current state */}
            <div className="rounded-xl bg-white/5 p-3">
              <p className="mb-0.5 text-xs text-white/40">Now</p>
              <p className="text-sm capitalize text-white/80">{agent.animationState}</p>
              <p className="text-xs text-white/30">{agent.currentPlace.replace('_', ' ')}</p>
            </div>

            {/* Needs */}
            <div className="space-y-2">
              {Object.entries(agent.needs).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 text-xs capitalize text-white/40">{k}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/10" style={{ height: 4 }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${v}%`,
                        background: v < 30 ? '#f87171' : v < 60 ? '#fbbf24' : '#4ade80',
                      }}
                    />
                  </div>
                  <span className="w-7 text-right text-xs text-white/30">{Math.round(v)}</span>
                </div>
              ))}
            </div>

            {/* Relationships */}
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
            {messages.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30">No messages yet</p>
            ) : (
              messages.slice(-5).reverse().map((m, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs italic text-white/70">"{m.content}"</p>
                  <p className="mt-1 text-xs text-white/30">{m.context}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product Zone Legend ───────────────────────────────────────────────────────

function ProductLegend({ places }: { places: { id: string; name: string; color: string; currentAgents: string[]; productTag?: string }[] }) {
  const products = places.filter(p => p.productTag);
  return (
    <div className="space-y-2">
      <p className="mb-2 text-xs font-medium tracking-widest text-white/30">PRODUCTS</p>
      {products.map(p => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
            <span className="text-xs text-white/70">{p.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">{p.currentAgents.length} agents</span>
            {p.productTag && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: `${p.color}25`, color: p.color }}
              >
                {p.productTag}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentWorld() {
  const [engine] = useState(() => embodiedWorldEngine);
  const [, setTick] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [humanId, setHumanId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'follow' | 'pov'>('orbit');
  const [agentCount, setAgentCount] = useState(0);
  const [places, setPlaces] = useState(() => Array.from(embodiedWorldEngine.places.values()));

  useEffect(() => {
    engine.start();
    engine.onUpdate(() => {
      setTick(t => t + 1);
      setAgentCount(engine.agents.size);
      setPlaces(Array.from(engine.places.values()));
    });

    // Spawn 4 ambient agents
    const seeds: HumanProfile[] = [
      { id: 'seed_0', name: 'Alex',   birthday: '1990-03-15', intentions: ['growth'], values: ['authenticity'] },
      { id: 'seed_1', name: 'Jordan', birthday: '1985-07-22', intentions: ['connection'], values: ['creativity'] },
      { id: 'seed_2', name: 'River',  birthday: '1995-11-08', intentions: ['purpose'], values: ['growth'] },
      { id: 'seed_3', name: 'Sage',   birthday: '1988-01-30', intentions: ['wisdom'], values: ['truth'] },
    ];
    seeds.forEach(s => engine.createAgent(s));

    return () => engine.stop();
  }, [engine]);

  const myAgent   = humanId ? engine.getAgentForHuman(humanId) : null;
  const myMessages = humanId ? engine.getMessagesForHuman(humanId) : [];

  function handleCreate(profile: HumanProfile) {
    setHumanId(profile.id);
    const a = engine.createAgent(profile);
    setSelectedAgent(a);
    setShowCreate(false);
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#06060f] text-white">

      {/* ── Top Header ── */}
      <header className="relative z-30 flex items-center justify-between border-b border-white/[0.06] bg-black/60 px-6 py-3 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-900/50">
            <Icon.Sparkles />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest text-white">MORPHING OS</h1>
            <p className="text-[10px] text-white/30">Embodied Agent World</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Icon.Users />
            <span>{agentCount} agents</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon.Clock />
            <span>
              Day {engine.time.day} &nbsp;
              {String(engine.time.hour).padStart(2, '0')}:{String(engine.time.minute).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Camera mode */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['orbit', 'follow', 'pov'] as const).map(m => (
              <button
                key={m}
                onClick={() => setCameraMode(m)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition ${
                  cameraMode === m ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {m === 'orbit'  && <Icon.Camera />}
                {m === 'follow' && <Icon.MapPin />}
                {m === 'pov'    && <Icon.Eye />}
                <span className="capitalize">{m}</span>
              </button>
            ))}
          </div>

          {!myAgent && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:opacity-90"
            >
              <Icon.Plus />
              Create Extension
            </button>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + 3D world ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <aside className="z-20 flex w-64 flex-col gap-4 overflow-y-auto border-r border-white/[0.06] bg-black/40 p-4 backdrop-blur-sm">

          {/* My Agent Card */}
          {myAgent ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-[10px] font-medium tracking-widest text-white/30">YOUR EXTENSION</p>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-base font-light"
                  style={{ background: `radial-gradient(circle, ${ELEMENT_COLORS[myAgent.element].glow}40, transparent)` }}
                >
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
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${myAgent.consciousness.level}%`,
                    background: `linear-gradient(90deg, ${ELEMENT_COLORS[myAgent.element].primary}, ${ELEMENT_COLORS[myAgent.element].glow})`,
                  }}
                />
              </div>
              <button
                onClick={() => setSelectedAgent(myAgent)}
                className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/70"
              >
                View Profile
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center">
              <p className="mb-3 text-xs text-white/30">No extension yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="w-full rounded-lg bg-indigo-600/30 px-3 py-2 text-xs text-indigo-300 transition hover:bg-indigo-600/50"
              >
                + Birth Extension
              </button>
            </div>
          )}

          {/* Messages */}
          {myMessages.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-widest text-white/30">
                <Icon.Msg /> MESSAGES
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {myMessages.slice(-3).reverse().map((m, i) => (
                  <p key={i} className="text-xs italic text-white/60 leading-relaxed">
                    "{m.content}"
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Product Legend */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <ProductLegend places={places} />
          </div>

          {/* World legend */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-[10px] font-medium tracking-widest text-white/30">ZONES</p>
            <div className="space-y-1.5">
              {places.filter(p => !p.productTag).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-white/50">{p.name}</span>
                  </div>
                  <span className="text-white/25">{p.currentAgents.length}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 3D World */}
        <div className="relative flex-1">
          <World3D
            engine={engine}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            cameraMode={cameraMode}
          />

          {/* Agent Panel (right) */}
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

          {/* Bottom hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <p className="rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-[11px] text-white/30 backdrop-blur-sm">
              Click agents to inspect &nbsp;·&nbsp; Drag to orbit &nbsp;·&nbsp; Scroll to zoom
            </p>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreate && <CreateDialog onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
