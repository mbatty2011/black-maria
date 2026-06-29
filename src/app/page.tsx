import Link from "next/link";
import { listProjects } from "@/lib/orchestrator";
import { getStore } from "@/lib/store";
import { getGenerator } from "@/lib/generators/registry";
import { hasClaude } from "@/lib/crew/anthropic";
import { bootstrapAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();
  const driver = getStore().driver;
  const generator = getGenerator().name;
  const crew = hasClaude() ? "claude (opus)" : "offline";

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-amber">
          The Production Brain
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-bone sm:text-5xl">
          Black Maria <span className="text-amber">2.0</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Not a generator. The orchestration layer those tools are missing: one
          shared memory that breaks a script into every element, holds a{" "}
          <span className="text-bone">canonical, locked version</span> of each,
          injects it into every render so the world stays consistent, and
          propagates a change across the whole film the moment you make it.
        </p>
      </header>

      <StatusBar driver={driver} generator={generator} crew={crew} />

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-muted">
            Films in memory
          </h2>
          <form action={bootstrapAction}>
            <button
              type="submit"
              className="rounded-sm border border-amber bg-amber/10 px-4 py-2 text-sm font-semibold text-amber transition hover:bg-amber hover:text-ink"
            >
              + Load the sample film
            </button>
          </form>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-sm border border-dashed border-edge bg-panel/40 p-10 text-center">
            <p className="text-sm text-muted">
              No films yet. Load{" "}
              <span className="text-bone">&ldquo;The Last Drop&rdquo;</span> — a
              tiny neo-noir where one prop recurs across scenes — to watch the
              consistency loop and a change propagate.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/film/${p.id}`}
                  className="block rounded-sm border border-edge bg-panel p-5 transition hover:border-amber/60 hover:bg-panel/80"
                >
                  <div className="text-lg font-semibold text-bone">
                    {p.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {p.logline}
                  </p>
                  <div className="mt-3 text-[10px] uppercase tracking-widest text-edge">
                    {new Date(p.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-20 border-t border-edge pt-6 text-[11px] leading-relaxed text-muted">
        <p>
          The wedge: <span className="text-bone">models commoditize,
          organization doesn&rsquo;t.</span> Generation lives behind a swappable
          adapter — the brain owns the anchors and consistency; the generator
          just renders.
        </p>
      </footer>
    </main>
  );
}

function StatusBar({
  driver,
  generator,
  crew,
}: {
  driver: string;
  generator: string;
  crew: string;
}) {
  const items = [
    {
      label: "Memory",
      value: driver === "supabase" ? "Supabase Postgres" : "Local file store",
      live: driver === "supabase",
    },
    { label: "Crew", value: crew, live: crew.startsWith("claude") },
    { label: "Generator", value: generator, live: generator !== "stub" },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-sm border border-edge bg-edge sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="bg-panel px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {it.label}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-bone">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                it.live ? "bg-signal" : "bg-amber"
              }`}
            />
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
