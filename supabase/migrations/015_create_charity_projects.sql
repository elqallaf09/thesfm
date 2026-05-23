create table if not exists public.charity_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text default 'other',
  status text default 'planning',
  target_amount numeric default 0,
  collected_amount numeric default 0,
  currency text default 'KWD',
  start_date date,
  end_date date,
  organization_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.charity_project_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.charity_projects(id) on delete cascade,
  amount numeric not null,
  currency text default 'KWD',
  donation_date date default current_date,
  donation_type text default 'donation',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.zakat_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  asset_name text not null,
  asset_type text default 'cash',
  amount numeric default 0,
  currency text default 'KWD',
  ownership_date date,
  zakat_due_date date,
  is_zakatable boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.charity_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric default 0,
  currency text default 'KWD',
  frequency text default 'monthly',
  next_due_date date,
  category text default 'other',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_projects_user_id_idx on public.charity_projects(user_id);
create index if not exists charity_projects_status_idx on public.charity_projects(status);
create index if not exists charity_project_donations_user_id_idx on public.charity_project_donations(user_id);
create index if not exists charity_project_donations_project_id_idx on public.charity_project_donations(project_id);
create index if not exists zakat_assets_user_id_idx on public.zakat_assets(user_id);
create index if not exists charity_commitments_user_id_idx on public.charity_commitments(user_id);

alter table public.charity_projects enable row level security;
alter table public.charity_project_donations enable row level security;
alter table public.zakat_assets enable row level security;
alter table public.charity_commitments enable row level security;

drop policy if exists "Users can select own charity projects" on public.charity_projects;
create policy "Users can select own charity projects"
on public.charity_projects for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity projects" on public.charity_projects;
create policy "Users can insert own charity projects"
on public.charity_projects for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity projects" on public.charity_projects;
create policy "Users can update own charity projects"
on public.charity_projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity projects" on public.charity_projects;
create policy "Users can delete own charity projects"
on public.charity_projects for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own charity project donations" on public.charity_project_donations;
create policy "Users can select own charity project donations"
on public.charity_project_donations for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity project donations" on public.charity_project_donations;
create policy "Users can insert own charity project donations"
on public.charity_project_donations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity project donations" on public.charity_project_donations;
create policy "Users can update own charity project donations"
on public.charity_project_donations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity project donations" on public.charity_project_donations;
create policy "Users can delete own charity project donations"
on public.charity_project_donations for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own zakat assets" on public.zakat_assets;
create policy "Users can select own zakat assets"
on public.zakat_assets for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own zakat assets" on public.zakat_assets;
create policy "Users can insert own zakat assets"
on public.zakat_assets for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own zakat assets" on public.zakat_assets;
create policy "Users can update own zakat assets"
on public.zakat_assets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own zakat assets" on public.zakat_assets;
create policy "Users can delete own zakat assets"
on public.zakat_assets for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own charity commitments" on public.charity_commitments;
create policy "Users can select own charity commitments"
on public.charity_commitments for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity commitments" on public.charity_commitments;
create policy "Users can insert own charity commitments"
on public.charity_commitments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity commitments" on public.charity_commitments;
create policy "Users can update own charity commitments"
on public.charity_commitments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity commitments" on public.charity_commitments;
create policy "Users can delete own charity commitments"
on public.charity_commitments for delete
using (auth.uid() = user_id);
