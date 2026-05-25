create table if not exists public.project_funding_readiness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  funding_needed numeric default 0,
  currency text default 'KWD',
  funding_type text,
  use_of_funds jsonb default '{}'::jsonb,
  readiness_score numeric default 0,
  checklist jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

create index if not exists project_funding_readiness_user_project_idx
on public.project_funding_readiness(user_id, project_id);

alter table public.project_funding_readiness enable row level security;

drop policy if exists "Users can select own project funding readiness" on public.project_funding_readiness;
create policy "Users can select own project funding readiness"
on public.project_funding_readiness for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project funding readiness" on public.project_funding_readiness;
create policy "Users can insert own project funding readiness"
on public.project_funding_readiness for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project funding readiness" on public.project_funding_readiness;
create policy "Users can update own project funding readiness"
on public.project_funding_readiness for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project funding readiness" on public.project_funding_readiness;
create policy "Users can delete own project funding readiness"
on public.project_funding_readiness for delete
using (auth.uid() = user_id);
