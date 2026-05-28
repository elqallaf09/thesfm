create table if not exists public.user_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  decision_type text not null,
  amount numeric default 0,
  currency text default 'KWD',
  target_date date,
  priority text default 'medium',
  inputs jsonb default '{}'::jsonb,
  analysis jsonb default '{}'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists user_decisions_user_id_idx
on public.user_decisions(user_id);

create index if not exists user_decisions_type_idx
on public.user_decisions(decision_type);

create index if not exists user_decisions_status_idx
on public.user_decisions(status);

alter table public.user_decisions enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.user_decisions to authenticated;

drop policy if exists "Users can select own decisions" on public.user_decisions;
create policy "Users can select own decisions"
on public.user_decisions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own decisions" on public.user_decisions;
create policy "Users can insert own decisions"
on public.user_decisions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own decisions" on public.user_decisions;
create policy "Users can update own decisions"
on public.user_decisions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own decisions" on public.user_decisions;
create policy "Users can delete own decisions"
on public.user_decisions for delete
using (auth.uid() = user_id);
