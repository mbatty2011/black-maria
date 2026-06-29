import { getStore } from "@/lib/store";
import { getGenerator } from "@/lib/generators/registry";
import { referencePrompt, shotPrompt } from "@/lib/consistency";
import { runLineProducer } from "@/lib/crew/line-producer";
import { runPropMaster, type PropOption } from "@/lib/crew/prop-master";
import { priceFilm, type FinanceReport } from "@/lib/pricing";
import { id, now, seedFrom } from "@/lib/ids";
import { SAMPLE_PROJECT_ID, THE_LAST_DROP } from "@/lib/sample";
import type {
  Asset,
  AssetVersion,
  Generation,
  Memory,
  Project,
  Scene,
  SceneElement,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// The orchestrator — the high-level moves the director makes, each operating on
// the one shared memory. This is where the spine actually does its work:
// breakdown → propose → LOCK (consistency loop) → CHANGE (propagation).
// ─────────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Read side ────────────────────────────────────────────────────────────────

export interface FilmView {
  project: Project;
  scenes: Scene[];
  elements: SceneElement[];
  assets: Asset[];
  versions: AssetVersion[];
  generations: Generation[];
  finance: FinanceReport;
}

export async function listProjects(): Promise<Project[]> {
  const m = await getStore().read();
  return [...m.projects].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getFilm(projectId: string): Promise<FilmView | null> {
  let m = await getStore().read();
  let project = m.projects.find((p) => p.id === projectId);
  // Self-heal the bundled sample on a keyless serverless instance that never
  // saw the original bootstrap write (cold-routed lambda, no shared store).
  if (!project && projectId === SAMPLE_PROJECT_ID) {
    await bootstrapSample();
    m = await getStore().read();
    project = m.projects.find((p) => p.id === projectId);
  }
  if (!project) return null;
  const inProj = <T extends { projectId: string }>(xs: T[]) =>
    xs.filter((x) => x.projectId === projectId);
  return {
    project,
    scenes: inProj(m.scenes).sort((a, b) => a.number - b.number),
    elements: inProj(m.elements),
    assets: inProj(m.assets),
    versions: inProj(m.versions).sort((a, b) => a.versionNo - b.versionNo),
    generations: inProj(m.generations),
    finance: priceFilm(m, projectId),
  };
}

// ── Bootstrap: hand in the sample script, run the Line Producer ──────────────

export async function bootstrapSample(): Promise<string> {
  // Idempotent: one canonical sample film, stable id, so reloads and
  // cold-routed serverless instances converge on the same project.
  const existing = await getStore().read();
  if (existing.projects.some((p) => p.id === SAMPLE_PROJECT_ID)) {
    return SAMPLE_PROJECT_ID;
  }

  const breakdown = await runLineProducer(THE_LAST_DROP.rawText);
  const projectId = SAMPLE_PROJECT_ID;
  const createdAt = now();

  await getStore().commit((m) => {
    m.projects.push({
      id: projectId,
      title: THE_LAST_DROP.title,
      logline: THE_LAST_DROP.logline,
      styleBible: THE_LAST_DROP.styleBible,
      createdAt,
    });
    m.scripts.push({
      id: id("script"),
      projectId,
      filename: THE_LAST_DROP.filename,
      rawText: THE_LAST_DROP.rawText,
      createdAt,
    });
    for (const rs of breakdown.scenes) {
      const sceneId = id("scene");
      m.scenes.push({
        id: sceneId,
        projectId,
        number: rs.number,
        heading: rs.heading,
        timeOfDay: rs.timeOfDay,
        synopsis: rs.synopsis,
      });
      for (const el of rs.elements) {
        m.elements.push({
          id: id("el"),
          projectId,
          sceneId,
          type: el.type,
          name: el.name,
          note: el.note,
          assetId: null,
        });
      }
    }
  });

  return projectId;
}

export async function deleteProject(projectId: string): Promise<void> {
  await getStore().commit((m) => {
    const keep = <T extends { projectId: string }>(xs: T[]) =>
      xs.filter((x) => x.projectId !== projectId);
    m.projects = m.projects.filter((p) => p.id !== projectId);
    m.scripts = keep(m.scripts);
    m.scenes = keep(m.scenes);
    m.elements = keep(m.elements);
    m.assets = keep(m.assets);
    m.versions = keep(m.versions);
    m.generations = keep(m.generations);
  });
}

// ── Prop Master proposes (no writes — the director hasn't chosen yet) ────────

export async function proposeForElement(
  projectId: string,
  elementId: string,
): Promise<{ element: SceneElement; options: PropOption[]; source: string }> {
  const m = await getStore().read();
  const element = m.elements.find((e) => e.id === elementId);
  const project = m.projects.find((p) => p.id === projectId);
  if (!element || !project) throw new Error("element or project not found");
  const { options, source } = await runPropMaster(
    element.name,
    project.styleBible,
    element.note,
  );
  return { element, options, source };
}

// ── LOCK: the one action that makes an asset canonical and propagates it ─────
// Creates the asset + first version, renders the canonical reference, links
// EVERY scene element of the same name/type, and renders a shot for each scene
// it touches. One prop, consistent across every scene — the consistency loop.

export async function lockProp(args: {
  projectId: string;
  elementId: string;
  label: string;
  spec: string;
  params: Record<string, unknown>;
  signedOffBy?: string;
}): Promise<{ assetId: string }> {
  const gen = getGenerator();
  const assetId = id("asset");
  const versionId = id("ver");

  // Read first so we can render outside the commit lock.
  const m = await getStore().read();
  const project = m.projects.find((p) => p.id === args.projectId);
  const element = m.elements.find((e) => e.id === args.elementId);
  if (!project || !element) throw new Error("project or element not found");

  const asset: Asset = {
    id: assetId,
    projectId: args.projectId,
    type: element.type,
    name: args.label || element.name,
    locked: true,
    currentVersionId: versionId,
    createdAt: now(),
  };
  const seed = seedFrom(`${asset.name}::${args.spec}`);
  const version: AssetVersion = {
    id: versionId,
    assetId,
    projectId: args.projectId,
    versionNo: 1,
    spec: args.spec,
    seed,
    referenceImage: null,
    params: args.params,
    cost: 0,
    signedOffBy: args.signedOffBy || "director",
    supersedesVersionId: null,
    createdAt: now(),
  };

  // Render the canonical reference plate.
  const ref = referencePrompt(project, asset, version);
  const refResult = await gen.render({
    prompt: ref.prompt,
    seed: ref.seed,
    kind: "reference",
    label: asset.name,
    caption: "canonical reference",
    params: args.params,
  });
  version.referenceImage = refResult.image;
  version.cost = refResult.cost;

  // Every scene element with the same name+type now points at this canon.
  const matches = m.elements.filter(
    (e) =>
      e.projectId === args.projectId &&
      e.type === element.type &&
      norm(e.name) === norm(element.name),
  );
  const sceneIds = [...new Set(matches.map((e) => e.sceneId))];
  const scenes = m.scenes.filter((s) => sceneIds.includes(s.id));

  // Render a shot per scene — same canon, every scene.
  const shots: Generation[] = [];
  for (const scene of scenes) {
    const sp = shotPrompt(project, asset, version, scene);
    const result = await gen.render({
      prompt: sp.prompt,
      seed: sp.seed,
      kind: "shot",
      label: asset.name,
      caption: `Sc.${scene.number} — ${scene.heading}`,
      params: args.params,
    });
    shots.push({
      id: id("gen"),
      projectId: args.projectId,
      assetId,
      assetVersionId: versionId,
      sceneId: scene.id,
      backend: result.backend,
      prompt: sp.prompt,
      image: result.image,
      seed: result.seed,
      cost: result.cost,
      status: "rendered",
      createdAt: now(),
    });
  }

  await getStore().commit((mem) => {
    mem.assets.push(asset);
    mem.versions.push(version);
    for (const e of mem.elements) {
      if (matches.some((mm) => mm.id === e.id)) e.assetId = assetId;
    }
    mem.generations.push(...shots);
  });

  return { assetId };
}

// ── CHANGE: say it once, it propagates ───────────────────────────────────────
// "The red phone is now a walkie-talkie." A new version supersedes the old, the
// old shots go stale (kept in lineage), the canonical reference re-renders, and
// every scene the asset touches re-renders against the new anchor. Finance
// re-prices automatically because it reads the memory.

export async function changeAsset(args: {
  projectId: string;
  assetId: string;
  newLabel?: string;
  newSpec: string;
  params?: Record<string, unknown>;
  signedOffBy?: string;
}): Promise<{ versionId: string; reRendered: number }> {
  const gen = getGenerator();
  const m = await getStore().read();
  const project = m.projects.find((p) => p.id === args.projectId);
  const asset = m.assets.find((a) => a.id === args.assetId);
  if (!project || !asset) throw new Error("project or asset not found");

  const prevVersionId = asset.currentVersionId;
  const prevVersion = m.versions.find((v) => v.id === prevVersionId);
  const versionId = id("ver");
  const nextNo = (prevVersion?.versionNo ?? 0) + 1;
  const newName = args.newLabel ?? asset.name;
  const params = args.params ?? prevVersion?.params ?? {};

  const newVersion: AssetVersion = {
    id: versionId,
    assetId: asset.id,
    projectId: args.projectId,
    versionNo: nextNo,
    spec: args.newSpec,
    seed: seedFrom(`${newName}::${args.newSpec}`),
    referenceImage: null,
    params,
    cost: 0,
    signedOffBy: args.signedOffBy || "director",
    supersedesVersionId: prevVersionId,
    createdAt: now(),
  };

  // Re-render the canonical reference against the new anchor.
  const updatedAsset: Asset = { ...asset, name: newName };
  const ref = referencePrompt(project, updatedAsset, newVersion);
  const refResult = await gen.render({
    prompt: ref.prompt,
    seed: ref.seed,
    kind: "reference",
    label: newName,
    caption: `canonical reference · v${nextNo}`,
    params,
  });
  newVersion.referenceImage = refResult.image;
  newVersion.cost = refResult.cost;

  // Re-render every scene this asset touches.
  const scenes = scenesForAsset(m, args.assetId);
  const newShots: Generation[] = [];
  for (const scene of scenes) {
    const sp = shotPrompt(project, updatedAsset, newVersion, scene);
    const result = await gen.render({
      prompt: sp.prompt,
      seed: sp.seed,
      kind: "shot",
      label: newName,
      caption: `Sc.${scene.number} — ${scene.heading}`,
      params,
    });
    newShots.push({
      id: id("gen"),
      projectId: args.projectId,
      assetId: args.assetId,
      assetVersionId: versionId,
      sceneId: scene.id,
      backend: result.backend,
      prompt: sp.prompt,
      image: result.image,
      seed: result.seed,
      cost: result.cost,
      status: "rendered",
      createdAt: now(),
    });
  }

  await getStore().commit((mem) => {
    // Old shots for this asset → stale (kept in lineage, excluded from live cost).
    for (const g of mem.generations) {
      if (g.assetId === args.assetId && g.status !== "stale") g.status = "stale";
    }
    const a = mem.assets.find((x) => x.id === args.assetId);
    if (a) {
      a.name = newName;
      a.currentVersionId = versionId;
    }
    mem.versions.push(newVersion);
    mem.generations.push(...newShots);
  });

  return { versionId, reRendered: newShots.length };
}

function scenesForAsset(m: Memory, assetId: string): Scene[] {
  const sceneIds = [
    ...new Set(
      m.elements.filter((e) => e.assetId === assetId).map((e) => e.sceneId),
    ),
  ];
  return m.scenes
    .filter((s) => sceneIds.includes(s.id))
    .sort((a, b) => a.number - b.number);
}

export async function financeReport(
  projectId: string,
): Promise<FinanceReport> {
  const m = await getStore().read();
  return priceFilm(m, projectId);
}
