import { describe, expect, it } from 'vitest';
import {
  toCanonicalInvestmentPosition,
  type CanonicalInvestmentPositionRow,
} from '@/lib/investments/canonicalPosition';

const row: CanonicalInvestmentPositionRow = {
  id: 'position-1',
  asset_type: 'STOCK',
  canonical_asset_identifier: null,
  symbol: 'TEST',
  display_name: 'Test Asset',
  country_code: null,
  exchange_code: null,
  sector_or_category: null,
  quantity: '1.25',
  ownership_percentage: null,
  unit_type: 'share',
  purchase_date: null,
  purchase_unit_price: '10.5',
  purchase_currency: 'USD',
  total_cost: '13.125',
  fees: null,
  current_unit_price: null,
  current_total_value: '14.00',
  valuation_currency: 'USD',
  user_base_currency: 'KWD',
  converted_value_in_base_currency: null,
  valuation_method: null,
  valuation_source: null,
  source_quality: null,
  valuation_confidence: null,
  valued_at: null,
  fx_rate_to_base_currency: null,
  fx_source: null,
  fx_valued_at: null,
  unrealized_gain_loss: null,
  realized_gain_loss: null,
  return_percentage: null,
  income_or_distributions: null,
  total_return: null,
  purchase_platform_name: null,
  purchase_platform_type: null,
  asset_logo_url: null,
  asset_image_url: null,
  notes: null,
  migration_state: 'VERIFIED',
  imported_at: '2026-09-16T00:00:00.000Z',
  created_at: '2026-09-16T00:00:00.000Z',
  updated_at: null,
};

describe('canonical investment position DTO', () => {
  it('converts exact numeric facts without deriving missing evidence', () => {
    const result = toCanonicalInvestmentPosition(row);

    expect(result.ownership.quantity).toBe(1.25);
    expect(result.purchase.unitPrice).toBe(10.5);
    expect(result.purchase.totalCost).toBe(13.125);
    expect(result.valuation.totalValue).toBe(14);

    expect(result.valuation.unitPrice).toBeNull();
    expect(result.valuation.method).toBeNull();
    expect(result.valuation.source).toBeNull();
    expect(result.valuation.sourceQuality).toBeNull();
    expect(result.valuation.confidence).toBeNull();
    expect(result.fx.rateToBaseCurrency).toBeNull();
  });

  it('does not expose migration snapshots or user identifiers in the public DTO', () => {
    const result = toCanonicalInvestmentPosition(row);
    const payload = JSON.stringify(result);

    expect(payload).not.toContain('legacy_snapshot');
    expect(payload).not.toContain('legacy_investment_item_id');
    expect(payload).not.toContain('user_id');
  });
});
