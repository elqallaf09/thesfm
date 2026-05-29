create table if not exists public.user_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  decision_type text,
  amount numeric default 0,
  currency text default 'KWD',
  expected_benefit numeric default 0,
  monthly_impact numeric default 0,
  risk_level text,
  target_date date,
  notes text,
  analysis jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_decisions
  add column if not exists title text,
  add column if not exists decision_type text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists expected_benefit numeric default 0,
  add column if not exists monthly_impact numeric default 0,
  add column if not exists risk_level text,
  add column if not exists target_date date,
  add column if not exists notes text,
  add column if not exists analysis jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_decisions'
      and column_name = 'decision_title'
  ) then
    execute $sql$
      update public.user_decisions
      set title = coalesce(nullif(btrim(title), ''), nullif(btrim(decision_title), ''), 'قرار مالي')
      where title is null or btrim(title) = ''
    $sql$;
  else
    update public.user_decisions
    set title = coalesce(nullif(btrim(title), ''), 'قرار مالي')
    where title is null or btrim(title) = '';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_decisions'
      and column_name = 'estimated_cost'
  ) then
    execute $sql$
      update public.user_decisions
      set amount = coalesce(amount, estimated_cost, 0)
      where amount is null
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_decisions'
      and column_name = 'expected_benefit'
      and data_type not in ('numeric', 'real', 'double precision', 'integer', 'bigint', 'smallint')
  ) then
    alter table public.user_decisions
      alter column expected_benefit type numeric
      using case
        when expected_benefit is null then 0
        when btrim(expected_benefit::text) ~ '^-?[0-9]+(\.[0-9]+)?$' then expected_benefit::numeric
        else 0
      end;
  end if;
end $$;

update public.user_decisions
set
  title = coalesce(nullif(btrim(title), ''), 'قرار مالي'),
  amount = coalesce(amount, 0),
  currency = coalesce(nullif(btrim(currency), ''), 'KWD'),
  expected_benefit = coalesce(expected_benefit, 0),
  monthly_impact = coalesce(monthly_impact, 0),
  risk_level = coalesce(nullif(btrim(risk_level), ''), 'medium'),
  analysis = coalesce(analysis, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.user_decisions
  alter column title set not null,
  alter column title drop default,
  alter column amount set default 0,
  alter column currency set default 'KWD',
  alter column expected_benefit set default 0,
  alter column monthly_impact set default 0,
  alter column analysis set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists user_decisions_user_id_idx
on public.user_decisions(user_id);

create index if not exists user_decisions_user_updated_idx
on public.user_decisions(user_id, updated_at desc);

create index if not exists user_decisions_type_idx
on public.user_decisions(decision_type);

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

notify pgrst, 'reload schema';
