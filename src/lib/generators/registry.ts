import type { GeneratorAdapter } from "./adapter";
import { StubAdapter } from "./stub-adapter";
import { RealAdapter } from "./real-adapter";

// ─────────────────────────────────────────────────────────────────────────────
// The router. New model drops next month → add an adapter here; the film's
// memory and look are untouched. Selection is by GENERATOR_BACKEND env.
// ─────────────────────────────────────────────────────────────────────────────

const adapters: Record<string, GeneratorAdapter> = {
  stub: new StubAdapter(),
  real: new RealAdapter(),
};

export function getGenerator(): GeneratorAdapter {
  const choice = process.env.GENERATOR_BACKEND ?? "stub";
  return adapters[choice] ?? adapters.stub;
}

export function listBackends(): string[] {
  return Object.keys(adapters);
}
