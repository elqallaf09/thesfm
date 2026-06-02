alter table public.investment_items
  add column if not exists current_price numeric,
  add column if not exists current_market_value numeric,
  add column if not exists price_currency text default 'KWD';

notify pgrst, 'reload schema';
