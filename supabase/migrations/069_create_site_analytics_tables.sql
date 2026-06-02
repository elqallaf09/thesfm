create table if not exists public.site_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  user_id uuid null references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  language text,
  device_type text,
  browser text,
  os text,
  referrer text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  session_id text not null,
  event_type text not null,
  page_path text not null,
  page_title text,
  section_name text,
  referrer text,
  language text,
  device_type text,
  browser text,
  os text,
  country text,
  city text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_events_created_at_idx on public.site_events (created_at desc);
create index if not exists site_events_event_type_idx on public.site_events (event_type);
create index if not exists site_events_page_path_idx on public.site_events (page_path);
create index if not exists site_events_section_name_idx on public.site_events (section_name);
create index if not exists site_events_session_id_idx on public.site_events (session_id);
create index if not exists site_sessions_session_id_idx on public.site_sessions (session_id);
create index if not exists site_sessions_last_seen_at_idx on public.site_sessions (last_seen_at desc);

alter table public.site_events enable row level security;
alter table public.site_sessions enable row level security;

drop policy if exists "No browser reads site events" on public.site_events;
create policy "No browser reads site events"
on public.site_events
for select
to anon, authenticated
using (false);

drop policy if exists "No browser writes site events" on public.site_events;
create policy "No browser writes site events"
on public.site_events
for insert
to anon, authenticated
with check (false);

drop policy if exists "No browser reads site sessions" on public.site_sessions;
create policy "No browser reads site sessions"
on public.site_sessions
for select
to anon, authenticated
using (false);

drop policy if exists "No browser writes site sessions" on public.site_sessions;
create policy "No browser writes site sessions"
on public.site_sessions
for insert
to anon, authenticated
with check (false);

grant select, insert, update, delete on public.site_events to service_role;
grant select, insert, update, delete on public.site_sessions to service_role;
