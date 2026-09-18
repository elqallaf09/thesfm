import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValuationEvidence } from './contracts';
import { buildRealEstateValuationRange } from './valuation-range';
import { assessRealEstateReadiness } from './readiness';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-18T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

const asset = { countryCode: 'BA', city: 'Sarajevo', propertyType: 'LAND', landArea: 100, landAreaUnit: 'M2' as const };
const evidence = (id: string, unitValue: number, currency = 'EUR', sourceName = `source-${id}`): ValuationEvidence => ({
  id,
  type: 'OFFICIAL_TRANSACTION',
  authority: 'GOVERNMENT',
  sourceName,
  sourceUrl: `https://registry.example/${id}`,
  observedOn: '2026-09-14',
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

  it.each([
    { type: 'LISTING_ASK' as const }, { observedOn: undefined }, { observedOn: '2020-01-01' },
    { observedOn: '2027-01-01' }, { sourceUrl: undefined }, { unitValue: -1 },
    { assetMatch: 'UNKNOWN' as const }, { geographyMatch: 'PARTIAL' as const },
  ])('rejects unqualified transaction evidence %j in valuation and readiness', overrides => {
    const rows = [{ ...evidence('1', 100), ...overrides }, { ...evidence('2', 110), ...overrides }];
    expect(buildRealEstateValuationRange(asset, rows, 'EUR').status).toBe('INSUFFICIENT_EVIDENCE');
    expect(assessRealEstateReadiness(asset, rows).checks.transactionComparables).toBe(false);
  });
  it('does not count duplicate evidence IDs as independent transactions', () => {
    expect(buildRealEstateValuationRange(asset, [evidence('1', 100), evidence('1', 110)], 'EUR').status).toBe('INSUFFICIENT_EVIDENCE');
  });
  it('withholds stale FX and invalid area rather than manufacturing a converted value', () => {
    const rows = [evidence('1', 100, 'USD'), evidence('2', 120, 'USD')];
    expect(buildRealEstateValuationRange(asset, rows, 'EUR', [{ from: 'USD', to: 'EUR', rate: 0.85, sourceName: 'registry', observedAt: '2025-01-01', retrievedAt: '2025-01-01' }]).status).toBe('INSUFFICIENT_EVIDENCE');
    expect(buildRealEstateValuationRange({ ...asset, landArea: Infinity }, rows, 'USD').status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
