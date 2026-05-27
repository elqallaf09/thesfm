create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  amount numeric not null default 0,
  currency text default 'KWD',
  expense_date date default current_date,
  category text default 'general',
  payment_method text,
  notes text,
  receipt_url text,
  paid_from_personal_budget boolean default false,
  personal_expense_id uuid null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_expenses
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists title text,
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'KWD',
  add column if not exists expense_date date default current_date,
  add column if not exists category text default 'general',
  add column if not exists payment_method text,
  add column if not exists notes text,
  add column if not exists receipt_url text,
  add column if not exists paid_from_personal_budget boolean default false,
  add column if not exists personal_expense_id uuid null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.expense_items
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_expense_id uuid references public.project_expenses(id) on delete set null,
  add column if not exists paid_from_personal_budget boolean default false;

create index if not exists project_expenses_user_project_idx
  on public.project_expenses(user_id, project_id);

create index if not exists project_expenses_user_date_idx
  on public.project_expenses(user_id, expense_date desc);

create index if not exists expense_items_project_id_idx
  on public.expense_items(project_id);

create index if not exists expense_items_project_expense_id_idx
  on public.expense_items(project_expense_id);

create or replace function public.set_project_expenses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_expenses_updated_at on public.project_expenses;
create trigger set_project_expenses_updated_at
before update on public.project_expenses
for each row execute function public.set_project_expenses_updated_at();

alter table public.project_expenses enable row level security;

drop policy if exists "Users can select own project expenses" on public.project_expenses;
create policy "Users can select own project expenses"
  on public.project_expenses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project expenses" on public.project_expenses;
create policy "Users can insert own project expenses"
  on public.project_expenses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own project expenses" on public.project_expenses;
create policy "Users can update own project expenses"
  on public.project_expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project expenses" on public.project_expenses;
create policy "Users can delete own project expenses"
  on public.project_expenses
  for delete
  using (auth.uid() = user_id);
