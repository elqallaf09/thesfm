create table if not exists public.business_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  employee_name text,
  role text,
  department text,
  salary numeric not null default 0,
  currency text not null default 'KWD',
  skill_level numeric default 0,
  bonus numeric default 0,
  status text not null default 'active',
  join_date date,
  salary_day integer,
  payroll_due_day integer default 25,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_employees
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists employee_name text,
  add column if not exists role text,
  add column if not exists department text,
  add column if not exists salary numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists skill_level numeric default 0,
  add column if not exists bonus numeric default 0,
  add column if not exists status text default 'active',
  add column if not exists join_date date,
  add column if not exists salary_day integer,
  add column if not exists payroll_due_day integer default 25,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.business_employees
set
  name = coalesce(nullif(btrim(name), ''), nullif(btrim(employee_name), ''), name),
  employee_name = coalesce(nullif(btrim(employee_name), ''), nullif(btrim(name), ''), employee_name),
  currency = coalesce(nullif(btrim(currency), ''), 'KWD'),
  skill_level = coalesce(skill_level, 0),
  bonus = coalesce(bonus, 0),
  status = coalesce(nullif(btrim(status), ''), 'active'),
  salary_day = coalesce(salary_day, payroll_due_day),
  payroll_due_day = coalesce(payroll_due_day, salary_day, 25),
  salary = coalesce(salary, 0);

alter table public.business_employees
  alter column salary set default 0,
  alter column salary set not null,
  alter column currency set default 'KWD',
  alter column currency set not null,
  alter column skill_level set default 0,
  alter column status set default 'active',
  alter column status set not null,
  alter column payroll_due_day set default 25;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_employees'
      and column_name = 'name'
  ) then
    begin
      alter table public.business_employees alter column name set not null;
    exception
      when others then null;
    end;
  end if;
end;
$$;

create or replace function public.normalize_business_employee_row()
returns trigger
language plpgsql
as $$
begin
  if new.name is null or btrim(new.name) = '' then
    new.name = nullif(btrim(new.employee_name), '');
  end if;

  if new.employee_name is null or btrim(new.employee_name) = '' then
    new.employee_name = new.name;
  end if;

  if new.salary is null then
    new.salary = 0;
  end if;

  if new.currency is null or btrim(new.currency) = '' then
    new.currency = 'KWD';
  end if;

  if new.skill_level is null then
    new.skill_level = 0;
  end if;

  if new.bonus is null then
    new.bonus = 0;
  end if;

  if new.status is null or btrim(new.status) = '' then
    new.status = 'active';
  end if;

  if new.salary_day is null then
    new.salary_day = new.payroll_due_day;
  end if;

  if new.payroll_due_day is null then
    new.payroll_due_day = coalesce(new.salary_day, 25);
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_business_employee_row on public.business_employees;
create trigger normalize_business_employee_row
before insert or update on public.business_employees
for each row execute function public.normalize_business_employee_row();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_employees_status_check'
      and conrelid = 'public.business_employees'::regclass
  ) then
    alter table public.business_employees
      add constraint business_employees_status_check
      check (status in ('active', 'inactive', 'on_leave'))
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_employees_salary_check'
      and conrelid = 'public.business_employees'::regclass
  ) then
    alter table public.business_employees
      add constraint business_employees_salary_check
      check (salary >= 0)
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_employees_skill_level_check'
      and conrelid = 'public.business_employees'::regclass
  ) then
    alter table public.business_employees
      add constraint business_employees_skill_level_check
      check (skill_level is null or (skill_level >= 0 and skill_level <= 100))
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_employees_salary_day_check'
      and conrelid = 'public.business_employees'::regclass
  ) then
    alter table public.business_employees
      add constraint business_employees_salary_day_check
      check (salary_day is null or (salary_day >= 1 and salary_day <= 31))
      not valid;
  end if;
end;
$$;

do $$
begin
  alter table public.business_employees validate constraint business_employees_status_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_employees validate constraint business_employees_salary_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_employees validate constraint business_employees_skill_level_check;
exception
  when others then null;
end;
$$;

do $$
begin
  alter table public.business_employees validate constraint business_employees_salary_day_check;
exception
  when others then null;
end;
$$;

create index if not exists business_employees_user_status_idx
  on public.business_employees(user_id, status);

create index if not exists business_employees_user_salary_day_idx
  on public.business_employees(user_id, salary_day);

create index if not exists business_employees_user_payroll_due_day_idx
  on public.business_employees(user_id, payroll_due_day);

alter table public.business_employees enable row level security;

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
grant select, insert, update, delete on table public.business_employees to authenticated;
