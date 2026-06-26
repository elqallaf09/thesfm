create table if not exists public.subscription_reminder_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_type text not null default 'manual',
  status text not null default 'completed',
  base_date date not null,
  timezone text not null default 'Asia/Kuwait',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  candidates_count integer not null default 0,
  processed_count integer not null default 0,
  email_sent_count integer not null default 0,
  email_failed_count integer not null default 0,
  smtp_configured boolean not null default false,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subscription_reminder_runs_type_check check (run_type in ('manual', 'scheduled', 'page_load', 'test_email')),
  constraint subscription_reminder_runs_status_check check (status in ('completed', 'failed', 'partial', 'skipped'))
);

create index if not exists subscription_reminder_runs_user_created_idx
  on public.subscription_reminder_runs(user_id, created_at desc);

alter table public.subscription_reminder_runs enable row level security;

drop policy if exists "Users can select own subscription reminder runs" on public.subscription_reminder_runs;
create policy "Users can select own subscription reminder runs"
on public.subscription_reminder_runs
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own subscription reminder runs" on public.subscription_reminder_runs;
create policy "Users can insert own subscription reminder runs"
on public.subscription_reminder_runs
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own subscription reminder runs" on public.subscription_reminder_runs;
create policy "Users can update own subscription reminder runs"
on public.subscription_reminder_runs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.subscription_reminder_runs to authenticated;

notify pgrst, 'reload schema';
