/* eslint-disable no-console */
// ─────────────────────────────────────────────────────────────────────────────
// Headless proof of the v1 thesis, no browser, no keys required:
//
//   hand in script → breakdown → lock one prop (consistent across scenes)
//   → change it → watch it propagate → finance re-prices.
//
// Run: npm run slice
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  bootstrapSample,
  getFilm,
  lockProp,
  changeAsset,
} from "../src/lib/orchestrator";

async function main() {
  // Run against a clean local file store.
  await fs
    .rm(path.join(process.cwd(), ".data", "memory.json"), { force: true })
    .catch(() => {});

  console.log("\n■ Black Maria 2.0 — vertical slice\n");

  console.log("→ Hand in the script. Line Producer breaks it down…");
  const projectId = await bootstrapSample();
  let film = (await getFilm(projectId))!;
  console.log(
    `  ${film.scenes.length} scenes, ${film.elements.length} elements tagged.`,
  );

  // Find the recurring prop.
  const propEl = film.elements.find(
    (e) => e.type === "prop" && /phone/i.test(e.name),
  )!;
  const scenesTouched = new Set(
    film.elements
      .filter((e) => e.name.toLowerCase() === propEl.name.toLowerCase())
      .map((e) => e.sceneId),
  ).size;
  console.log(
    `\n→ Prop "${propEl.name}" appears across ${scenesTouched} scenes.`,
  );

  console.log("→ Lock a canonical look. Rendering reference + every scene…");
  const { assetId } = await lockProp({
    projectId,
    elementId: propEl.id,
    label: "Dispatcher's red wall phone",
    spec: "A 1970s municipal rotary wall phone in fire-engine red, coiled cord, scuffed receiver, a single brass dial — institutional and worn.",
    params: { era: "1970s", finish: "matte", wear: "high" },
  });

  film = (await getFilm(projectId))!;
  const liveShots = film.generations.filter(
    (g) => g.assetId === assetId && g.status !== "stale",
  );
  const seeds = new Set(liveShots.map((g) => g.seed));
  console.log(
    `  ✓ ${liveShots.length} shots rendered. Distinct canon seeds: ${seeds.size} ` +
      `→ ${seeds.size === 1 ? "IDENTICAL across every scene (consistent ✅)" : "DRIFT ❌"}`,
  );
  console.log(`  Finance: live total $${film.finance.total.toFixed(2)}`);

  console.log(
    '\n→ Director: "the red phone is now a walkie-talkie." Say it once…',
  );
  const { reRendered } = await changeAsset({
    projectId,
    assetId,
    newLabel: "Dispatcher's walkie-talkie",
    newSpec:
      "A battered handheld VHF walkie-talkie, olive-drab municipal issue, stubby rubber antenna, coiled mic cord, worn keypad — same role, new object.",
  });

  film = (await getFilm(projectId))!;
  const asset = film.assets.find((a) => a.id === assetId)!;
  const versions = film.versions.filter((v) => v.assetId === assetId);
  const nowLive = film.generations.filter(
    (g) => g.assetId === assetId && g.status !== "stale",
  );
  const nowStale = film.generations.filter(
    (g) => g.assetId === assetId && g.status === "stale",
  );
  console.log(`  ✓ propagated: ${reRendered} scenes re-rendered.`);
  console.log(
    `  Asset is now "${asset.name}", v${versions.length}; ` +
      `${nowStale.length} old renders kept in lineage (sunk), ${nowLive.length} live.`,
  );
  console.log(
    `  Finance re-priced: live $${film.finance.total.toFixed(2)} ` +
      `(sunk $${film.finance.sunkCost.toFixed(2)} preserved).`,
  );

  console.log(
    "\n■ Slice complete — one prop, consistent across scenes, survived a change.\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
