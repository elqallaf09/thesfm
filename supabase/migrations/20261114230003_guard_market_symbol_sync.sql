-- A provider ticker may occur on two venues. The existing exchange/symbol
-- unique index remains the conflict target; IDs and referencing FKs are unchanged.
alter table public.market_symbols drop constraint if exists market_symbols_symbol_asset_type_provider_symbol_key;

-- Additive provenance: never infer the primary exchange from a request filter.
alter table public.market_symbols add column if not exists primary_exchange text;
alter table public.market_symbols add column if not exists requested_exchange text;

-- One transaction for validation, upsert and reconciliation. Existing IDs,
-- Shariah reviews and unspecified metadata are retained. No deletions.
create or replace function public.sync_market_symbols_checked(p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_input bigint; v_before bigint; v_after bigint; v_existing bigint; v_matched bigint;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'symbol_sync_invalid_array'; end if;
  v_input := jsonb_array_length(p_rows);
  if v_input < 1 or v_input > 30000 then raise exception 'symbol_sync_invalid_size'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r where
    jsonb_typeof(r) is distinct from 'object' or
    nullif(btrim(r->>'symbol'), '') is null or
    nullif(btrim(r->>'exchange'), '') is null or
    nullif(btrim(r->>'name'), '') is null or
    (r->>'symbol') <> upper(btrim(r->>'symbol')) or
    (r->>'exchange') <> btrim(r->>'exchange')) then
    raise exception 'symbol_sync_invalid_identity';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    group by r->>'exchange', r->>'symbol' having count(*) > 1) then
    raise exception 'symbol_sync_duplicate_listing';
  end if;
  -- Serialize against other writers, including older clients that do not use this RPC.
  lock table public.market_symbols in share row exclusive mode;
  select count(*) into v_before from public.market_symbols;
  select count(*) into v_existing from public.market_symbols m join jsonb_array_elements(p_rows) r
    on m.exchange = r->>'exchange' and m.symbol = r->>'symbol';

  insert into public.market_symbols as current (
    symbol, exchange, provider_symbol, name, asset_type, market, display_symbol,
    company_name_ar, company_name_en, sector, country, currency, price_unit,
    is_active, source, last_synced_at, primary_exchange, requested_exchange
  ) select x.symbol, x.exchange, x.provider_symbol, x.name, x.asset_type, x.market, x.display_symbol,
      x.company_name_ar, x.company_name_en, x.sector, x.country, x.currency, x.price_unit,
      x.is_active, x.source, x.last_synced_at, x.primary_exchange, x.requested_exchange
    from jsonb_array_elements(p_rows) r
    left join public.market_symbols old on old.exchange = r->>'exchange' and old.symbol = r->>'symbol'
    cross join lateral jsonb_populate_record(null::public.market_symbols,
      jsonb_build_object('provider_symbol', r->>'symbol', 'asset_type', 'stock', 'is_active', true)
      || coalesce(to_jsonb(old), '{}'::jsonb) || r) x
    order by x.exchange, x.symbol
    on conflict (exchange, symbol) do update set
      provider_symbol = excluded.provider_symbol, name = excluded.name, asset_type = excluded.asset_type,
      market = excluded.market, display_symbol = excluded.display_symbol,
      company_name_ar = excluded.company_name_ar, company_name_en = excluded.company_name_en,
      sector = excluded.sector, country = excluded.country, currency = excluded.currency,
      price_unit = excluded.price_unit, is_active = excluded.is_active,
      source = excluded.source, last_synced_at = excluded.last_synced_at,
      primary_exchange = coalesce(excluded.primary_exchange, current.primary_exchange),
      requested_exchange = coalesce(excluded.requested_exchange, current.requested_exchange),
      updated_at = now();

  select count(*) into v_after from public.market_symbols;
  select count(*) into v_matched from public.market_symbols m join jsonb_array_elements(p_rows) r
    on m.exchange = r->>'exchange' and m.symbol = r->>'symbol';
  if v_matched <> v_input or v_after <> v_before + v_input - v_existing then
    raise exception 'symbol_sync_reconciliation_failed';
  end if;
  return jsonb_build_object('input_count', v_input, 'before_count', v_before,
    'after_count', v_after, 'inserted_count', v_input - v_existing,
    'updated_count', v_existing, 'matched_after', v_matched);
end;
$$;
revoke all on function public.sync_market_symbols_checked(jsonb) from public, anon, authenticated;
grant execute on function public.sync_market_symbols_checked(jsonb) to service_role;
