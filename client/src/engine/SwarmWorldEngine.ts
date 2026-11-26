/**
 * SwarmWorldEngine.ts — the same embodied world, placed BESIDE the original (user, Nov 24: "put it beside itself").
 * EmbodiedWorldEngine is untouched. This subclass gives each agent a mind made from the Synthia swarm
 * (client/public/swarm, plain ES modules loaded at runtime):
 *   · four real charts from the person's birth data (charts.js: Draconic mean/true, Tropical, Sidereal)
 *   · its gate = the real Personality Sun gate (not a hash of the birthday)
 *   · its type = what the swarm's trained five-dimension net reads from the Body (tropical) chart
 *   · where it goes = which activity meets its lowest needs AND who is already there:
 *     the rule book's connection kinds between this agent's gates and theirs (electromagnetic / companionship draw,
 *     dominance / compromise are noted). Every choice is logged as a hypothesis for the experiment.
 */
import { EmbodiedWorldEngine } from './EmbodiedWorldEngine';
import { morphKernel, type CircuitType } from './MorphKernel';
import { CIRCUIT_CONFIG } from '../types/embodiedAgent';
import type { Agent, HumanProfile } from '../types/embodiedAgent';

const BASE = '/swarm/';
const load = (p: string) => import(/* @vite-ignore */ BASE + p);

const EFFECTS: Record<string, Partial<Record<string, number>>> = {
  resting: { energy: 0.8, rest: 1.5 }, meditating: { energy: 0.3, purpose: 0.8, rest: 0.8 }, reading: { growth: 1.2, energy: -0.2 },
  creating: { growth: 1.5, purpose: 0.8, energy: -0.5 }, socializing: { connection: 1.5, energy: -0.3 }, exploring: { growth: 0.8, energy: -0.4 },
  learning: { growth: 1.2, energy: -0.3 }, working: { purpose: 0.6, energy: -0.5 }, dreaming: { rest: 0.8, purpose: 0.4 },
};
const PULL: Record<string, number> = { electromagnetic: 2, companionship: 1.5, compromise: 0.5, dominance: 0.25 };

export interface SwarmMind { charts: any; gates: number[]; type: string; typeVotes: Record<string, number>; birth: { date: string; time: string; zone: string } }
export interface Hypothesis { t: number; agent: string; place: string; activity: string; because: string[]; }

export class SwarmWorldEngine extends EmbodiedWorldEngine {
  M: any = null; capacityResident: ((place: any, agent: Agent) => boolean) | null = null;
  littleMiracles: any = null; capacityReceipt: any = null;
  minds = new Map<string, SwarmMind>(); hypotheses: Hypothesis[] = [];

  static async create() {
    const e = new SwarmWorldEngine();
    const [charts, rules, model, habitat] = await Promise.all([load('charts.js'), load('resonance_rules.js'), load('swarm_model.js'), load('realm-capacity.js')]);
    e.littleMiracles = habitat.createRealmOrganism();
    const grown = habitat.growCapacityResident(e.littleMiracles);
    e.capacityResident = grown.resident; e.capacityReceipt = grown.report;
    await rules.loadRules(new URL(BASE + 'bhantugh_rules.json', location.href));
    const NN = new model.SwarmModel(await (await fetch(BASE + 'trained_swarm.json')).json());
    e.M = { charts, rules, model, NN };
    (e as any).decideNextAction = (a: Agent) => e.swarmDecide(a);   // the swarm decides; the rest of the world is the original
    return e;
  }

  createAgent(human: HumanProfile & { time?: string; zone?: string }): Agent {
    const agent = super.createAgent(human);
    if (!this.M) return agent;
    const birth = { date: human.birthday, time: human.time ?? '12:00', zone: human.zone ?? 'UTC' };
    const C = this.M.charts.fourCharts(birth);
    const being = C.charts.Being.addresses, gates = [...new Set(Object.values(C.charts).flatMap((c: any) => c.addresses.map((a: any) => a.gate)))] as number[];
    // the net reads the Body (tropical) chart's 26 units
    const g = this.M.model.buildGraph(being, 8), { X } = this.M.NN.inputs(g.A, g.D, being.map((a: any) => a.gate)), out = this.M.NN.forward(g.W, X);
    const votes: Record<string, number> = {}; for (const k of out.pred) { const t = this.M.NN.types[k]; votes[t] = (votes[t] ?? 0) + 1; }
    const type = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    agent.gate = being[0].gate;   // real Personality Sun gate
    morphKernel.activateAgentGate(agent.gate, human.name);
    const circ = (Object.entries(CIRCUIT_CONFIG).find(([, c]) => c.gates.includes(agent.gate))?.[0] ?? 'integration') as CircuitType;
    agent.circuit = circ;
    if (['Generator', 'Manifestor', 'Projector', 'Reflector'].includes(type)) agent.hdType = type as Agent['hdType'];
    else if (type === 'Manifesting Generator') agent.hdType = 'Generator';
    this.minds.set(agent.id, { charts: C, gates, type, typeVotes: votes, birth });
    return agent;
  }

  /** what draws this agent to a place: needs it would meet + the connection kinds with whoever is there */
  private swarmDecide(agent: Agent) {
    const me = this.minds.get(agent.id); if (!me) return;
    const needs = agent.needs, places = Array.from(this.places.values()).filter(p => this.capacityResident!(p, agent));
    let best: any = null;
    for (const p of places) for (const act of p.activities) {
      const fx = EFFECTS[act] ?? {}, relief = Object.entries(fx).reduce((s, [k, v]) => s + (v ?? 0) * (100 - (needs[k] ?? 50)) / 50, 0);
      let pull = 0; const why: string[] = [];
      for (const id of p.currentAgents) { if (id === agent.id) continue; const o = this.minds.get(id); if (!o) continue;
        const cs = this.M.rules.connectionsOf(me.gates, o.gates);
        for (const c of cs) { pull += PULL[c.kind] ?? 0; }
        const em = cs.filter((c: any) => c.kind === 'electromagnetic').map((c: any) => c.channel);
        if (em.length) why.push(`electromagnetic with ${this.agents.get(id)?.name} on ${em.slice(0, 3).join(', ')}`); }
      const score = relief + Math.min(1.5, 0.04 * pull) + Math.random() * 0.6;   // needs first, company second, a little exploration
      if (!best || score > best.score) best = { p, act, score, why: [`meets ${Object.keys(fx).filter(k => (fx as any)[k] > 0).join('+')}`, ...why] };
    }
    if (!best) return;
    agent.currentActivity = best.act as any;
    if (best.p.id !== agent.currentPlace) { morphKernel.routeAgent(agent.currentPlace as CircuitType, best.p.circuit as CircuitType); (this as any).moveAgentToPlace(agent, best.p.id); }
    this.hypotheses.push({ t: Date.now(), agent: agent.name, place: best.p.name, activity: best.act, because: best.why });
    if (this.hypotheses.length > 500) this.hypotheses.splice(0, 250);
    if (best.why.length > 1 && Math.random() < 0.3)
      (this as any).addMessage({ id: `msg_${Date.now()}_${agent.id}`, timestamp: Date.now(), fromAgent: agent.name, toHuman: 'all',
        content: `${best.act} at ${best.p.name}`, context: best.why.slice(1).join(' · ') });
  }
}
