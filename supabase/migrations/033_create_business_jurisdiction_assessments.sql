create table if not exists public.business_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  country_name_ar text not null,
  country_name_en text,
  country_name_fr text,
  region text default 'GCC',
  data_status text default 'unverified',
  official_source_url text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_jurisdictions enable row level security;

drop policy if exists "Public can read active business jurisdictions" on public.business_jurisdictions;
create policy "Public can read active business jurisdictions"
on public.business_jurisdictions for select
using (is_active = true);

insert into public.business_jurisdictions (country_code, country_name_ar, country_name_en, country_name_fr, region, data_status)
values
  ('kuwait', 'الكويت', 'Kuwait', 'Koweït', 'GCC', 'unverified'),
  ('saudi-arabia', 'السعودية', 'Saudi Arabia', 'Arabie saoudite', 'GCC', 'unverified'),
  ('uae', 'الإمارات', 'UAE', 'EAU', 'GCC', 'unverified'),
  ('qatar', 'قطر', 'Qatar', 'Qatar', 'GCC', 'unverified'),
  ('bahrain', 'البحرين', 'Bahrain', 'Bahreïn', 'GCC', 'unverified'),
  ('oman', 'عُمان', 'Oman', 'Oman', 'GCC', 'unverified'),
  ('global-other', 'عالمي / أخرى', 'Global / Other', 'Global / Autre', 'Global', 'unverified')
on conflict (country_code) do update
set
  country_name_ar = excluded.country_name_ar,
  country_name_en = excluded.country_name_en,
  country_name_fr = excluded.country_name_fr,
  region = excluded.region,
  data_status = 'unverified',
  updated_at = now();

create table if not exists public.project_jurisdiction_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  inputs jsonb default '{}'::jsonb,
  results jsonb default '{}'::jsonb,
  recommended_jurisdictions jsonb default '[]'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

create index if not exists project_jurisdiction_assessments_user_project_idx
on public.project_jurisdiction_assessments(user_id, project_id);

alter table public.project_jurisdiction_assessments enable row level security;

drop policy if exists "Users can select own jurisdiction assessments" on public.project_jurisdiction_assessments;
create policy "Users can select own jurisdiction assessments"
on public.project_jurisdiction_assessments for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own jurisdiction assessments" on public.project_jurisdiction_assessments;
create policy "Users can insert own jurisdiction assessments"
on public.project_jurisdiction_assessments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own jurisdiction assessments" on public.project_jurisdiction_assessments;
create policy "Users can update own jurisdiction assessments"
on public.project_jurisdiction_assessments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own jurisdiction assessments" on public.project_jurisdiction_assessments;
create policy "Users can delete own jurisdiction assessments"
on public.project_jurisdiction_assessments for delete
using (auth.uid() = user_id);
