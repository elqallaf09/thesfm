alter table public.projects enable row level security;
alter table public.business_sales enable row level security;
alter table public.business_employees enable row level security;

drop policy if exists "Users can select own projects" on public.projects;
create policy "Users can select own projects"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can select own business sales" on public.business_sales;
create policy "Users can select own business sales"
  on public.business_sales
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business sales" on public.business_sales;
create policy "Users can insert own business sales"
  on public.business_sales
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business sales" on public.business_sales;
create policy "Users can update own business sales"
  on public.business_sales
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business sales" on public.business_sales;
create policy "Users can delete own business sales"
  on public.business_sales
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can select own business employees" on public.business_employees;
create policy "Users can select own business employees"
  on public.business_employees
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own business employees" on public.business_employees;
create policy "Users can insert own business employees"
  on public.business_employees
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own business employees" on public.business_employees;
create policy "Users can update own business employees"
  on public.business_employees
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own business employees" on public.business_employees;
create policy "Users can delete own business employees"
  on public.business_employees
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.business_sales to authenticated;
grant select, insert, update, delete on table public.business_employees to authenticated;
