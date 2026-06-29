import type {
  GeneratorAdapter,
  GenerationRequest,
  GenerationResult,
} from "./adapter";

// ─────────────────────────────────────────────────────────────────────────────
// SEAM: the real image adapter.
//
// This is the clearly-marked place a production backend wires in — a fal route,
// Magnific/Mystic, Nano Banana, SeeDream, etc. It implements the same contract
// as the stub, so the orchestration brain above it never changes: it keeps
// owning the anchors and consistency while this just renders.
//
// To activate: set GENERATOR_BACKEND=real and FAL_KEY (or your provider key),
// then fill in render() with the provider call. Left intentionally unimplemented
// in v1 — the thesis is proven by the stub making consistency visible, not by
// paying a generator.
// ─────────────────────────────────────────────────────────────────────────────

export class RealAdapter implements GeneratorAdapter {
  readonly name = "real";

  price(req: GenerationRequest): number {
    // Replace with the provider's real per-render price.
    return req.kind === "reference" ? 0.08 : 0.05;
  }

  async render(_req: GenerationRequest): Promise<GenerationResult> {
    throw new Error(
      "RealAdapter is a seam — wire a fal/Magnific call here and set GENERATOR_BACKEND=real. " +
        "The default `stub` backend renders deterministic stills with no key.",
    );
  }
}
