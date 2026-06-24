create table if not exists public.account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_activity
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists event_type text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

delete from public.account_activity
where user_id is null
  and (
    title in (
      'تم تحديث الملف الشخصي',
      'تم إضافة هدف مالي',
      'تم إضافة استثمار',
      'تم تغيير اللغة',
      'تم تصدير تقرير',
      'Profile updated',
      'Financial goal added',
      'Investment added',
      'Language changed',
      'Report exported'
    )
    or metadata ? 'demo'
    or metadata ? 'mock'
    or metadata ? 'seed'
  );

update public.account_activity
set event_type = lower(regexp_replace(coalesce(nullif(event_type, ''), title, 'unknown'), '[^a-zA-Z0-9_]+', '_', 'g'))
where event_type is null or event_type = '';

update public.account_activity
set title = event_type
where title is null or title = '';

do $$
begin
  if not exists (select 1 from public.account_activity where user_id is null) then
    alter table public.account_activity alter column user_id set not null;
  end if;
end $$;

alter table public.account_activity alter column event_type set not null;
alter table public.account_activity alter column title set not null;
alter table public.account_activity alter column metadata set default '{}'::jsonb;
alter table public.account_activity alter column created_at set default now();

create index if not exists activity_user_created_idx
  on public.account_activity (user_id, created_at desc);

create index if not exists activity_user_event_created_idx
  on public.account_activity (user_id, event_type, created_at desc);

alter table public.account_activity enable row level security;

drop policy if exists "Users can select own account activity" on public.account_activity;
create policy "Users can select own account activity"
  on public.account_activity
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own account activity" on public.account_activity;
create policy "Users can insert own account activity"
  on public.account_activity
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.account_activity to authenticated;
