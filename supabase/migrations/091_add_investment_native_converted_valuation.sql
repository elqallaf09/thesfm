alter table public.investment_items
  add column if not exists native_currency text,
  add column if not exists native_unit_price numeric,
  add column if not exists native_market_value numeric,
  add column if not exists user_currency text,
  add column if not exists fx_rate_to_user_currency numeric,
  add column if not exists converted_market_value numeric,
  add column if not exists fx_source text,
  add column if not exists fx_last_updated_at timestamptz,
  add column if not exists valuation_source text,
  add column if not exists valuation_last_updated_at timestamptz;

alter table public.investment_items
  alter column quantity type numeric(24, 10) using quantity::numeric(24, 10),
  alter column grams type numeric(24, 10) using grams::numeric(24, 10),
  alter column pure_metal_grams type numeric(24, 10) using pure_metal_grams::numeric(24, 10);

update public.investment_items
set
  native_currency = coalesce(nullif(btrim(native_currency), ''), nullif(btrim(price_currency), ''), nullif(btrim(currency), '')),
  native_unit_price = coalesce(native_unit_price, current_price, last_price, purchase_price),
  native_market_value = coalesce(native_market_value, current_market_value, current_value, amount),
  user_currency = coalesce(nullif(btrim(user_currency), ''), nullif(btrim(currency), ''), nullif(btrim(price_currency), '')),
  converted_market_value = coalesce(converted_market_value, current_value, amount, current_market_value),
  fx_rate_to_user_currency = coalesce(
    fx_rate_to_user_currency,
    case
      when coalesce(nullif(btrim(native_currency), ''), nullif(btrim(price_currency), ''), nullif(btrim(currency), ''))
        = coalesce(nullif(btrim(user_currency), ''), nullif(btrim(currency), ''), nullif(btrim(price_currency), ''))
      then 1
      else null
    end
  ),
  fx_source = coalesce(fx_source, case
    when coalesce(nullif(btrim(native_currency), ''), nullif(btrim(price_currency), ''), nullif(btrim(currency), ''))
      = coalesce(nullif(btrim(user_currency), ''), nullif(btrim(currency), ''), nullif(btrim(price_currency), ''))
    then 'same_currency'
    else null
  end),
  fx_last_updated_at = coalesce(fx_last_updated_at, updated_at, created_at),
  valuation_source = coalesce(valuation_source, data_source, price_source),
  valuation_last_updated_at = coalesce(valuation_last_updated_at, last_price_updated_at, updated_at, created_at)
where native_currency is null
   or native_unit_price is null
   or native_market_value is null
   or user_currency is null
   or converted_market_value is null
   or valuation_last_updated_at is null;

create index if not exists investment_items_user_native_currency_idx
  on public.investment_items (user_id, native_currency);

notify pgrst, 'reload schema';
