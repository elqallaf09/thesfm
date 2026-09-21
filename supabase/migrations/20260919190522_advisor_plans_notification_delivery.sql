-- Immutable user-owned plan versions. Calculations are persisted only by the authenticated server route.
create table public.sfm_advisor_plans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 report jsonb not null check (jsonb_typeof(report) = 'object'),
 created_at timestamptz not null default now()
);
alter table public.sfm_advisor_plans enable row level security;
revoke all on public.sfm_advisor_plans from anon, authenticated;
grant select, delete on public.sfm_advisor_plans to authenticated;
grant all on public.sfm_advisor_plans to service_role;
create policy advisor_plan_owner_read on public.sfm_advisor_plans for select to authenticated using (user_id = (select auth.uid()));
create policy advisor_plan_owner_delete on public.sfm_advisor_plans for delete to authenticated using (user_id = (select auth.uid()));
create index advisor_plan_owner_created on public.sfm_advisor_plans(user_id,created_at desc);

-- Destinations can only be verified by the server. Client writes never grant delivery consent.
create table public.sfm_notification_channels (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in ('email','telegram','whatsapp','push')),
 device_key text not null default '',
 destination jsonb not null,
 enabled boolean not null default false,
 verified_at timestamptz not null,
 locale text not null default 'ar' check(locale in ('ar','en','fr')),
 quiet_start integer check(quiet_start between 0 and 1439),
 quiet_end integer check(quiet_end between 0 and 1439),
 timezone text not null default 'Asia/Kuwait',
 created_at timestamptz not null default now(),
 unique(user_id,channel,device_key)
);
create table public.sfm_notification_link_codes (
 token_hash text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in ('telegram','whatsapp')),
 locale text not null check(locale in ('ar','en','fr')),
 expires_at timestamptz not null
);
create table public.sfm_notification_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 notification_id uuid not null references public.notifications(id) on delete cascade,
 channel_id uuid not null references public.sfm_notification_channels(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','failed','uncertain','cancelled')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 locked_at timestamptz,
 attempt_token uuid,
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 unique(notification_id,channel_id)
);
alter table public.sfm_notification_channels enable row level security;
alter table public.sfm_notification_link_codes enable row level security;
alter table public.sfm_notification_deliveries enable row level security;
revoke all on public.sfm_notification_channels, public.sfm_notification_link_codes, public.sfm_notification_deliveries from anon, authenticated;
grant all on public.sfm_notification_channels, public.sfm_notification_link_codes, public.sfm_notification_deliveries to service_role;
-- Status metadata is owner-readable, endpoint secrets are available only through a redacted API.
grant select on public.sfm_notification_deliveries to authenticated;
create policy delivery_owner on public.sfm_notification_deliveries for select to authenticated using (user_id=(select auth.uid()));
create index sfm_delivery_due on public.sfm_notification_deliveries(available_at) where status='queued';
create index sfm_delivery_owner on public.sfm_notification_deliveries(user_id,created_at desc);
create index sfm_channel_owner on public.sfm_notification_channels(user_id);

create function sfm_private.enqueue_notification_channels() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Only new, unread notifications created after opt-in are delivered. A bounded queue prevents bursts.
 if new.user_id is not null and coalesce(new.read,false)=false and coalesce(new.status,'unread')='unread' then
  -- Serialize each owner's enqueue count, including concurrent notifications and multiple channels.
  perform 1 from auth.users where id=new.user_id for update;
  insert into public.sfm_notification_deliveries(user_id,notification_id,channel_id)
  select new.user_id,new.id,c.id from public.sfm_notification_channels c
  where c.user_id=new.user_id and c.enabled and new.created_at>=c.verified_at
  order by c.created_at,c.id
  limit greatest(0,100-(select count(*) from public.sfm_notification_deliveries d where d.user_id=new.user_id and d.created_at>now()-interval '1 day'))
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function sfm_private.enqueue_notification_channels() from public,anon,authenticated;
create trigger sfm_notification_enqueue after insert on public.notifications for each row execute function sfm_private.enqueue_notification_channels();

-- A worker crash after starting delivery is ambiguous: do not resend automatically.
create function public.sfm_claim_notification_deliveries() returns setof public.sfm_notification_deliveries
language plpgsql security definer set search_path='' as $$
begin
 update public.sfm_notification_deliveries set status='uncertain',error_code='WORKER_INTERRUPTED'
 where status='sending' and locked_at<now()-interval '5 minutes';
 return query
 with picked as (select id from public.sfm_notification_deliveries where status='queued' and available_at<=now()
 order by available_at for update skip locked limit 10)
 update public.sfm_notification_deliveries d set status='sending',attempts=attempts+1,locked_at=now(),attempt_token=gen_random_uuid()
 from picked where d.id=picked.id returning d.*;
end $$;
revoke all on function public.sfm_claim_notification_deliveries() from public,anon,authenticated;
grant execute on function public.sfm_claim_notification_deliveries() to service_role;

create function public.sfm_verify_notification_channel(p_hash text,p_channel text,p_destination jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare code public.sfm_notification_link_codes;
begin
 delete from public.sfm_notification_link_codes where token_hash=p_hash and channel=p_channel and expires_at>now() returning * into code;
 if code.user_id is null then return false; end if;
 insert into public.sfm_notification_channels(user_id,channel,destination,enabled,verified_at,locale)
 values(code.user_id,code.channel,p_destination,true,now(),code.locale)
 on conflict(user_id,channel,device_key) do update set destination=excluded.destination,enabled=true,verified_at=now(),locale=excluded.locale;
 return true;
end $$;
revoke all on function public.sfm_verify_notification_channel(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sfm_verify_notification_channel(text,text,jsonb) to service_role;
