alter table public.investment_items
  add column if not exists name text,
  add column if not exists asset_name text,
  add column if not exists type text,
  add column if not exists symbol text,
  add column if not exists provider_symbol text,
  add column if not exists market text,
  add column if not exists exchange text,
  add column if not exists asset_type text,
  add column if not exists currency text,
  add column if not exists price_currency text,
  add column if not exists native_currency text,
  add column if not exists quantity numeric(24, 10),
  add column if not exists shares numeric(24, 10),
  add column if not exists purchase_price numeric,
  add column if not exists average_buy_price numeric,
  add column if not exists purchase_total numeric,
  add column if not exists total_invested numeric,
  add column if not exists invested_amount numeric,
  add column if not exists current_price numeric,
  add column if not exists last_price numeric,
  add column if not exists current_market_value numeric,
  add column if not exists native_unit_price numeric,
  add column if not exists native_market_value numeric,
  add column if not exists converted_market_value numeric,
  add column if not exists default_currency_value numeric,
  add column if not exists profit_loss numeric,
  add column if not exists profit_loss_percent numeric,
  add column if not exists monthly_contribution numeric default 0,
  add column if not exists expected_annual_return numeric,
  add column if not exists last_price_updated_at timestamptz,
  add column if not exists price_updated_at timestamptz,
  add column if not exists valuation_last_updated_at timestamptz,
  add column if not exists data_source text,
  add column if not exists valuation_source text;

update public.investment_items as item
set
  name = coalesce(nullif(btrim(item.name), ''), nullif(btrim(item.asset_name), ''), nullif(btrim(item.symbol), ''), nullif(btrim(item.provider_symbol), ''), 'Investment'),
  asset_name = coalesce(nullif(btrim(item.asset_name), ''), nullif(btrim(item.name), '')),
  market = coalesce(nullif(btrim(item.market), ''), nullif(btrim(item.exchange), '')),
  exchange = coalesce(nullif(btrim(item.exchange), ''), nullif(btrim(item.market), '')),
  currency = upper(coalesce(nullif(btrim(item.currency), ''), nullif(btrim(item.native_currency), ''), nullif(btrim(item.price_currency), ''))),
  price_currency = upper(coalesce(nullif(btrim(item.price_currency), ''), nullif(btrim(item.native_currency), ''), nullif(btrim(item.currency), ''))),
  native_currency = upper(coalesce(nullif(btrim(item.native_currency), ''), nullif(btrim(item.price_currency), ''), nullif(btrim(item.currency), ''))),
  quantity = coalesce(item.quantity, item.shares),
  shares = coalesce(item.shares, item.quantity),
  purchase_price = coalesce(item.purchase_price, item.average_buy_price),
  average_buy_price = coalesce(item.average_buy_price, item.purchase_price),
  purchase_total = coalesce(
    item.purchase_total,
    item.total_invested,
    item.invested_amount,
    case
      when coalesce(item.quantity, item.shares) is not null
       and coalesce(item.purchase_price, item.average_buy_price) is not null
      then coalesce(item.quantity, item.shares) * coalesce(item.purchase_price, item.average_buy_price)
      else null
    end
  ),
  total_invested = coalesce(
    item.total_invested,
    item.purchase_total,
    item.invested_amount,
    case
      when coalesce(item.quantity, item.shares) is not null
       and coalesce(item.purchase_price, item.average_buy_price) is not null
      then coalesce(item.quantity, item.shares) * coalesce(item.purchase_price, item.average_buy_price)
      else null
    end
  ),
  current_price = coalesce(item.current_price, item.last_price),
  last_price = coalesce(item.last_price, item.current_price),
  native_unit_price = case
    when coalesce(item.current_price, item.last_price) is null
     and item.native_unit_price is not null
     and item.purchase_price is not null
     and item.native_unit_price = item.purchase_price
     and coalesce(nullif(btrim(item.symbol), ''), nullif(btrim(item.provider_symbol), '')) is not null
     and coalesce(item.type, item.asset_type) in ('stocks', 'fund', 'crypto', 'gold', 'silver', 'stock', 'etf')
    then null
    else coalesce(item.native_unit_price, item.current_price, item.last_price)
  end,
  current_market_value = case
    when coalesce(item.current_price, item.last_price) is null
     and coalesce(nullif(btrim(item.symbol), ''), nullif(btrim(item.provider_symbol), '')) is not null
     and coalesce(item.type, item.asset_type) in ('stocks', 'fund', 'crypto', 'gold', 'silver', 'stock', 'etf')
    then null
    else coalesce(
      item.current_market_value,
      case
        when coalesce(item.quantity, item.shares) is not null
         and coalesce(item.current_price, item.last_price) is not null
        then coalesce(item.quantity, item.shares) * coalesce(item.current_price, item.last_price)
        else null
      end
    )
  end,
  native_market_value = case
    when coalesce(item.current_price, item.last_price) is null
     and coalesce(nullif(btrim(item.symbol), ''), nullif(btrim(item.provider_symbol), '')) is not null
     and coalesce(item.type, item.asset_type) in ('stocks', 'fund', 'crypto', 'gold', 'silver', 'stock', 'etf')
    then null
    else coalesce(
      item.native_market_value,
      item.current_market_value,
      case
        when coalesce(item.quantity, item.shares) is not null
         and coalesce(item.current_price, item.last_price) is not null
        then coalesce(item.quantity, item.shares) * coalesce(item.current_price, item.last_price)
        else null
      end
    )
  end,
  converted_market_value = coalesce(item.converted_market_value, item.default_currency_value, item.current_market_value, item.native_market_value, item.amount, item.purchase_total, item.total_invested),
  default_currency_value = coalesce(item.default_currency_value, item.converted_market_value, item.amount, item.purchase_total, item.total_invested),
  profit_loss = case
    when coalesce(item.current_market_value, item.native_market_value) is not null
     and coalesce(item.purchase_total, item.total_invested) is not null
    then coalesce(item.current_market_value, item.native_market_value) - coalesce(item.purchase_total, item.total_invested)
    else item.profit_loss
  end,
  profit_loss_percent = case
    when coalesce(item.purchase_total, item.total_invested) > 0
     and coalesce(item.current_market_value, item.native_market_value) is not null
    then (
      (coalesce(item.current_market_value, item.native_market_value) - coalesce(item.purchase_total, item.total_invested))
      / coalesce(item.purchase_total, item.total_invested)
    ) * 100
    else item.profit_loss_percent
  end,
  last_price_updated_at = case
    when coalesce(item.current_price, item.last_price) is null then item.last_price_updated_at
    else coalesce(item.last_price_updated_at, item.price_updated_at, item.valuation_last_updated_at)
  end,
  price_updated_at = case
    when coalesce(item.current_price, item.last_price) is null then item.price_updated_at
    else coalesce(item.price_updated_at, item.last_price_updated_at, item.valuation_last_updated_at)
  end,
  valuation_last_updated_at = case
    when coalesce(item.current_price, item.last_price) is null then item.valuation_last_updated_at
    else coalesce(item.valuation_last_updated_at, item.last_price_updated_at, item.price_updated_at)
  end;

create index if not exists investment_items_user_symbol_market_idx
  on public.investment_items (user_id, symbol, market)
  where symbol is not null;

create index if not exists investment_items_user_provider_market_idx
  on public.investment_items (user_id, provider_symbol, market)
  where provider_symbol is not null;

notify pgrst, 'reload schema';
