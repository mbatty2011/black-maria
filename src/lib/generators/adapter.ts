// ─────────────────────────────────────────────────────────────────────────────
// Generator-agnostic adapter contract (spec §"Generator-agnostic by design").
//
// Generation lives behind this seam. Black Maria never bets on a model — it
// owns the anchors and consistency and routes the render to whichever backend
// fits. v1 ships the deterministic `stub` adapter; a real fal/Magnific adapter
// implements the same interface and drops in via the registry.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationRequest {
  /** The fully-assembled, anchor-injected prompt. */
  prompt: string;
  /** Deterministic seed — same seed must reproduce the same look. */
  seed: number;
  /** What we're rendering, for the backend to specialise on. */
  kind: "reference" | "shot";
  /** Free-form generation parameters (aspect, steps, etc). */
  params?: Record<string, unknown>;
  /** Human label used by the stub renderer's caption. */
  label?: string;
  /** Subtitle (e.g. the scene heading) for shot renders. */
  caption?: string;
}

export interface GenerationResult {
  /** Rendered image as a data-URI or remote URL. */
  image: string;
  /** What this render cost, in USD. Finance reads this. */
  cost: number;
  /** Which backend produced it. */
  backend: string;
  seed: number;
}

export interface GeneratorAdapter {
  readonly name: string;
  /** Per-call price, so Finance can price anything before rendering it. */
  price(req: GenerationRequest): number;
  render(req: GenerationRequest): Promise<GenerationResult>;
}
