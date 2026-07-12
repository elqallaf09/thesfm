-- Phase 2.9 — Investor Experience.
-- Secure investor share links, access events, project risks, investor
-- questions, and a due-diligence checklist. All tables are user-owned with
-- strict RLS; the public investor viewer only reaches this data through the
-- server-side token route (service role), never through anon table access.

-- ── Secure investor links ──────────────────────────────────────────────
create table if not exists public.project_investor_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  label text,
  -- SHA-256 of the URL token; the raw token is shown to the owner once.
  token_hash text not null unique,
  -- scrypt:<salt>:<hash>; null means no password gate.
  password_hash text,
  investor_message text,
  visible_sections jsonb default '[]'::jsonb,
  allow_downloads boolean default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_investor_links_user_project_idx
on public.project_investor_links(user_id, project_id);

alter table public.project_investor_links enable row level security;

drop policy if exists "Users can select own investor links" on public.project_investor_links;
create policy "Users can select own investor links"
on public.project_investor_links for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own investor links" on public.project_investor_links;
create policy "Users can insert own investor links"
on public.project_investor_links for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own investor links" on public.project_investor_links;
create policy "Users can update own investor links"
on public.project_investor_links for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own investor links" on public.project_investor_links;
create policy "Users can delete own investor links"
on public.project_investor_links for delete
using (auth.uid() = user_id);

-- ── Investor access events (activity log) ──────────────────────────────
create table if not exists public.project_investor_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  link_id uuid references public.project_investor_links(id) on delete set null,
  event_type text not null,
  section text,
  investor_label text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists project_investor_events_user_project_idx
on public.project_investor_events(user_id, project_id, created_at desc);

alter table public.project_investor_events enable row level security;

-- Owners read and prune their own log. Public-viewer events are written by
-- the server route with the service role; the owner may also record events
-- for own actions (e.g. link revoked).
drop policy if exists "Users can select own investor events" on public.project_investor_events;
create policy "Users can select own investor events"
on public.project_investor_events for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own investor events" on public.project_investor_events;
create policy "Users can insert own investor events"
on public.project_investor_events for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own investor events" on public.project_investor_events;
create policy "Users can delete own investor events"
on public.project_investor_events for delete
using (auth.uid() = user_id);

-- ── Project risks ───────────────────────────────────────────────────────
create table if not exists public.project_risks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  category text default 'market',
  severity text default 'medium',
  probability text default 'medium',
  impact text,
  mitigation text,
  owner_label text,
  status text default 'open',
  last_review_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_risks_user_project_idx
on public.project_risks(user_id, project_id);

alter table public.project_risks enable row level security;

drop policy if exists "Users can select own project risks" on public.project_risks;
create policy "Users can select own project risks"
on public.project_risks for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project risks" on public.project_risks;
create policy "Users can insert own project risks"
on public.project_risks for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project risks" on public.project_risks;
create policy "Users can update own project risks"
on public.project_risks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project risks" on public.project_risks;
create policy "Users can delete own project risks"
on public.project_risks for delete
using (auth.uid() = user_id);

-- ── Investor questions ──────────────────────────────────────────────────
create table if not exists public.project_investor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  link_id uuid references public.project_investor_links(id) on delete set null,
  question text not null,
  category text default 'general',
  asked_by text,
  response text,
  -- internal_note is owner-only and must never reach the public viewer.
  internal_note text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_investor_questions_user_project_idx
on public.project_investor_questions(user_id, project_id, created_at desc);

alter table public.project_investor_questions enable row level security;

drop policy if exists "Users can select own investor questions" on public.project_investor_questions;
create policy "Users can select own investor questions"
on public.project_investor_questions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own investor questions" on public.project_investor_questions;
create policy "Users can insert own investor questions"
on public.project_investor_questions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own investor questions" on public.project_investor_questions;
create policy "Users can update own investor questions"
on public.project_investor_questions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own investor questions" on public.project_investor_questions;
create policy "Users can delete own investor questions"
on public.project_investor_questions for delete
using (auth.uid() = user_id);

-- ── Due-diligence checklist ─────────────────────────────────────────────
create table if not exists public.project_due_diligence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  group_key text not null,
  item_key text not null,
  required boolean default true,
  status text default 'missing',
  owner_label text,
  document_id uuid,
  note text,
  last_review_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id, group_key, item_key)
);

create index if not exists project_due_diligence_items_user_project_idx
on public.project_due_diligence_items(user_id, project_id);

alter table public.project_due_diligence_items enable row level security;

drop policy if exists "Users can select own due diligence items" on public.project_due_diligence_items;
create policy "Users can select own due diligence items"
on public.project_due_diligence_items for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own due diligence items" on public.project_due_diligence_items;
create policy "Users can insert own due diligence items"
on public.project_due_diligence_items for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own due diligence items" on public.project_due_diligence_items;
create policy "Users can update own due diligence items"
on public.project_due_diligence_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own due diligence items" on public.project_due_diligence_items;
create policy "Users can delete own due diligence items"
on public.project_due_diligence_items for delete
using (auth.uid() = user_id);
