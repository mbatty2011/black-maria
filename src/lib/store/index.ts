import type { Memory } from "@/lib/types";
import { FileStore } from "./file-store";
import { SupabaseStore } from "./supabase-store";

// ─────────────────────────────────────────────────────────────────────────────
// The Store is the shared memory's persistence seam. Two drivers implement it:
//
//   • SupabaseStore — the hostable production path (Postgres).
//   • FileStore     — a zero-setup local JSON driver so the demo runs with no
//                     keys and the browser preview can verify behaviour.
//
// Selection is automatic: if both Supabase env vars are present we use it,
// otherwise we fall back to the file driver. Same philosophy the spec applies
// to generators (a swappable adapter), applied to storage.
// ─────────────────────────────────────────────────────────────────────────────

export interface Store {
  readonly driver: "supabase" | "file";
  /** Load the entire shared memory. */
  read(): Promise<Memory>;
  /** Apply a mutation transactionally and persist. The mutator receives a
   *  working copy of memory and mutates it in place; the new memory is
   *  returned. We never hard-delete rows — changes supersede via lineage — so
   *  drivers can persist with plain upserts. */
  commit(mutator: (m: Memory) => void | Promise<void>): Promise<Memory>;
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    cached = new SupabaseStore(url, key);
  } else {
    cached = new FileStore();
  }
  return cached;
}

/** Test/seed helper — reset the cached singleton. */
export function __resetStore() {
  cached = null;
}
