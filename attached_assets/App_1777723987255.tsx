/**
 * EMBODIED AGENTS - 3D WORLD
 * Watch your human extensions walk, talk, and live
 */

import { useState, useEffect } from 'react';
import { embodiedWorldEngine } from '@/engine/EmbodiedWorldEngine';
import { World3D } from '@/components/World3D';
import type { Agent, HumanProfile, AgentMessage } from '@/types/embodiedAgent';
import { ELEMENT_COLORS } from '@/types/embodiedAgent';

import { 
  Sparkles, 
  Users, 
  Clock,
  Plus,
  X,
  MessageCircle,
  Camera,
  Eye,
  MapPin,
  Heart,
  Zap,
  Brain,
  Moon
} from 'lucide-react';

// ============================================================================
// CREATE AGENT DIALOG
// ============================================================================

function CreateAgentDialog({ 
  isOpen, 
  onSubmit, 
  onClose 
}: { 
  isOpen: boolean;
  onSubmit: (profile: HumanProfile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [intentions, setIntentions] = useState('');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl border border-white/20 p-8">
        <h2 className="text-2xl font-light text-white mb-2">Birth Your Extension</h2>
        <p className="text-white/60 mb-6">
          Create an embodied agent that will walk, learn, and grow in this world.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40"
            />
          </div>
          
          <div>
            <label className="text-sm text-white/60 mb-1 block">Birthday</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
            />
          </div>
          
          <div>
            <label className="text-sm text-white/60 mb-1 block">Intentions (comma separated)</label>
            <input
              type="text"
              value={intentions}
              onChange={(e) => setIntentions(e.target.value)}
              placeholder="growth, creativity, connection..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-white/60 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name && birthday) {
                onSubmit({
                  id: `human_${Date.now()}`,
                  name,
                  birthday,
                  intentions: intentions.split(',').map(s => s.trim()).filter(Boolean),
                  values: ['authenticity', 'growth', 'connection']
                });
              }
            }}
            disabled={!name || !birthday}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Birth Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT PANEL
// ============================================================================

