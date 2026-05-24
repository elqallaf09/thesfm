create table if not exists public.project_financial_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  assumptions jsonb default '{}'::jsonb,
  revenue_streams jsonb default '[]'::jsonb,
  cost_items jsonb default '[]'::jsonb,
  scenarios jsonb default '{}'::jsonb,
  forecast jsonb default '[]'::jsonb,
  kpis jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

create index if not exists project_financial_models_user_id_idx
on public.project_financial_models(user_id);

create index if not exists project_financial_models_project_id_idx
on public.project_financial_models(project_id);

alter table public.project_financial_models enable row level security;

drop policy if exists "Users can select own project financial models" on public.project_financial_models;
create policy "Users can select own project financial models"
on public.project_financial_models for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project financial models" on public.project_financial_models;
create policy "Users can insert own project financial models"
on public.project_financial_models for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project financial models" on public.project_financial_models;
create policy "Users can update own project financial models"
on public.project_financial_models for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project financial models" on public.project_financial_models;
create policy "Users can delete own project financial models"
on public.project_financial_models for delete
using (auth.uid() = user_id);
