-- Schema-only baseline for the thirteen public tables that predate repository migrations.
-- This migration is intentionally data-free and safe to replay against databases where
-- the tables already exist.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  username text unique,
  display_name text,
  email text,
  age integer,
  phone_country_code text default '+965',
  phone_number text,
  created_at timestamptz default now(),
  profession text,
  security_question_2 text,
  security_answer_2 text,
  security_question_3 text,
  security_answer_3 text,
  gender text
);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  amount numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.investment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  amount numeric default 0,
  created_at timestamptz default now(),
  value numeric default 0
);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null default '',
  amount numeric default 0,
  duration text default '',
  duration_unit text default 'month',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists public.monthly_income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category text not null,
  amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  label text
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  emoji text default '🚀',
  budget text default '',
  timeline text default '',
  duration_unit text default 'month',
  steps text[] default '{}'::text[],
  notes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.savings_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  amount numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id bigint primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'د.إ',
  cash numeric not null default 0,
  gold numeric not null default 0,
  receivables numeric not null default 0,
  liabilities numeric not null default 0,
  nisab numeric not null default 24000,
  updated_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  market_value numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint primary key,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id bigint primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  saving_type text,
  method text,
  saved_at date default current_date,
  notes text,
  currency text default 'KWD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.expense_items enable row level security;
alter table public.investment_items enable row level security;
alter table public.financial_goals enable row level security;
alter table public.monthly_income_sources enable row level security;
alter table public.projects enable row level security;
alter table public.savings_items enable row level security;
alter table public.events enable row level security;
alter table public.financial_profiles enable row level security;
alter table public.holdings enable row level security;
alter table public.orders enable row level security;
alter table public.page_views enable row level security;
alter table public.savings enable row level security;

create index events_name_idx on public.events (name);
create index holdings_user_idx on public.holdings (user_id);
create index page_views_created_idx on public.page_views (created_at);
create index page_views_path_idx on public.page_views (path);

create policy "own financial profile"
  on public.financial_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own holdings"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view own savings"
  on public.savings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own savings"
  on public.savings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own savings"
  on public.savings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own savings"
  on public.savings for delete to authenticated
  using (auth.uid() = user_id);

-- Match the established Production Data API grants. RLS is enabled before these
-- grants, and the existing migrations add the ownership policies.
grant all privileges on table public.profiles to anon, authenticated, service_role;
grant all privileges on table public.expense_items to anon, authenticated, service_role;
grant all privileges on table public.investment_items to anon, authenticated, service_role;
grant all privileges on table public.financial_goals to anon, authenticated, service_role;
grant all privileges on table public.monthly_income_sources to anon, authenticated, service_role;
grant all privileges on table public.projects to anon, authenticated, service_role;
grant all privileges on table public.savings_items to anon, authenticated, service_role;
grant all privileges on table public.events to anon, authenticated, service_role;
grant all privileges on table public.financial_profiles to anon, authenticated, service_role;
grant all privileges on table public.holdings to anon, authenticated, service_role;
grant all privileges on table public.orders to anon, authenticated, service_role;
grant all privileges on table public.page_views to anon, authenticated, service_role;
grant all privileges on table public.savings to anon, authenticated, service_role;

create or replace function public.get_site_analytics()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'visitors_total',  (select count(distinct coalesce(session_id, user_id::text)) from page_views),
    'visitors_30d',    (select count(distinct coalesce(session_id, user_id::text)) from page_views where created_at > now() - interval '30 days'),
    'buyers_total',    (select count(distinct user_id) from orders where status in ('paid','completed')),
    'top_page',        (select path from page_views group by path order by count(*) desc limit 1),
    'top_page_views',  (select count(*)::int from page_views group by path order by count(*) desc limit 1),
    'top_feature',     (select name from events where category = 'feature' group by name order by count(*) desc limit 1),
    'top_feature_uses',(select count(*)::int from events where category = 'feature' group by name order by count(*) desc limit 1)
  );
$$;

revoke execute on function public.get_site_analytics() from public, anon, authenticated;
grant execute on function public.get_site_analytics() to service_role;

commit;
