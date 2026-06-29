import { promises as fs } from "node:fs";
import path from "node:path";
import type { Store } from "./index";
import { EMPTY_MEMORY, type Memory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// JSON file driver. Holds the whole shared memory in .data/memory.json.
//
// Good for: local dev, the browser-preview demo, running with zero setup.
// Not for: serverless production (the filesystem is ephemeral on Vercel) — that
// is exactly what the Supabase driver is for. An in-process mutex serialises
// commits so concurrent requests can't clobber each other's writes.
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "memory.json");

export class FileStore implements Store {
  readonly driver = "file" as const;
  private chain: Promise<unknown> = Promise.resolve();

  async read(): Promise<Memory> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      return { ...EMPTY_MEMORY, ...(JSON.parse(raw) as Memory) };
    } catch {
      return structuredClone(EMPTY_MEMORY);
    }
  }

  async commit(mutator: (m: Memory) => void | Promise<void>): Promise<Memory> {
    // Serialise commits through a promise chain (single-process mutex).
    const run = this.chain.then(async () => {
      const memory = await this.read();
      await mutator(memory);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(memory, null, 2), "utf8");
      return memory;
    });
    this.chain = run.catch(() => {});
    return run;
  }
}
