create table if not exists public.charity_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  reminder_type text default 'general',
  related_project_id uuid references public.charity_projects(id) on delete set null,
  related_zakat_asset_id uuid references public.zakat_assets(id) on delete set null,
  related_commitment_id uuid references public.charity_commitments(id) on delete set null,
  reminder_date date,
  due_date date,
  hijri_date text,
  remind_before_days integer default 30,
  status text default 'pending',
  priority text default 'normal',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.charity_reminders
  add column if not exists description text,
  add column if not exists reminder_type text default 'general',
  add column if not exists related_project_id uuid references public.charity_projects(id) on delete set null,
  add column if not exists related_zakat_asset_id uuid references public.zakat_assets(id) on delete set null,
  add column if not exists related_commitment_id uuid references public.charity_commitments(id) on delete set null,
  add column if not exists reminder_date date,
  add column if not exists due_date date,
  add column if not exists hijri_date text,
  add column if not exists remind_before_days integer default 30,
  add column if not exists status text default 'pending',
  add column if not exists priority text default 'normal',
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.charity_reminders
set
  due_date = coalesce(due_date, reminder_date),
  reminder_date = coalesce(reminder_date, due_date),
  status = coalesce(nullif(btrim(status), ''), 'pending'),
  reminder_type = coalesce(nullif(btrim(reminder_type), ''), 'general'),
  updated_at = coalesce(updated_at, created_at, now());

create index if not exists charity_reminders_user_id_idx on public.charity_reminders(user_id);
create index if not exists charity_reminders_due_date_idx on public.charity_reminders(due_date);
create index if not exists charity_reminders_reminder_date_idx on public.charity_reminders(reminder_date);
create index if not exists charity_reminders_status_idx on public.charity_reminders(status);
create index if not exists charity_reminders_type_idx on public.charity_reminders(reminder_type);
create index if not exists charity_reminders_project_idx on public.charity_reminders(related_project_id);
create index if not exists charity_reminders_zakat_asset_idx on public.charity_reminders(related_zakat_asset_id);
create index if not exists charity_reminders_commitment_idx on public.charity_reminders(related_commitment_id);

create unique index if not exists charity_reminders_generated_unique
on public.charity_reminders(
  user_id,
  reminder_type,
  coalesce(related_project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(related_zakat_asset_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(related_commitment_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(due_date, reminder_date)
)
where coalesce(due_date, reminder_date) is not null;

alter table public.charity_reminders enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.charity_reminders to authenticated;

drop policy if exists "Users can select own charity reminders" on public.charity_reminders;
drop policy if exists "Users can insert own charity reminders" on public.charity_reminders;
drop policy if exists "Users can update own charity reminders" on public.charity_reminders;
drop policy if exists "Users can delete own charity reminders" on public.charity_reminders;
drop policy if exists "Users can view own charity reminders" on public.charity_reminders;

create policy "Users can view own charity reminders"
on public.charity_reminders
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own charity reminders"
on public.charity_reminders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own charity reminders"
on public.charity_reminders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own charity reminders"
on public.charity_reminders
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
