create table if not exists public.project_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  amount numeric not null default 0,
  currency text default 'KWD',
  income_date date default current_date,
  category text default 'general',
  source text,
  description text,
  notes text,
  transferred_to_personal_income boolean default false,
  personal_income_id uuid null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_income_user_id_idx
on public.project_income(user_id);

create index if not exists project_income_project_id_idx
on public.project_income(project_id);

create index if not exists project_income_income_date_idx
on public.project_income(income_date);

alter table public.project_income enable row level security;

drop policy if exists "Users can select own project income" on public.project_income;
create policy "Users can select own project income"
on public.project_income for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project income" on public.project_income;
create policy "Users can insert own project income"
on public.project_income for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project income" on public.project_income;
create policy "Users can update own project income"
on public.project_income for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project income" on public.project_income;
create policy "Users can delete own project income"
on public.project_income for delete
using (auth.uid() = user_id);

alter table public.monthly_income_sources
add column if not exists project_id uuid references public.projects(id) on delete set null,
add column if not exists project_income_id uuid references public.project_income(id) on delete set null,
add column if not exists transferred_to_personal_income boolean default false;

create index if not exists monthly_income_sources_project_id_idx
on public.monthly_income_sources(project_id);

create index if not exists monthly_income_sources_project_income_id_idx
on public.monthly_income_sources(project_income_id);
