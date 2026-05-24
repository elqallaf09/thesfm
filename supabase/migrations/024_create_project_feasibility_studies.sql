create table if not exists public.project_feasibility_studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  market_data jsonb default '{}'::jsonb,
  technical_data jsonb default '{}'::jsonb,
  financial_data jsonb default '{}'::jsonb,
  legal_data jsonb default '{}'::jsonb,
  feasibility_score numeric default 0,
  feasibility_status text default 'incomplete',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

create index if not exists project_feasibility_studies_user_id_idx
on public.project_feasibility_studies(user_id);

create index if not exists project_feasibility_studies_project_id_idx
on public.project_feasibility_studies(project_id);

alter table public.project_feasibility_studies enable row level security;

drop policy if exists "Users can select own project feasibility studies" on public.project_feasibility_studies;
create policy "Users can select own project feasibility studies"
on public.project_feasibility_studies for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project feasibility studies" on public.project_feasibility_studies;
create policy "Users can insert own project feasibility studies"
on public.project_feasibility_studies for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project feasibility studies" on public.project_feasibility_studies;
create policy "Users can update own project feasibility studies"
on public.project_feasibility_studies for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project feasibility studies" on public.project_feasibility_studies;
create policy "Users can delete own project feasibility studies"
on public.project_feasibility_studies for delete
using (auth.uid() = user_id);
