begin;
alter table public.notifications add column if not exists opened_at timestamptz, add column if not exists actioned_at timestamptz, add column if not exists resolved_at timestamptz, add column if not exists resolution_code text;
create index if not exists notifications_user_source_resolution_idx on public.notifications(user_id, source_module, resolved_at, created_at desc);
create index if not exists notifications_user_source_actioned_idx on public.notifications(user_id, source_module, actioned_at, created_at desc);
create or replace function public.track_economic_intelligence_notification_outcome() returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
 if new.source_module = 'economic_intelligence' and new.status = 'read' and old.status is distinct from new.status then
  new.opened_at := coalesce(new.opened_at, now());
 end if;
 return new;
end;
$$;
drop trigger if exists notifications_track_economic_intelligence_outcome on public.notifications;
create trigger notifications_track_economic_intelligence_outcome before update on public.notifications for each row execute function public.track_economic_intelligence_notification_outcome();
commit;
