-- Disposable database only; all fixtures and auth stand-ins roll back.
begin;
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION_FAILED: %',label; end if; end $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
   if position(expected in sqlerrm)>0 then return; end if;
   raise;
 end;
 raise exception 'EXPECTED_ERROR: %',expected;
end $$;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.expense_items(id,user_id,name,amount,currency,date) values
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','Expense',10,'KWD','2020-01-15');
insert into public.monthly_income_sources(user_id,category,amount,currency,status,received_date,is_recurring) values
 ('00000000-0000-4000-8000-000000000001','salary',30,'USD','received','2020-01-15',false),
 ('00000000-0000-4000-8000-000000000001','salary',99,'USD','expected','2020-01-15',false),
 ('00000000-0000-4000-8000-000000000001','salary',99,'USD','received','2020-01-15',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.finance_close_month('2020-01-01');
select pg_temp.assert_true((select jsonb_array_length(snapshot->'rows')=3 and jsonb_array_length(snapshot->'totals')=2 from public.finance_month_closes),'snapshot excludes recurring templates');
select pg_temp.assert_true((select (t->>'amount')::numeric=30 from public.finance_month_closes,jsonb_array_elements(snapshot->'totals') t where t->>'kind'='income'),'received-only income');
select pg_temp.expect_error($q$update public.expense_items set amount=12 where id='00000000-0000-4000-8000-000000000011'$q$,'MONTH_CLOSED');
select pg_temp.expect_error($q$update public.expense_items set date='2020-02-01' where id='00000000-0000-4000-8000-000000000011'$q$,'MONTH_CLOSED');
select pg_temp.expect_error($q$delete from public.expense_items where id='00000000-0000-4000-8000-000000000011'$q$,'MONTH_CLOSED');
select pg_temp.expect_error($q$insert into public.expense_items(user_id,name,amount,currency,date) values(auth.uid(),'Late',2,'KWD','2020-01-10')$q$,'MONTH_CLOSED');
select pg_temp.expect_error($q$delete from public.finance_month_events$q$,'permission denied');
select pg_temp.expect_error($q$select public.finance_reopen_month('2020-01-01','')$q$,'REASON_REQUIRED');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.finance_month_closes),'close isolation');
select pg_temp.expect_error($q$select public.finance_reopen_month('2020-01-01','Testing reason')$q$,'MONTH_NOT_CLOSED');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.finance_reopen_month('2020-01-01','Correct the expense');
update public.expense_items set amount=12 where id='00000000-0000-4000-8000-000000000011';
select pg_temp.assert_true((select count(*)=2 from public.finance_month_events),'immutable audit retained');
select set_config('test.team',(public.sfm_team_action('create',null,'Test team')->>'id'),true);
select set_config('test.invite',(public.sfm_team_action('invite',current_setting('test.team')::uuid)->>'code'),true);
select public.sfm_team_action('note',current_setting('test.team')::uuid,'Owner note');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.sfm_team_notes),'nonmember cannot read notes');
select pg_temp.expect_error($q$select public.sfm_team_action('note',current_setting('test.team')::uuid,'Intruder')$q$,'TEAM_UNAVAILABLE');
select public.sfm_team_action('join',null,current_setting('test.invite'));
select pg_temp.assert_true((select count(*)=1 from public.sfm_team_notes),'member can read notes');
select pg_temp.expect_error($q$select public.sfm_team_action('join',null,current_setting('test.invite'))$q$,'INVITE_UNAVAILABLE');
select pg_temp.expect_error($q$select public.sfm_team_action('invite',current_setting('test.team')::uuid)$q$,'OWNER_REQUIRED');
select pg_temp.assert_true((select count(*)=0 from public.expense_items),'membership does not expose finance');
select public.sfm_team_action('leave',current_setting('test.team')::uuid);
select pg_temp.assert_true((select count(*)=0 from public.sfm_team_notes),'leaving revokes read');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.sfmer_action('publish',null,'Financial discussion','Test author');
select set_config('test.post',(select id::text from public.sfmer_posts limit 1),true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.sfmer_action('edit',current_setting('test.post')::uuid,'Attempted overwrite','Another author');
select pg_temp.assert_true((select body='Financial discussion' from public.sfmer_posts limit 1),'nonowner cannot edit post');
select public.sfmer_action('block',current_setting('test.post')::uuid);
select pg_temp.assert_true((select count(*)=0 from public.sfmer_posts),'blocked author hidden');
select public.sfmer_action('unblock','00000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*)=1 from public.sfmer_posts),'unblock restores feed');
select public.sfmer_action('report',current_setting('test.post')::uuid,'Review this post');
select pg_temp.assert_true((select count(*)=0 from public.sfmer_posts),'reported post hidden for reporter');
select pg_temp.expect_error($q$select public.sfmer_moderate('list')$q$,'ADMIN_REQUIRED');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_error($q$select public.sfm_team_action('create',null,'Anonymous')$q$,'AUTH_REQUIRED');
set local role anon;
select pg_temp.expect_error($q$select * from public.sfmer_posts$q$,'permission denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.finance_close_month('2020-01-01');
reset role;
-- Mirror /api/account/delete: legacy finance/profile FKs do not all cascade.
-- Only the privileged, authenticated account-erasure route removes these locks.
delete from public.finance_month_closes where user_id='00000000-0000-4000-8000-000000000001';
delete from public.finance_month_events where user_id='00000000-0000-4000-8000-000000000001';
delete from public.monthly_income_sources where user_id='00000000-0000-4000-8000-000000000001';
delete from public.expense_items where user_id='00000000-0000-4000-8000-000000000001';
delete from public.profiles where id='00000000-0000-4000-8000-000000000001';
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*)=0 from public.expense_items where user_id='00000000-0000-4000-8000-000000000001'),'explicit account erasure removes closed ledger');
rollback;
