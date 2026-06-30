create table if not exists public.khums_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  currency text not null default 'KWD',
  marja_name text,
  total_income numeric not null default 0,
  total_expenses numeric not null default 0,
  surplus numeric not null default 0,
  khums_due numeric not null default 0,
  imam_share numeric not null default 0,
  sayyid_share numeric not null default 0,
  imam_share_percent numeric not null default 0.5,
  sayyid_share_percent numeric not null default 0.5,
  status text not null default 'incomplete'
    check (status in ('not_due', 'incomplete', 'complete', 'overpaid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (total_income >= 0),
  check (total_expenses >= 0),
  check (surplus >= 0),
  check (khums_due >= 0),
  check (imam_share >= 0),
  check (sayyid_share >= 0),
  check (imam_share_percent >= 0 and imam_share_percent <= 1),
  check (sayyid_share_percent >= 0 and sayyid_share_percent <= 1)
);

create table if not exists public.khums_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  khums_year_id uuid references public.khums_years(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense', 'adjustment')),
  category text not null,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'KWD',
  description text,
  date date,
  created_at timestamptz not null default now()
);

create table if not exists public.khums_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  khums_year_id uuid references public.khums_years(id) on delete cascade not null,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'KWD',
  payment_date date not null default current_date,
  recipient text,
  share_type text not null default 'unspecified'
    check (share_type in ('imam', 'sayyid', 'unspecified')),
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.khums_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  khums_year_id uuid references public.khums_years(id) on delete cascade not null,
  reminder_date date not null,
  reminder_type text not null default 'custom'
    check (reminder_type in ('before_year_end_30', 'year_end', 'custom')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'dismissed')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists khums_years_user_id_idx on public.khums_years(user_id);
create index if not exists khums_years_end_date_idx on public.khums_years(end_date);
create index if not exists khums_entries_user_year_idx on public.khums_entries(user_id, khums_year_id);
create index if not exists khums_entries_type_idx on public.khums_entries(type);
create index if not exists khums_payments_user_year_idx on public.khums_payments(user_id, khums_year_id);
create index if not exists khums_payments_date_idx on public.khums_payments(payment_date);
create index if not exists khums_reminders_user_year_idx on public.khums_reminders(user_id, khums_year_id);
create index if not exists khums_reminders_date_idx on public.khums_reminders(reminder_date);

create unique index if not exists khums_reminders_unique_default_idx
on public.khums_reminders(user_id, khums_year_id, reminder_type, reminder_date);

alter table public.khums_years enable row level security;
alter table public.khums_entries enable row level security;
alter table public.khums_payments enable row level security;
alter table public.khums_reminders enable row level security;

drop policy if exists "Users can view own khums years" on public.khums_years;
create policy "Users can view own khums years"
on public.khums_years for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own khums years" on public.khums_years;
create policy "Users can insert own khums years"
on public.khums_years for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own khums years" on public.khums_years;
create policy "Users can update own khums years"
on public.khums_years for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own khums years" on public.khums_years;
create policy "Users can delete own khums years"
on public.khums_years for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own khums entries" on public.khums_entries;
create policy "Users can view own khums entries"
on public.khums_entries for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own khums entries" on public.khums_entries;
create policy "Users can insert own khums entries"
on public.khums_entries for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_entries.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own khums entries" on public.khums_entries;
create policy "Users can update own khums entries"
on public.khums_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_entries.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own khums entries" on public.khums_entries;
create policy "Users can delete own khums entries"
on public.khums_entries for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own khums payments" on public.khums_payments;
create policy "Users can view own khums payments"
on public.khums_payments for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own khums payments" on public.khums_payments;
create policy "Users can insert own khums payments"
on public.khums_payments for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_payments.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own khums payments" on public.khums_payments;
create policy "Users can update own khums payments"
on public.khums_payments for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_payments.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own khums payments" on public.khums_payments;
create policy "Users can delete own khums payments"
on public.khums_payments for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own khums reminders" on public.khums_reminders;
create policy "Users can view own khums reminders"
on public.khums_reminders for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own khums reminders" on public.khums_reminders;
create policy "Users can insert own khums reminders"
on public.khums_reminders for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_reminders.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own khums reminders" on public.khums_reminders;
create policy "Users can update own khums reminders"
on public.khums_reminders for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.khums_years
    where khums_years.id = khums_reminders.khums_year_id
    and khums_years.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own khums reminders" on public.khums_reminders;
create policy "Users can delete own khums reminders"
on public.khums_reminders for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.khums_years to authenticated;
grant select, insert, update, delete on table public.khums_entries to authenticated;
grant select, insert, update, delete on table public.khums_payments to authenticated;
grant select, insert, update, delete on table public.khums_reminders to authenticated;

grant select, insert, update, delete on table public.khums_years to service_role;
grant select, insert, update, delete on table public.khums_entries to service_role;
grant select, insert, update, delete on table public.khums_payments to service_role;
grant select, insert, update, delete on table public.khums_reminders to service_role;
