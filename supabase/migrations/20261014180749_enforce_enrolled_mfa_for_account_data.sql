-- Deploy after email_mfa_sessions and the web/native challenge handlers.
-- Opt-in MFA only. Existing ownership/role policies remain mandatory.
begin;
create function sfm_private.has_required_mfa() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); requires_totp boolean; requires_email boolean; sid text := auth.jwt()->>'session_id';
begin
  if actor is null then return false; end if;
  select exists(select 1 from auth.mfa_factors where user_id=actor and status='verified') into requires_totp;
  select coalesce(email_2fa_enabled,false) into requires_email from public.profiles where id=actor;
  if not found then return false; end if;
  if not requires_totp and not requires_email then return true; end if;
  if not exists(select 1 from auth.sessions where id::text=sid and user_id=actor) then return false; end if;
  if auth.jwt()->>'aal' = 'aal2' then return true; end if;
  if requires_totp then return false; end if;
  return exists(select 1 from public.email_mfa_sessions where user_id=actor and session_id::text=sid and expires_at>now());
end $$;
revoke all on function sfm_private.has_required_mfa() from public,anon;
grant execute on function sfm_private.has_required_mfa() to authenticated;

-- All currently existing RLS tables with account ownership, including team
-- records. Public market/catalog tables without account ownership are untouched.
do $$ declare target record; begin
  for target in
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
      and c.relname not in ('profiles','email_mfa_sessions')
      and exists(select 1 from pg_attribute a where a.attrelid=c.oid and not a.attisdropped
        and a.attname in ('user_id','owner_id','author_id','team_id'))
  loop
    execute format('create policy enrolled_mfa_required on public.%I as restrictive for all to authenticated using ((select sfm_private.has_required_mfa())) with check ((select sfm_private.has_required_mfa()))',target.relname);
  end loop;
end $$;
-- Own profile SELECT remains available for the login security decision.
-- A first-factor session cannot disable its MFA flag or delete that profile.
create policy enrolled_mfa_profile_update on public.profiles as restrictive for update to authenticated
using ((select sfm_private.has_required_mfa())) with check ((select sfm_private.has_required_mfa()));
create policy enrolled_mfa_profile_delete on public.profiles as restrictive for delete to authenticated
using ((select sfm_private.has_required_mfa()));
create policy enrolled_mfa_financial_files on storage.objects as restrictive for all to authenticated
using (bucket_id not in ('receipts','income-attachments') or (select sfm_private.has_required_mfa()))
with check (bucket_id not in ('receipts','income-attachments') or (select sfm_private.has_required_mfa()));

-- SECURITY DEFINER RPCs must enforce assurance before bypassing table RLS.
create or replace function public.finance_close_month(p_month date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
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

create or replace function public.finance_reopen_month(p_month date, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); previous jsonb;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'REASON_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 914));
  delete from public.finance_month_closes where user_id=owner_id and month=p_month returning snapshot into previous;
  if previous is null then raise exception 'MONTH_NOT_CLOSED'; end if;
  insert into public.finance_month_events(user_id,month,action,reason,snapshot) values(owner_id,p_month,'reopen',trim(p_reason),previous);
end $$;

create or replace function public.sfm_team_action(p_action text, p_team uuid default null, p_value text default null, p_name text default 'Member') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; team_owner uuid; token text; result jsonb;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,915));
 if p_action='create' then
   if (select count(*) from public.sfm_teams where owner_id=actor)>=20 then raise exception 'TEAM_LIMIT'; end if;
   insert into public.sfm_teams(owner_id,name) values(actor,trim(p_value)) returning id into target;
   insert into public.sfm_team_members(team_id,user_id,role,display_name) values(target,actor,'owner',trim(p_name));
   return jsonb_build_object('id',target);
 end if;
 if p_action='join' then
   select team_id into target from public.sfm_team_invites
     where token_hash=encode(sha256(convert_to(p_value,'UTF8')),'hex') and used_at is null and expires_at>now() for update;
   if target is null then raise exception 'INVITE_UNAVAILABLE'; end if;
   insert into public.sfm_team_members(team_id,user_id,role,display_name) values(target,actor,'member',trim(p_name)) on conflict do nothing;
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

create or replace function public.sfm_team_task(p_team uuid,p_action text,p_id uuid default null,p_title text default null,p_assignee uuid default null,p_due date default null,p_status text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();owner_id uuid;task public.sfm_team_tasks;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
 if actor is null then raise exception 'AUTH_REQUIRED';end if;
 select t.owner_id into owner_id from public.sfm_teams t where t.id=p_team for update;
 if owner_id is null or not sfm_private.is_team_member(p_team) then raise exception 'TEAM_UNAVAILABLE';end if;
 if p_assignee is not null and not exists(select 1 from public.sfm_team_members m where m.team_id=p_team and m.user_id=p_assignee) then raise exception 'ASSIGNEE_UNAVAILABLE';end if;
 if p_action='create' then
  if (select count(*) from public.sfm_team_tasks where team_id=p_team)>=1000 then raise exception 'TASK_LIMIT';end if;
  insert into public.sfm_team_tasks(team_id,author_id,assignee_id,title,due_date) values(p_team,actor,p_assignee,trim(p_title),p_due);
  return;
 end if;
 select * into task from public.sfm_team_tasks where id=p_id and team_id=p_team for update;
 if task.id is null or (actor<>owner_id and actor<>task.author_id and actor is distinct from task.assignee_id) then raise exception 'TASK_UNAVAILABLE';end if;
 if p_action='status' then update public.sfm_team_tasks set status=p_status,updated_at=now() where id=p_id;
 elsif p_action='delete' and (actor=owner_id or actor=task.author_id) then delete from public.sfm_team_tasks where id=p_id;
 else raise exception 'INVALID_ACTION';end if;
end $$;

create or replace function public.sfmer_action(p_action text,p_target uuid default null,p_body text default null,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_author uuid;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
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

create or replace function public.sfmer_moderate(p_action text default 'list',p_report uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; target uuid;
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
 if auth.uid() is null or not app_private.is_current_user_admin_role('super_admin') then raise exception 'ADMIN_REQUIRED'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
   select report.id, report.reason, report.created_at, post.body, post.display_name
   from public.sfmer_reports report join public.sfmer_posts post on post.id=report.post_id
   where report.resolved_at is null order by report.created_at,report.id limit 50
  ) r;
  return result;
 end if;
 if p_action not in ('hide','dismiss') then raise exception 'INVALID_ACTION'; end if;
 select post_id into target from public.sfmer_reports where id=p_report and resolved_at is null for update;
 if target is null then raise exception 'REPORT_UNAVAILABLE'; end if;
 if p_action='hide' then update public.sfmer_posts set hidden_at=now() where id=target; end if;
 update public.sfmer_reports set resolved_at=now(),resolution=p_action,moderator_id=auth.uid() where id=p_report;
 return '{}'::jsonb;
end $$;

create or replace function public.sfmer_save_profile(p_handle text,p_name text,p_bio text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and not sfm_private.has_required_mfa() then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 insert into public.sfmer_profiles(user_id,handle,display_name,bio) values(auth.uid(),lower(trim(p_handle)),trim(p_name),trim(p_bio))
 on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,updated_at=now();
end $$;

commit;
