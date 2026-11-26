# Swarm World (beside the original)
A third mode, "✦ Swarm World", next to Agent World and Game. The original world and engine are untouched.
- client/src/engine/SwarmWorldEngine.ts — subclass of EmbodiedWorldEngine; each agent's mind is the Synthia swarm:
  real four charts from birth data (date, optional time + IANA zone; seeds use 12:00 UTC), real Personality Sun gate,
  type read by the swarm's trained net (Body/tropical chart), and where it goes = needs it meets + rule-book connection
  kinds with whoever is there. Every choice is logged in engine.hypotheses (the experiment's record).
- client/public/swarm/ — the slim swarm (plain ES modules, loaded at runtime, not bundled).
- Small edits: App.tsx (third mode + loader), pages/AgentWorld.tsx (takes an optional engine prop; default unchanged).
Build: npm install && npx vite build (verified), or npm run dev.
