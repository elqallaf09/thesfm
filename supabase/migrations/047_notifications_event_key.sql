alter table public.notifications
  add column if not exists event_key text;

create unique index if not exists notifications_user_source_event_key_uidx
on public.notifications(user_id, source_module, event_key)
where event_key is not null;

create index if not exists notifications_user_source_event_status_idx
on public.notifications(user_id, source_module, event_key, status, created_at desc);
