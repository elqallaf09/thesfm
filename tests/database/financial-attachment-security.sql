-- Disposable database only; rollback all fixtures and stub changes.
begin;
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated, anon;
alter table storage.objects enable row level security;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION_FAILED: %',label; end if; end $$;
create function pg_temp.expect_rls(statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when insufficient_privilege then return; end;
 raise exception 'EXPECTED_RLS_DENIAL: %',statement;
end $$;
select pg_temp.assert_true((select count(*)=2 from storage.buckets where id in ('receipts','income-attachments') and public=false),'both financial buckets are private');
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000101'), ('00000000-0000-4000-8000-000000000102');
insert into storage.objects(bucket_id,name) values
 ('receipts','00000000-0000-4000-8000-000000000101/expense.jpg'),
 ('receipts','00000000-0000-4000-8000-000000000101/project-expenses/expense.jpg'),
 ('income-attachments','00000000-0000-4000-8000-000000000101/income/statement.pdf'),
 ('receipts','00000000-0000-4000-8000-000000000102/expense.jpg'),
 ('income-attachments','00000000-0000-4000-8000-000000000102/income/statement.pdf');
-- Prove a future broad permissive policy cannot override the restrictive boundary.
create policy test_accidental_broad_policy on storage.objects for all to anon, authenticated using (true) with check (true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select pg_temp.assert_true((select count(*)=3 from storage.objects),'only own financial attachments visible');
insert into storage.objects(bucket_id,name) values ('receipts','00000000-0000-4000-8000-000000000101/new.jpg');
select pg_temp.expect_rls($q$insert into storage.objects(bucket_id,name) values ('receipts','00000000-0000-4000-8000-000000000102/denied.jpg')$q$);
select pg_temp.expect_rls($q$insert into storage.objects(bucket_id,name) values ('income-attachments','00000000-0000-4000-8000-000000000102/denied.pdf')$q$);
select pg_temp.expect_rls($q$update storage.objects set name='00000000-0000-4000-8000-000000000102/moved.jpg' where name like '%/new.jpg'$q$);
with changed as (delete from storage.objects where name like '00000000-0000-4000-8000-000000000102/%' returning *)
 select pg_temp.assert_true((select count(*)=0 from changed),'cannot delete another owner files');
with changed as (delete from storage.objects where name like '%/new.jpg' returning *)
 select pg_temp.assert_true((select count(*)=1 from changed),'can delete own receipt');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.assert_true((select count(*)=0 from storage.objects),'anonymous cannot read financial attachments');
select pg_temp.expect_rls($q$insert into storage.objects(bucket_id,name) values ('receipts','00000000-0000-4000-8000-000000000101/anonymous.jpg')$q$);
rollback;
