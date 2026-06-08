alter table public.investment_items
  add column if not exists ai_analysis text,
  add column if not exists investment_snapshot jsonb,
  add column if not exists asset_name text,
  add column if not exists exchange text,
  add column if not exists shares numeric(24, 10),
  add column if not exists average_buy_price numeric,
  add column if not exists total_invested numeric,
  add column if not exists purchase_date date,
  add column if not exists entry_date date,
  add column if not exists price_updated_at timestamptz;

alter table public.investment_items enable row level security;

update public.investment_items as item
set
  asset_name = coalesce(nullif(btrim(item.asset_name), ''), nullif(btrim(item.name), '')),
  exchange = coalesce(nullif(btrim(item.exchange), ''), nullif(btrim(item.market), '')),
  market = coalesce(nullif(btrim(item.market), ''), nullif(btrim(item.exchange), '')),
  shares = coalesce(item.shares, item.quantity),
  quantity = coalesce(item.quantity, item.shares),
  average_buy_price = coalesce(item.average_buy_price, item.purchase_price),
  purchase_price = coalesce(item.purchase_price, item.average_buy_price),
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
  invested_amount = coalesce(
    item.invested_amount,
    item.purchase_total,
    item.total_invested,
    case
      when coalesce(item.quantity, item.shares) is not null
       and coalesce(item.purchase_price, item.average_buy_price) is not null
      then coalesce(item.quantity, item.shares) * coalesce(item.purchase_price, item.average_buy_price)
      else null
    end
  ),
  purchase_date = coalesce(item.purchase_date, item.entry_date, item.start_date, item.created_at::date),
  entry_date = coalesce(item.entry_date, item.purchase_date, item.start_date, item.created_at::date),
  start_date = coalesce(item.start_date, item.purchase_date, item.entry_date, item.created_at::date),
  current_market_value = coalesce(
    item.current_market_value,
    case
      when coalesce(item.quantity, item.shares) is not null
       and coalesce(item.current_price, item.last_price) is not null
      then coalesce(item.quantity, item.shares) * coalesce(item.current_price, item.last_price)
      else null
    end
  ),
  native_market_value = coalesce(
    item.native_market_value,
    item.current_market_value,
    case
      when coalesce(item.quantity, item.shares) is not null
       and coalesce(item.current_price, item.last_price) is not null
      then coalesce(item.quantity, item.shares) * coalesce(item.current_price, item.last_price)
      else null
    end
  ),
  price_updated_at = case
    when coalesce(item.current_price, item.last_price) is null then item.price_updated_at
    else coalesce(item.price_updated_at, item.last_price_updated_at, item.valuation_last_updated_at)
  end;

with resolved_currency as (
  select
    id,
    case
      when upper(coalesce(symbol, provider_symbol, '')) like '%.KW'
        or coalesce(market, exchange, '') ~* 'boursa[[:space:]]*kuwait|kuwait|kse'
      then 'KWD'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.SR'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.SA'
        or coalesce(market, exchange, '') ~* 'tadawul|saudi|riyadh'
      then 'SAR'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.AE'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.DU'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.AD'
        or coalesce(market, exchange, '') ~* 'dubai financial market|abu dhabi securities|dfm|adx|uae|emirates'
      then 'AED'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.QA'
        or coalesce(market, exchange, '') ~* 'qatar|doha|qe'
      then 'QAR'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.BH'
        or coalesce(market, exchange, '') ~* 'bahrain'
      then 'BHD'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.OM'
        or coalesce(market, exchange, '') ~* 'oman|muscat|msx'
      then 'OMR'
      when coalesce(market, exchange, '') ~* 'nasdaq|nyse|amex|arca|cboe|iex|united states|us markets'
      then 'USD'
      else null
    end as currency_code
  from public.investment_items
)
update public.investment_items as item
set
  currency = coalesce(nullif(btrim(item.currency), ''), resolved.currency_code),
  price_currency = coalesce(nullif(btrim(item.price_currency), ''), resolved.currency_code),
  native_currency = coalesce(nullif(btrim(item.native_currency), ''), resolved.currency_code)
from resolved_currency as resolved
where item.id = resolved.id
  and resolved.currency_code is not null
  and (
    nullif(btrim(item.currency), '') is null
    or nullif(btrim(item.price_currency), '') is null
    or nullif(btrim(item.native_currency), '') is null
  );

update public.investment_items as item
set investment_snapshot = jsonb_strip_nulls(jsonb_build_object(
  'version', 1,
  'name', item.name,
  'type', item.type,
  'currentValue', item.current_value,
  'monthlyContribution', item.monthly_contribution,
  'startDate', coalesce(item.purchase_date, item.entry_date, item.start_date),
  'riskLevel', item.risk_level,
  'expectedAnnualReturn', item.expected_annual_return,
  'notes', item.notes,
  'symbol', item.symbol,
  'providerSymbol', item.provider_symbol,
  'market', coalesce(item.market, item.exchange),
  'assetType', item.asset_type,
  'currency', item.currency,
  'quantity', coalesce(item.quantity, item.shares),
  'purchasePrice', coalesce(item.purchase_price, item.average_buy_price),
  'purchaseTotal', coalesce(item.purchase_total, item.total_invested, item.invested_amount),
  'currentPrice', coalesce(item.current_price, item.last_price),
  'currentMarketValue', item.current_market_value,
  'nativeCurrency', item.native_currency,
  'nativeMarketValue', item.native_market_value,
  'lastPrice', coalesce(item.last_price, item.current_price),
  'lastPriceUpdatedAt', coalesce(item.last_price_updated_at, item.price_updated_at, item.valuation_last_updated_at),
  'dataSource', item.data_source
))
where item.investment_snapshot is null;

drop policy if exists "Users can select own investments" on public.investment_items;
create policy "Users can select own investments"
  on public.investment_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own investments" on public.investment_items;
create policy "Users can insert own investments"
  on public.investment_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own investments" on public.investment_items;
create policy "Users can update own investments"
  on public.investment_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own investments" on public.investment_items;
create policy "Users can delete own investments"
  on public.investment_items for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
