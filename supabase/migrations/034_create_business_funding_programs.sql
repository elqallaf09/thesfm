create table if not exists public.business_funding_programs (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  name_fr text,
  funding_type text not null default 'other',
  country text,
  region text,
  provider_name text,
  website_url text,
  contact_email text,
  contact_phone text,
  description_ar text,
  description_en text,
  description_fr text,
  eligibility_summary_ar text,
  eligibility_summary_en text,
  eligibility_summary_fr text,
  typical_ticket_min numeric,
  typical_ticket_max numeric,
  currency text default 'KWD',
  application_url text,
  application_deadline date,
  data_status text default 'unverified',
  data_source_url text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint business_funding_programs_type_check check (
    funding_type in (
      'self_funding',
      'bank_loan',
      'government_fund',
      'angel',
      'venture_capital',
      'accelerator',
      'incubator',
      'islamic_finance',
      'grant',
      'strategic_partner',
      'other'
    )
  ),
  constraint business_funding_programs_status_check check (
    data_status in ('verified', 'pending_review', 'unverified', 'outdated')
  ),
  unique (name_ar, provider_name, country)
);

alter table public.business_funding_programs enable row level security;

drop policy if exists "Users can read active funding programs" on public.business_funding_programs;
create policy "Users can read active funding programs"
on public.business_funding_programs for select
using (is_active = true);

create table if not exists public.project_funding_shortlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  funding_program_id uuid references public.business_funding_programs(id) on delete cascade,
  status text default 'saved',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint project_funding_shortlist_status_check check (
    status in ('saved', 'reviewing', 'preparing', 'applied', 'rejected', 'accepted', 'archived')
  ),
  unique (user_id, project_id, funding_program_id)
);

create index if not exists project_funding_shortlist_user_project_idx
on public.project_funding_shortlist(user_id, project_id);

alter table public.project_funding_shortlist enable row level security;

drop policy if exists "Users can select own funding shortlist" on public.project_funding_shortlist;
create policy "Users can select own funding shortlist"
on public.project_funding_shortlist for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own funding shortlist" on public.project_funding_shortlist;
create policy "Users can insert own funding shortlist"
on public.project_funding_shortlist for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own funding shortlist" on public.project_funding_shortlist;
create policy "Users can update own funding shortlist"
on public.project_funding_shortlist for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own funding shortlist" on public.project_funding_shortlist;
create policy "Users can delete own funding shortlist"
on public.project_funding_shortlist for delete
using (auth.uid() = user_id);
