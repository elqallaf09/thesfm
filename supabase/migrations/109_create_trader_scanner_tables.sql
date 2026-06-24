create table if not exists public.trader_assets (
  symbol text primary key,
  provider_symbol text not null,
  name text not null,
  exchange text,
  market text not null default 'US',
  currency text not null default 'USD',
  sector text,
  industry text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trader_scan_runs (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  status text not null
    check (status in ('running', 'completed', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_assets integer not null default 0,
  successful_assets integer not null default 0,
  failed_assets integer not null default 0,
  generated_signals integer not null default 0,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.trader_scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references public.trader_scan_runs(id) on delete cascade,
  symbol text not null,
  signal text not null check (signal in ('buy', 'sell', 'hold')),
  confidence numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  current_price numeric not null,
  target_price numeric,
  stop_loss numeric,
  timeframe text,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'unknown')),
  total_score numeric(6,2) not null,
  score_breakdown jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  data_timestamp timestamptz not null,
  provider text not null,
  delayed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (scan_run_id, symbol)
);

create table if not exists public.trader_provider_status (
  provider text primary key,
  configured boolean not null default false,
  connected boolean not null default false,
  delayed boolean not null default true,
  last_successful_update timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now()
);

create index if not exists trader_scan_runs_market_completed_idx
  on public.trader_scan_runs (market, completed_at desc);

create index if not exists trader_scan_results_symbol_created_idx
  on public.trader_scan_results (symbol, created_at desc);

create index if not exists trader_scan_results_signal_confidence_idx
  on public.trader_scan_results (signal, confidence desc);

alter table public.trader_assets enable row level security;
alter table public.trader_scan_runs enable row level security;
alter table public.trader_scan_results enable row level security;
alter table public.trader_provider_status enable row level security;

comment on table public.trader_assets is
  'Configured asset universe for the private SFM Trading Terminal scanner.';

comment on table public.trader_scan_runs is
  'Server-generated scan run metadata for the private SFM Trading Terminal.';

comment on table public.trader_scan_results is
  'Explainable technical-rule scanner outputs generated from provider market data.';

comment on table public.trader_provider_status is
  'Safe provider status snapshots for the private SFM Trading Terminal.';
