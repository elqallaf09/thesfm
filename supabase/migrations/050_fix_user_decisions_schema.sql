create table if not exists public.user_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  decision_title text not null default '',
  decision_type text not null,
  estimated_cost numeric default 0,
  monthly_impact numeric default 0,
  expected_benefit text,
  risk_level text default 'medium',
  target_date date,
  notes text,
  risk_score numeric default 0,
  is_recommended boolean default false,
  main_reason text,
  better_alternative text,
  action_plan jsonb,
  currency text default 'KWD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_decisions
  add column if not exists decision_title text,
  add column if not exists estimated_cost numeric default 0,
  add column if not exists monthly_impact numeric default 0,
  add column if not exists expected_benefit text,
  add column if not exists risk_level text default 'medium',
  add column if not exists risk_score numeric default 0,
  add column if not exists is_recommended boolean default false,
  add column if not exists main_reason text,
  add column if not exists better_alternative text,
  add column if not exists action_plan jsonb,
  add column if not exists currency text default 'KWD',
  add column if not exists updated_at timestamptz default now(),
  add column if not exists title text,
  add column if not exists amount numeric default 0,
  add column if not exists priority text default 'medium',
  add column if not exists inputs jsonb default '{}'::jsonb,
  add column if not exists analysis jsonb default '{}'::jsonb,
  add column if not exists status text default 'analyzed';

update public.user_decisions
set
  decision_title = coalesce(nullif(btrim(decision_title), ''), nullif(btrim(title), ''), 'قرار مالي'),
  estimated_cost = coalesce(estimated_cost, amount, 0),
  risk_level = coalesce(nullif(btrim(risk_level), ''), priority, 'medium'),
  risk_score = coalesce(risk_score, 0),
  currency = coalesce(nullif(btrim(currency), ''), 'KWD'),
  updated_at = coalesce(updated_at, created_at, now())
where decision_title is null
   or btrim(decision_title) = ''
   or estimated_cost is null
   or risk_level is null
   or btrim(risk_level) = ''
   or risk_score is null
   or currency is null
   or btrim(currency) = ''
   or updated_at is null;

alter table public.user_decisions
  alter column decision_title set not null,
  alter column decision_title drop default,
  alter column estimated_cost set default 0,
  alter column monthly_impact set default 0,
  alter column risk_level set default 'medium',
  alter column risk_score set default 0,
  alter column is_recommended set default false,
  alter column currency set default 'KWD',
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists user_decisions_user_id_idx
on public.user_decisions(user_id);

create index if not exists user_decisions_type_idx
on public.user_decisions(decision_type);

create index if not exists user_decisions_created_at_idx
on public.user_decisions(created_at);

alter table public.user_decisions enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.user_decisions to authenticated;

drop policy if exists "Users can select own decisions" on public.user_decisions;
create policy "Users can select own decisions"
on public.user_decisions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own decisions" on public.user_decisions;
create policy "Users can insert own decisions"
on public.user_decisions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own decisions" on public.user_decisions;
create policy "Users can update own decisions"
on public.user_decisions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own decisions" on public.user_decisions;
create policy "Users can delete own decisions"
on public.user_decisions for delete
using (auth.uid() = user_id);
