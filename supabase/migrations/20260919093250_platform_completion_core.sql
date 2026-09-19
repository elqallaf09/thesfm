-- Additive collaboration and ledger-close foundation. No existing rows are reset.
create schema if not exists sfm_private;
revoke all on schema sfm_private from public, anon, authenticated;

create table public.finance_month_closes (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  closed_at timestamptz not null default now(),
  snapshot jsonb not null,
  primary key(user_id, month)
);
create table public.finance_month_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  action text not null check(action in ('close', 'reopen')),
  reason text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.finance_month_closes enable row level security;
alter table public.finance_month_events enable row level security;
revoke all on public.finance_month_closes, public.finance_month_events from anon, authenticated;
grant select on public.finance_month_closes, public.finance_month_events to authenticated;
create policy month_close_owner on public.finance_month_closes for select to authenticated using (user_id = (select auth.uid()));
create policy month_event_owner on public.finance_month_events for select to authenticated using (user_id = (select auth.uid()));
create index finance_month_events_owner_date on public.finance_month_events(user_id, created_at desc);

-- One date definition is used for both the snapshot and write guard. Recurring
-- parent templates are excluded; their dated generated occurrences are included.
create function sfm_private.ledger_date(kind text, row_data jsonb) returns date
language sql immutable set search_path = '' as $$
  select case when kind = 'monthly_income_sources'
    and coalesce((row_data->>'is_recurring')::boolean, false)
    and nullif(row_data->>'parent_recurring_income_id', '') is null then null
  when kind = 'monthly_income_sources' then coalesce(
    nullif(row_data->>'received_date', '')::date,
    nullif(row_data->>'generated_for_date', '')::date,
    left(row_data->>'created_at', 10)::date)
  else coalesce(nullif(row_data->>'date', '')::date, left(row_data->>'created_at', 10)::date) end
$$;
create function sfm_private.guard_closed_month() returns trigger
language plpgsql security definer set search_path = '' as $$
declare old_row jsonb; new_row jsonb; item jsonb; owner_id uuid; item_date date;
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;
  -- Lock owners in a stable order, including both sides of a reassignment.
  for owner_id in select distinct (r->>'user_id')::uuid from unnest(array[old_row,new_row]) r
    where r is not null order by 1 loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 914));
  end loop;
  foreach item in array array[old_row,new_row] loop
    if item is null then continue; end if;
    item_date := sfm_private.ledger_date(tg_table_name, item);
    if exists(select 1 from public.finance_month_closes c
      where c.user_id = (item->>'user_id')::uuid and c.month = date_trunc('month', item_date)::date) then
      raise exception 'MONTH_CLOSED' using errcode = '23514';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger expense_closed_month before insert or update or delete on public.expense_items
for each row execute function sfm_private.guard_closed_month();
create trigger income_closed_month before insert or update or delete on public.monthly_income_sources
for each row execute function sfm_private.guard_closed_month();

create function public.finance_close_month(p_month date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month >= date_trunc('month', current_date)::date then
    raise exception 'COMPLETED_MONTH_REQUIRED';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 914));
  if exists(select 1 from public.finance_month_closes where user_id=owner_id and month=p_month) then
    raise exception 'MONTH_ALREADY_CLOSED';
  end if;
  -- Numeric amounts are kept as decimal strings, separately for every currency.
  with ledger as (
    select 'income' as kind, to_jsonb(i) as row_data from public.monthly_income_sources i
      where i.user_id=owner_id and sfm_private.ledger_date('monthly_income_sources',to_jsonb(i)) >= p_month
        and sfm_private.ledger_date('monthly_income_sources',to_jsonb(i)) < p_month + interval '1 month'
    union all
    select 'expense', to_jsonb(e) from public.expense_items e where e.user_id=owner_id
      and sfm_private.ledger_date('expense_items',to_jsonb(e)) >= p_month
      and sfm_private.ledger_date('expense_items',to_jsonb(e)) < p_month + interval '1 month'
  ), totals as (
    select kind, nullif(upper(trim(row_data->>'currency')), '') as currency,
      sum((row_data->>'amount')::numeric)::text as amount, count(*) as count
    from ledger where kind='expense' or row_data->>'status'='received'
    group by kind, nullif(upper(trim(row_data->>'currency')), '')
  ) select jsonb_build_object('version',1,'scope','dated_income_expense_records',
      'rows',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'record',row_data)) from ledger),'[]'::jsonb),
      'totals',coalesce((select jsonb_agg(to_jsonb(t)) from totals t),'[]'::jsonb)) into result;
  insert into public.finance_month_closes(user_id,month,snapshot) values(owner_id,p_month,result);
  insert into public.finance_month_events(user_id,month,action,snapshot) values(owner_id,p_month,'close',result);
  return result;
