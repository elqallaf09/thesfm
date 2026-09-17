import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260916233000_verify_investment_position_imports.sql',
  'utf8',
);

describe('investment canonical import verification', () => {
  it('verifies only exact mappings from the frozen legacy snapshot', () => {
    expect(migration).toContain('p.legacy_snapshot');
    expect(migration).toContain("verification_state = 'VERIFIED'");
    expect(migration).toContain("migration_state = 'VERIFIED'");
    expect(migration).toContain("snapshot_mapping_exact_v1");
    expect(migration).toContain("p.current_unit_price is not distinct from nullif(snapshot.s ->> 'current_price', '')::numeric");
    expect(migration).toContain("p.current_total_value is not distinct from nullif(snapshot.s ->> 'current_market_value', '')::numeric");
  });

  it('does not mutate the legacy source or reconcile financial values during verification', () => {
    expect(migration).not.toMatch(/update\s+public\.investment_items/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.investment_items/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.investment_items/i);

    const positionUpdate = migration.match(/update public\.investment_positions p[\s\S]*?;/i)?.[0] ?? '';
    expect(positionUpdate).toContain("migration_state = 'VERIFIED'");
    expect(positionUpdate).toContain("migration_note = 'snapshot_mapping_exact_v1'");
    expect(positionUpdate).not.toMatch(/current_unit_price\s*=/i);
    expect(positionUpdate).not.toMatch(/current_total_value\s*=/i);
    expect(positionUpdate).not.toMatch(/converted_value_in_base_currency\s*=/i);
    expect(positionUpdate).not.toMatch(/fx_rate_to_base_currency\s*=/i);
  });

  it('leaves mismatches pending rather than manufacturing a pass', () => {
    expect(migration).toContain("c.verification_state = 'PENDING'");
    expect(migration).toContain("p.migration_state = 'PENDING_VERIFICATION'");
    expect(migration).not.toContain("verification_state = 'ERROR'");
  });
});
