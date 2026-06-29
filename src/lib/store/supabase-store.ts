import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./index";
import { EMPTY_MEMORY, type Memory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Postgres driver — the hostable production path.
//
// Each memory collection maps to a table of shape (id, project_id, data jsonb).
// Storing each row as a jsonb document keeps the TypeScript types in src/lib/
// types.ts as the single source of truth — no parallel column list to keep in
// sync. See supabase/schema.sql for the DDL.
//
// commit() reads the whole memory, applies the mutator, then upserts every row.
// We never hard-delete (changes supersede via lineage), so upsert-all is a
// correct, simple persistence strategy at one-film scale.
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTIONS: (keyof Memory)[] = [
  "projects",
  "scripts",
  "scenes",
  "elements",
  "assets",
  "versions",
  "generations",
];

// Collection name (plural, in Memory) → table name.
const TABLE: Record<keyof Memory, string> = {
  projects: "bm_projects",
  scripts: "bm_scripts",
  scenes: "bm_scenes",
  elements: "bm_elements",
  assets: "bm_assets",
  versions: "bm_versions",
  generations: "bm_generations",
};

type Row = { id: string; project_id: string | null; data: unknown };

function projectIdOf(row: Record<string, unknown>): string | null {
  return (row.projectId as string) ?? (row.id as string) ?? null;
}

export class SupabaseStore implements Store {
  readonly driver = "supabase" as const;
  private client: SupabaseClient;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }

  async read(): Promise<Memory> {
    const memory: Memory = structuredClone(EMPTY_MEMORY);
    for (const col of COLLECTIONS) {
      const { data, error } = await this.client.from(TABLE[col]).select("data");
      if (error) throw new Error(`read ${TABLE[col]}: ${error.message}`);
      (memory[col] as unknown[]) = (data ?? []).map((r) => (r as Row).data);
    }
    return memory;
  }

  async commit(mutator: (m: Memory) => void | Promise<void>): Promise<Memory> {
    const run = this.chain.then(async () => {
      const before = await this.read();
      const memory = structuredClone(before);
      await mutator(memory);

      for (const col of COLLECTIONS) {
        const rows = memory[col] as unknown as Record<string, unknown>[];
        if (rows.length === 0) continue;
        const payload: Row[] = rows.map((r) => ({
          id: r.id as string,
          project_id: projectIdOf(r),
          data: r,
        }));
        const { error } = await this.client
          .from(TABLE[col])
          .upsert(payload, { onConflict: "id" });
        if (error) throw new Error(`upsert ${TABLE[col]}: ${error.message}`);
      }
      return memory;
    });
    this.chain = run.catch(() => {});
    return run;
  }
}
