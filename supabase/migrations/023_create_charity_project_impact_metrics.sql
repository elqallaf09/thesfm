create table if not exists public.charity_project_impact_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.charity_projects(id) on delete cascade not null,
  metric_name text not null,
  metric_value numeric default 0,
  metric_unit text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_project_impact_metrics_user_id_idx
on public.charity_project_impact_metrics(user_id);

create index if not exists charity_project_impact_metrics_project_id_idx
on public.charity_project_impact_metrics(project_id);

alter table public.charity_project_impact_metrics enable row level security;

drop policy if exists "Users can select own charity impact metrics" on public.charity_project_impact_metrics;
create policy "Users can select own charity impact metrics"
on public.charity_project_impact_metrics for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity impact metrics" on public.charity_project_impact_metrics;
create policy "Users can insert own charity impact metrics"
on public.charity_project_impact_metrics for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity impact metrics" on public.charity_project_impact_metrics;
create policy "Users can update own charity impact metrics"
on public.charity_project_impact_metrics for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity impact metrics" on public.charity_project_impact_metrics;
create policy "Users can delete own charity impact metrics"
on public.charity_project_impact_metrics for delete
using (auth.uid() = user_id);
