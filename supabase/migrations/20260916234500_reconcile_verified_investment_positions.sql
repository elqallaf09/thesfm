-- Investments Intelligence 2.0 — live legacy reconciliation before canonical cutover.
--
-- Preconditions:
--   1. Phase 6.4 additive import exists.
--   2. 20260916233000_verify_investment_position_imports.sql has verified the
--      original frozen import mapping.
--
-- This migration keeps investment_items as the source of truth and advances only
-- already-VERIFIED canonical rows to the latest explicit legacy facts. It does
-- not infer missing values, does not create confidence/source-quality claims and
-- does not fabricate valuation history.

begin;

update public.investment_positions p
set
  asset_type = case lower(regexp_replace(
    coalesce(
      nullif(btrim(i.asset_type), ''),
      nullif(btrim(i.type), '')
    ),
    '[^a-z]', '', 'g'
  ))
    when 'stock' then 'STOCK'
    when 'stocks' then 'STOCK'
    when 'realestate' then 'REAL_ESTATE'
    when 'gold' then 'GOLD'
    when 'silver' then 'SILVER'
    when 'crypto' then 'CRYPTO'
    when 'fund' then 'FUND'
    when 'funds' then 'FUND'
    when 'bond' then 'BOND'
    when 'bonds' then 'BOND'
    when 'commodity' then 'COMMODITY'
    when 'commodities' then 'COMMODITY'
    when 'other' then 'OTHER'
    else null
  end,
  symbol = nullif(btrim(i.symbol), ''),
  display_name = nullif(btrim(i.name), ''),
  exchange_code = nullif(btrim(i.exchange), ''),
  quantity = i.quantity,
  unit_type = nullif(btrim(i.unit), ''),
  purchase_date = i.purchase_date,
  purchase_unit_price = i.purchase_price,
  purchase_currency = case
    when upper(btrim(coalesce(i.currency, ''))) ~ '^[A-Z]{3}$'
      then upper(btrim(i.currency))
    else null
  end,
  total_cost = i.purchase_total,
  current_unit_price = i.current_price,
  current_total_value = i.current_market_value,
  valuation_currency = case
    when upper(btrim(coalesce(i.price_currency, ''))) ~ '^[A-Z]{3}$'
      then upper(btrim(i.price_currency))
    else null
  end,
  valuation_source = nullif(btrim(i.valuation_source), ''),
  valued_at = i.valuation_last_updated_at,
  user_base_currency = case
    when upper(btrim(coalesce(i.user_currency, ''))) ~ '^[A-Z]{3}$'
      then upper(btrim(i.user_currency))
    else null
  end,
  converted_value_in_base_currency = i.converted_market_value,
  fx_rate_to_base_currency = i.fx_rate_to_user_currency,
  fx_source = nullif(btrim(i.fx_source), ''),
  fx_valued_at = i.fx_last_updated_at,
  purchase_platform_id = i.purchase_platform_id,
  purchase_platform_name = nullif(btrim(i.purchase_platform_name), ''),
  purchase_platform_type = nullif(btrim(i.purchase_platform_type), ''),
  notes = i.notes,
  legacy_asset_type = coalesce(
    nullif(btrim(i.asset_type), ''),
    nullif(btrim(i.type), '')
  ),
  migration_note = 'snapshot_mapping_exact_v1;legacy_live_reconciled_v1',
  updated_at = i.updated_at
from public.investment_items i
join public.investment_position_migration_checks c
  on c.source_table = 'investment_items'
 and c.source_row_id = i.id
 and c.user_id = i.user_id
 and c.verification_state = 'VERIFIED'
where p.id = c.position_id
  and p.user_id = i.user_id
  and p.legacy_investment_item_id = i.id
  and p.migration_state = 'VERIFIED';

update public.investment_position_migration_checks c
set
  source_row_updated_at = i.updated_at,
  verification_note = 'snapshot_mapping_exact_v1;legacy_live_reconciled_v1',
  updated_at = now()
from public.investment_items i,
     public.investment_positions p
where c.position_id = p.id
  and c.source_table = 'investment_items'
  and c.source_row_id = i.id
  and c.user_id = i.user_id
  and p.user_id = i.user_id
  and p.legacy_investment_item_id = i.id
  and c.verification_state = 'VERIFIED'
  and p.migration_state = 'VERIFIED';

commit;
