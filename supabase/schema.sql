-- ─────────────────────────────────────────────────────────────────────────────
-- Black Maria 2.0 — Supabase schema.
--
-- Run this once in your Supabase project (SQL Editor → paste → Run), then set
-- NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The app will switch
-- from the local file driver to Postgres automatically.
--
-- Each table stores one collection of the shared memory as jsonb documents, so
-- the TypeScript types in src/lib/types.ts stay the single source of truth.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists bm_projects (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_scripts (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_scenes (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_elements (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_assets (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_versions (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists bm_generations (
  id          text primary key,
  project_id  text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Helpful indexes for filtering a single film's memory.
create index if not exists bm_scenes_project      on bm_scenes (project_id);
create index if not exists bm_elements_project    on bm_elements (project_id);
create index if not exists bm_assets_project      on bm_assets (project_id);
create index if not exists bm_versions_project    on bm_versions (project_id);
create index if not exists bm_generations_project on bm_generations (project_id);

-- The app talks to Postgres only through the server-side service-role key, so
-- Row Level Security can stay enabled with no public policies. Uncomment to
-- lock the tables down explicitly:
--
-- alter table bm_projects    enable row level security;
-- alter table bm_scripts     enable row level security;
-- alter table bm_scenes      enable row level security;
-- alter table bm_elements    enable row level security;
-- alter table bm_assets      enable row level security;
-- alter table bm_versions    enable row level security;
-- alter table bm_generations enable row level security;
