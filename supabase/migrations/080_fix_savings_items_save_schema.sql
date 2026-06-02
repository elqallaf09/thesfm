create extension if not exists pgcrypto;

create table if not exists public.savings_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric default 0,
  currency text default 'KWD',
  saving_type text,
  method text,
  saved_at date,
  notes text,
  goal_id uuid references public.financial_goals(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.savings_items
  add column if not exists currency text default 'KWD',
  add column if not exists saving_type text,
  add column if not exists method text,
  add column if not exists saved_at date,
  add column if not exists notes text,
  add column if not exists goal_id uuid references public.financial_goals(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'savings_items'
      and column_name = 'saving_method'
  ) then
    execute 'update public.savings_items set method = coalesce(method, saving_method) where method is null and saving_method is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'savings_items'
      and column_name = 'note'
  ) then
    execute 'update public.savings_items set notes = coalesce(notes, note) where notes is null and note is not null';
  end if;
end $$;

update public.savings_items
set currency = coalesce(nullif(currency, ''), 'KWD')
where currency is null or currency = '';

create index if not exists savings_items_user_created_at_idx
  on public.savings_items(user_id, created_at desc);

create index if not exists savings_items_user_saved_at_idx
  on public.savings_items(user_id, saved_at desc);

create index if not exists savings_items_user_goal_idx
  on public.savings_items(user_id, goal_id);

alter table public.savings_items enable row level security;

drop policy if exists "Users can select own savings" on public.savings_items;
create policy "Users can select own savings"
  on public.savings_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own savings" on public.savings_items;
create policy "Users can insert own savings"
  on public.savings_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own savings" on public.savings_items;
create policy "Users can update own savings"
  on public.savings_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own savings" on public.savings_items;
create policy "Users can delete own savings"
  on public.savings_items
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.savings_items to authenticated;

notify pgrst, 'reload schema';
