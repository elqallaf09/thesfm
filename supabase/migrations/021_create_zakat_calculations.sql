create table if not exists public.zakat_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  calculation_date date default current_date,
  currency text default 'KWD',
  cash_amount numeric default 0,
  investment_amount numeric default 0,
  gold_value numeric default 0,
  silver_value numeric default 0,
  deductible_debts numeric default 0,
  net_zakat_base numeric default 0,
  nisab_method text default 'gold',
  gold_nisab_value numeric default 0,
  silver_nisab_value numeric default 0,
  selected_nisab_value numeric default 0,
  zakat_due numeric default 0,
  price_source text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists zakat_calculations_user_id_idx on public.zakat_calculations(user_id);
create index if not exists zakat_calculations_date_idx on public.zakat_calculations(calculation_date);

alter table public.zakat_calculations enable row level security;

drop policy if exists "Users can select own zakat calculations" on public.zakat_calculations;
create policy "Users can select own zakat calculations"
on public.zakat_calculations for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own zakat calculations" on public.zakat_calculations;
create policy "Users can insert own zakat calculations"
on public.zakat_calculations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own zakat calculations" on public.zakat_calculations;
create policy "Users can update own zakat calculations"
on public.zakat_calculations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own zakat calculations" on public.zakat_calculations;
create policy "Users can delete own zakat calculations"
on public.zakat_calculations for delete
using (auth.uid() = user_id);
