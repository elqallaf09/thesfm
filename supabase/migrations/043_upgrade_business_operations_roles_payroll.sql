alter table public.business_employees
  add column if not exists payroll_due_day integer default 25;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_employees_payroll_due_day_check'
      and conrelid = 'public.business_employees'::regclass
  ) then
    alter table public.business_employees
      add constraint business_employees_payroll_due_day_check
      check (payroll_due_day is null or (payroll_due_day >= 1 and payroll_due_day <= 31))
      not valid;
  end if;
end;
$$;

do $$
begin
  alter table public.business_employees validate constraint business_employees_payroll_due_day_check;
exception
  when others then null;
end;
$$;

create table if not exists public.business_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'manager',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint business_user_roles_role_check check (role in ('manager', 'accountant', 'employee'))
);

alter table public.business_user_roles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role text default 'manager',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists business_user_roles_user_id_key
  on public.business_user_roles(user_id);

create index if not exists business_employees_user_payroll_due_day_idx
  on public.business_employees(user_id, payroll_due_day);

create or replace function public.set_business_user_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_user_roles_updated_at on public.business_user_roles;
create trigger set_business_user_roles_updated_at
before update on public.business_user_roles
for each row execute function public.set_business_user_roles_updated_at();

alter table public.business_user_roles enable row level security;

drop policy if exists "Users can select own business role" on public.business_user_roles;
create policy "Users can select own business role"
  on public.business_user_roles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own default business role" on public.business_user_roles;
create policy "Users can insert own default business role"
  on public.business_user_roles
  for insert
  with check (auth.uid() = user_id and role = 'manager');

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.business_sales to authenticated;
grant select, insert, update, delete on table public.business_employees to authenticated;
grant select, insert, update, delete on table public.business_user_roles to authenticated;
