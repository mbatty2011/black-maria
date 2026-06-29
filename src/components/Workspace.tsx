"use client";

import { useMemo, useState, useTransition } from "react";
import type { FilmView } from "@/lib/orchestrator";
import type { PropOption } from "@/lib/crew/prop-master";
import type { Asset, Scene, SceneElement } from "@/lib/types";
import { changeAction, lockAction, proposeAction } from "@/app/actions";

type Tab = "breakdown" | "registry" | "wall";

export default function Workspace({
  film,
  env,
}: {
  film: FilmView;
  env: { driver: string; generator: string; crew: "claude" | "offline" };
}) {
  const [tab, setTab] = useState<Tab>("breakdown");
  const [lockTarget, setLockTarget] = useState<SceneElement | null>(null);
  const [changeTarget, setChangeTarget] = useState<Asset | null>(null);

  const { project, scenes, elements, assets, versions, generations, finance } =
    film;

  const propElements = elements.filter((e) => e.type === "prop");
  const lockedCount = assets.length;

  return (
    <div className="mt-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-edge pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-bone">
            {project.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {project.logline}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            <span className="uppercase tracking-widest text-amber">
              Style bible ·{" "}
            </span>
            {project.styleBible}
          </p>
        </div>
        <FinanceCard finance={finance} env={env} />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <nav className="mt-6 flex gap-1 text-xs uppercase tracking-widest">
        <TabButton active={tab === "breakdown"} onClick={() => setTab("breakdown")}>
          Breakdown · {scenes.length} scene{scenes.length === 1 ? "" : "s"}
        </TabButton>
        <TabButton active={tab === "registry"} onClick={() => setTab("registry")}>
          Canonical Registry · {lockedCount} locked
        </TabButton>
        <TabButton active={tab === "wall"} onClick={() => setTab("wall")}>
          Consistency Wall
        </TabButton>
      </nav>

      <div className="mt-6">
        {tab === "breakdown" && (
          <BreakdownView
            scenes={scenes}
            elements={elements}
            assets={assets}
            onLock={(el) => setLockTarget(el)}
          />
        )}
        {tab === "registry" && (
          <RegistryView
            film={film}
            onChange={(a) => setChangeTarget(a)}
          />
        )}
        {tab === "wall" && <ConsistencyWall film={film} />}
      </div>

      {propElements.length === 0 && (
        <p className="mt-6 text-xs text-muted">
          No props tagged in the breakdown.
        </p>
      )}

      {lockTarget && (
        <LockModal
          projectId={project.id}
          element={lockTarget}
          onClose={() => setLockTarget(null)}
        />
      )}
      {changeTarget && (
        <ChangeModal
          projectId={project.id}
          asset={changeTarget}
          currentSpec={
            versions.find((v) => v.id === changeTarget.currentVersionId)?.spec ??
            ""
          }
          onClose={() => setChangeTarget(null)}
        />
      )}
    </div>
  );
}

// ── Finance ──────────────────────────────────────────────────────────────────
function FinanceCard({
  finance,
  env,
}: {
  finance: FilmView["finance"];
  env: { driver: string; generator: string; crew: string };
}) {
  return (
    <div className="w-64 shrink-0 rounded-sm border border-edge bg-panel p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted">
        Finance · live total
      </div>
      <div className="mt-1 text-2xl font-bold text-signal">
        ${finance.total.toFixed(2)}
      </div>
      <dl className="mt-3 space-y-1 text-[11px] text-muted">
        <Row k="Canonical plates" v={`$${finance.referenceCost.toFixed(2)}`} />
        <Row k="Live shots" v={`$${finance.liveShotCost.toFixed(2)}`} />
        <Row
          k="Sunk (superseded)"
          v={`$${finance.sunkCost.toFixed(2)}`}
          dim
        />
        <Row
          k="Renders"
          v={`${finance.generationCount} live · ${finance.staleCount} stale`}
        />
      </dl>
      <div className="mt-3 border-t border-edge pt-2 text-[10px] text-muted">
        mem <span className="text-bone">{env.driver}</span> · crew{" "}
        <span className="text-bone">{env.crew}</span> · gen{" "}
        <span className="text-bone">{env.generator}</span>
      </div>
    </div>
  );
}

function Row({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt>{k}</dt>
      <dd className={dim ? "text-edge" : "text-bone"}>{v}</dd>
    </div>
  );
}

// ── Breakdown ─────────────────────────────────────────────────────────────────
function BreakdownView({
  scenes,
  elements,
  assets,
  onLock,
}: {
  scenes: Scene[];
  elements: SceneElement[];
  assets: Asset[];
  onLock: (e: SceneElement) => void;
}) {
  return (
    <div className="space-y-4">
      {scenes.map((scene) => {
        const els = elements.filter((e) => e.sceneId === scene.id);
        return (
          <div
            key={scene.id}
            className="rounded-sm border border-edge bg-panel/60 p-4"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-bone">
                <span className="text-amber">{scene.number}.</span>{" "}
                {scene.heading}
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-muted">
                {scene.timeOfDay}
              </span>
            </div>
            {scene.synopsis && (
              <p className="mt-1 text-xs text-muted">{scene.synopsis}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {els.length === 0 && (
                <span className="text-[11px] text-muted">No elements tagged in this scene.</span>
              )}
              {els.map((el) => {
                const asset = el.assetId
                  ? assets.find((a) => a.id === el.assetId)
                  : null;
                if (asset) {
                  return (
                    <span
                      key={el.id}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-signal/40 bg-signal/10 px-2 py-1 text-[11px] text-signal"
                      title={el.note}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" />
                      {asset.name}
                      <span className="text-signal/60">· canon</span>
                    </span>
                  );
                }
                const lockable = el.type === "prop";
                return (
                  <button
                    key={el.id}
                    disabled={!lockable}
                    onClick={() => lockable && onLock(el)}
                    title={el.note}
                    className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] transition ${
                      lockable
                        ? "border-edge bg-ink text-muted hover:border-amber hover:text-amber"
                        : "border-edge/50 bg-ink/40 text-edge"
                    }`}
                  >
                    <span className="uppercase opacity-60">{el.type}</span>
                    {el.name}
                    {lockable && <span className="text-amber">+ lock</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Canonical Registry ────────────────────────────────────────────────────────
function RegistryView({
  film,
  onChange,
}: {
  film: FilmView;
  onChange: (a: Asset) => void;
}) {
  const { assets, versions } = film;
  if (assets.length === 0) {
    return (
      <EmptyHint>
        Nothing locked yet. Open the <b>Breakdown</b>, pick a prop, and lock a
        canonical look. Locking is the one action that makes an asset canonical
        and carries it into every scene it touches.
      </EmptyHint>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {assets.map((asset) => {
        const lineage = versions
          .filter((v) => v.assetId === asset.id)
          .sort((a, b) => a.versionNo - b.versionNo);
        const current = lineage.find((v) => v.id === asset.currentVersionId);
        return (
          <div
            key={asset.id}
            className="overflow-hidden rounded-sm border border-edge bg-panel"
          >
            {current?.referenceImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.referenceImage}
                alt={asset.name}
                className="aspect-[3/2] w-full object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-bone">
                  {asset.name}
                </div>
                <span className="rounded-sm bg-amber/15 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-amber">
                  {asset.type} · v{current?.versionNo}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {current?.spec}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-edge">
                  seed {current?.seed} · signed off by {current?.signedOffBy}
                </span>
                <button
                  onClick={() => onChange(asset)}
                  className="rounded-sm border border-alarm/50 px-2.5 py-1 text-[11px] text-alarm transition hover:bg-alarm hover:text-ink"
                >
                  Change canon
                </button>
              </div>

              {lineage.length > 1 && (
                <div className="mt-3 border-t border-edge pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted">
                    Version lineage
                  </div>
                  <ol className="mt-1 space-y-0.5 text-[11px]">
                    {lineage.map((v) => (
                      <li
                        key={v.id}
                        className={
                          v.id === asset.currentVersionId
                            ? "text-signal"
                            : "text-edge line-through"
                        }
                      >
                        v{v.versionNo} · {v.spec.slice(0, 52)}
                        {v.spec.length > 52 ? "…" : ""}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Consistency Wall ──────────────────────────────────────────────────────────
function ConsistencyWall({ film }: { film: FilmView }) {
  const { assets, scenes, generations } = film;
  if (assets.length === 0) {
    return (
      <EmptyHint>
        The wall fills in once you lock a prop. Then every scene that prop
        touches shows the <b>same canonical render</b> — and a change re-renders
        the whole row at once.
      </EmptyHint>
    );
  }
  return (
    <div className="space-y-8">
      {assets.map((asset) => {
        const live = generations
          .filter((g) => g.assetId === asset.id && g.status !== "stale")
          .sort((a, b) => sceneNo(scenes, a.sceneId) - sceneNo(scenes, b.sceneId));
        const stale = generations.filter(
          (g) => g.assetId === asset.id && g.status === "stale",
        );
        return (
          <div key={asset.id}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-bone">{asset.name}</h3>
              <span className="text-[11px] text-signal">
                identical across {live.length} scene
                {live.length === 1 ? "" : "s"}
              </span>
              {stale.length > 0 && (
                <span className="text-[11px] text-edge">
                  · {stale.length} superseded in lineage
                </span>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {live.map((g) => (
                <figure key={g.id} className="w-52 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image ?? ""}
                    alt=""
                    className="w-full rounded-sm border border-edge"
                  />
                  <figcaption className="mt-1 text-[10px] text-muted">
                    Sc.{sceneNo(scenes, g.sceneId)} ·{" "}
                    {sceneHeading(scenes, g.sceneId)}
                  </figcaption>
                </figure>
              ))}
            </div>
            {stale.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-edge hover:text-muted">
                  show superseded renders (kept in lineage)
                </summary>
                <div className="mt-2 flex gap-3 overflow-x-auto pb-2 opacity-50">
                  {stale.map((g) => (
                    <figure key={g.id} className="w-40 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.image ?? ""}
                        alt=""
                        className="w-full rounded-sm border border-edge grayscale"
                      />
                      <figcaption className="mt-1 text-[10px] text-edge">
                        Sc.{sceneNo(scenes, g.sceneId)} · superseded
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

function sceneNo(scenes: Scene[], sceneId: string): number {
  return scenes.find((s) => s.id === sceneId)?.number ?? 0;
}
function sceneHeading(scenes: Scene[], sceneId: string): string {
  return scenes.find((s) => s.id === sceneId)?.heading ?? "";
}

// ── Modals ────────────────────────────────────────────────────────────────────
function LockModal({
  projectId,
  element,
  onClose,
}: {
  projectId: string;
  element: SceneElement;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<PropOption[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [label, setLabel] = useState(element.name);
  const [spec, setSpec] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [proposing, setProposing] = useState(false);

  const propose = () => {
    setProposing(true);
    proposeAction(projectId, element.id)
      .then((res) => {
        setOptions(res.options);
        setSource(res.source);
      })
      .finally(() => setProposing(false));
  };

  const lock = () => {
    if (!spec.trim()) return;
    const params =
      selected != null && options ? options[selected].params : {};
    start(async () => {
      await lockAction({
        projectId,
        elementId: element.id,
        label: label.trim() || element.name,
        spec: spec.trim(),
        params,
      });
      onClose();
    });
  };

  return (
    <Modal onClose={onClose} title={`Lock canon — “${element.name}”`}>
      <p className="text-[11px] text-muted">
        The Prop Master proposes; you lock. Locking renders the canonical
        reference and carries this look into every scene the prop touches.
      </p>

      {!options && (
        <button
          onClick={propose}
          disabled={proposing}
          className="mt-4 w-full rounded-sm border border-amber bg-amber/10 px-3 py-2 text-sm text-amber hover:bg-amber hover:text-ink disabled:opacity-50"
        >
          {proposing ? "Prop Master thinking…" : "Ask the Prop Master for options"}
        </button>
      )}

      {options && (
        <>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-muted">
            Options · {source}
          </div>
          <div className="mt-2 space-y-2">
            {options.map((o, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i);
                  setSpec(o.spec);
                  setLabel(o.label || element.name);
                }}
                className={`block w-full rounded-sm border p-3 text-left text-[12px] transition ${
                  selected === i
                    ? "border-amber bg-amber/10 text-bone"
                    : "border-edge bg-ink text-muted hover:border-amber/50"
                }`}
              >
                <div className="font-semibold text-bone">{o.label}</div>
                <div className="mt-0.5 leading-relaxed">{o.spec}</div>
              </button>
            ))}
          </div>

          <label className="mt-4 block text-[10px] uppercase tracking-widest text-muted">
            Canonical name
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-sm border border-edge bg-ink px-2 py-1.5 text-sm text-bone outline-none focus:border-amber"
          />
          <label className="mt-3 block text-[10px] uppercase tracking-widest text-muted">
            Locked spec (the anchor, editable)
          </label>
          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-sm border border-edge bg-ink px-2 py-1.5 text-sm text-bone outline-none focus:border-amber"
          />

          <button
            onClick={lock}
            disabled={pending || !spec.trim()}
            className="mt-4 w-full rounded-sm bg-signal px-3 py-2 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-50"
          >
            {pending ? "Locking & rendering…" : "🔒 Lock canon & render every scene"}
          </button>
        </>
      )}
    </Modal>
  );
}

function ChangeModal({
  projectId,
  asset,
  currentSpec,
  onClose,
}: {
  projectId: string;
  asset: Asset;
  currentSpec: string;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(asset.name);
  const [spec, setSpec] = useState(currentSpec);
  const [pending, start] = useTransition();

  const change = () => {
    if (!spec.trim()) return;
    start(async () => {
      await changeAction({
        projectId,
        assetId: asset.id,
        newLabel: label.trim() || asset.name,
        newSpec: spec.trim(),
      });
      onClose();
    });
  };

  return (
    <Modal onClose={onClose} title={`Change canon — “${asset.name}”`}>
      <p className="text-[11px] text-muted">
        Say it once. A new version supersedes the old (kept in lineage), the
        canonical reference re-renders, and every scene this asset touches
        re-renders against the new anchor. Finance re-prices automatically.
      </p>
      <p className="mt-3 rounded-sm border border-edge bg-ink p-2 text-[11px] text-muted">
        Try: <span className="text-bone">rename to “Dispatcher&rsquo;s
        walkie-talkie”</span> and rewrite the spec — the red wall phone becomes a
        handheld, everywhere, at once.
      </p>

      <label className="mt-4 block text-[10px] uppercase tracking-widest text-muted">
        New canonical name
      </label>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="mt-1 w-full rounded-sm border border-edge bg-ink px-2 py-1.5 text-sm text-bone outline-none focus:border-alarm"
      />
      <label className="mt-3 block text-[10px] uppercase tracking-widest text-muted">
        New locked spec
      </label>
      <textarea
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        rows={5}
        className="mt-1 w-full rounded-sm border border-edge bg-ink px-2 py-1.5 text-sm text-bone outline-none focus:border-alarm"
      />
      <button
        onClick={change}
        disabled={pending || !spec.trim()}
        className="mt-4 w-full rounded-sm bg-alarm px-3 py-2 text-sm font-semibold text-ink hover:bg-alarm/90 disabled:opacity-50"
      >
        {pending ? "Propagating across the film…" : "↻ Change & propagate"}
      </button>
    </Modal>
  );
}

// ── primitives ────────────────────────────────────────────────────────────────
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-sm border border-edge bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-bone">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-bone"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm px-3 py-2 transition ${
        active
          ? "bg-amber text-ink"
          : "bg-panel text-muted hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-edge bg-panel/40 p-8 text-center text-sm leading-relaxed text-muted">
      {children}
    </div>
  );
}
