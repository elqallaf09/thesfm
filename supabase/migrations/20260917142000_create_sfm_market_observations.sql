-- THE SFM canonical raw market observation store.
-- Stores only observed market facts plus source lineage. Derived indicators and
-- recommendations intentionally live outside this table.

create table if not exists public.sfm_market_observations (
  id uuid primary key default gen_random_uuid(),
  observation_key text not null,
  schema_version text not null,
  engine_version text not null,
  symbol text not null,
  asset_type text not null,
  market text,
  exchange text,
  country text,
  currency text,
  price numeric not null,
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
  source_class text not null,
  upstream_provider text not null,
  upstream_provider_name text,
  provider_symbol text,
  observed_at timestamptz not null,
  received_at timestamptz not null,
  delay_type text,
  cached boolean not null default false,
  cache_age_seconds integer,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sfm_market_observations_key_unique unique (observation_key),
  constraint sfm_market_observations_price_positive check (price > 0),
  constraint sfm_market_observations_quality_state_check
    check (quality_state in ('complete', 'usable', 'partial', 'stale')),
  constraint sfm_market_observations_quality_score_check
    check (quality_score between 0 and 100),
  constraint sfm_market_observations_completeness_check
    check (completeness_percent between 0 and 100),
  constraint sfm_market_observations_source_class_check
    check (source_class in ('primary_exchange', 'regulator', 'issuer', 'licensed_feed', 'aggregator', 'derived')),
  constraint sfm_market_observations_volume_nonnegative
    check (volume is null or volume >= 0)
);

create index if not exists sfm_market_observations_symbol_observed_idx
  on public.sfm_market_observations (symbol, observed_at desc);

create index if not exists sfm_market_observations_provider_observed_idx
  on public.sfm_market_observations (upstream_provider, observed_at desc);

create index if not exists sfm_market_observations_market_symbol_idx
  on public.sfm_market_observations (market, symbol, observed_at desc);

alter table public.sfm_market_observations enable row level security;

drop policy if exists "Service role manages SFM market observations" on public.sfm_market_observations;
create policy "Service role manages SFM market observations"
  on public.sfm_market_observations
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.sfm_market_observations from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.sfm_market_observations to service_role;

comment on table public.sfm_market_observations is
  'Immutable provider observations accepted by THE SFM. No synthetic prices or derived recommendations.';
comment on column public.sfm_market_observations.observation_key is
  'Deterministic SHA-256 identity used to deduplicate the same upstream observation.';
