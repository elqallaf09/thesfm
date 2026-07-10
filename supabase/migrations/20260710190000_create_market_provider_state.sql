-- Persists provider capability health across serverless cold starts for the unified
-- market-data state layer (src/lib/market-state/aggregateMarketState.ts).
-- Modeled exactly on 101_create_market_provider_sessions.sql / 130_create_trader_cache.sql.
create table if not exists public.market_provider_state (
  id text primary key,                    -- `${provider}:${capability}` composite key
  provider text not null,
  capability text not null,
  status text not null,
  configured boolean not null default false,
  healthy boolean not null default false,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_reason text,
  rate_limited_until timestamptz,
  next_retry_at timestamptz,
  failure_streak integer not null default 0,
  latency_ms integer,
  updated_at timestamptz not null default now()
);

create index if not exists market_provider_state_capability_idx on public.market_provider_state (capability);

alter table public.market_provider_state enable row level security;

-- Service-role only, no public policy at all (same pattern as market_provider_sessions/trader_cache).
create policy "no_public_access" on public.market_provider_state
  for all using (false);

comment on table public.market_provider_state is
  'Persists provider capability health across serverless cold starts for the unified market-state layer.';
