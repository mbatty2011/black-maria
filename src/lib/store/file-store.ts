import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Store } from "./index";
import { EMPTY_MEMORY, type Memory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// JSON file driver. Holds the whole shared memory in one file, fronted by an
// in-process cache that is always authoritative.
//
// Good for: local dev, the browser-preview demo, running with zero setup, and a
// keyless Vercel deploy (degrades to the warm-lambda in-memory cache).
// Not durable across serverless cold starts — that is exactly what the Supabase
// driver is for. An in-process mutex serialises commits.
//
// On Vercel the project filesystem is read-only, so we write under the OS temp
// dir; if even that fails, the in-memory cache still serves the session.
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "blackmaria")
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "memory.json");

export class FileStore implements Store {
  readonly driver = "file" as const;
  private chain: Promise<unknown> = Promise.resolve();
  private cache: Memory | null = null;

  async read(): Promise<Memory> {
    if (this.cache) return structuredClone(this.cache);
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      this.cache = { ...EMPTY_MEMORY, ...(JSON.parse(raw) as Memory) };
    } catch {
      this.cache = structuredClone(EMPTY_MEMORY);
    }
    return structuredClone(this.cache);
  }

  async commit(mutator: (m: Memory) => void | Promise<void>): Promise<Memory> {
    const run = this.chain.then(async () => {
      const memory = await this.read();
      await mutator(memory);
      this.cache = structuredClone(memory); // authoritative, even if disk fails
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(memory, null, 2), "utf8");
      } catch {
        // read-only FS (e.g. serverless) — the in-memory cache still serves it.
      }
      return memory;
    });
    this.chain = run.catch(() => {});
    return run;
  }
}
