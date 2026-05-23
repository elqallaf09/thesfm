create table if not exists public.charity_organizations (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  name_fr text,
  license_number text,
  country text default 'Kuwait',
  city text,
  organization_type text default 'charity',
  website_url text,
  phone text,
  email text,
  address text,
  verification_status text default 'unverified',
  transparency_score integer default 0,
  efficiency_score integer default 0,
  track_record_score integer default 0,
  notes text,
  data_source text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.charity_organizations
  add constraint charity_organizations_type_check
  check (organization_type in ('charity', 'zakat_house', 'humanitarian', 'waqf', 'mosque', 'education', 'relief', 'other')) not valid;

alter table public.charity_organizations
  add constraint charity_organizations_verification_check
  check (verification_status in ('verified', 'pending_review', 'unverified', 'rejected')) not valid;

create index if not exists charity_organizations_active_idx on public.charity_organizations(is_active);
create index if not exists charity_organizations_type_idx on public.charity_organizations(organization_type);
create index if not exists charity_organizations_verification_idx on public.charity_organizations(verification_status);
create index if not exists charity_organizations_license_idx on public.charity_organizations(license_number);
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'charity_organizations_license_unique'
  ) then
    alter table public.charity_organizations
    add constraint charity_organizations_license_unique unique (license_number);
  end if;
end $$;

alter table public.charity_projects
add column if not exists organization_id uuid references public.charity_organizations(id) on delete set null;

alter table public.charity_project_donations
add column if not exists organization_id uuid references public.charity_organizations(id) on delete set null;

create index if not exists charity_projects_organization_id_idx on public.charity_projects(organization_id);
create index if not exists charity_project_donations_organization_id_idx on public.charity_project_donations(organization_id);

alter table public.charity_organizations enable row level security;

drop policy if exists "Anyone can select active charity organizations" on public.charity_organizations;
create policy "Anyone can select active charity organizations"
on public.charity_organizations for select
using (is_active = true);

-- No insert/update/delete policies are created for normal users.
-- Supabase service role/admin access bypasses RLS for trusted server-side imports.
