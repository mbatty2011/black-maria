import type { Asset, AssetVersion, Project, Scene } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Consistency injection — the design center (spec §"The design center").
//
// A generation call is never "make a phone." It is "make THIS phone, in THIS
// world, for THIS scene," with every anchor pulled from memory. These builders
// assemble that prompt from the canonical asset version + the film's style
// bible + the scene context. The seed is derived from the canonical spec, so
// the same canon always reproduces the same look — and a change to the canon
// (new version → new spec → new seed) visibly re-renders everything.
// ─────────────────────────────────────────────────────────────────────────────

/** Prompt + seed for the canonical REFERENCE still (the prop sheet itself). */
export function referencePrompt(
  project: Project,
  asset: Asset,
  version: AssetVersion,
): { prompt: string; seed: number } {
  const prompt = [
    `CANONICAL ${asset.type.toUpperCase()} REFERENCE — "${asset.name}"`,
    ``,
    `Look (locked anchor): ${version.spec}`,
    ``,
    `Film style bible: ${project.styleBible}`,
    ``,
    `Render a clean, well-lit reference plate of this ${asset.type} on a neutral`,
    `field. This is the single source of truth every scene will match.`,
  ].join("\n");
  return { prompt, seed: version.seed };
}

/** Prompt + seed for a SHOT — the same canonical anchor placed into a scene.
 *  The seed stays tied to the canon so the object reads identically scene to
 *  scene; the scene only changes the surrounding context, never the object. */
export function shotPrompt(
  project: Project,
  asset: Asset,
  version: AssetVersion,
  scene: Scene,
): { prompt: string; seed: number } {
  const prompt = [
    `SHOT — Scene ${scene.number}: ${scene.heading}`,
    ``,
    `Place the canonical ${asset.type} "${asset.name}" into this scene.`,
    `Locked anchor (must match exactly): ${version.spec}`,
    ``,
    `Scene context: ${scene.synopsis || scene.heading} (${scene.timeOfDay}).`,
    `Film style bible: ${project.styleBible}`,
    ``,
    `The ${asset.type} is identical to its canonical reference — same material,`,
    `colour, wear, and silhouette. Only lighting and framing follow the scene.`,
  ].join("\n");
  // The shot's seed IS the canon's seed. The object renders identically in
  // every scene it touches — that is consistency, made visible. Only the
  // caption (scene heading) differs. Change the canon → new seed → every shot
  // re-renders to the new locked look. That is change propagation, made visible.
  return { prompt, seed: version.seed };
}
