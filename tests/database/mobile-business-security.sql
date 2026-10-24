-- Disposable database only. Synthetic identities, no production records.
begin;
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION_FAILED: %',label; end if; end $$;
create function pg_temp.expect_rls(statement text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when insufficient_privilege then return;
 end;
 raise exception 'EXPECTED_RLS_DENIAL: %',statement;
end $$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000102');
insert into public.business_user_roles(user_id,role) values('00000000-0000-4000-8000-000000000101','manager');
insert into public.business_customers(id,user_id,name) values
 ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000101','Own customer'),
 ('00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000102','Foreign customer');
insert into public.business_suppliers(user_id,name) values('00000000-0000-4000-8000-000000000101','Supplier');
insert into public.business_invoices(user_id,title,amount,customer_id) values('00000000-0000-4000-8000-000000000101','Invoice',1,'00000000-0000-4000-8000-000000000111');
insert into public.business_sales(user_id,product_or_service,customer_name,amount) values('00000000-0000-4000-8000-000000000101','Sale','Customer',1);
insert into public.business_operating_expenses(user_id,name,amount) values('00000000-0000-4000-8000-000000000101','Expense',1);
insert into public.business_employees(user_id,name,employee_name) values('00000000-0000-4000-8000-000000000101','Employee','Employee');
insert into public.financial_goals(id,user_id,goal,amount,duration,duration_unit) values
 ('00000000-0000-4000-8000-000000000121','00000000-0000-4000-8000-000000000101','Own goal',10,'1','month'),
 ('00000000-0000-4000-8000-000000000122','00000000-0000-4000-8000-000000000102','Foreign goal',10,'1','month');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select pg_temp.assert_true((select count(*)=1 from public.business_customers),'owner cannot read another customer');
select pg_temp.expect_rls($q$insert into public.business_customers(user_id,name) values('00000000-0000-4000-8000-000000000102','Impersonation')$q$);
select pg_temp.expect_rls($q$update public.business_customers set user_id='00000000-0000-4000-8000-000000000102'$q$);
select pg_temp.expect_rls($q$insert into public.business_invoices(user_id,title,customer_id) values(auth.uid(),'Foreign link','00000000-0000-4000-8000-000000000112')$q$);
select pg_temp.expect_rls($q$update public.business_invoices set customer_id='00000000-0000-4000-8000-000000000112'$q$);
select pg_temp.expect_rls($q$update public.business_sales set customer_id='00000000-0000-4000-8000-000000000112'$q$);
select pg_temp.expect_rls($q$insert into public.savings_items(user_id,name,amount,goal_id) values(auth.uid(),'Foreign goal',1,'00000000-0000-4000-8000-000000000122')$q$);
insert into public.savings_items(user_id,name,amount,goal_id) values(auth.uid(),'Owned saving',1,'00000000-0000-4000-8000-000000000121');
select pg_temp.expect_rls($q$update public.savings_items set goal_id='00000000-0000-4000-8000-000000000122'$q$);
update public.savings_items set goal_id=null;
reset role;
update public.business_user_roles set role='accountant' where user_id='00000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ declare target text; changed integer; visible integer; begin
 foreach target in array array['business_customers','business_suppliers','business_invoices','business_sales','business_operating_expenses','business_employees'] loop
  execute format('select count(*) from public.%I',target) into visible;
  perform pg_temp.assert_true(visible=1, target||': accountant reads owned rows');
  execute format('update public.%I set notes=''Reviewed''',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=case when target='business_employees' then 0 else 1 end,target||': accountant write boundary');
  execute format('delete from public.%I',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=0,target||': accountant cannot delete');
 end loop;
end $$;
select pg_temp.expect_rls($q$insert into public.business_employees(user_id,name,employee_name) values(auth.uid(),'Denied','Denied')$q$);
with updated as (update public.business_user_roles set role='manager' returning *) select pg_temp.assert_true((select count(*)=0 from updated),'accountant cannot self-promote');
reset role;
update public.business_user_roles set role='employee' where user_id='00000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ declare target text; changed integer; visible integer; begin
 foreach target in array array['business_customers','business_suppliers','business_invoices','business_sales','business_operating_expenses','business_employees'] loop
  execute format('select count(*) from public.%I',target) into visible;
  perform pg_temp.assert_true(visible=0,target||': employee cannot read');
  execute format('update public.%I set notes=''Denied''',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=0,target||': employee cannot update');
  execute format('delete from public.%I',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=0,target||': employee cannot delete');
 end loop;
end $$;
select pg_temp.expect_rls($q$insert into public.business_customers(user_id,name) values(auth.uid(),'Denied')$q$);
select pg_temp.expect_rls($q$insert into public.business_suppliers(user_id,name) values(auth.uid(),'Denied')$q$);
select pg_temp.expect_rls($q$insert into public.business_invoices(user_id,title) values(auth.uid(),'Denied')$q$);
select pg_temp.expect_rls($q$insert into public.business_sales(user_id,product_or_service,customer_name,amount) values(auth.uid(),'Denied','Denied',1)$q$);
select pg_temp.expect_rls($q$insert into public.business_operating_expenses(user_id,name,amount) values(auth.uid(),'Denied',1)$q$);
select pg_temp.expect_rls($q$insert into public.business_employees(user_id,name,employee_name) values(auth.uid(),'Denied','Denied')$q$);
reset role;
update public.business_user_roles set role='manager' where user_id='00000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ declare target text; changed integer; begin
 foreach target in array array['business_invoices','business_sales','business_operating_expenses','business_employees','business_suppliers','business_customers'] loop
  execute format('update public.%I set notes=''Manager update''',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=1,target||': manager can update');
  execute format('delete from public.%I',target); get diagnostics changed=row_count;
  perform pg_temp.assert_true(changed=1,target||': manager can delete owned rows');
 end loop;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
insert into public.business_suppliers(user_id,name) values(auth.uid(),'New owner without role');
select pg_temp.assert_true((select count(*)=1 from public.business_suppliers),'owner onboarding remains available');
rollback;
