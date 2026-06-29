// ─────────────────────────────────────────────────────────────────────────────
// Black Maria 2.0 — the shared-memory data model.
//
// One memory holds the four things the whole crew works off of (spec §"The
// spine"): the breakdown, the canonical asset registry, version lineage, and
// cost. Everything below is that memory, typed.
// ─────────────────────────────────────────────────────────────────────────────

/** The kinds of element a Line Producer pulls out of a scene. v1 proves PROP
 *  end-to-end; the rest are first-class in the model so later departments
 *  (Production Designer → sets, casting → talent) slot in without a migration. */
export type ElementType =
  | "prop"
  | "wardrobe"
  | "talent"
  | "background"
  | "vehicle"
  | "animal"
  | "set"
  | "location"
  | "makeup";

export const ELEMENT_TYPES: ElementType[] = [
  "prop",
  "wardrobe",
  "talent",
  "background",
  "vehicle",
  "animal",
  "set",
  "location",
  "makeup",
];

/** A film project — the top of the memory. */
export interface Project {
  id: string;
  title: string;
  logline: string;
  createdAt: string;
  /** The film's overall look, owned by the Production Designer. Injected into
   *  every generation so the world holds together scene to scene. */
  styleBible: string;
}

/** Raw script handed in by the director (Final Draft / PDF / pasted text). */
export interface ScriptDoc {
  id: string;
  projectId: string;
  filename: string;
  rawText: string;
  createdAt: string;
}

/** One scene of the breakdown. */
export interface Scene {
  id: string;
  projectId: string;
  number: number;
  heading: string; // e.g. "INT. DISPATCH OFFICE - NIGHT"
  timeOfDay: string;
  synopsis: string;
}

/** One element appearing in one scene (the breakdown rows). An element points
 *  at a canonical Asset once one is locked for it — that link is what carries a
 *  prop's locked look into all the scenes it touches. */
export interface SceneElement {
  id: string;
  projectId: string;
  sceneId: string;
  type: ElementType;
  name: string; // as written in the script, e.g. "red wall phone"
  note: string; // continuity note from the Line Producer
  assetId: string | null; // null until a canonical asset is locked for it
}

/** A canonical asset in the registry — the locked, single source of truth for
 *  one visual element across the whole film. */
export interface Asset {
  id: string;
  projectId: string;
  type: ElementType;
  name: string; // canonical name, e.g. "Dispatcher's phone"
  locked: boolean;
  currentVersionId: string | null;
  createdAt: string;
}

/** One version of an asset. Lineage lives here: every change makes a new
 *  version that records what it superseded, who signed it off, and its cost. */
export interface AssetVersion {
  id: string;
  assetId: string;
  projectId: string;
  versionNo: number;
  /** The canonical spec — the words that define this look. This is the anchor
   *  text injected into every generation. */
  spec: string;
  /** Deterministic seed that reproduces this look in the generator. */
  seed: number;
  /** Rendered reference still (data-URI or remote URL). The "character sheet" /
   *  "prop sheet" the spec describes — the locked reference image. */
  referenceImage: string | null;
  /** Generation parameters captured so the look can be reproduced. */
  params: Record<string, unknown>;
  cost: number;
  signedOffBy: string;
  supersedesVersionId: string | null;
  createdAt: string;
}

/** A single generation event for a specific asset version, in a specific scene.
 *  This is where consistency becomes visible: many scenes, one canonical
 *  anchor, identical render. */
export interface Generation {
  id: string;
  projectId: string;
  assetId: string;
  assetVersionId: string;
  sceneId: string;
  backend: string; // which adapter rendered it
  /** The fully-assembled prompt, with every anchor injected. Never just
   *  "make a phone" — always "make THIS phone, in THIS world". */
  prompt: string;
  image: string | null;
  seed: number;
  cost: number;
  status: "queued" | "rendered" | "stale";
  createdAt: string;
}

/** The whole memory, as one object. The file-store holds exactly this; the
 *  Supabase driver maps each array to a table. */
export interface Memory {
  projects: Project[];
  scripts: ScriptDoc[];
  scenes: Scene[];
  elements: SceneElement[];
  assets: Asset[];
  versions: AssetVersion[];
  generations: Generation[];
}

export const EMPTY_MEMORY: Memory = {
  projects: [],
  scripts: [],
  scenes: [],
  elements: [],
  assets: [],
  versions: [],
  generations: [],
};
