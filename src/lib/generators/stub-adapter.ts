import type {
  GeneratorAdapter,
  GenerationRequest,
  GenerationResult,
} from "./adapter";

// ─────────────────────────────────────────────────────────────────────────────
// The stub generator. It does not call a model — it deterministically renders
// an SVG "still" from the seed. That is the point: the same anchor (same seed)
// always produces the *same* image, so consistency across scenes is something
// you can see, and a change (new seed) visibly re-renders everything. A real
// fal/Magnific adapter swaps in behind the same interface with no other change.
// ─────────────────────────────────────────────────────────────────────────────

/** Tiny deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgStill(req: GenerationRequest): string {
  const r = rng(req.seed);
  const W = 480;
  const H = 320;

  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 120)) % 360;
  const bgA = `hsl(${hue} 45% 12%)`;
  const bgB = `hsl(${hue2} 50% 7%)`;
  const accent = `hsl(${hue} 70% 60%)`;
  const accent2 = `hsl(${hue2} 65% 55%)`;

  // A deterministic central "object": layered polygons + a focal ring.
  const cx = W / 2;
  const cy = H / 2 - 8;
  const shapes: string[] = [];
  const layers = 3 + Math.floor(r() * 3);
  for (let i = 0; i < layers; i++) {
    const sides = 3 + Math.floor(r() * 5);
    const rad = 38 + r() * 70;
    const rot = r() * Math.PI * 2;
    const pts: string[] = [];
    for (let s = 0; s < sides; s++) {
      const ang = rot + (s / sides) * Math.PI * 2;
      const jitter = 0.8 + r() * 0.4;
      pts.push(
        `${(cx + Math.cos(ang) * rad * jitter).toFixed(1)},${(
          cy +
          Math.sin(ang) * rad * jitter
        ).toFixed(1)}`,
      );
    }
    const fillHue = (hue + i * 25) % 360;
    const op = (0.18 + r() * 0.4).toFixed(2);
    shapes.push(
      `<polygon points="${pts.join(" ")}" fill="hsl(${fillHue} 60% 55%)" opacity="${op}" />`,
    );
  }
  const ringR = 30 + r() * 20;
  shapes.push(
    `<circle cx="${cx}" cy="${cy}" r="${ringR.toFixed(1)}" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.9" />`,
  );
  shapes.push(
    `<circle cx="${cx}" cy="${cy}" r="${(ringR * 0.45).toFixed(1)}" fill="${accent2}" opacity="0.85" />`,
  );

  const label = esc(req.label ?? "asset");
  const caption = req.caption ? esc(req.caption) : "";
  const kindBadge = req.kind === "reference" ? "CANON" : "SHOT";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bgA}"/>
      <stop offset="1" stop-color="${bgB}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${shapes.join("\n  ")}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect x="12" y="12" width="62" height="20" rx="3" fill="#000" opacity="0.5"/>
  <text x="20" y="26" font-family="ui-monospace, monospace" font-size="11" fill="${accent}" letter-spacing="1.5">${kindBadge}</text>
  <text x="20" y="${H - 34}" font-family="ui-monospace, monospace" font-size="15" fill="#e8e6df" font-weight="600">${label}</text>
  ${caption ? `<text x="20" y="${H - 16}" font-family="ui-monospace, monospace" font-size="10.5" fill="#8a8a93">${caption}</text>` : ""}
  <text x="${W - 14}" y="${H - 16}" text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="#8a8a93">seed ${req.seed}</text>
</svg>`;
}

export class StubAdapter implements GeneratorAdapter {
  readonly name = "stub";

  price(req: GenerationRequest): number {
    // A believable per-render price so Finance has something real to total.
    return req.kind === "reference" ? 0.12 : 0.04;
  }

  async render(req: GenerationRequest): Promise<GenerationResult> {
    const svg = svgStill(req);
    const image = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return {
      image,
      cost: this.price(req),
      backend: this.name,
      seed: req.seed,
    };
  }
}
