create extension if not exists pgcrypto;

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

alter table public.business_suppliers
  add column if not exists id uuid default gen_random_uuid(),
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

alter table public.business_suppliers
  alter column id set default gen_random_uuid(),
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (select 1 from public.business_suppliers where id is null) then
    alter table public.business_suppliers alter column id set not null;
  end if;

  if not exists (select 1 from public.business_suppliers where user_id is null) then
    alter table public.business_suppliers alter column user_id set not null;
  end if;

  if not exists (select 1 from public.business_suppliers where name is null) then
    alter table public.business_suppliers alter column name set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_suppliers'::regclass
      and contype = 'p'
  ) then
    alter table public.business_suppliers
      add constraint business_suppliers_pkey primary key (id);
  end if;
end $$;

create index if not exists business_suppliers_user_created_idx
  on public.business_suppliers(user_id, created_at desc);

create index if not exists business_suppliers_user_name_idx
  on public.business_suppliers(user_id, name);

create or replace function public.set_business_operations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_suppliers_updated_at on public.business_suppliers;
create trigger set_business_suppliers_updated_at
before update on public.business_suppliers
for each row execute function public.set_business_operations_updated_at();

alter table public.business_suppliers enable row level security;

drop policy if exists "Users can select own business suppliers" on public.business_suppliers;
drop policy if exists "Users can insert own business suppliers" on public.business_suppliers;
drop policy if exists "Users can update own business suppliers" on public.business_suppliers;
drop policy if exists "Users can delete own business suppliers" on public.business_suppliers;

drop policy if exists "Users can view own suppliers" on public.business_suppliers;
create policy "Users can view own suppliers"
  on public.business_suppliers
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own suppliers" on public.business_suppliers;
create policy "Users can insert own suppliers"
  on public.business_suppliers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own suppliers" on public.business_suppliers;
create policy "Users can update own suppliers"
  on public.business_suppliers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own suppliers" on public.business_suppliers;
create policy "Users can delete own suppliers"
  on public.business_suppliers
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_suppliers to authenticated;
