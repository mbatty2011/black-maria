import type { ElementType } from "@/lib/types";
import { askJSON, hasClaude } from "./anthropic";

// ─────────────────────────────────────────────────────────────────────────────
// Line Producer — breaks a script scene by scene into every element. Output:
// a breakdown sheet per scene. v1 surfaces props prominently (the element type
// we prove end-to-end) but tags everything it finds.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawElement {
  type: ElementType;
  name: string;
  note: string;
}

export interface RawScene {
  number: number;
  heading: string;
  timeOfDay: string;
  synopsis: string;
  elements: RawElement[];
}

export interface Breakdown {
  scenes: RawScene[];
  source: "claude" | "offline";
}

const SYSTEM = `You are the Line Producer on a film. Break a screenplay into a
scene-by-scene breakdown. For each scene return its slugline heading, time of
day, a one-line synopsis, and every taggable element. Element types must be one
of: prop, wardrobe, talent, background, vehicle, animal, set, location, makeup.
Be thorough about PROPS especially (hand-props characters touch). Respond with
ONLY a JSON object of shape:
{"scenes":[{"number":1,"heading":"INT. ...","timeOfDay":"NIGHT","synopsis":"...",
"elements":[{"type":"prop","name":"red wall phone","note":"continuity note"}]}]}`;

export async function runLineProducer(rawText: string): Promise<Breakdown> {
  const fromClaude = await askJSON<{ scenes: RawScene[] }>(
    SYSTEM,
    `Screenplay:\n\n${rawText}`,
    4000,
  );
  if (fromClaude?.scenes?.length) {
    return { scenes: normalise(fromClaude.scenes), source: "claude" };
  }
  return { scenes: offlineBreakdown(rawText), source: "offline" };
}

export function lineProducerMode(): "claude" | "offline" {
  return hasClaude() ? "claude" : "offline";
}

function normalise(scenes: RawScene[]): RawScene[] {
  return scenes.map((s, i) => ({
    number: s.number ?? i + 1,
    heading: s.heading ?? `SCENE ${i + 1}`,
    timeOfDay: s.timeOfDay ?? guessTime(s.heading ?? ""),
    synopsis: s.synopsis ?? "",
    elements: (s.elements ?? []).map((e) => ({
      type: (e.type ?? "prop") as ElementType,
      name: e.name ?? "element",
      note: e.note ?? "",
    })),
  }));
}

function guessTime(heading: string): string {
  const h = heading.toUpperCase();
  if (h.includes("NIGHT")) return "NIGHT";
  if (h.includes("DAWN")) return "DAWN";
  if (h.includes("DUSK")) return "DUSK";
  if (h.includes("EVENING")) return "EVENING";
  if (h.includes("DAY")) return "DAY";
  return "UNSPECIFIED";
}

// ── Offline fallback ─────────────────────────────────────────────────────────
// A deterministic heuristic parse so the breakdown works with no API key:
// split on sluglines, then pull parenthetical PROP tags of the form [[prop]].
// Our sample script is authored with those tags; arbitrary scripts still get
// scene segmentation.
const SLUG = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i;

function offlineBreakdown(rawText: string): RawScene[] {
  const lines = rawText.split(/\r?\n/);
  const scenes: RawScene[] = [];
  let current: RawScene | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (SLUG.test(trimmed)) {
      current = {
        number: scenes.length + 1,
        heading: trimmed.replace(/\s+/g, " "),
        timeOfDay: guessTime(trimmed),
        synopsis: "",
        elements: [],
      };
      scenes.push(current);
      continue;
    }
    if (!current) continue;
    if (!current.synopsis && trimmed && !trimmed.startsWith("[[")) {
      current.synopsis = trimmed.slice(0, 120);
    }
    // [[prop: red wall phone | note]] tags
    const tagRe = /\[\[\s*(\w+)\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]]+?))?\s*\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(line))) {
      const type = m[1].toLowerCase() as ElementType;
      current.elements.push({
        type,
        name: m[2].trim(),
        note: (m[3] ?? "").trim(),
      });
    }
  }
  return scenes;
}
