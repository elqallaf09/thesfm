import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MARKET_DATA_PROVIDERS, PRIORITY_MARKET_SCOPES } from '@/lib/market-data/catalog';
import { entitlementFor, readMarketDataEntitlements } from '@/lib/market-data/entitlements.server';
import { createMarketDataRecord, marketDataRegistrySnapshot } from '@/lib/market-data/records.server';

const agreement = {
  id: 'synthetic-kw', providerId: 'twelve_data', dataset: 'quotes',
  scope: { exchange: 'BOURSA_KUWAIT', country: 'KW' }, planName: 'Synthetic reviewed plan',
  commercialDisplay: 'allowed', redistribution: 'denied', delayType: 'delayed', delayMinutes: 15,
  evidenceReference: 'synthetic-private-reference', reviewedAt: '2026-10-01T00:00:00Z', validUntil: '2026-11-01T00:00:00Z',
};
function configure(entries: unknown[]) { vi.stubEnv('MARKET_DATA_ENTITLEMENTS_JSON', JSON.stringify(entries)); }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z')); vi.stubEnv('MARKET_DATA_ENTITLEMENTS_JSON', ''); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('market data rights scope and plan review', () => {
  it.each(PRIORITY_MARKET_SCOPES)('isolates $exchange from every other priority exchange', scope => {
    configure([{ ...agreement, scope: { exchange: scope.exchange, country: scope.country } }]);
    for (const target of PRIORITY_MARKET_SCOPES) {
      const result = createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', ...target });
      expect(result.commercialDisplay).toBe(target.exchange === scope.exchange ? 'allowed' : 'unverified');
    }
  });
  it.each(Object.keys(MARKET_DATA_PROVIDERS).filter(id => id !== 'twelve_data'))('does not inherit rights into %s', provider => {
    configure([agreement]);
    expect(createMarketDataRecord({ dataset: 'quotes', provider, ...agreement.scope })).toMatchObject({ entitlementId: null, commercialDisplay: 'unverified' });
  });
  it('selects the reviewed plan and delay only from the exact provider/dataset/venue tuple', () => {
    configure([
      agreement,
      { ...agreement, id: 'synthetic-us', scope: { exchange: 'NASDAQ', country: 'US' }, planName: 'Synthetic US plan', delayType: 'realtime', delayMinutes: 0 },
      { ...agreement, id: 'synthetic-fmp', providerId: 'fmp', planName: 'Synthetic FMP plan', delayType: 'eod', delayMinutes: null },
    ]);
    for (const [providerId, exchange, country, planName, delayType, delayMinutes] of [
      ['twelve_data', 'BOURSA_KUWAIT', 'KW', 'Synthetic reviewed plan', 'delayed', 15],
      ['twelve_data', 'NASDAQ', 'US', 'Synthetic US plan', 'realtime', 0],
      ['fmp', 'BOURSA_KUWAIT', 'KW', 'Synthetic FMP plan', 'eod', null],
    ] as const) {
      expect(entitlementFor({ providerId, dataset: 'quotes', exchange, country }).entry).toMatchObject({ planName, delayType, delayMinutes });
    }
    const publicRecord = createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', ...agreement.scope, reportedDelay: 'realtime', cacheAgeSeconds: 900 });
    expect(publicRecord.delay).toMatchObject({ reported: 'realtime', contractual: 'delayed', minutes: 15 });
    expect(JSON.stringify(publicRecord)).not.toMatch(/Synthetic reviewed plan|synthetic-private-reference/);
  });
  it('rejects conflicting plans for the same normalized tuple', () => {
    configure([agreement, { ...agreement, id: 'different-id', providerId: 'Twelve Data', scope: { exchange: 'XKSE', country: null }, planName: 'Other plan' }]);
    expect(readMarketDataEntitlements()).toEqual({ state: 'invalid', entries: [] });
  });
  it.each([
    { delayType: 'realtime', delayMinutes: 15 }, { delayType: 'delayed', delayMinutes: 0 },
    { delayType: 'delayed', delayMinutes: null }, { delayType: 'delayed', delayMinutes: -1 },
    { delayType: 'eod', delayMinutes: 1440 }, { delayType: 'unknown', delayMinutes: 15 },
    { scope: { exchange: 'XKSE', country: 'SA' } }, { scope: { exchange: 'ADX', country: 'KW' } },
    { scope: { exchange: 'TD_*', country: null } }, { scope: { exchange: 'NASDAQ', country: 'USA' } },
    { scope: { exchange: 'NASDAQ|NYSE', country: 'US' } }, { providerId: '*' },
    { providerId: 'rss/publisher' }, { id: 'https://private.example/agreement?token=synthetic' },
    { planName: '' }, { evidenceReference: '' },
  ])('rejects contradictory or unsafe record %j', override => {
    configure([{ ...agreement, ...override }]);
    expect(readMarketDataEntitlements()).toEqual({ state: 'invalid', entries: [] });
  });
  it.each([
    { delayType: 'realtime', delayMinutes: 0 }, { delayType: 'realtime', delayMinutes: null },
    { delayType: 'delayed', delayMinutes: 15 }, { delayType: 'eod', delayMinutes: null }, { delayType: 'unknown', delayMinutes: null },
  ])('accepts consistent contractual delay %j', override => {
    configure([{ ...agreement, ...override }]);
    expect(readMarketDataEntitlements().state).toBe('configured');
  });
  it('does not promote country-only evidence into exchange quote rights', () => {
    configure([{ ...agreement, scope: { exchange: null, country: 'US' } }]);
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', exchange: 'NASDAQ', country: 'US' }).commercialDisplay).toBe('unverified');
  });
  it('keeps display and redistribution independent', () => {
    configure([{ ...agreement, commercialDisplay: 'denied', redistribution: 'allowed' }]);
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', ...agreement.scope })).toMatchObject({ commercialDisplay: 'denied', redistribution: 'allowed' });
  });
  it.each(['2026-09-30T23:59:59Z', '2026-11-01T00:00:00Z'])('grants nothing outside the reviewed validity period at %s', now => {
    configure([agreement]); vi.setSystemTime(new Date(now));
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', ...agreement.scope })).toMatchObject({ planStatus: 'expired_or_future', entitlementId: null, commercialDisplay: 'unverified' });
  });
  it('links policy evidence in the protected registry without seeding account permissions', () => {
    const registry = marketDataRegistrySnapshot();
    expect(registry.entitlements).toEqual([]);
    expect(registry.entitlementConfiguration).toBe('not_configured');
    expect(registry.policyReview).toMatchObject({ evidenceType: 'public_policy_only', grantsAccountRights: false });
    expect(registry.policyReview.exchanges).toHaveLength(PRIORITY_MARKET_SCOPES.length);
    for (const row of [...registry.policyReview.providers, ...registry.policyReview.exchanges]) {
      for (const id of row.policyEvidenceIds) expect(registry.policyReview.sources[id].url).toMatch(/^https:\/\//);
    }
    expect(registry.rules.availabilityEnforcementEnabled).toBe(false);
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'fmp', exchange: 'NASDAQ' })).not.toHaveProperty('policyReview');
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'fmp', exchange: 'NASDAQ' }).commercialDisplay).toBe('unverified');
  });
});
