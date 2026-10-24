-- Preserve existing owner policies and add role checks that cannot be bypassed
-- by calling PostgREST directly. A missing role retains the established owner
-- onboarding default; an existing employee/accountant cannot replace their role.
begin;
do $migration$
declare
  target text;
  view_role text := $predicate$coalesce((select role from public.business_user_roles where user_id = (select auth.uid())), 'manager') in ('manager', 'accountant')$predicate$;
  manager_role text := $predicate$coalesce((select role from public.business_user_roles where user_id = (select auth.uid())), 'manager') = 'manager'$predicate$;
  write_role text;
begin
  foreach target in array array['business_customers', 'business_suppliers', 'business_invoices', 'business_sales', 'business_operating_expenses', 'business_employees'] loop
    write_role := case when target = 'business_employees' then manager_role else view_role end;
    execute format('create policy business_role_select on public.%I as restrictive for select to authenticated using (%s)', target, view_role);
    execute format('create policy business_role_insert on public.%I as restrictive for insert to authenticated with check (%s)', target, write_role);
    execute format('create policy business_role_update on public.%I as restrictive for update to authenticated using (%s) with check (%s)', target, write_role, write_role);
    execute format('create policy business_role_delete on public.%I as restrictive for delete to authenticated using (%s)', target, manager_role);
  end loop;
end;
$migration$;

-- Foreign keys prove existence, not ownership. Reject cross-account links even
-- if a caller knows another customer's or goal's UUID. Existing records remain
-- readable and can be repaired by removing/replacing a link.
create policy invoice_customer_owner_insert on public.business_invoices as restrictive
  for insert to authenticated with check (customer_id is null or exists (
    select 1 from public.business_customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy invoice_customer_owner_update on public.business_invoices as restrictive
  for update to authenticated using (true) with check (customer_id is null or exists (
    select 1 from public.business_customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy sale_customer_owner_insert on public.business_sales as restrictive
  for insert to authenticated with check (customer_id is null or exists (
    select 1 from public.business_customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy sale_customer_owner_update on public.business_sales as restrictive
  for update to authenticated using (true) with check (customer_id is null or exists (
    select 1 from public.business_customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy savings_goal_owner_insert on public.savings_items as restrictive
  for insert to authenticated with check (goal_id is null or exists (
    select 1 from public.financial_goals g where g.id = goal_id and g.user_id = (select auth.uid())));
create policy savings_goal_owner_update on public.savings_items as restrictive
  for update to authenticated using (true) with check (goal_id is null or exists (
    select 1 from public.financial_goals g where g.id = goal_id and g.user_id = (select auth.uid())));
commit;
