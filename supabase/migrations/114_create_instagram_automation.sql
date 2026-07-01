create table if not exists public.instagram_automation_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  topic text not null,
  titles jsonb not null default '{"ar":"","en":"","fr":""}'::jsonb,
  asset_prompts jsonb not null default '{"ar":"","en":"","fr":""}'::jsonb,
  captions jsonb not null default '{"ar":"","en":"","fr":""}'::jsonb,
  descriptions jsonb not null default '{"ar":"","en":"","fr":""}'::jsonb,
  hashtags jsonb not null default '{"ar":[],"en":[],"fr":[]}'::jsonb,
  ctas jsonb not null default '{"ar":"","en":"","fr":""}'::jsonb,
  asset_url text,
  thumbnail_url text,
  template_provider text,
  telegram_chat_id text,
  telegram_message_id text,
  instagram_container_id text,
  instagram_media_id text,
  status text not null default 'draft',
  approval_sent_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  review_notes text,
  raw_provider_responses jsonb not null default '{}'::jsonb,
  error_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_automation_posts_content_type_check
    check (content_type in ('reel', 'post', 'story')),
  constraint instagram_automation_posts_status_check
    check (status in ('draft', 'approval_pending', 'approved', 'rejected', 'publishing', 'published', 'failed'))
);

create table if not exists public.instagram_automation_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.instagram_automation_posts(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  status_from text,
  status_to text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  raw_provider_response jsonb,
  error_log jsonb,
  telegram_chat_id text,
  telegram_message_id text,
  instagram_container_id text,
  instagram_media_id text,
  created_at timestamptz not null default now()
);

alter table public.instagram_automation_posts
add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.instagram_automation_posts
add column if not exists created_at timestamptz not null default now();

alter table public.instagram_automation_posts
add column if not exists updated_at timestamptz not null default now();

create index if not exists instagram_automation_posts_status_created_idx
  on public.instagram_automation_posts(status, created_at desc);
create index if not exists instagram_automation_posts_created_by_idx
  on public.instagram_automation_posts(created_by, created_at desc);
create index if not exists instagram_automation_posts_content_type_idx
  on public.instagram_automation_posts(content_type, created_at desc);
create index if not exists instagram_automation_events_post_created_idx
  on public.instagram_automation_events(post_id, created_at desc);
create index if not exists instagram_automation_events_actor_created_idx
  on public.instagram_automation_events(actor_user_id, created_at desc);

create or replace function public.set_instagram_automation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_instagram_automation_posts_updated_at on public.instagram_automation_posts;
create trigger set_instagram_automation_posts_updated_at
before update on public.instagram_automation_posts
for each row execute function public.set_instagram_automation_updated_at();

alter table public.instagram_automation_posts enable row level security;
alter table public.instagram_automation_events enable row level security;

drop policy if exists "Creators can select own instagram automation posts" on public.instagram_automation_posts;
create policy "Creators can select own instagram automation posts"
  on public.instagram_automation_posts
  for select to authenticated
  using ((select auth.uid()) = created_by);

drop policy if exists "Creators can insert own instagram automation posts" on public.instagram_automation_posts;
create policy "Creators can insert own instagram automation posts"
  on public.instagram_automation_posts
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Creators can update own instagram automation posts" on public.instagram_automation_posts;
create policy "Creators can update own instagram automation posts"
  on public.instagram_automation_posts
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "Creators can delete own instagram automation posts" on public.instagram_automation_posts;
create policy "Creators can delete own instagram automation posts"
  on public.instagram_automation_posts
  for delete to authenticated
  using ((select auth.uid()) = created_by);

drop policy if exists "Creators can select own instagram automation events" on public.instagram_automation_events;
create policy "Creators can select own instagram automation events"
  on public.instagram_automation_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.instagram_automation_posts posts
      where posts.id = instagram_automation_events.post_id
        and posts.created_by = (select auth.uid())
    )
  );

drop policy if exists "Actors can insert own instagram automation events" on public.instagram_automation_events;
create policy "Actors can insert own instagram automation events"
  on public.instagram_automation_events
  for insert to authenticated
  with check ((select auth.uid()) = actor_user_id);

grant select, insert, update, delete on table public.instagram_automation_posts to authenticated;
grant select, insert on table public.instagram_automation_events to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.instagram_automation_posts to service_role;
grant select, insert, update, delete on table public.instagram_automation_events to service_role;
