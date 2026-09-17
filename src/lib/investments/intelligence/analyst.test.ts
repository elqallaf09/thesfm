import { describe, expect, it } from 'vitest';
import { analyzeRealEstateAsset } from './analyst';

describe('real estate analyst orchestration', () => {
  it('reports unsupported country coverage instead of inventing sources or values', async () => {
    const result = await analyzeRealEstateAsset({ countryCode: 'BA', city: 'Sarajevo', propertyType: 'LAND', landArea: 500, landAreaUnit: 'M2' }, 'EUR');
    expect(result.status).toBe('SOURCE_COVERAGE_UNAVAILABLE');
    expect(result.valuation).toBeNull();
    expect(result.evidenceCount).toBe(0);
  });
});
