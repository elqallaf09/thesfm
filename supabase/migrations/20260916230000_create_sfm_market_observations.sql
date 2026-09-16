-- SFM Market Data Engine canonical observation store.
-- Raw/licensed provider payloads are deliberately NOT persisted here. This table stores
-- normalized facts plus lineage/quality metadata so redistribution rights can be enforced
-- independently from internal analytics.

create table if not exists public.sfm_market_observations (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
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

  quality_state text not null,
  quality_score integer not null,
  completeness_percent integer not null,
  freshness_seconds integer,
  missing_fields jsonb not null default '[]'::jsonb,
  quality_reasons jsonb not null default '[]'::jsonb,

  source_class text not null,
  upstream_provider text,
  upstream_provider_name text,
  provider_symbol text,
  delay_type text,
  cached boolean not null default false,
  cache_age_seconds integer,
  attempt_count integer not null default 0,
  derived_fields jsonb not null default '[]'::jsonb,

  distribution_scope text not null default 'internal_only',
  source_url text,
  schema_version text not null,
  engine_version text not null,
  created_at timestamptz not null default now(),

  constraint sfm_market_observations_fingerprint_sha256
    check (fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sfm_market_observations_asset_type
    check (asset_type in ('stock','etf','crypto','forex','commodity','gold','index')),
  constraint sfm_market_observations_quality_state
    check (quality_state in ('complete','usable','partial','stale','unavailable')),
  constraint sfm_market_observations_source_class
    check (source_class in ('primary_exchange','regulator','issuer','licensed_feed','aggregator','derived')),
  constraint sfm_market_observations_distribution_scope
    check (distribution_scope in ('internal_only','external_allowed')),
  constraint sfm_market_observations_quality_score_range
    check (quality_score between 0 and 100),
  constraint sfm_market_observations_completeness_range
    check (completeness_percent between 0 and 100),
  constraint sfm_market_observations_price_positive
    check (price is null or price > 0),
  constraint sfm_market_observations_previous_close_positive
    check (previous_close is null or previous_close > 0),
  constraint sfm_market_observations_session_prices_positive
    check ((open is null or open > 0) and (high is null or high > 0) and (low is null or low > 0)),
  constraint sfm_market_observations_volume_nonnegative
    check (volume is null or volume >= 0),
  constraint sfm_market_observations_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint sfm_market_observations_cache_age_nonnegative
    check (cache_age_seconds is null or cache_age_seconds >= 0),
  constraint sfm_market_observations_freshness_nonnegative
    check (freshness_seconds is null or freshness_seconds >= 0)
);

create index if not exists sfm_market_observations_symbol_observed_idx
  on public.sfm_market_observations (symbol, observed_at desc nulls last, received_at desc);

create index if not exists sfm_market_observations_source_idx
  on public.sfm_market_observations (source_class, upstream_provider, received_at desc);

create index if not exists sfm_market_observations_external_idx
  on public.sfm_market_observations (symbol, observed_at desc nulls last)
  where distribution_scope = 'external_allowed';

alter table public.sfm_market_observations enable row level security;

-- Browser roles never read or mutate the canonical store directly. Product and future
-- external APIs must pass through a server-owned policy/entitlement layer.
revoke all on table public.sfm_market_observations from anon, authenticated;
grant select, insert on table public.sfm_market_observations to service_role;

comment on table public.sfm_market_observations is
  'Immutable normalized market observations owned by THE SFM with explicit upstream lineage and redistribution scope.';
comment on column public.sfm_market_observations.distribution_scope is
  'internal_only unless THE SFM has verified redistribution rights for this observation source.';
