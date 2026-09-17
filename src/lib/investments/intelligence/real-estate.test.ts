import { describe, expect, it } from 'vitest';
import type { ValuationEvidence } from './contracts';
import { areaToSquareMeters, prepareRealEstateEvidence } from './real-estate';

const evidence = (overrides: Partial<ValuationEvidence> = {}): ValuationEvidence => ({
  id: 'e1',
  type: 'OFFICIAL_TRANSACTION',
  authority: 'GOVERNMENT',
  sourceName: 'Official registry',
  retrievedAt: '2026-09-15T00:00:00Z',
  assetMatch: 'EXACT',
  geographyMatch: 'EXACT',
  currency: 'KWD',
  unitValue: 1000,
  unitCode: 'M2',
  ...overrides,
});

describe('real estate intelligence foundation', () => {
  it('normalizes square feet to square meters', () => {
    expect(areaToSquareMeters(10.76391041671, 'FT2')).toBeCloseTo(1, 8);
  });

  it('refuses a valuation when there is no usable evidence', () => {
    const result = prepareRealEstateEvidence([]);
    expect(result.sufficient).toBe(false);
    expect(result.confidence).toBe('INSUFFICIENT');
  });

  it('keeps listing evidence distinct while allowing evidence-quality assessment', () => {
    const result = prepareRealEstateEvidence([
      evidence(),
      evidence({ id: 'e2', type: 'LISTING_ASK', authority: 'LISTING_PLATFORM', sourceName: 'Listing source', unitValue: 1100 }),
    ]);
    expect(result.sufficient).toBe(true);
    expect(result.comparables).toHaveLength(2);
    expect(result.comparables[1].evidence.type).toBe('LISTING_ASK');
  });

  it('preserves mixed raw currencies for the verified FX normalization stage', () => {
    const result = prepareRealEstateEvidence([
      evidence(),
      evidence({ id: 'e2', sourceName: 'Second official source', currency: 'USD' }),
    ]);
    expect(result.sufficient).toBe(true);
    expect(new Set(result.comparables.map((item) => item.currency))).toEqual(new Set(['KWD', 'USD']));
  });
});