function AgentPanel({ 
  agent, 
  messages,
  onClose,
  onFollow
}: { 
  agent: Agent;
  messages: AgentMessage[];
  onClose: () => void;
  onFollow: () => void;
}) {
  const colors = ELEMENT_COLORS[agent.element];
  const [activeTab, setActiveTab] = useState<'status' | 'messages'>('status');
  
  return (
    <div className="w-80 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ 
                background: `radial-gradient(circle, ${colors.glow}40, transparent)`,
                boxShadow: `0 0 20px ${colors.glow}40`
              }}
            >
              <span className="text-xl">{agent.name[0]}</span>
            </div>
            <div>
              <h3 className="font-medium text-white">{agent.name}</h3>
              <p className="text-xs" style={{ color: colors.glow }}>
                {agent.element} {agent.archetype}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={onFollow}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
              title="Follow agent"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
          <span className="capitalize">{agent.lifeStage}</span>
          <span>•</span>
          <span>{agent.age} days</span>
          <span>•</span>
          <span>{agent.hdType}</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['status', 'messages'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm capitalize transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Consciousness */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white/60 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Consciousness
                </span>
                <span className="text-white/80 capitalize">{agent.consciousness.stage}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${agent.consciousness.level}%`,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.glow})`
                  }}
                />
              </div>
            </div>
            
            {/* Current state */}
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">Currently</p>
              <p className="text-sm text-white/80 capitalize flex items-center gap-2">
                {agent.animationState === 'walking' && <Zap className="w-4 h-4" />}
                {agent.animationState === 'talking' && <MessageCircle className="w-4 h-4" />}
                {agent.animationState === 'meditating' && <Moon className="w-4 h-4" />}
                {agent.animationState}
              </p>
              <p className="text-xs text-white/40 mt-1">
                at {agent.currentPlace}
              </p>
            </div>
            
            {/* Needs */}
            <div className="space-y-2">
              <p className="text-sm text-white/60 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Needs
              </p>
              {Object.entries(agent.needs).map(([need, value]) => (
                <div key={need} className="flex items-center gap-2">
                  <span className="text-xs text-white/50 w-16 capitalize">{need}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        value < 30 ? 'bg-red-400' : value < 60 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-8">{value.toFixed(0)}</span>
                </div>
              ))}
            </div>
            
            {/* Relationships */}
            {agent.relationships.length > 0 && (
              <div>
                <p className="text-sm text-white/60 mb-2">Relationships</p>
                <div className="space-y-1">
                  {agent.relationships.slice(0, 3).map(rel => (
                    <div key={rel.agentId} className="flex items-center justify-between text-xs">
                      <span className="text-white/70 capitalize">{rel.type}</span>
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${rel.strength}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">
                No messages yet
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/80 italic">"{msg.content}"</p>
                  <p className="text-xs text-white/40 mt-1">{msg.context}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [engine] = useState(() => embodiedWorldEngine);
  const [, setTick] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentHuman, setCurrentHuman] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'follow' | 'pov'>('orbit');
  const [agentCount, setAgentCount] = useState(0);
  
  // Start engine
  useEffect(() => {
    engine.start();
    
    engine.onUpdate(() => {
      setTick(t => t + 1); // Force re-render
      setAgentCount(engine.agents.size);
    });
    
    // Create some initial agents
    for (let i = 0; i < 3; i++) {
      engine.createAgent({
        id: `human_init_${i}`,
        name: ['Alex', 'Jordan', 'Taylor'][i],
        birthday: `199${i}-0${i + 1}-15`,
        intentions: ['growth', 'connection'],
        values: ['authenticity']
      });
    }
    
    return () => engine.stop();
  }, [engine]);
  
  const handleCreateAgent = (profile: HumanProfile) => {
    setCurrentHuman(profile.id);
    const agent = engine.createAgent(profile);
    setSelectedAgent(agent);
    setShowCreate(false);
  };
  
  const myAgent = currentHuman ? engine.getAgentForHuman(currentHuman) : null;
  const myMessages = currentHuman ? engine.getMessagesForHuman(currentHuman) : [];
  
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-wider">EMBODIED AGENTS</h1>
              <p className="text-xs text-white/40">Your extensions in 3D space</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-white/50" />
              <span className="text-white/70">{agentCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-white/50" />
              <span className="text-white/70">
                Day {engine.time.day} • {engine.time.hour.toString().padStart(2, '0')}:{engine.time.minute.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Camera mode toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              {(['orbit', 'follow', 'pov'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  className={`px-3 py-1.5 rounded text-xs capitalize transition-colors ${
                    cameraMode === mode ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {mode === 'orbit' && <Camera className="w-3 h-3 inline mr-1" />}
                  {mode === 'follow' && <MapPin className="w-3 h-3 inline mr-1" />}
                  {mode === 'pov' && <Eye className="w-3 h-3 inline mr-1" />}
                  {mode}
                </button>
              ))}
            </div>
            
            {!myAgent && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Extension
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="pt-16 h-screen">
        <div className="relative h-full">
          {/* 3D World */}
          <World3D
            engine={engine}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            cameraMode={cameraMode}
          />
          
          {/* UI Overlay */}
          <div className="absolute top-4 left-4 right-4 bottom-4 pointer-events-none flex justify-between">
            {/* Left panel - My Agent */}
            <div className="pointer-events-auto w-64 space-y-3">
              {myAgent && (
                <div className="p-4 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ 
                        background: `radial-gradient(circle, ${ELEMENT_COLORS[myAgent.element].glow}40, transparent)`
                      }}
                    >
                      {myAgent.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{myAgent.name}</h3>
                      <p className="text-xs text-white/50">Your extension</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Consciousness</span>
                      <span className="text-white/70">{myAgent.consciousness.stage}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${myAgent.consciousness.level}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Current</span>
                      <span className="text-white/70 capitalize">{myAgent.animationState}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedAgent(myAgent)}
                    className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              )}
              
              {/* Recent Messages */}
              {myMessages.length > 0 && (
                <div className="p-3 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10">
                  <h4 className="text-xs font-medium text-white/70 mb-2 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    Messages
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {myMessages.slice(-2).reverse().map((msg, i) => (
                      <div key={i} className="text-xs text-white/70 italic">
                        "{msg.content}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right panel - Selected Agent */}
            <div className="pointer-events-auto">
              {selectedAgent && (
                <AgentPanel
                  agent={selectedAgent}
                  messages={myMessages}
                  onClose={() => setSelectedAgent(null)}
                  onFollow={() => {
                    setCameraMode('follow');
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-xs text-white/50">
            <p>Click agents to select • Drag to rotate • Scroll to zoom</p>
          </div>
        </div>
      </main>
      
      {/* Create Agent Dialog */}
      <CreateAgentDialog
        isOpen={showCreate}
        onSubmit={handleCreateAgent}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}

export default App;
