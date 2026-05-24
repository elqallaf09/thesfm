create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  phase text default 'planning',
  start_date date,
  due_date date,
  completed_at timestamptz,
  assigned_to text,
  estimated_cost numeric default 0,
  actual_cost numeric default 0,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  status text default 'planned',
  progress_percent numeric default 0,
  related_task_ids jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_tasks_user_project_idx
on public.project_tasks(user_id, project_id);

create index if not exists project_tasks_due_date_idx
on public.project_tasks(due_date);

create index if not exists project_milestones_user_project_idx
on public.project_milestones(user_id, project_id);

create index if not exists project_milestones_target_date_idx
on public.project_milestones(target_date);

alter table public.project_tasks enable row level security;
alter table public.project_milestones enable row level security;

drop policy if exists "Users can select own project tasks" on public.project_tasks;
create policy "Users can select own project tasks"
on public.project_tasks for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project tasks" on public.project_tasks;
create policy "Users can insert own project tasks"
on public.project_tasks for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project tasks" on public.project_tasks;
create policy "Users can update own project tasks"
on public.project_tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project tasks" on public.project_tasks;
create policy "Users can delete own project tasks"
on public.project_tasks for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own project milestones" on public.project_milestones;
create policy "Users can select own project milestones"
on public.project_milestones for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project milestones" on public.project_milestones;
create policy "Users can insert own project milestones"
on public.project_milestones for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project milestones" on public.project_milestones;
create policy "Users can update own project milestones"
on public.project_milestones for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project milestones" on public.project_milestones;
create policy "Users can delete own project milestones"
on public.project_milestones for delete
using (auth.uid() = user_id);
