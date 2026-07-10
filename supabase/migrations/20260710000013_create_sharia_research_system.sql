-- Multi-source Shariah research persistence.
-- Private searches/results are user-owned. Shared public documents remain service-only.

create table if not exists public.sharia_methodologies (
  id text primary key,
  version text not null,
  name text not null,
  name_ar text not null,
  name_fr text not null,
  source_title text not null,
  source_publisher text not null,
  source_url text not null check (source_url ~ '^https://'),
  version_date date not null,
  business_rules jsonb not null,
  financial_ratio_rules jsonb not null,
  denominator_rules text not null,
  purification_guidance text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, version)
);

create table if not exists public.sharia_security_identities (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  company_name text not null,
  company_name_ar text,
  ticker text not null,
  provider_symbol text not null,
  exchange text not null,
  exchange_mic text,
  isin text,
  cik text,
  lei text,
  country text,
  sector text,
  industry text,
  currency text,
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  website text check (website is null or website ~ '^https?://'),
  aliases jsonb not null default '[]'::jsonb,
  previous_names jsonb not null default '[]'::jsonb,
  identity_sources jsonb not null default '[]'::jsonb,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exchange, ticker)
);

create unique index if not exists sharia_security_identities_isin_key
  on public.sharia_security_identities (isin)
  where isin is not null;
create index if not exists sharia_security_identities_ticker_idx on public.sharia_security_identities (ticker);
create index if not exists sharia_security_identities_cik_idx on public.sharia_security_identities (cik) where cik is not null;
create index if not exists sharia_security_identities_verified_idx on public.sharia_security_identities (last_verified_at desc);

create table if not exists public.sharia_research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  security_id uuid references public.sharia_security_identities(id) on delete set null,
  methodology_id text not null references public.sharia_methodologies(id),
  methodology_version text not null,
  original_query text not null,
  normalized_query jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'awaiting_selection', 'completed', 'failed', 'cancelled', 'expired')),
  current_step text not null default 'identifying_security'
    check (current_step in ('identifying_security', 'awaiting_security_selection', 'searching_official_sources', 'retrieving_filings', 'extracting_financial_data', 'checking_business_activities', 'calculating_ratios', 'resolving_conflicts', 'preparing_result')),
  progress integer not null default 0 check (progress between 0 and 100),
  candidates jsonb not null default '[]'::jsonb,
  manual_urls jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  partial_errors jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  retry_count integer not null default 0 check (retry_count between 0 and 5),
  max_retries integer not null default 2 check (max_retries between 0 and 5),
  cancellation_requested_at timestamptz,
  result_id uuid,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  purge_after timestamptz not null default (now() + interval '90 days'),
  check (expires_at > created_at),
  check (purge_after > created_at),
  unique (user_id, idempotency_key)
);

create index if not exists sharia_research_jobs_user_created_idx on public.sharia_research_jobs (user_id, created_at desc);
create index if not exists sharia_research_jobs_user_status_idx on public.sharia_research_jobs (user_id, status, updated_at desc);
create index if not exists sharia_research_jobs_expiration_idx on public.sharia_research_jobs (expires_at) where status in ('queued', 'running', 'awaiting_selection');
create index if not exists sharia_research_jobs_purge_idx on public.sharia_research_jobs (purge_after);

create table if not exists public.sharia_source_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.sharia_research_jobs(id) on delete set null,
  security_id uuid not null references public.sharia_security_identities(id) on delete cascade,
  adapter_id text not null,
  source_title text not null,
  publisher text not null,
  domain text not null,
  source_url text not null check (source_url ~ '^https?://'),
  canonical_url text not null check (canonical_url ~ '^https?://'),
  grouped_urls jsonb not null default '[]'::jsonb,
  publication_date timestamptz,
  filing_date date,
  retrieval_date timestamptz not null,
  source_type text not null,
  source_tier smallint not null check (source_tier between 1 and 4),
  reliability text not null check (reliability in ('official', 'high', 'medium', 'context_only', 'unknown')),
  extracted_text text not null default '',
  evidence_snippets jsonb not null default '[]'::jsonb,
  reporting_period text,
  content_hash text not null,
  mime_type text,
  extraction_status text not null check (extraction_status in ('success', 'partial', 'blocked', 'unavailable', 'failed')),
  error_info jsonb,
  supports jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '2 years'),
  check (purge_after > created_at)
);

create unique index if not exists sharia_source_documents_dedupe_key
  on public.sharia_source_documents (security_id, content_hash, source_type);
create index if not exists sharia_source_documents_security_period_idx on public.sharia_source_documents (security_id, reporting_period, retrieval_date desc);
create index if not exists sharia_source_documents_job_idx on public.sharia_source_documents (job_id);
create index if not exists sharia_source_documents_domain_idx on public.sharia_source_documents (domain, retrieval_date desc);
create index if not exists sharia_source_documents_purge_idx on public.sharia_source_documents (purge_after);

