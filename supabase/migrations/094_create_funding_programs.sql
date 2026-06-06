create table if not exists public.funding_programs (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  name_fr text,
  country text,
  funding_type text not null default 'other',
  provider_type text,
  description_ar text,
  description_en text,
  description_fr text,
  currency text default 'KWD',
  min_amount numeric,
  max_amount numeric,
  eligibility_requirements jsonb,
  required_documents jsonb,
  official_url text,
  is_verified boolean not null default false,
  source_name text,
  business_activity text,
  required_readiness_score integer default 70,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_programs_type_check check (
    funding_type in (
      'bank_loan',
      'sme_financing',
      'government_support',
      'startup_grant',
      'investor_funding',
      'revenue_based_financing',
      'crowdfunding',
      'self_funding',
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
  constraint funding_programs_amount_check check (
    min_amount is null or max_amount is null or min_amount <= max_amount
  ),
  constraint funding_programs_readiness_check check (
    required_readiness_score is null or (required_readiness_score >= 0 and required_readiness_score <= 100)
  )
);

alter table public.funding_programs add column if not exists name_ar text;
alter table public.funding_programs add column if not exists name_en text;
alter table public.funding_programs add column if not exists name_fr text;
alter table public.funding_programs add column if not exists country text;
alter table public.funding_programs add column if not exists funding_type text not null default 'other';
alter table public.funding_programs add column if not exists provider_type text;
alter table public.funding_programs add column if not exists description_ar text;
alter table public.funding_programs add column if not exists description_en text;
alter table public.funding_programs add column if not exists description_fr text;
alter table public.funding_programs add column if not exists currency text default 'KWD';
alter table public.funding_programs add column if not exists min_amount numeric;
alter table public.funding_programs add column if not exists max_amount numeric;
alter table public.funding_programs add column if not exists eligibility_requirements jsonb;
alter table public.funding_programs add column if not exists required_documents jsonb;
alter table public.funding_programs add column if not exists official_url text;
alter table public.funding_programs add column if not exists is_verified boolean not null default false;
alter table public.funding_programs add column if not exists source_name text;
alter table public.funding_programs add column if not exists business_activity text;
alter table public.funding_programs add column if not exists required_readiness_score integer default 70;
alter table public.funding_programs add column if not exists notes text;
alter table public.funding_programs add column if not exists is_active boolean not null default true;
alter table public.funding_programs add column if not exists updated_at timestamptz not null default now();

create table if not exists public.funding_program_categories (
  value text primary key,
  label_ar text not null,
  label_en text not null,
  created_at timestamptz not null default now()
);

insert into public.funding_program_categories (value, label_ar, label_en)
values
  ('bank_loan', 'قرض بنكي', 'Bank loan'),
  ('sme_financing', 'تمويل المشاريع الصغيرة والمتوسطة', 'SME financing'),
  ('government_support', 'دعم حكومي', 'Government support'),
  ('startup_grant', 'منح الشركات الناشئة', 'Startup grants'),
  ('investor_funding', 'تمويل المستثمرين', 'Investor funding'),
  ('revenue_based_financing', 'تمويل مبني على الإيرادات', 'Revenue-based financing'),
  ('crowdfunding', 'تمويل جماعي', 'Crowdfunding')
on conflict (value) do update set
  label_ar = excluded.label_ar,
  label_en = excluded.label_en;

insert into public.funding_programs (
  id,
  name_ar,
  name_en,
  name_fr,
  country,
  funding_type,
  provider_type,
  description_ar,
  description_en,
  description_fr,
  currency,
  min_amount,
  max_amount,
  eligibility_requirements,
  required_documents,
  official_url,
  is_verified,
  source_name,
  business_activity,
  notes,
  is_active,
  created_at,
  updated_at
)
select
  id,
  name_ar,
  name_en,
  name_fr,
  country,
  case
    when funding_type = 'government_fund' then 'government_support'
    when funding_type = 'grant' then 'startup_grant'
    when funding_type in ('angel', 'venture_capital', 'strategic_partner') then 'investor_funding'
    else funding_type
  end,
  provider_name,
  description_ar,
  description_en,
  description_fr,
  currency,
  typical_ticket_min,
  typical_ticket_max,
  to_jsonb(array_remove(array[eligibility_summary_ar, eligibility_summary_en, eligibility_summary_fr], null)),
  null,
  coalesce(application_url, website_url, data_source_url),
  data_status = 'verified',
  coalesce(provider_name, data_source_url),
  region,
  notes,
  is_active,
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from public.business_funding_programs
where exists (
  select 1
  from information_schema.tables
  where table_schema = 'public'
    and table_name = 'business_funding_programs'
)
on conflict (id) do nothing;

create index if not exists funding_programs_active_type_idx
on public.funding_programs(is_active, funding_type, country);

alter table public.funding_programs enable row level security;
alter table public.funding_program_categories enable row level security;

drop policy if exists "Users can read active funding programs" on public.funding_programs;
create policy "Users can read active funding programs"
on public.funding_programs for select
using (is_active = true);

drop policy if exists "Users can read funding program categories" on public.funding_program_categories;
create policy "Users can read funding program categories"
on public.funding_program_categories for select
using (true);

do $$
begin
  if to_regclass('public.project_funding_shortlist') is not null then
    alter table public.project_funding_shortlist
      drop constraint if exists project_funding_shortlist_funding_program_id_fkey;

    alter table public.project_funding_shortlist
      add constraint project_funding_shortlist_funding_program_id_fkey
      foreign key (funding_program_id)
      references public.funding_programs(id)
      on delete cascade;
  end if;
end $$;

grant select on public.funding_programs to anon, authenticated;
grant select on public.funding_program_categories to anon, authenticated;
