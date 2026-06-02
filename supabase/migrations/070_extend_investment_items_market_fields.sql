alter table public.investment_items
  add column if not exists symbol text,
  add column if not exists provider_symbol text,
  add column if not exists market text,
  add column if not exists asset_type text,
  add column if not exists currency text default 'KWD',
  add column if not exists quantity numeric,
  add column if not exists last_price numeric,
  add column if not exists last_price_updated_at timestamptz,
  add column if not exists data_source text;

create index if not exists investment_items_user_symbol_idx
  on public.investment_items (user_id, symbol)
  where symbol is not null;

create index if not exists investment_items_user_provider_symbol_idx
  on public.investment_items (user_id, provider_symbol)
  where provider_symbol is not null;

notify pgrst, 'reload schema';
