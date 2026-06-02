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
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_sales
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists invoice_number text,
  add column if not exists customer_name text,
  add column if not exists customer_id uuid null,
  add column if not exists product_or_service text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists status text default 'completed',
  add column if not exists sale_date date default current_date,
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
  amount = coalesce(amount, 0),
  sale_date = coalesce(sale_date, current_date);

alter table public.business_sales
  alter column amount set default 0,
  alter column amount set not null,
  alter column currency set default 'KWD',
  alter column currency set not null,
  alter column status set default 'completed',
  alter column status set not null,
  alter column sale_date set default current_date,
  alter column sale_date set not null;

alter table public.business_sales
  drop constraint if exists business_sales_status_check;

alter table public.business_sales
  add constraint business_sales_status_check
  check (status in ('completed', 'pending', 'cancelled', 'refunded', 'canceled'))
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_amount_check;

alter table public.business_sales
  add constraint business_sales_amount_check
  check (amount > 0)
  not valid;

alter table public.business_sales
  drop constraint if exists business_sales_product_required_check;

alter table public.business_sales
  add constraint business_sales_product_required_check
  check (product_or_service is not null and nullif(btrim(product_or_service), '') is not null)
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
  alter table public.business_sales validate constraint business_sales_product_required_check;
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

alter table public.business_sales enable row level security;

drop policy if exists "Users can select own business sales" on public.business_sales;
create policy "Users can select own business sales"
  on public.business_sales
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business sales" on public.business_sales;
create policy "Users can insert own business sales"
  on public.business_sales
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business sales" on public.business_sales;
create policy "Users can update own business sales"
  on public.business_sales
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business sales" on public.business_sales;
create policy "Users can delete own business sales"
  on public.business_sales
  for delete
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_sales to authenticated;