create table if not exists public.sharia_screening_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null unique references public.sharia_research_jobs(id) on delete cascade,
  security_id uuid not null references public.sharia_security_identities(id) on delete cascade,
  methodology_id text not null references public.sharia_methodologies(id),
  methodology_version text not null,
  classification text not null
    check (classification in ('compliant', 'non_compliant', 'requires_review', 'insufficient_current_data', 'conflicting_evidence')),
  confidence numeric(5,2) not null check (confidence between 0 and 100),
  reporting_period text,
  last_financial_report_date date,
  source_count integer not null default 0 check (source_count >= 0),
  source_quality_breakdown jsonb not null,
  business_screen jsonb not null,
  financial_ratio_result jsonb not null,
  failed_checks jsonb not null default '[]'::jsonb,
  unavailable_checks jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  result_payload jsonb not null,
  research_timestamp timestamptz not null,
  cache_state text not null default 'live' check (cache_state in ('live', 'recently_cached', 'outdated')),
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '2 years'),
  check (purge_after > created_at)
);

alter table public.sharia_research_jobs
  drop constraint if exists sharia_research_jobs_result_id_fkey;
alter table public.sharia_research_jobs
  add constraint sharia_research_jobs_result_id_fkey
  foreign key (result_id) references public.sharia_screening_results(id) on delete set null;

create index if not exists sharia_screening_results_user_created_idx on public.sharia_screening_results (user_id, created_at desc);
create index if not exists sharia_screening_results_cache_idx on public.sharia_screening_results (security_id, methodology_id, methodology_version, reporting_period, research_timestamp desc);
create index if not exists sharia_screening_results_valid_idx on public.sharia_screening_results (security_id, research_timestamp desc) where invalidated_at is null;
create index if not exists sharia_screening_results_purge_idx on public.sharia_screening_results (purge_after);

create table if not exists public.sharia_evidence_items (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.sharia_screening_results(id) on delete cascade,
  document_id uuid not null references public.sharia_source_documents(id) on delete cascade,
  category text not null check (category in ('identity', 'business_activity', 'financial_value', 'methodology', 'conflict', 'news_context')),
  conclusion text not null,
  excerpt text not null,
  source_url text not null check (source_url ~ '^https?://'),
  source_title text not null,
  publisher text not null,
  publication_date timestamptz,
  retrieval_date timestamptz not null,
  source_tier smallint not null check (source_tier between 1 and 4),
  reliability text not null,
  reporting_period text,
  created_at timestamptz not null default now()
);

create index if not exists sharia_evidence_items_result_category_idx on public.sharia_evidence_items (result_id, category);
create index if not exists sharia_evidence_items_document_idx on public.sharia_evidence_items (document_id);

create table if not exists public.sharia_financial_values (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.sharia_screening_results(id) on delete cascade,
  document_id uuid not null references public.sharia_source_documents(id) on delete cascade,
  reporting_period text not null,
  period_end date not null,
  filed_at date,
  currency text not null,
  value numeric not null,
  unit text not null,
  original_field text not null,
  normalized_field text not null,
  normalization_formula text not null,
  accession_number text,
  form text,
  created_at timestamptz not null default now(),
  unique (result_id, document_id, normalized_field, period_end, original_field)
);

create index if not exists sharia_financial_values_result_field_idx on public.sharia_financial_values (result_id, normalized_field, period_end desc);
create index if not exists sharia_financial_values_document_idx on public.sharia_financial_values (document_id);

create table if not exists public.sharia_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.sharia_research_jobs(id) on delete set null,
  result_id uuid references public.sharia_screening_results(id) on delete set null,
  original_query text not null,
  normalized_query text not null,
  security_id uuid references public.sharia_security_identities(id) on delete set null,
  methodology_id text not null references public.sharia_methodologies(id),
  outcome text not null,
  created_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '1 year'),
  check (purge_after > created_at)
);

create index if not exists sharia_search_history_user_created_idx on public.sharia_search_history (user_id, created_at desc);
create index if not exists sharia_search_history_user_security_idx on public.sharia_search_history (user_id, security_id, created_at desc);
create index if not exists sharia_search_history_purge_idx on public.sharia_search_history (purge_after);

drop trigger if exists sharia_methodologies_set_updated_at on public.sharia_methodologies;
create trigger sharia_methodologies_set_updated_at before update on public.sharia_methodologies
  for each row execute function public.set_updated_at();
drop trigger if exists sharia_security_identities_set_updated_at on public.sharia_security_identities;
create trigger sharia_security_identities_set_updated_at before update on public.sharia_security_identities
  for each row execute function public.set_updated_at();
drop trigger if exists sharia_research_jobs_set_updated_at on public.sharia_research_jobs;
create trigger sharia_research_jobs_set_updated_at before update on public.sharia_research_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists sharia_screening_results_set_updated_at on public.sharia_screening_results;
create trigger sharia_screening_results_set_updated_at before update on public.sharia_screening_results
  for each row execute function public.set_updated_at();

