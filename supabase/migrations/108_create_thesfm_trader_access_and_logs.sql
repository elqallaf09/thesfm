create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.trader_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trader_access_status_idx
  on public.trader_access (status, expires_at);

drop trigger if exists trader_access_set_updated_at on public.trader_access;
create trigger trader_access_set_updated_at
  before update on public.trader_access
  for each row execute function public.set_updated_at();

alter table public.trader_access enable row level security;

drop policy if exists "Users can read own trader access" on public.trader_access;
create policy "Users can read own trader access"
  on public.trader_access
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can request own trader access" on public.trader_access;
create policy "Users can request own trader access"
  on public.trader_access
  for insert
  with check ((select auth.uid()) = user_id and status = 'pending');

grant select, insert on public.trader_access to authenticated;

create table if not exists public.trader_recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market_id text,
  action text not null,
  confidence numeric,
  current_price numeric,
  target_price numeric,
  stop_loss numeric,
  provider text,
  model_version text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trader_recommendation_history_user_created_idx
  on public.trader_recommendation_history (user_id, created_at desc);

create index if not exists trader_recommendation_history_symbol_idx
  on public.trader_recommendation_history (symbol, created_at desc);

alter table public.trader_recommendation_history enable row level security;

drop policy if exists "Users can read own trader recommendation history" on public.trader_recommendation_history;
create policy "Users can read own trader recommendation history"
  on public.trader_recommendation_history
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own trader recommendation history" on public.trader_recommendation_history;
create policy "Users can insert own trader recommendation history"
  on public.trader_recommendation_history
  for insert
  with check ((select auth.uid()) = user_id);

grant select, insert on public.trader_recommendation_history to authenticated;

create table if not exists public.trader_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market_id text,
  condition_type text not null
    check (condition_type in ('price_above', 'price_below', 'signal_change', 'target_hit', 'stop_loss_hit', 'news_risk')),
  target_price numeric,
  message text,
  status text not null default 'active'
    check (status in ('active', 'triggered', 'paused', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  triggered_at timestamptz
);

create index if not exists trader_alerts_user_status_idx
  on public.trader_alerts (user_id, status, created_at desc);

create index if not exists trader_alerts_symbol_idx
  on public.trader_alerts (symbol, status);

drop trigger if exists trader_alerts_set_updated_at on public.trader_alerts;
create trigger trader_alerts_set_updated_at
  before update on public.trader_alerts
  for each row execute function public.set_updated_at();

alter table public.trader_alerts enable row level security;

drop policy if exists "Users can read own trader alerts" on public.trader_alerts;
create policy "Users can read own trader alerts"
  on public.trader_alerts
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own trader alerts" on public.trader_alerts;
create policy "Users can insert own trader alerts"
  on public.trader_alerts
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own trader alerts" on public.trader_alerts;
create policy "Users can update own trader alerts"
  on public.trader_alerts
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own trader alerts" on public.trader_alerts;
create policy "Users can delete own trader alerts"
  on public.trader_alerts
  for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.trader_alerts to authenticated;

create table if not exists public.trader_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.trader_alerts(id) on delete set null,
  symbol text,
  title text not null,
  body text,
  severity text not null default 'info'
    check (severity in ('info', 'success', 'warning', 'danger')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trader_notification_log_user_created_idx
  on public.trader_notification_log (user_id, created_at desc);

alter table public.trader_notification_log enable row level security;

drop policy if exists "Users can read own trader notification log" on public.trader_notification_log;
create policy "Users can read own trader notification log"
  on public.trader_notification_log
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own trader notification log" on public.trader_notification_log;
create policy "Users can insert own trader notification log"
  on public.trader_notification_log
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own trader notification log" on public.trader_notification_log;
create policy "Users can update own trader notification log"
  on public.trader_notification_log
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.trader_notification_log to authenticated;

comment on table public.trader_access is
  'Controls approved private access to /thesfm-trader-own. Admin/server service role manages approvals.';

comment on table public.trader_recommendation_history is
  'Stores thesfm trader recommendation snapshots per user for later auditing and model training.';

comment on table public.trader_alerts is
  'Stores user trader alerts for price, signal, target, stop-loss, and news-risk triggers.';

comment on table public.trader_notification_log is
  'Stores delivered thesfm trader notifications so users can review them later.';
