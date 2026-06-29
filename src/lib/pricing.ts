import type { Memory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Finance — sits across the whole system and prices anything: a version, a
// scene, the whole film. It reads cost off every version and generation in the
// shared memory (spec §"Finance", §"Cost"). Stale generations are excluded from
// the live total but kept visible as already-spent in lineage.
// ─────────────────────────────────────────────────────────────────────────────

export interface FinanceReport {
  projectId: string;
  referenceCost: number; // cost of all locked reference plates
  liveShotCost: number; // cost of current (non-stale) shot renders
  sunkCost: number; // cost already spent on superseded/stale renders
  total: number; // referenceCost + liveShotCost
  grandTotalWithSunk: number; // everything ever spent
  generationCount: number;
  staleCount: number;
  byAsset: { assetId: string; name: string; cost: number }[];
}

export function priceFilm(memory: Memory, projectId: string): FinanceReport {
  const versions = memory.versions.filter((v) => v.projectId === projectId);
  const gens = memory.generations.filter((g) => g.projectId === projectId);
  const assets = memory.assets.filter((a) => a.projectId === projectId);

  const referenceCost = round(versions.reduce((s, v) => s + v.cost, 0));
  const liveShots = gens.filter((g) => g.status !== "stale");
  const staleShots = gens.filter((g) => g.status === "stale");
  const liveShotCost = round(liveShots.reduce((s, g) => s + g.cost, 0));
  const sunkCost = round(staleShots.reduce((s, g) => s + g.cost, 0));

  const byAsset = assets.map((a) => {
    const vCost = versions
      .filter((v) => v.assetId === a.id)
      .reduce((s, v) => s + v.cost, 0);
    const gCost = liveShots
      .filter((g) => g.assetId === a.id)
      .reduce((s, g) => s + g.cost, 0);
    return { assetId: a.id, name: a.name, cost: round(vCost + gCost) };
  });

  return {
    projectId,
    referenceCost,
    liveShotCost,
    sunkCost,
    total: round(referenceCost + liveShotCost),
    grandTotalWithSunk: round(referenceCost + liveShotCost + sunkCost),
    generationCount: liveShots.length,
    staleCount: staleShots.length,
    byAsset: byAsset.sort((a, b) => b.cost - a.cost),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
