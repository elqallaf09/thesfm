alter table public.investment_items
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists metal_type text,
  add column if not exists metal_product_type text,
  add column if not exists metal_karat numeric,
  add column if not exists metal_purity numeric,
  add column if not exists grams numeric,
  add column if not exists pure_metal_grams numeric,
  add column if not exists price_source text,
  add column if not exists last_price_updated_at timestamptz;

alter table public.investment_items
  alter column quantity type numeric(24, 10) using quantity::numeric(24, 10),
  alter column current_price type numeric using current_price::numeric,
  alter column current_market_value type numeric using current_market_value::numeric,
  alter column purchase_price type numeric using purchase_price::numeric,
  alter column expected_annual_return type numeric using expected_annual_return::numeric,
  alter column grams type numeric(24, 10) using grams::numeric(24, 10),
  alter column pure_metal_grams type numeric(24, 10) using pure_metal_grams::numeric(24, 10);

update public.investment_items
set
  current_market_value = coalesce(current_market_value, current_value, amount),
  price_currency = coalesce(price_currency, currency, 'KWD'),
  currency = coalesce(nullif(btrim(currency), ''), price_currency, 'KWD'),
  updated_at = coalesce(updated_at, created_at, now())
where current_market_value is null
   or price_currency is null
   or currency is null
   or updated_at is null;

create index if not exists investment_items_user_project_idx
  on public.investment_items (user_id, project_id)
  where project_id is not null;

create index if not exists investment_items_user_type_idx
  on public.investment_items (user_id, type);

notify pgrst, 'reload schema';
