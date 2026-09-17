-- SFM Market Data Engine historical observation store.
-- Raw market facts remain separate from derived analytics and keep full source lineage.

create table if not exists public.sfm_market_observations (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null,
  engine_version text not null,
  symbol text not null,
  asset_type text not null,
  market text,
  exchange text,
  country text,
  currency text,
  observed_at timestamptz,
  received_at timestamptz not null,
  price numeric,
  change numeric,
  change_percent numeric,
  open numeric,
  high numeric,
  low numeric,
  previous_close numeric,
  volume numeric,
  quality_state text not null check (quality_state in ('complete','usable','partial','stale','unavailable')),
  quality_score integer not null check (quality_score between 0 and 100),
  completeness_percent integer not null check (completeness_percent between 0 and 100),
  freshness_seconds integer check (freshness_seconds is null or freshness_seconds >= 0),
  missing_fields text[] not null default '{}',
  quality_reasons text[] not null default '{}',
  source_class text not null check (source_class in ('primary_exchange','regulator','issuer','licensed_feed','aggregator','derived')),
  upstream_provider text,
  upstream_provider_name text,
  provider_symbol text,
  delay_type text,
  cached boolean not null default false,
  cache_age_seconds integer check (cache_age_seconds is null or cache_age_seconds >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  derived_fields text[] not null default '{}',
  redistribution_policy text not null check (redistribution_policy in ('internal_only','rights_review_required','redistributable')),
  evidence_hash text not null unique,
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  constraint sfm_market_observations_price_positive check (price is null or price > 0),
  constraint sfm_market_observations_volume_nonnegative check (volume is null or volume >= 0)
);

create index if not exists sfm_market_observations_symbol_observed_idx
  on public.sfm_market_observations(symbol, observed_at desc nulls last, created_at desc);

create index if not exists sfm_market_observations_provider_observed_idx
  on public.sfm_market_observations(upstream_provider, observed_at desc nulls last);

create index if not exists sfm_market_observations_quality_idx
  on public.sfm_market_observations(quality_state, created_at desc);

alter table public.sfm_market_observations enable row level security;
alter table public.sfm_market_observations force row level security;

-- This is an internal evidence ledger. No browser role receives table access.
-- service_role can append and inspect observations but cannot update/delete/truncate them.
revoke all on table public.sfm_market_observations from public, anon, authenticated;
revoke update, delete, truncate on table public.sfm_market_observations from service_role;
grant select, insert on table public.sfm_market_observations to service_role;

comment on table public.sfm_market_observations is
  'Append-only SFM market observations with source lineage. Redistribution requires explicit rights review; no row implies redistribution permission.';
comment on column public.sfm_market_observations.evidence_hash is
  'Deterministic hash used to deduplicate the same upstream observation without rewriting history.';
comment on column public.sfm_market_observations.redistribution_policy is
  'Licensing guard. Aggregator observations are internal_only; other sources require rights review unless explicitly approved.';
