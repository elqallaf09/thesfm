create extension if not exists pgcrypto;

create table if not exists public.business_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text,
  customer_name text not null,
  customer_id uuid null,
  product_or_service text not null,
  amount numeric not null,
  currency text not null default 'KWD',
  status text not null default 'completed',
  sale_date date not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint business_sales_status_check
    check (status in ('completed', 'pending', 'cancelled', 'refunded')),
  constraint business_sales_amount_check
    check (amount > 0)
);

alter table public.business_sales
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists invoice_number text,
  add column if not exists customer_name text,
  add column if not exists customer_id uuid null,
  add column if not exists product_or_service text,
  add column if not exists amount numeric,
  add column if not exists currency text default 'KWD',
  add column if not exists status text default 'completed',
  add column if not exists sale_date date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.business_sales
set
  currency = coalesce(nullif(btrim(currency), ''), 'KWD'),
  status = case
    when status = 'canceled' then 'cancelled'
    when status in ('completed', 'pending', 'cancelled', 'refunded') then status
    else 'completed'
  end,
  sale_date = coalesce(sale_date, current_date);

alter table public.business_sales
  alter column id set default gen_random_uuid(),
  alter column amount drop default,
  alter column currency set default 'KWD',
  alter column status set default 'completed',
  alter column sale_date set default current_date,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (select 1 from public.business_sales where id is null) then
    alter table public.business_sales alter column id set not null;
  end if;

  if not exists (select 1 from public.business_sales where user_id is null) then
    alter table public.business_sales alter column user_id set not null;
  end if;

  if not exists (select 1 from public.business_sales where customer_name is null) then
    alter table public.business_sales alter column customer_name set not null;
  end if;

  if not exists (select 1 from public.business_sales where product_or_service is null) then
    alter table public.business_sales alter column product_or_service set not null;
  end if;

  if not exists (select 1 from public.business_sales where amount is null) then
    alter table public.business_sales alter column amount set not null;
  end if;

  if not exists (select 1 from public.business_sales where currency is null) then
    alter table public.business_sales alter column currency set not null;
  end if;

  if not exists (select 1 from public.business_sales where status is null) then
    alter table public.business_sales alter column status set not null;
  end if;

  if not exists (select 1 from public.business_sales where sale_date is null) then
    alter table public.business_sales alter column sale_date set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_sales'::regclass
      and contype = 'p'
  ) then
    alter table public.business_sales
      add constraint business_sales_pkey primary key (id);
  end if;
end $$;

alter table public.business_sales
  drop constraint if exists business_sales_status_check;

alter table public.business_sales
  add constraint business_sales_status_check
  check (status in ('completed', 'pending', 'cancelled', 'refunded'))
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_amount_check;

alter table public.business_sales
  add constraint business_sales_amount_check
  check (amount is not null and amount > 0)
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_customer_required_check;

alter table public.business_sales
  add constraint business_sales_customer_required_check
  check (customer_name is not null and nullif(btrim(customer_name), '') is not null)
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_product_required_check;

alter table public.business_sales
  add constraint business_sales_product_required_check
  check (product_or_service is not null and nullif(btrim(product_or_service), '') is not null)
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_required_fields_check;

alter table public.business_sales
  add constraint business_sales_required_fields_check
  check (
    user_id is not null
    and currency is not null
    and nullif(btrim(currency), '') is not null
    and status is not null
    and sale_date is not null
  )
  not valid;

do $$
begin
  alter table public.business_sales validate constraint business_sales_status_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_sales validate constraint business_sales_amount_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_sales validate constraint business_sales_customer_required_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_sales validate constraint business_sales_product_required_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_sales validate constraint business_sales_required_fields_check;
exception
  when others then null;
end;
$$;

create index if not exists business_sales_user_date_idx
  on public.business_sales(user_id, sale_date desc);

create index if not exists business_sales_user_status_idx
  on public.business_sales(user_id, status);

create index if not exists business_sales_user_customer_idx
  on public.business_sales(user_id, customer_id);

create or replace function public.set_business_operations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_sales_updated_at on public.business_sales;
create trigger set_business_sales_updated_at
before update on public.business_sales
for each row execute function public.set_business_operations_updated_at();

alter table public.business_sales enable row level security;

drop policy if exists "Users can select own business sales" on public.business_sales;
drop policy if exists "Users can view own business sales" on public.business_sales;
create policy "Users can view own business sales"
on public.business_sales
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own business sales" on public.business_sales;
create policy "Users can insert own business sales"
on public.business_sales
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own business sales" on public.business_sales;
create policy "Users can update own business sales"
on public.business_sales
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own business sales" on public.business_sales;
create policy "Users can delete own business sales"
on public.business_sales
for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_sales to authenticated;
