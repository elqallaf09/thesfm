-- Schema-only baseline for the seven public tables that predate repository migrations.
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

alter table public.profiles enable row level security;
alter table public.expense_items enable row level security;
alter table public.investment_items enable row level security;
alter table public.financial_goals enable row level security;
alter table public.monthly_income_sources enable row level security;
alter table public.projects enable row level security;
alter table public.savings_items enable row level security;

-- Match the established Production Data API grants. RLS is enabled before these
-- grants, and the existing migrations add the ownership policies.
grant all privileges on table public.profiles to anon, authenticated, service_role;
grant all privileges on table public.expense_items to anon, authenticated, service_role;
grant all privileges on table public.investment_items to anon, authenticated, service_role;
grant all privileges on table public.financial_goals to anon, authenticated, service_role;
grant all privileges on table public.monthly_income_sources to anon, authenticated, service_role;
grant all privileges on table public.projects to anon, authenticated, service_role;
grant all privileges on table public.savings_items to anon, authenticated, service_role;

commit;
