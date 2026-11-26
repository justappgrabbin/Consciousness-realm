export interface HabitatSnapshot {
  time: unknown; activeGates: number[]; consciousnessLevel: number;
  agents: Array<{id: string; currentPlace: string; [key: string]: unknown}>;
  places: Array<{id: string; artifactIds?: string[]}>;
}
export interface HostCondition {
  id: string; description: string; output: string;
  challenges?: unknown[];
  verify(snapshot: HabitatSnapshot, result: unknown): boolean;
}
export function occupancyCondition(): HostCondition;
export function createHabitat(engine: unknown, options: {
  instantiate(genome: unknown): {run(snapshot: unknown): unknown};
  conditions: HostCondition[];
}): {
  enter(id: string): {
    observe(): HabitatSnapshot;
    conditions(): Array<{id: string; description: string; output: string}>;
    settle(candidate: {conditionId: string; descendantId: string; genome: unknown}): {descendantId: string; conditionId: string; verifiedSamples: number};
    extract(): {swarmId: string; descendants: string[]};
  };
  observe(): HabitatSnapshot;
  tick(): Array<{id: string; ok: boolean; result?: unknown; error?: string}>;
  results(): Array<{id: string; ok: boolean; result?: unknown; error?: string}>;
  residentIds(): string[];
};
