begin;

create table if not exists public.economic_intelligence_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  confirmation_key text not null,
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, confirmation_key),
  constraint economic_intelligence_confirmation_key_check
    check (confirmation_key in ('no_debts', 'no_investments', 'no_business_projects'))
);

create index if not exists economic_intelligence_confirmations_user_idx
  on public.economic_intelligence_confirmations(user_id, updated_at desc);

alter table public.economic_intelligence_confirmations enable row level security;

drop policy if exists "Users can select own economic intelligence confirmations" on public.economic_intelligence_confirmations;
create policy "Users can select own economic intelligence confirmations"
  on public.economic_intelligence_confirmations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own economic intelligence confirmations" on public.economic_intelligence_confirmations;
create policy "Users can insert own economic intelligence confirmations"
  on public.economic_intelligence_confirmations for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own economic intelligence confirmations" on public.economic_intelligence_confirmations;
create policy "Users can update own economic intelligence confirmations"
  on public.economic_intelligence_confirmations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own economic intelligence confirmations" on public.economic_intelligence_confirmations;
create policy "Users can delete own economic intelligence confirmations"
  on public.economic_intelligence_confirmations for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
