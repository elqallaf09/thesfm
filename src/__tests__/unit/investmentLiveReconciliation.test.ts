import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260916234500_reconcile_verified_investment_positions.sql',
  'utf8',
);

describe('investment live reconciliation migration', () => {
  it('updates only already verified imported positions', () => {
    expect(migration).toContain("c.verification_state = 'VERIFIED'");
    expect(migration).toContain("p.migration_state = 'VERIFIED'");
    expect(migration).toContain('p.legacy_investment_item_id = i.id');
    expect(migration).toContain('p.user_id = i.user_id');
  });

  it('copies explicit valuation and FX facts without inventing evidence metadata', () => {
    expect(migration).toContain('current_unit_price = i.current_price');
    expect(migration).toContain('current_total_value = i.current_market_value');
    expect(migration).toContain('valuation_source = nullif(btrim(i.valuation_source), \'\')');
    expect(migration).toContain('valued_at = i.valuation_last_updated_at');
    expect(migration).toContain('converted_value_in_base_currency = i.converted_market_value');
    expect(migration).toContain('fx_rate_to_base_currency = i.fx_rate_to_user_currency');
    expect(migration).toContain('fx_source = nullif(btrim(i.fx_source), \'\')');
    expect(migration).toContain('fx_valued_at = i.fx_last_updated_at');

    expect(migration).not.toMatch(/valuation_confidence\s*=/i);
    expect(migration).not.toMatch(/source_quality\s*=/i);
    expect(migration).not.toMatch(/valuation_method\s*=/i);
  });

  it('does not manufacture valuation history or mutate the legacy source', () => {
    expect(migration).not.toMatch(/insert\s+into\s+public\.investment_valuations/i);
    expect(migration).not.toMatch(/update\s+public\.investment_items/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.investment_items/i);
  });

  it('advances the recorded legacy timestamp only after the same verified rows are reconciled', () => {
    expect(migration).toContain('source_row_updated_at = i.updated_at');
    expect(migration).toContain("snapshot_mapping_exact_v1;legacy_live_reconciled_v1");
  });
});
