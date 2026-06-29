import Link from "next/link";
import { notFound } from "next/navigation";
import { getFilm } from "@/lib/orchestrator";
import { getStore } from "@/lib/store";
import { getGenerator } from "@/lib/generators/registry";
import { hasClaude } from "@/lib/crew/anthropic";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default async function FilmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const film = await getFilm(id);
  if (!film) notFound();

  const env = {
    driver: getStore().driver,
    generator: getGenerator().name,
    crew: hasClaude() ? ("claude" as const) : ("offline" as const),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-muted hover:text-amber"
      >
        ← all films
      </Link>
      <Workspace film={film} env={env} />
    </main>
  );
}
