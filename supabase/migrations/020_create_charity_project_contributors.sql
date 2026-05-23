create table if not exists public.charity_project_contributors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.charity_projects(id) on delete cascade not null,
  contributor_name text not null,
  contributor_email text,
  role text default 'contributor',
  pledged_amount numeric default 0,
  paid_amount numeric default 0,
  currency text default 'KWD',
  payment_status text default 'pending',
  due_date date,
  notes text,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_project_contributors_user_id_idx on public.charity_project_contributors(user_id);
create index if not exists charity_project_contributors_project_id_idx on public.charity_project_contributors(project_id);
create index if not exists charity_project_contributors_payment_status_idx on public.charity_project_contributors(payment_status);
create index if not exists charity_project_contributors_due_date_idx on public.charity_project_contributors(due_date);

alter table public.charity_project_contributors enable row level security;

drop policy if exists "Users can select own charity project contributors" on public.charity_project_contributors;
create policy "Users can select own charity project contributors"
on public.charity_project_contributors for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.charity_projects
    where charity_projects.id = charity_project_contributors.project_id
    and charity_projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own charity project contributors" on public.charity_project_contributors;
create policy "Users can insert own charity project contributors"
on public.charity_project_contributors for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.charity_projects
    where charity_projects.id = charity_project_contributors.project_id
    and charity_projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own charity project contributors" on public.charity_project_contributors;
create policy "Users can update own charity project contributors"
on public.charity_project_contributors for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.charity_projects
    where charity_projects.id = charity_project_contributors.project_id
    and charity_projects.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.charity_projects
    where charity_projects.id = charity_project_contributors.project_id
    and charity_projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own charity project contributors" on public.charity_project_contributors;
create policy "Users can delete own charity project contributors"
on public.charity_project_contributors for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.charity_projects
    where charity_projects.id = charity_project_contributors.project_id
    and charity_projects.user_id = auth.uid()
  )
);
