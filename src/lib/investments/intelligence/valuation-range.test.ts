import { describe, expect, it } from 'vitest';
import type { ValuationEvidence } from './contracts';
import { buildRealEstateValuationRange } from './valuation-range';

const asset = { countryCode: 'BA', city: 'Sarajevo', propertyType: 'LAND', landArea: 100, landAreaUnit: 'M2' as const };
const evidence = (id: string, unitValue: number, currency = 'EUR', sourceName = `source-${id}`): ValuationEvidence => ({
  id,
  type: 'OFFICIAL_TRANSACTION',
  authority: 'GOVERNMENT',
  sourceName,
  retrievedAt: '2026-09-15T00:00:00Z',
  assetMatch: 'EXACT',
  geographyMatch: 'EXACT',
  currency,
  unitValue,
  unitCode: 'M2',
});

describe('real estate valuation range', () => {
  it('returns a range only from sufficient normalized evidence', () => {
    const result = buildRealEstateValuationRange(asset, [evidence('1', 90), evidence('2', 100), evidence('3', 120)], 'EUR');
    expect(result.status).toBe('VALUED');
    expect(result.lowValue).toBeGreaterThan(0);
    expect(result.lowValue!).toBeLessThanOrEqual(result.midpointValue!);
    expect(result.midpointValue!).toBeLessThanOrEqual(result.highValue!);
    expect(result.evidenceIds).toHaveLength(3);
  });

  it('refuses a single comparable instead of inventing a range', () => {
    const result = buildRealEstateValuationRange(asset, [evidence('1', 100)], 'EUR');
    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('requires verified FX quotes for foreign-currency comparables', () => {
    const result = buildRealEstateValuationRange(asset, [evidence('1', 100, 'USD'), evidence('2', 110, 'USD')], 'EUR');
    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('uses supplied FX evidence rather than guessing conversion', () => {
    const result = buildRealEstateValuationRange(
      asset,
      [evidence('1', 100, 'USD'), evidence('2', 120, 'USD')],
      'EUR',
      [{ from: 'USD', to: 'EUR', rate: 0.85, sourceName: 'verified-fx', observedAt: '2026-09-15T00:00:00Z', retrievedAt: '2026-09-15T00:01:00Z' }],
    );
    expect(result.status).toBe('VALUED');
    expect(result.currency).toBe('EUR');
  });
});