alter table public.sharia_methodologies enable row level security;
alter table public.sharia_security_identities enable row level security;
alter table public.sharia_research_jobs enable row level security;
alter table public.sharia_source_documents enable row level security;
alter table public.sharia_evidence_items enable row level security;
alter table public.sharia_financial_values enable row level security;
alter table public.sharia_screening_results enable row level security;
alter table public.sharia_search_history enable row level security;

drop policy if exists "Authenticated users can read active Sharia methodologies" on public.sharia_methodologies;
create policy "Authenticated users can read active Sharia methodologies"
  on public.sharia_methodologies for select to authenticated using (is_active = true);

drop policy if exists "Users can read own Sharia research jobs" on public.sharia_research_jobs;
create policy "Users can read own Sharia research jobs"
  on public.sharia_research_jobs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own Sharia research jobs" on public.sharia_research_jobs;
create policy "Users can create own Sharia research jobs"
  on public.sharia_research_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own Sharia research jobs" on public.sharia_research_jobs;
create policy "Users can update own Sharia research jobs"
  on public.sharia_research_jobs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own Sharia research jobs" on public.sharia_research_jobs;
create policy "Users can delete own Sharia research jobs"
  on public.sharia_research_jobs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own Sharia screening results" on public.sharia_screening_results;
create policy "Users can read own Sharia screening results"
  on public.sharia_screening_results for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own Sharia search history" on public.sharia_search_history;
create policy "Users can read own Sharia search history"
  on public.sharia_search_history for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own Sharia search history" on public.sharia_search_history;
create policy "Users can create own Sharia search history"
  on public.sharia_search_history for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own Sharia search history" on public.sharia_search_history;
create policy "Users can delete own Sharia search history"
  on public.sharia_search_history for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.sharia_methodologies to authenticated;
grant select, insert, update, delete on public.sharia_research_jobs to authenticated;
grant select on public.sharia_screening_results to authenticated;
grant select, insert, delete on public.sharia_search_history to authenticated;

grant select, insert, update, delete on public.sharia_methodologies to service_role;
grant select, insert, update, delete on public.sharia_security_identities to service_role;
grant select, insert, update, delete on public.sharia_research_jobs to service_role;
grant select, insert, update, delete on public.sharia_source_documents to service_role;
grant select, insert, update, delete on public.sharia_evidence_items to service_role;
grant select, insert, update, delete on public.sharia_financial_values to service_role;
grant select, insert, update, delete on public.sharia_screening_results to service_role;
grant select, insert, update, delete on public.sharia_search_history to service_role;

insert into public.sharia_methodologies (
  id, version, name, name_ar, name_fr, source_title, source_publisher, source_url, version_date,
  business_rules, financial_ratio_rules, denominator_rules, purification_guidance, is_active
) values (
  'msci-islamic-index-series-assets',
  '2025-07',
  'MSCI Islamic Index Series — new security entry screen',
  'منهجية سلسلة مؤشرات MSCI الإسلامية — فحص دخول ورقة مالية جديدة',
  'Série d’indices islamiques MSCI — filtre d’entrée d’un nouveau titre',
  'MSCI Islamic Index Series Methodology',
  'MSCI Inc.',
  'https://www.msci.com/documents/10199/11c651fc-44a0-2740-be99-2163f074fcce',
  '2025-07-01',
  '{"prohibitedRevenueThreshold":0.05,"sourceSection":"Sections 2.1 and 2.1.1, pages 4-6"}'::jsonb,
  '[{"id":"total-debt-to-assets","threshold":0.30,"denominator":"total_assets"},{"id":"cash-interest-securities-to-assets","threshold":0.30,"denominator":"total_assets"},{"id":"receivables-cash-to-assets","threshold":0.46,"denominator":"total_assets"}]'::jsonb,
  'Uses Total Assets. Entry buffers for a new security are 30%, 30%, and 46%; existing-index retention thresholds are not applied.',
  'Apply the dividend adjustment factor in section 2.3 when interest or prohibited income is documented.',
  true
) on conflict (id) do update set
  version = excluded.version,
  name = excluded.name,
  name_ar = excluded.name_ar,
  name_fr = excluded.name_fr,
  source_title = excluded.source_title,
  source_publisher = excluded.source_publisher,
  source_url = excluded.source_url,
  version_date = excluded.version_date,
  business_rules = excluded.business_rules,
  financial_ratio_rules = excluded.financial_ratio_rules,
  denominator_rules = excluded.denominator_rules,
  purification_guidance = excluded.purification_guidance,
  is_active = true,
  updated_at = now();

comment on table public.sharia_research_jobs is 'User-owned, idempotent research jobs. Active jobs expire after 24 hours and are eligible for purge after 90 days.';
comment on table public.sharia_source_documents is 'Deduplicated public-source text only; raw remote HTML and executable scripts are never stored. Service-role only.';
comment on table public.sharia_screening_results is 'User-owned screening snapshots invalidated when a newer financial reporting period is stored.';
comment on table public.sharia_search_history is 'Private per-user search history retained for one year unless deleted earlier.';

notify pgrst, 'reload schema';
