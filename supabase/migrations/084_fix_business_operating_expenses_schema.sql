create extension if not exists pgcrypto;

create table if not exists public.business_operating_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  amount numeric not null,
  currency text not null default 'KWD',
  expense_date date not null,
  recurring_monthly boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint business_operating_expenses_amount_check
    check (amount > 0)
);

alter table public.business_operating_expenses
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists amount numeric,
  add column if not exists currency text default 'KWD',
  add column if not exists expense_date date,
  add column if not exists recurring_monthly boolean default false,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.business_operating_expenses
set
  currency = coalesce(nullif(btrim(currency), ''), 'KWD'),
  recurring_monthly = coalesce(recurring_monthly, false),
  expense_date = coalesce(expense_date, current_date);

alter table public.business_operating_expenses
  alter column id set default gen_random_uuid(),
  alter column amount drop default,
  alter column currency set default 'KWD',
  alter column expense_date set default current_date,
  alter column recurring_monthly set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (select 1 from public.business_operating_expenses where id is null) then
    alter table public.business_operating_expenses alter column id set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where user_id is null) then
    alter table public.business_operating_expenses alter column user_id set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where name is null) then
    alter table public.business_operating_expenses alter column name set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where amount is null) then
    alter table public.business_operating_expenses alter column amount set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where currency is null) then
    alter table public.business_operating_expenses alter column currency set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where expense_date is null) then
    alter table public.business_operating_expenses alter column expense_date set not null;
  end if;

  if not exists (select 1 from public.business_operating_expenses where recurring_monthly is null) then
    alter table public.business_operating_expenses alter column recurring_monthly set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_operating_expenses'::regclass
      and contype = 'p'
  ) then
    alter table public.business_operating_expenses
      add constraint business_operating_expenses_pkey primary key (id);
  end if;
end $$;

alter table public.business_operating_expenses
  drop constraint if exists business_operating_expenses_amount_check;

alter table public.business_operating_expenses
  add constraint business_operating_expenses_amount_check
  check (amount is not null and amount > 0)
  not valid;

alter table public.business_operating_expenses
  drop constraint if exists business_operating_expenses_name_required_check;

alter table public.business_operating_expenses
  add constraint business_operating_expenses_name_required_check
  check (name is not null and nullif(btrim(name), '') is not null)
  not valid;

alter table public.business_operating_expenses
  drop constraint if exists business_operating_expenses_required_fields_check;

alter table public.business_operating_expenses
  add constraint business_operating_expenses_required_fields_check
  check (
    user_id is not null
    and currency is not null
    and nullif(btrim(currency), '') is not null
    and expense_date is not null
    and recurring_monthly is not null
  )
  not valid;

do $$
begin
  alter table public.business_operating_expenses validate constraint business_operating_expenses_amount_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_operating_expenses validate constraint business_operating_expenses_name_required_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_operating_expenses validate constraint business_operating_expenses_required_fields_check;
exception
  when others then null;
end;
$$;

create index if not exists business_operating_expenses_user_date_idx
  on public.business_operating_expenses(user_id, expense_date desc);

create index if not exists business_operating_expenses_user_category_idx
  on public.business_operating_expenses(user_id, category);

create or replace function public.set_business_operations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_operating_expenses_updated_at on public.business_operating_expenses;
create trigger set_business_operating_expenses_updated_at
before update on public.business_operating_expenses
for each row execute function public.set_business_operations_updated_at();

alter table public.business_operating_expenses enable row level security;

drop policy if exists "Users can select own business operating expenses" on public.business_operating_expenses;
drop policy if exists "Users can view own business operating expenses" on public.business_operating_expenses;
create policy "Users can view own business operating expenses"
on public.business_operating_expenses
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own business operating expenses" on public.business_operating_expenses;
create policy "Users can insert own business operating expenses"
on public.business_operating_expenses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own business operating expenses" on public.business_operating_expenses;
create policy "Users can update own business operating expenses"
on public.business_operating_expenses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own business operating expenses" on public.business_operating_expenses;
create policy "Users can delete own business operating expenses"
on public.business_operating_expenses
for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_operating_expenses to authenticated;
