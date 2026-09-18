import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ registry: vi.fn(), collect: vi.fn(), value: vi.fn(), context: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/investments/intelligence/source-registry', () => ({ getRealEstateSourceAdapters: mocks.registry }));
vi.mock('@/lib/investments/intelligence/sources', () => ({ collectRealEstateEvidence: mocks.collect }));
vi.mock('@/lib/investments/intelligence/valuation-range', () => ({ buildRealEstateValuationRange: mocks.value }));
vi.mock('@/lib/investments/intelligence/adapters/uk-hmlr-open-data', () => ({ collectUkHmlrPropertyContext: mocks.context, ukHmlrContextUnavailable: vi.fn() }));
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';

it('market research never invokes valuation adapters, even when area is supplied', async () => {
  mocks.context.mockResolvedValue({ status: 'AVAILABLE', providerId: 'fixture-context', valuationEligible: false });
  const result = await analyzeRealEstateAsset({ countryCode: 'GB', city: 'London', propertyType: 'HOUSE', landArea: 100, landAreaUnit: 'M2' }, 'USD', [], 'market_context');
  expect(result.status).toBe('SOURCE_DATA_REVIEW_REQUIRED');
  expect(result.valuation).toBeNull(); expect(result.evidence).toEqual([]);
  expect(result.officialContext?.providerId).toBe('fixture-context');
  expect(mocks.registry).not.toHaveBeenCalled();
  expect(mocks.collect).not.toHaveBeenCalled();
  expect(mocks.value).not.toHaveBeenCalled();
});