end $$;
create function public.finance_reopen_month(p_month date, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); previous jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'REASON_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 914));
  delete from public.finance_month_closes where user_id=owner_id and month=p_month returning snapshot into previous;
  if previous is null then raise exception 'MONTH_NOT_CLOSED'; end if;
  insert into public.finance_month_events(user_id,month,action,reason,snapshot) values(owner_id,p_month,'reopen',trim(p_reason),previous);
end $$;
revoke all on function sfm_private.ledger_date(text,jsonb), sfm_private.guard_closed_month() from public,anon,authenticated;
revoke all on function public.finance_close_month(date), public.finance_reopen_month(date,text) from public,anon;
grant execute on function public.finance_close_month(date), public.finance_reopen_month(date,text) to authenticated;

-- Teams share only explicit team notes. Membership never grants finance access.
create table public.sfm_teams (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 80), created_at timestamptz not null default now()
);
create table public.sfm_team_members (
 team_id uuid not null references public.sfm_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','member')), joined_at timestamptz not null default now(),
 primary key(team_id,user_id)
);
create index sfm_members_user on public.sfm_team_members(user_id,team_id);
create table public.sfm_team_invites (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.sfm_teams(id) on delete cascade,
 token_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days',
 used_at timestamptz, created_at timestamptz not null default now()
);
create table public.sfm_team_notes (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.sfm_teams(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create index sfm_notes_team_date on public.sfm_team_notes(team_id,created_at desc,id);
create function sfm_private.is_team_member(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sfm_team_members where team_id=target and user_id=auth.uid())
$$;
grant usage on schema sfm_private to authenticated;
revoke all on function sfm_private.is_team_member(uuid) from public,anon;
grant execute on function sfm_private.is_team_member(uuid) to authenticated;
alter table public.sfm_teams enable row level security;
alter table public.sfm_team_members enable row level security;
alter table public.sfm_team_invites enable row level security;
alter table public.sfm_team_notes enable row level security;
revoke all on public.sfm_teams,public.sfm_team_members,public.sfm_team_invites,public.sfm_team_notes from anon,authenticated;
grant select on public.sfm_teams,public.sfm_team_members,public.sfm_team_notes to authenticated;
create policy team_read on public.sfm_teams for select to authenticated using(sfm_private.is_team_member(id));
create policy member_read on public.sfm_team_members for select to authenticated using(sfm_private.is_team_member(team_id));
create policy note_read on public.sfm_team_notes for select to authenticated using(sfm_private.is_team_member(team_id));

create function public.sfm_team_action(p_action text, p_team uuid default null, p_value text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; team_owner uuid; token text; result jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,915));
 if p_action='create' then
   if (select count(*) from public.sfm_teams where owner_id=actor)>=20 then raise exception 'TEAM_LIMIT'; end if;
   insert into public.sfm_teams(owner_id,name) values(actor,trim(p_value)) returning id into target;
   insert into public.sfm_team_members(team_id,user_id,role) values(target,actor,'owner');
   return jsonb_build_object('id',target);
 end if;
 if p_action='join' then
   select team_id into target from public.sfm_team_invites
     where token_hash=encode(sha256(convert_to(p_value,'UTF8')),'hex') and used_at is null and expires_at>now() for update;
   if target is null then raise exception 'INVITE_UNAVAILABLE'; end if;
   insert into public.sfm_team_members(team_id,user_id,role) values(target,actor,'member') on conflict do nothing;
   update public.sfm_team_invites set used_at=now() where token_hash=encode(sha256(convert_to(p_value,'UTF8')),'hex');
   return jsonb_build_object('id',target);
 end if;
 select owner_id into team_owner from public.sfm_teams where id=p_team for update;
 if team_owner is null or not sfm_private.is_team_member(p_team) then raise exception 'TEAM_UNAVAILABLE'; end if;
 if p_action='note' then
   if (select count(*) from public.sfm_team_notes where author_id=actor and created_at>now()-interval '1 minute')>=10 then raise exception 'RATE_LIMIT'; end if;
   insert into public.sfm_team_notes(team_id,author_id,body) values(p_team,actor,trim(p_value));
 elsif p_action='delete_note' then
   delete from public.sfm_team_notes where team_id=p_team and id=p_value::uuid and (author_id=actor or team_owner=actor);
 elsif p_action='leave' then
   if team_owner=actor then raise exception 'OWNER_CANNOT_LEAVE'; end if;
   delete from public.sfm_team_members where team_id=p_team and user_id=actor;
 elsif team_owner<>actor then raise exception 'OWNER_REQUIRED';
 elsif p_action='invite' then
   if (select count(*) from public.sfm_team_invites where team_id=p_team and used_at is null and expires_at>now())>=20 then raise exception 'INVITE_LIMIT'; end if;
   token:=gen_random_uuid()::text || gen_random_uuid()::text;
   insert into public.sfm_team_invites(team_id,token_hash) values(p_team,encode(sha256(convert_to(token,'UTF8')),'hex'));
   return jsonb_build_object('code',token);
 elsif p_action='revoke_invites' then
   update public.sfm_team_invites set expires_at=now() where team_id=p_team and used_at is null;
 elsif p_action='remove_member' then
   delete from public.sfm_team_members where team_id=p_team and user_id=p_value::uuid and role<>'owner';
 else raise exception 'INVALID_ACTION'; end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.sfm_team_action(text,uuid,text) from public,anon;
grant execute on function public.sfm_team_action(text,uuid,text) to authenticated;

-- SFMer is opt-in, authenticated text publishing; no personal ledger is shared.
create table public.sfmer_posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 2 and 60),
 body text not null check(length(trim(body)) between 1 and 2000), created_at timestamptz not null default now(),
 hidden_at timestamptz
);
create index sfmer_posts_timeline on public.sfmer_posts(created_at desc,id desc) where hidden_at is null;
create table public.sfmer_blocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_user_id uuid not null references auth.users(id) on delete cascade,
 primary key(user_id,blocked_user_id), check(user_id<>blocked_user_id)
);
create table public.sfmer_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.sfmer_posts(id) on delete cascade,
 reason text not null check(length(trim(reason)) between 5 and 500), created_at timestamptz not null default now(),
 unique(reporter_id,post_id)
);
alter table public.sfmer_posts enable row level security;
alter table public.sfmer_blocks enable row level security;
alter table public.sfmer_reports enable row level security;
revoke all on public.sfmer_posts,public.sfmer_blocks,public.sfmer_reports from anon,authenticated;
grant select on public.sfmer_posts,public.sfmer_blocks,public.sfmer_reports to authenticated;
create policy block_owner on public.sfmer_blocks for select to authenticated using(user_id=(select auth.uid()));
create policy report_owner on public.sfmer_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy feed_read on public.sfmer_posts for select to authenticated using(
 hidden_at is null and not exists(select 1 from public.sfmer_blocks b where b.user_id=(select auth.uid()) and b.blocked_user_id=author_id)
 and not exists(select 1 from public.sfmer_reports r where r.reporter_id=(select auth.uid()) and r.post_id=sfmer_posts.id)
);
create function public.sfmer_action(p_action text,p_target uuid default null,p_body text default null,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_author uuid;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,916));
 if p_action='publish' then
   if (select count(*) from public.sfmer_posts where author_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'RATE_LIMIT'; end if;
   insert into public.sfmer_posts(author_id,display_name,body) values(actor,trim(p_name),trim(p_body));
 elsif p_action='edit' then
   update public.sfmer_posts set body=trim(p_body),display_name=trim(p_name) where id=p_target and author_id=actor and hidden_at is null;
 elsif p_action='delete' then
   update public.sfmer_posts set hidden_at=now() where id=p_target and author_id=actor;
 elsif p_action='unblock' then
   delete from public.sfmer_blocks where user_id=actor and blocked_user_id=p_target;
 elsif p_action in ('report','block') then
   select author_id into target_author from public.sfmer_posts where id=p_target and hidden_at is null;
   if target_author is null or target_author=actor then raise exception 'POST_UNAVAILABLE'; end if;
   if p_action='report' then
     insert into public.sfmer_reports(reporter_id,post_id,reason) values(actor,p_target,trim(p_body)) on conflict do nothing;
   else
     insert into public.sfmer_blocks(user_id,blocked_user_id) values(actor,target_author) on conflict do nothing;
   end if;
 else raise exception 'INVALID_ACTION'; end if;
end $$;
revoke all on function public.sfmer_action(text,uuid,text,text) from public,anon;
grant execute on function public.sfmer_action(text,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
