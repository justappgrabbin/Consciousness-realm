import { embodiedWorldEngine } from './EmbodiedWorldEngine';
import { createHabitat, occupancyCondition } from './littleMiraclesHabitat.mjs';

// Trusted native descendant factory must be supplied by the verified swarm runtime.
// This connects only once per invocation; call from an explicit integration entry point.
export function attachLittleMiraclesHabitat(instantiate: (genome: unknown) => { run(snapshot: unknown): unknown }) {
  const habitat = createHabitat(embodiedWorldEngine, { instantiate, conditions: [occupancyCondition()] });
  let active = true;
  embodiedWorldEngine.onUpdate(() => { if (active) habitat.tick(); });
  return { habitat, disconnect: () => { active = false; } };
}
