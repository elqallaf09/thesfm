alter table public.notifications
  add column if not exists opened_at timestamptz,
  add column if not exists actioned_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_code text;

create index if not exists notifications_user_source_resolution_idx
on public.notifications(user_id, source_module, resolved_at, created_at desc);

create index if not exists notifications_user_source_actioned_idx
on public.notifications(user_id, source_module, actioned_at, created_at desc);
