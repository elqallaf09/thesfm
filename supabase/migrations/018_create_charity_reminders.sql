create table if not exists public.charity_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  reminder_type text default 'general',
  related_project_id uuid references public.charity_projects(id) on delete set null,
  related_zakat_asset_id uuid references public.zakat_assets(id) on delete set null,
  related_commitment_id uuid references public.charity_commitments(id) on delete set null,
  due_date date not null,
  hijri_date text,
  remind_before_days integer default 30,
  status text default 'active',
  priority text default 'normal',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_reminders_user_id_idx on public.charity_reminders(user_id);
create index if not exists charity_reminders_due_date_idx on public.charity_reminders(due_date);
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
  due_date
);

alter table public.charity_reminders enable row level security;

drop policy if exists "Users can select own charity reminders" on public.charity_reminders;
create policy "Users can select own charity reminders"
on public.charity_reminders for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity reminders" on public.charity_reminders;
create policy "Users can insert own charity reminders"
on public.charity_reminders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity reminders" on public.charity_reminders;
create policy "Users can update own charity reminders"
on public.charity_reminders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity reminders" on public.charity_reminders;
create policy "Users can delete own charity reminders"
on public.charity_reminders for delete
using (auth.uid() = user_id);
