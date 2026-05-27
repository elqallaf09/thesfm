create table if not exists public.business_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text,
  customer_name text not null,
  product_or_service text,
  amount numeric not null default 0,
  currency text default 'KWD',
  status text default 'pending',
  sale_date date default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  employee_name text not null,
  role text,
  department text,
  salary numeric default 0,
  bonus numeric default 0,
  status text default 'active',
  join_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_sales
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists invoice_number text,
  add column if not exists customer_name text,
  add column if not exists product_or_service text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists status text default 'pending',
  add column if not exists sale_date date default current_date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.business_employees
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists employee_name text,
  add column if not exists role text,
  add column if not exists department text,
  add column if not exists salary numeric default 0,
  add column if not exists bonus numeric default 0,
  add column if not exists status text default 'active',
  add column if not exists join_date date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists business_sales_user_date_idx
  on public.business_sales(user_id, sale_date desc);

create index if not exists business_sales_user_status_idx
  on public.business_sales(user_id, status);

create index if not exists business_employees_user_status_idx
  on public.business_employees(user_id, status);

create index if not exists business_employees_user_department_idx
  on public.business_employees(user_id, department);

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

drop trigger if exists set_business_employees_updated_at on public.business_employees;
create trigger set_business_employees_updated_at
before update on public.business_employees
for each row execute function public.set_business_operations_updated_at();

alter table public.business_sales enable row level security;
alter table public.business_employees enable row level security;

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

drop policy if exists "Users can select own business employees" on public.business_employees;
create policy "Users can select own business employees"
  on public.business_employees
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business employees" on public.business_employees;
create policy "Users can insert own business employees"
  on public.business_employees
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business employees" on public.business_employees;
create policy "Users can update own business employees"
  on public.business_employees
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business employees" on public.business_employees;
create policy "Users can delete own business employees"
  on public.business_employees
  for delete
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_sales to authenticated;
grant select, insert, update, delete on table public.business_employees to authenticated;
