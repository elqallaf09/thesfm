create table if not exists public.business_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  company text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  company text,
  supply_type text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.business_customers(id) on delete set null,
  invoice_number text,
  title text,
  amount numeric not null default 0,
  currency text default 'KWD',
  status text default 'draft',
  invoice_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_operating_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  amount numeric not null default 0,
  currency text default 'KWD',
  expense_date date not null default current_date,
  recurring_monthly boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_customers
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists company text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.business_suppliers
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists company text,
  add column if not exists supply_type text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.business_invoices
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists customer_id uuid references public.business_customers(id) on delete set null,
  add column if not exists invoice_number text,
  add column if not exists title text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists status text default 'draft',
  add column if not exists invoice_date date default current_date,
  add column if not exists due_date date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.business_operating_expenses
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists expense_date date default current_date,
  add column if not exists recurring_monthly boolean default false,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists business_customers_user_created_idx
  on public.business_customers(user_id, created_at desc);

create index if not exists business_customers_user_name_idx
  on public.business_customers(user_id, name);

create index if not exists business_suppliers_user_created_idx
  on public.business_suppliers(user_id, created_at desc);

create index if not exists business_suppliers_user_name_idx
  on public.business_suppliers(user_id, name);

create index if not exists business_invoices_user_date_idx
  on public.business_invoices(user_id, invoice_date desc, created_at desc);

create index if not exists business_invoices_user_status_idx
  on public.business_invoices(user_id, status);

create index if not exists business_invoices_user_customer_idx
  on public.business_invoices(user_id, customer_id);

create index if not exists business_operating_expenses_user_date_idx
  on public.business_operating_expenses(user_id, expense_date desc, created_at desc);

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

drop trigger if exists set_business_customers_updated_at on public.business_customers;
create trigger set_business_customers_updated_at
before update on public.business_customers
for each row execute function public.set_business_operations_updated_at();

drop trigger if exists set_business_suppliers_updated_at on public.business_suppliers;
create trigger set_business_suppliers_updated_at
before update on public.business_suppliers
for each row execute function public.set_business_operations_updated_at();

drop trigger if exists set_business_invoices_updated_at on public.business_invoices;
create trigger set_business_invoices_updated_at
before update on public.business_invoices
for each row execute function public.set_business_operations_updated_at();

drop trigger if exists set_business_operating_expenses_updated_at on public.business_operating_expenses;
create trigger set_business_operating_expenses_updated_at
before update on public.business_operating_expenses
for each row execute function public.set_business_operations_updated_at();

alter table public.business_customers enable row level security;
alter table public.business_suppliers enable row level security;
alter table public.business_invoices enable row level security;
alter table public.business_operating_expenses enable row level security;

drop policy if exists "Users can select own business customers" on public.business_customers;
create policy "Users can select own business customers"
  on public.business_customers
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business customers" on public.business_customers;
create policy "Users can insert own business customers"
  on public.business_customers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business customers" on public.business_customers;
create policy "Users can update own business customers"
  on public.business_customers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business customers" on public.business_customers;
create policy "Users can delete own business customers"
  on public.business_customers
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can select own business suppliers" on public.business_suppliers;
create policy "Users can select own business suppliers"
  on public.business_suppliers
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business suppliers" on public.business_suppliers;
create policy "Users can insert own business suppliers"
  on public.business_suppliers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business suppliers" on public.business_suppliers;
create policy "Users can update own business suppliers"
  on public.business_suppliers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business suppliers" on public.business_suppliers;
create policy "Users can delete own business suppliers"
  on public.business_suppliers
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can select own business invoices" on public.business_invoices;
create policy "Users can select own business invoices"
  on public.business_invoices
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business invoices" on public.business_invoices;
create policy "Users can insert own business invoices"
  on public.business_invoices
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business invoices" on public.business_invoices;
create policy "Users can update own business invoices"
  on public.business_invoices
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business invoices" on public.business_invoices;
create policy "Users can delete own business invoices"
  on public.business_invoices
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can select own business operating expenses" on public.business_operating_expenses;
create policy "Users can select own business operating expenses"
  on public.business_operating_expenses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business operating expenses" on public.business_operating_expenses;
create policy "Users can insert own business operating expenses"
  on public.business_operating_expenses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business operating expenses" on public.business_operating_expenses;
create policy "Users can update own business operating expenses"
  on public.business_operating_expenses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business operating expenses" on public.business_operating_expenses;
create policy "Users can delete own business operating expenses"
  on public.business_operating_expenses
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_customers to authenticated;
grant select, insert, update, delete on table public.business_suppliers to authenticated;
grant select, insert, update, delete on table public.business_invoices to authenticated;
grant select, insert, update, delete on table public.business_operating_expenses to authenticated;
