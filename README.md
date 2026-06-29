# Black Maria 2.0 — the production brain

**▶ Live demo: [black-maria.vercel.app](https://black-maria.vercel.app)** ·
**Code: [github.com/mbatty2011/black-maria](https://github.com/mbatty2011/black-maria)**

> Not a generator. The orchestration layer those tools are missing: one shared
> memory that breaks a script into every element, holds a **canonical, locked
> version** of each, injects it into every render so the world stays consistent,
> and propagates a change across the whole film the moment you make it.

The wedge: **models commoditize, organization doesn't.** Everyone is racing on
generation. Almost no one is winning on structure and consistency. That lane is
open — and it's what this owns.

---

## What v1 proves (less, better)

This is the **spine**, not the whole studio: shared memory + a canonical asset
registry + consistency injection + change propagation, wired to **one** element
type (props) end-to-end. The thesis is proven by **one prop staying consistent
across several scenes and surviving a change** — not by building every
department.

The included sample film, _"The Last Drop"_, is a tiny neo-noir where one prop —
the dispatcher's red wall phone — recurs across four scenes. In the app you:

1. **Hand in the script** → the Line Producer breaks it down scene by scene.
2. **Lock a canonical look** for the phone → it renders a reference plate and
   carries that exact look into every scene it touches. _Consistency, visible:_
   the same render appears in all four scenes (same seed).
3. **Change it** — "the red phone is now a walkie-talkie." Say it once → a new
   version supersedes the old (kept in lineage), the reference re-renders, every
   scene re-renders against the new anchor, and Finance re-prices. _Propagation,
   visible._

Run it headless to see the whole loop in your terminal:

```bash
npm install
npm run slice
```

```
→ Prop "red wall phone" appears across 4 scenes.
  ✓ 4 shots rendered. Distinct canon seeds: 1 → IDENTICAL across every scene (consistent ✅)
→ Director: "the red phone is now a walkie-talkie." Say it once…
  ✓ propagated: 4 scenes re-rendered. Asset is now "Dispatcher's walkie-talkie", v2
  Finance re-priced: live $0.40 (sunk $0.16 preserved).
```

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000 — click "Load the sample film"
```

**Zero setup, zero keys.** With no environment variables the app runs on a local
JSON file-store (`.data/memory.json`), a deterministic offline "crew", and a
stub generator that renders repeatable SVG stills — so consistency is something
you can _see_ without paying any model.

Set the optional env vars (below) to turn it into the hostable production brain.

---

## The architecture

One **shared memory** holds the four things the whole crew works off of, woven
together (`src/lib/types.ts`):

1. **The breakdown** — scenes, and every element in each scene.
2. **The canonical asset registry** — the locked source-of-truth look of each
   element (prop sheets, and later character/set bibles).
3. **Version lineage** — every version of every asset, with what it superseded
   and who signed it off.
4. **Cost** — attached to every version and every generation.

Everything is a **swappable seam**:

| Seam | Default (v1) | Production | Where |
| --- | --- | --- | --- |
| **Storage** | JSON file store | Supabase Postgres | `src/lib/store/` |
| **Crew brain** | deterministic offline | Claude (Opus) | `src/lib/crew/` |
| **Generator** | deterministic SVG stub | fal / Magnific (seam) | `src/lib/generators/` |

The orchestration brain above these seams never changes — it owns the anchors
and consistency; the generator just renders. New model drops next month → add an
adapter in `src/lib/generators/registry.ts`; the film's memory and look are
untouched.

**Consistency injection** (`src/lib/consistency.ts`) is the heart: a generation
call is never "make a phone." It's "make _this_ phone, in _this_ world, for
_this_ scene," with every anchor pulled from memory and the seed bound to the
canonical spec.

**Change propagation** (`src/lib/orchestrator.ts → changeAsset`): one edit makes
a new version, marks old renders stale (kept in lineage), re-renders the
reference and every scene the asset touches, and Finance re-prices because it
just reads the memory.

```
src/
  lib/
    types.ts            the shared-memory data model
    store/              swappable storage: file ⇄ supabase
    crew/               line-producer, prop-master, anthropic client (+ offline)
    generators/         adapter contract, stub adapter, real-adapter seam, router
    consistency.ts      anchor-injected prompt + seed building
    pricing.ts          Finance — prices anything from the memory
    orchestrator.ts     bootstrap · propose · LOCK · CHANGE
    sample.ts           "The Last Drop" sample script
  app/
    page.tsx            film list + bootstrap
    film/[id]/page.tsx  the workspace
    actions.ts          server actions
  components/Workspace.tsx   breakdown · registry · consistency wall
scripts/run-slice.ts    headless proof of the whole loop
supabase/schema.sql     Postgres tables
```

---

## Deploy — Vercel + Supabase

This is built to host on Vercel with Supabase as the shared memory.

### 1. Supabase (the memory)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query →** paste [`supabase/schema.sql`](supabase/schema.sql)
   → **Run**.
3. **Settings → API**, copy the **Project URL** and the **`service_role`** key.

### 2. Vercel (the app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mbatty2011/black-maria&env=NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY&envDescription=Supabase%20gives%20the%20brain%20persistent%20memory%3B%20Anthropic%20powers%20the%20crew%20(both%20optional%20for%20a%20demo).)

Or from the CLI:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL      # from Supabase
vercel env add SUPABASE_SERVICE_ROLE_KEY     # from Supabase (server-only)
vercel env add ANTHROPIC_API_KEY             # optional — turns the crew on
vercel --prod
```

### Environment variables

| Var | Required | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Switches storage to Supabase Postgres. |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Server-only key. **Never expose to the browser.** |
| `ANTHROPIC_API_KEY` | optional | Runs the Line Producer + Prop Master on Claude (Opus). Offline fallback otherwise. |
| `GENERATOR_BACKEND` | optional | `stub` (default) or `real` (wire a provider in `real-adapter.ts`). |

> On Vercel's serverless filesystem the file-store is ephemeral — that's exactly
> what the Supabase driver is for. Set the two Supabase vars and memory persists.

---

## The framing

Edison's first studio — the Black Maria — was built around a camera that
couldn't move, so the whole film was staged inside the frame. This inverts it:
build the entire film inside the system first — every element defined, locked,
and rendered — then either shoot it live or render it through generators. Same
brain either way. What it guarantees is that the film stays **organized and
consistent** the whole way through.

## License

MIT — see [LICENSE](LICENSE).
