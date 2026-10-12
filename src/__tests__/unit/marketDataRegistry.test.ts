import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MARKET_DATASETS, PRIORITY_MARKET_SCOPES } from '@/lib/market-data/catalog';
import { readMarketDataEntitlements } from '@/lib/market-data/entitlements.server';
import { createMarketDataRecord, marketDataRegistrySnapshot } from '@/lib/market-data/records.server';
import { directoryRecordExchange } from '@/lib/market-data/scope';

const agreement = {
  id: 'test-agreement', providerId: 'twelve_data', dataset: 'quotes',
  scope: { exchange: 'BOURSA_KUWAIT', country: 'KW' }, planName: 'Private test plan',
  commercialDisplay: 'allowed', redistribution: 'denied', delayType: 'eod', delayMinutes: null,
  evidenceReference: 'private-evidence-ref', reviewedAt: '2026-10-01T00:00:00Z', validUntil: '2026-11-01T00:00:00Z',
};
function configure(entries: unknown[] = [agreement]) { vi.stubEnv('MARKET_DATA_ENTITLEMENTS_JSON', JSON.stringify(entries)); }
const quote = () => createMarketDataRecord({ dataset: 'quotes', provider: 'Twelve Data', exchange: 'BOURSA_KUWAIT', country: 'KW', reportedDelay: 'delayed', cached: true, cacheAgeSeconds: 30 });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('market data evidence registry', () => {
  it('never treats configured API credentials as a subscription or display right', () => {
    vi.stubEnv('MARKET_DATA_ENTITLEMENTS_JSON', ''); vi.stubEnv('FMP_API_KEY', 'test-secret');
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'fmp' })).toMatchObject({ providerId: 'fmp', planStatus: 'unverified', commercialDisplay: 'unverified', redistribution: 'unverified', coverage: 'unverified', delay: { contractual: 'unknown', minutes: null } });
  });
  it('records exact-scope evidence and keeps contract delay separate from the adapter and cache', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12')); configure();
    expect(quote()).toMatchObject({ providerId: 'twelve_data', planStatus: 'verified', entitlementId: 'test-agreement', commercialDisplay: 'allowed', redistribution: 'denied', coverage: 'unverified', delay: { reported: 'delayed', contractual: 'eod', minutes: null, cached: true, cacheAgeSeconds: 30 } });
    expect(JSON.stringify(quote())).not.toMatch(/Private test plan|private-evidence-ref/);
    expect(marketDataRegistrySnapshot().entitlements[0]).toMatchObject({ planName: 'Private test plan', evidenceReference: 'private-evidence-ref' });
  });
  it('does not extend Kuwait rights to Saudi Arabia, another dataset or an unknown exchange', () => {
    configure();
    for (const overrides of [{ exchange: 'TADAWUL' }, { dataset: 'history' as const }, { exchange: null }, { country: 'AE' }]) {
      expect(createMarketDataRecord({ dataset: 'quotes', provider: 'twelve_data', exchange: 'BOURSA_KUWAIT', country: 'KW', ...overrides }).commercialDisplay).toBe('unverified');
    }
  });
  it('normalizes explicit exchange aliases while preserving distinct Gulf venues', () => {
    configure(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12'));
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'Twelve Data', exchange: 'XKSE' })).toMatchObject({ scope: { exchange: 'BOURSA_KUWAIT', country: 'KW' }, commercialDisplay: 'allowed' });
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'Twelve Data', exchange: 'TD_XADS' })).toMatchObject({ scope: { exchange: 'ADX', country: 'AE' }, commercialDisplay: 'unverified' });
    expect(directoryRecordExchange('NBK.KW')).toBe('BOURSA_KUWAIT');
    expect(directoryRecordExchange('TD:DSMD:QNBK')).toBe('DSMD');
    expect(directoryRecordExchange('AAPL')).toBeNull();
  });
  it('never transfers a primary provider entitlement to a fallback provider', () => {
    configure();
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'Yahoo Finance', exchange: 'BOURSA_KUWAIT', country: 'KW' })).toMatchObject({ providerId: 'yahoo', commercialDisplay: 'unverified', entitlementId: null });
  });
  it('expires an agreement even while a cached price is still available', () => {
    configure(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02'));
    expect(quote()).toMatchObject({ planStatus: 'expired_or_future', commercialDisplay: 'unverified', delay: { cached: true } });
  });
  it.each(['not-json', '{}', JSON.stringify([{ ...agreement, scope: { exchange: '*', country: null } }]), JSON.stringify([agreement, agreement]), JSON.stringify([{ ...agreement, providerId: 'openbb' }])])('fails closed on invalid or ambiguous configuration', raw => {
    expect(readMarketDataEntitlements(raw)).toEqual({ state: 'invalid', entries: [] });
  });
  it('keeps different RSS publishers distinct and does not grant integration-layer rights', () => {
    vi.stubEnv('MARKET_DATA_ENTITLEMENTS_JSON', '');
    expect(createMarketDataRecord({ dataset: 'news', provider: 'official-dfm-disclosures' }).providerId).toBe('official-dfm-disclosures');
    expect(createMarketDataRecord({ dataset: 'quotes', provider: 'OpenBB' }).commercialDisplay).toBe('unverified');
  });
  it('has separate Gulf exchange review rows with no blanket region coverage claim', () => {
    expect(PRIORITY_MARKET_SCOPES.filter(row => row.country === 'AE').map(row => row.exchange)).toEqual(['ADX', 'DFM', 'NASDAQ_DUBAI']);
    expect(marketDataRegistrySnapshot().priorityMarkets.every(row => row.symbolCompleteness === 'unverified')).toBe(true);
  });
  it('links each catalogued dataset to existing implementation and API routes', () => {
    for (const entry of Object.values(MARKET_DATASETS)) {
      expect(existsSync(entry.implementation), entry.implementation).toBe(true);
      for (const route of entry.routes) expect(existsSync(`src/app${route}/route.ts`), route).toBe(true);
    }
  });
});
