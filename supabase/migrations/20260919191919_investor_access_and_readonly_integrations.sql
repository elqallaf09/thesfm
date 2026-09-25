-- Atomic activity counter. Only the server can call it after link/password validation.
create function public.sfm_record_investor_open(p_link uuid) returns void
language sql security definer set search_path='' as $$
 update public.project_investor_links set access_count=coalesce(access_count,0)+1,last_accessed_at=now()
 where id=p_link and revoked_at is null and (expires_at is null or expires_at>now());
$$;
revoke all on function public.sfm_record_investor_open(uuid) from public,anon,authenticated;
grant execute on function public.sfm_record_investor_open(uuid) to service_role;

create table public.sfm_integration_keys(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 label text not null check(length(label) between 1 and 80), token_hash text not null unique,
 scopes text[] not null check(cardinality(scopes)>0 and scopes <@ array['portfolio:read','notifications:read','snapshots:write']::text[]),
 expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now(),last_used_at timestamptz,
 request_minute timestamptz,requests integer not null default 0
);
create table public.sfm_integration_snapshots(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 key_id uuid references public.sfm_integration_keys(id) on delete set null,
 source text not null check(source in ('mt5','ibkr','bank','wallet','custom')),
 external_id text not null check(length(external_id) between 1 and 100),
 observed_at timestamptz not null,received_at timestamptz not null default now(),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 unique(user_id,source,external_id)
);
alter table public.sfm_integration_keys enable row level security;
alter table public.sfm_integration_snapshots enable row level security;
revoke all on public.sfm_integration_keys,public.sfm_integration_snapshots from anon,authenticated;
grant all on public.sfm_integration_keys,public.sfm_integration_snapshots to service_role;
grant select,delete on public.sfm_integration_snapshots to authenticated;
create policy integration_snapshot_owner_read on public.sfm_integration_snapshots for select to authenticated using(user_id=(select auth.uid()));
create policy integration_snapshot_owner_delete on public.sfm_integration_snapshots for delete to authenticated using(user_id=(select auth.uid()));
create index integration_snapshot_owner_received on public.sfm_integration_snapshots(user_id,received_at desc);
create index integration_key_owner on public.sfm_integration_keys(user_id);
-- Atomically authenticate and apply a durable 30/minute quota shared across server instances.
create function public.sfm_authorize_integration(p_hash text,p_scope text) returns uuid
language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 update public.sfm_integration_keys set
  requests=case when request_minute=date_trunc('minute',now()) then requests+1 else 1 end,
  request_minute=date_trunc('minute',now()),last_used_at=now()
 where token_hash=p_hash and revoked_at is null and expires_at>now() and p_scope=any(scopes)
  and (request_minute is distinct from date_trunc('minute',now()) or requests<30)
 returning user_id into owner_id;
 return owner_id;
end $$;
revoke all on function public.sfm_authorize_integration(text,text) from public,anon,authenticated;
grant execute on function public.sfm_authorize_integration(text,text) to service_role;
