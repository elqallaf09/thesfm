alter table public.notifications
  add column if not exists severity text default 'info',
  add column if not exists source_module text,
  add column if not exists source_id uuid,
  add column if not exists action_url text,
  add column if not exists status text default 'unread',
  add column if not exists due_date date,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists read_at timestamptz;

update public.notifications
set
  status = case when read is true then 'read' else coalesce(status, 'unread') end,
  read_at = case when read is true and read_at is null then created_at else read_at end,
  action_url = coalesce(action_url, link),
  severity = coalesce(severity, case when type = 'warning' then 'warning' when type = 'success' then 'success' else 'info' end),
  source_module = coalesce(source_module, type)
where user_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notifications" on public.notifications;
create policy "Users can insert own notifications"
on public.notifications for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications for delete
using (auth.uid() = user_id);

create index if not exists notifications_user_status_created_idx
on public.notifications(user_id, status, created_at desc);

create index if not exists notifications_user_due_date_idx
on public.notifications(user_id, due_date);

create index if not exists notifications_user_source_idx
on public.notifications(user_id, source_module, source_id, type, due_date);
