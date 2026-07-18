-- Phase 6.1: immutable, versioned financial-intelligence analysis history.
--
-- Operational rollback notes:
-- 1. Roll back the application to a build that does not write this table.
-- 2. Export the table if the recorded audit history must be retained.
-- 3. Drop public.intelligence_analyses. No existing table or migration is altered.
-- This migration is intentionally forward-only and must be validated on Preview first.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.intelligence_analyses (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('shared', 'private')),
  canonical_symbol text not null check (char_length(canonical_symbol) between 1 and 32),
  provider_symbol text not null check (char_length(provider_symbol) between 1 and 64),
  display_symbol text not null check (char_length(display_symbol) between 1 and 64),
  asset_name text not null check (char_length(asset_name) between 1 and 240),
  asset_type text not null check (asset_type in ('STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND')),
  exchange text check (exchange is null or char_length(exchange) between 1 and 80),
  market text check (market is null or char_length(market) between 1 and 80),
  quote_currency text check (quote_currency is null or quote_currency ~ '^[A-Z0-9]{3,8}$'),
  recommendation text not null check (recommendation in ('BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA')),
  confidence smallint not null check (confidence between 0 and 100),
  confidence_quality text not null check (confidence_quality in (
    'STRONG_EVIDENCE', 'MODERATE_EVIDENCE', 'LIMITED_EVIDENCE', 'INSUFFICIENT_EVIDENCE'
  )),
  risk text not null check (risk in ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNAVAILABLE')),
  horizon text not null check (horizon in ('INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM')),
  generated_at timestamptz not null,
  data_as_of timestamptz,
  expires_at timestamptz not null,
  freshness_state text not null check (freshness_state in ('FRESH', 'DELAYED', 'STALE', 'UNAVAILABLE')),
  factor_snapshot jsonb not null check (jsonb_typeof(factor_snapshot) = 'array'),
  provider_provenance jsonb not null check (jsonb_typeof(provider_provenance) = 'object'),
  warnings jsonb not null check (jsonb_typeof(warnings) = 'array'),
  data_completeness jsonb not null check (jsonb_typeof(data_completeness) = 'object'),
  conflict_status text not null check (conflict_status in ('NONE', 'MODERATE', 'STRONG')),
  engine_version text not null check (char_length(engine_version) between 1 and 80),
  rules_version text not null check (char_length(rules_version) between 1 and 80),
  weighting_version text not null check (char_length(weighting_version) between 1 and 80),
  previous_analysis_id uuid references public.intelligence_analyses(id) on delete set null,
  status text not null check (status in ('complete', 'partial', 'insufficient_data', 'failed')),
  request_source text not null check (request_source in ('smart_market_analysis', 'public_api', 'internal')),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  constraint intelligence_analyses_scope_owner_check check (
    (scope = 'shared' and user_id is null)
    or (scope = 'private' and user_id is not null)
  ),
  constraint intelligence_analyses_expiration_check check (expires_at >= generated_at)
);

create index intelligence_analyses_shared_latest_idx
  on public.intelligence_analyses (canonical_symbol, asset_type, horizon, generated_at desc)
  where scope = 'shared';

create index intelligence_analyses_user_latest_idx
  on public.intelligence_analyses (user_id, generated_at desc)
  where scope = 'private';

create index intelligence_analyses_expiration_idx
  on public.intelligence_analyses (expires_at)
  where scope = 'shared';

create index intelligence_analyses_previous_idx
  on public.intelligence_analyses (previous_analysis_id)
  where previous_analysis_id is not null;

comment on table public.intelligence_analyses is
  'Immutable, versioned Phase 6.1 intelligence results. Shared rows contain public market analysis; private rows are user isolated.';
comment on column public.intelligence_analyses.confidence is
  'Deterministic analysis confidence, not a probability of profit.';
comment on column public.intelligence_analyses.result_snapshot is
  'Canonical result only; provider secrets, raw tokens, and confidential prompts are prohibited.';

alter table public.intelligence_analyses enable row level security;
alter table public.intelligence_analyses force row level security;

revoke all on table public.intelligence_analyses from public, anon, authenticated;
grant select on table public.intelligence_analyses to authenticated;
grant select, insert, update, delete on table public.intelligence_analyses to service_role;

-- Shared reads are intentional for signed-in clients; anonymous reads are mediated
-- through the rate-limited server endpoint and never receive direct table access.
create policy "Authenticated users can read shared intelligence analyses"
  on public.intelligence_analyses
  for select
  to authenticated
  using (scope = 'shared');

create policy "Users can read own private intelligence analyses"
  on public.intelligence_analyses
  for select
  to authenticated
  using (scope = 'private' and user_id = (select auth.uid()));

commit;
