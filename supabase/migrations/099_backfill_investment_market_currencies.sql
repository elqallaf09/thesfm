with resolved_currency as (
  select
    id,
    case
      when upper(coalesce(symbol, provider_symbol, '')) like '%.KW'
        or coalesce(market, exchange, '') ~* 'boursa[[:space:]]*kuwait|kuwait|kse|بورصة[[:space:]]*الكويت|الكويت'
      then 'KWD'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.SR'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.SA'
        or coalesce(market, exchange, '') ~* 'tadawul|saudi|riyadh|تداول|السعودية'
      then 'SAR'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.AE'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.DU'
        or upper(coalesce(symbol, provider_symbol, '')) like '%.AD'
        or coalesce(market, exchange, '') ~* 'dubai financial market|abu dhabi securities|dfm|adx|uae|emirates|دبي|أبو[[:space:]]*ظبي|ابو[[:space:]]*ظبي|الإمارات|الامارات'
      then 'AED'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.QA'
        or coalesce(market, exchange, '') ~* 'qatar|doha|qe|قطر|الدوحة'
      then 'QAR'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.BH'
        or coalesce(market, exchange, '') ~* 'bahrain|البحرين'
      then 'BHD'
      when upper(coalesce(symbol, provider_symbol, '')) like '%.OM'
        or coalesce(market, exchange, '') ~* 'oman|muscat|msx|عمان|مسقط'
      then 'OMR'
      when coalesce(market, exchange, '') ~* 'nasdaq|nyse|amex|arca|cboe|iex|united states|us markets|الأسواق[[:space:]]*الأمريكية|الاسواق[[:space:]]*الامريكية'
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

notify pgrst, 'reload schema';
