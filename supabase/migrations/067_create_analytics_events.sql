create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  session_id text,
  event_type text not null,
  page_path text,
  page_title text,
  module text,
  referrer text,
  language text,
  device_type text,
  browser text,
  operating_system text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_type_idx on public.analytics_events (event_type);
create index if not exists analytics_events_page_path_idx on public.analytics_events (page_path);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_module_idx on public.analytics_events (module);

alter table public.analytics_events enable row level security;

drop policy if exists "Visitors can insert analytics events" on public.analytics_events;
create policy "Visitors can insert analytics events"
on public.analytics_events
for insert
to anon, authenticated
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Users cannot read analytics events" on public.analytics_events;
create policy "Users cannot read analytics events"
on public.analytics_events
for select
to anon, authenticated
using (false);

grant insert on public.analytics_events to anon, authenticated;
grant select, insert, update, delete on public.analytics_events to service_role;
