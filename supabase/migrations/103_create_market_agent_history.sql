create table if not exists public.market_agent_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  asset_type text not null,
  timeframe text not null,
  suggested_action text not null,
  confidence numeric not null,
  risk_level text not null,
  current_price numeric,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists market_agent_history_user_created_idx
  on public.market_agent_history (user_id, created_at desc);

alter table public.market_agent_history enable row level security;

drop policy if exists "Users can select own market agent history" on public.market_agent_history;
create policy "Users can select own market agent history"
  on public.market_agent_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own market agent history" on public.market_agent_history;
create policy "Users can insert own market agent history"
  on public.market_agent_history
  for insert
  with check (auth.uid() = user_id);

grant select, insert on public.market_agent_history to authenticated;
