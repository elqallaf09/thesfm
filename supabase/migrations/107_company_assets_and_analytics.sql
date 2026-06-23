-- Company image uploads and privacy-safe aggregate analytics.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company assets public read" on storage.objects;
create policy "company assets public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'company-assets');

drop policy if exists "company assets owner insert" on storage.objects;
create policy "company assets owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "company assets owner update" on storage.objects;
create policy "company assets owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "company assets owner delete" on storage.objects;
create policy "company assets owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create table if not exists public.company_analytics_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_listings(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'company_card_view',
      'company_profile_view',
      'company_website_click',
      'company_contact_click'
    )
  ),
  user_id uuid null references auth.users(id) on delete set null,
  session_id text null,
  ip_hash text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists company_analytics_events_company_type_idx
on public.company_analytics_events (company_id, event_type, created_at desc);

create index if not exists company_analytics_events_dedupe_idx
on public.company_analytics_events (company_id, event_type, user_id, session_id, ip_hash, created_at desc);

alter table public.company_analytics_events enable row level security;

drop view if exists public.company_analytics_summary;
create view public.company_analytics_summary
with (security_invoker = true)
as
select
  company_id,
  count(*) filter (where event_type = 'company_card_view')::bigint as card_views_count,
  count(*) filter (where event_type = 'company_profile_view')::bigint as profile_views_count,
  count(*) filter (where event_type = 'company_website_click')::bigint as website_clicks_count,
  count(*) filter (where event_type = 'company_contact_click')::bigint as contact_clicks_count,
  max(created_at) as last_viewed_at
from public.company_analytics_events
group by company_id;

revoke all on public.company_analytics_events from anon, authenticated;
revoke all on public.company_analytics_summary from anon, authenticated;
