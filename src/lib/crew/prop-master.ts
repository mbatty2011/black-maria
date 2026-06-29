import { askJSON } from "./anthropic";

// ─────────────────────────────────────────────────────────────────────────────
// Prop Master — for a given prop, proposes canonical-look options. It does NOT
// render and does NOT decide: the director locks one, and the lock is what makes
// it canonical. Each option is a tight spec (the anchor text) plus generation
// params.
// ─────────────────────────────────────────────────────────────────────────────

export interface PropOption {
  label: string; // short name for the option
  spec: string; // the canonical-look description — becomes the anchor text
  params: Record<string, unknown>;
}

const SYSTEM = `You are the Prop Master on a film. Given one prop and the film's
style bible, propose 3 distinct canonical-look options. Each option is a vivid,
specific physical description (material, era, wear, colour, size) that could
anchor every future render of this prop. Respond with ONLY JSON of shape:
{"options":[{"label":"...","spec":"...","params":{"material":"...","era":"..."}}]}`;

export async function runPropMaster(
  propName: string,
  styleBible: string,
  note: string,
): Promise<{ options: PropOption[]; source: "claude" | "offline" }> {
  const fromClaude = await askJSON<{ options: PropOption[] }>(
    SYSTEM,
    `Prop: ${propName}\nContinuity note: ${note || "(none)"}\nStyle bible: ${styleBible}`,
    1500,
  );
  if (fromClaude?.options?.length) {
    return { options: fromClaude.options.slice(0, 3), source: "claude" };
  }
  return { options: offlineOptions(propName, styleBible), source: "offline" };
}

// Deterministic fallback: three plausible canon directions for any prop, keyed
// off the style bible so they read as belonging to this film.
function offlineOptions(propName: string, styleBible: string): PropOption[] {
  const world = styleBible.slice(0, 80);
  return [
    {
      label: `Worn / lived-in`,
      spec: `${propName} — heavily used and period-honest: scuffed surfaces, faded labels, the patina of daily handling. Sits naturally inside the film's world (${world}).`,
      params: { finish: "matte", wear: "high", era: "period" },
    },
    {
      label: `Clean / hero`,
      spec: `${propName} — pristine hero version: crisp edges, saturated signature colour, catches a single hard key light. Reads instantly on camera and anchors the look (${world}).`,
      params: { finish: "semi-gloss", wear: "low", era: "period" },
    },
    {
      label: `Reimagined`,
      spec: `${propName} — a tasteful reinterpretation that keeps the silhouette but updates material and detail, so it feels deliberate rather than found (${world}).`,
      params: { finish: "mixed", wear: "medium", era: "stylised" },
    },
  ];
}
