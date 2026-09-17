-- Investments Intelligence 2.0 — canonical import verification.
--
-- This migration deliberately verifies only the fidelity of the additive Phase 6.4
-- import. It does NOT switch reads, does NOT touch investment_items, and does NOT
-- refresh or invent valuations, FX, confidence, transactions, or ownership data.
--
-- A position is verified only when every field that Phase 6.4 copied from the
-- immutable legacy_snapshot still matches the documented import transformation.
-- Any mismatch remains PENDING_VERIFICATION for explicit investigation.

begin;

create temporary table _sfm_verified_investment_positions (
  position_id uuid primary key
) on commit drop;

insert into _sfm_verified_investment_positions (position_id)
select p.id
from public.investment_positions p
join public.investment_position_migration_checks c
  on c.position_id = p.id
 and c.user_id = p.user_id
 and c.source_table = 'investment_items'
 and c.source_row_id = p.legacy_investment_item_id
cross join lateral (select p.legacy_snapshot as s) snapshot
where p.legacy_investment_item_id = p.id
  and nullif(snapshot.s ->> 'id', '')::uuid is not distinct from p.id
  and nullif(snapshot.s ->> 'user_id', '')::uuid is not distinct from p.user_id
  and p.asset_type is not distinct from (
    case lower(regexp_replace(
      coalesce(
        nullif(btrim(snapshot.s ->> 'asset_type'), ''),
        nullif(btrim(snapshot.s ->> 'type'), '')
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
    end
  )
  and p.symbol is not distinct from nullif(btrim(snapshot.s ->> 'symbol'), '')
  and p.display_name is not distinct from nullif(btrim(snapshot.s ->> 'name'), '')
  and p.exchange_code is not distinct from nullif(btrim(snapshot.s ->> 'exchange'), '')
  and p.quantity is not distinct from nullif(snapshot.s ->> 'quantity', '')::numeric
  and p.unit_type is not distinct from nullif(btrim(snapshot.s ->> 'unit'), '')
  and p.purchase_date is not distinct from nullif(snapshot.s ->> 'purchase_date', '')::date
  and p.purchase_unit_price is not distinct from nullif(snapshot.s ->> 'purchase_price', '')::numeric
  and p.purchase_currency is not distinct from nullif(upper(btrim(snapshot.s ->> 'currency')), '')
  and p.total_cost is not distinct from nullif(snapshot.s ->> 'purchase_total', '')::numeric
  and p.current_unit_price is not distinct from nullif(snapshot.s ->> 'current_price', '')::numeric
  and p.current_total_value is not distinct from nullif(snapshot.s ->> 'current_market_value', '')::numeric
  and p.valuation_currency is not distinct from nullif(upper(btrim(snapshot.s ->> 'price_currency')), '')
  and p.valuation_source is not distinct from nullif(btrim(snapshot.s ->> 'valuation_source'), '')
  and p.valued_at is not distinct from nullif(snapshot.s ->> 'valuation_last_updated_at', '')::timestamptz
  and p.purchase_platform_id is not distinct from nullif(snapshot.s ->> 'purchase_platform_id', '')::uuid
  and p.purchase_platform_name is not distinct from nullif(btrim(snapshot.s ->> 'purchase_platform_name'), '')
  and p.purchase_platform_type is not distinct from nullif(btrim(snapshot.s ->> 'purchase_platform_type'), '')
  and p.notes is not distinct from (snapshot.s ->> 'notes')
  and p.legacy_asset_type is not distinct from coalesce(
    nullif(btrim(snapshot.s ->> 'asset_type'), ''),
    nullif(btrim(snapshot.s ->> 'type'), '')
  )
  and p.created_at is not distinct from nullif(snapshot.s ->> 'created_at', '')::timestamptz
  and p.updated_at is not distinct from nullif(snapshot.s ->> 'updated_at', '')::timestamptz;

update public.investment_position_migration_checks c
set verification_state = 'VERIFIED',
    verification_note = 'snapshot_mapping_exact_v1',
    verified_at = coalesce(c.verified_at, now()),
    updated_at = now()
from _sfm_verified_investment_positions v
where c.position_id = v.position_id
  and c.verification_state = 'PENDING';

update public.investment_positions p
set migration_state = 'VERIFIED',
    migration_note = 'snapshot_mapping_exact_v1'
from _sfm_verified_investment_positions v
where p.id = v.position_id
  and p.migration_state = 'PENDING_VERIFICATION';

commit;
