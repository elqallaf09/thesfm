create table if not exists public.trader_followed_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  asset_name text not null,
  asset_logo text,
  market text not null default 'US',
  action text not null check (action in ('buy', 'sell', 'wait', 'watch')),
  entry_price numeric,
  current_price numeric,
  target_price numeric,
  stop_loss numeric,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 95)),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  timeframe text not null default '1-3 أسابيع',
  status text not null default 'watching' check (status in ('open', 'won', 'lost', 'waiting', 'watching', 'expired')),
  provider text not null default 'Yahoo Finance',
  source_signal_id uuid references public.market_signals(id) on delete set null,
  source_type text not null default 'manual',
  notes text,
  price_message text,
  price_updated_at timestamptz,
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists trader_followed_trades_user_opened_idx
  on public.trader_followed_trades (user_id, opened_at desc);

create index if not exists trader_followed_trades_user_status_idx
  on public.trader_followed_trades (user_id, status, opened_at desc);

create index if not exists trader_followed_trades_user_symbol_idx
  on public.trader_followed_trades (user_id, symbol, opened_at desc);

create index if not exists trader_followed_trades_source_signal_idx
  on public.trader_followed_trades (source_signal_id)
  where source_signal_id is not null;

drop trigger if exists trader_followed_trades_set_updated_at on public.trader_followed_trades;
create trigger trader_followed_trades_set_updated_at
  before update on public.trader_followed_trades
  for each row execute function public.set_updated_at();

alter table public.trader_followed_trades enable row level security;

drop policy if exists "Users can read own trader followed trades" on public.trader_followed_trades;
create policy "Users can read own trader followed trades"
  on public.trader_followed_trades
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own trader followed trades" on public.trader_followed_trades;
create policy "Users can insert own trader followed trades"
  on public.trader_followed_trades
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own trader followed trades" on public.trader_followed_trades;
create policy "Users can update own trader followed trades"
  on public.trader_followed_trades
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own trader followed trades" on public.trader_followed_trades;
create policy "Users can delete own trader followed trades"
  on public.trader_followed_trades
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.trader_followed_trades to authenticated;
grant select, insert, update, delete on public.trader_followed_trades to service_role;

comment on table public.trader_followed_trades is
  'Stores real followed trader recommendations, manual tracked trades, signal candidates, and recommendation status outcomes for /thesfm-trader-own.';

notify pgrst, 'reload schema';
