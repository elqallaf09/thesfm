create table if not exists public.charity_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.charity_projects(id) on delete set null,
  reference_code text,
  display_name text not null,
  category text default 'other',
  organization_name text,
  country text,
  city text,
  monthly_support_amount numeric default 0,
  currency text default 'KWD',
  sponsorship_start_date date,
  sponsorship_end_date date,
  next_renewal_date date,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_beneficiaries_user_id_idx on public.charity_beneficiaries(user_id);
create index if not exists charity_beneficiaries_project_id_idx on public.charity_beneficiaries(project_id);
create index if not exists charity_beneficiaries_status_idx on public.charity_beneficiaries(status);
create index if not exists charity_beneficiaries_category_idx on public.charity_beneficiaries(category);
create index if not exists charity_beneficiaries_next_renewal_idx on public.charity_beneficiaries(next_renewal_date);

alter table public.charity_beneficiaries enable row level security;

drop policy if exists "Users can select own charity beneficiaries" on public.charity_beneficiaries;
create policy "Users can select own charity beneficiaries"
on public.charity_beneficiaries for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity beneficiaries" on public.charity_beneficiaries;
create policy "Users can insert own charity beneficiaries"
on public.charity_beneficiaries for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity beneficiaries" on public.charity_beneficiaries;
create policy "Users can update own charity beneficiaries"
on public.charity_beneficiaries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity beneficiaries" on public.charity_beneficiaries;
create policy "Users can delete own charity beneficiaries"
on public.charity_beneficiaries for delete
using (auth.uid() = user_id);
