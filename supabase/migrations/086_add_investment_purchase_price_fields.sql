alter table public.investment_items
  add column if not exists invested_amount numeric,
  add column if not exists purchase_price numeric,
  add column if not exists average_buy_price numeric;

notify pgrst, 'reload schema';
