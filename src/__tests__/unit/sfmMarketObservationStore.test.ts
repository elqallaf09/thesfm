import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import {
  persistSfmMarketObservation,
  sfmObservationFingerprint,
  toSfmMarketObservationRecord,
} from '@/lib/sfm-market/observationStore';

function quote(patch: Partial<SfmMarketQuote> = {}): SfmMarketQuote {
  return {
    schemaVersion: 'sfm-market.v1',
    engine: 'THE SFM Market Data Engine',
    engineVersion: '1.0.0',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    market: 'US Stocks',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    price: 320,
    change: 2,
    changePercent: 0.63,
    open: 317,
    high: 322,
    low: 316,
    previousClose: 318,
    volume: 48_000_000,
    quality: {
      state: 'complete',
      score: 100,
      completenessPercent: 100,
      freshnessSeconds: 12,
      missingFields: [],
      reasons: [],
    },
    provenance: {
      sourceClass: 'aggregator',
      upstreamProvider: 'finnhub',
      upstreamProviderName: 'Finnhub',
      providerSymbol: 'AAPL',
      observedAt: '2026-09-16T19:00:00.000Z',
      receivedAt: '2026-09-16T19:00:12.000Z',
      delayType: 'realtime',
      cached: false,
      cacheAgeSeconds: null,
      attemptCount: 1,
      derivedFields: ['change', 'changePercent'],
    },
    ...patch,
  };
}

describe('SFM canonical market observation store', () => {
  it('produces stable SHA-256 fingerprints and changes them when market facts change', () => {
    const first = sfmObservationFingerprint(quote());
    const same = sfmObservationFingerprint(quote());
    const changedHigh = sfmObservationFingerprint(quote({ high: 323 }));
    const changedVolume = sfmObservationFingerprint(quote({ volume: 49_000_000 }));

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(same).toBe(first);
    expect(changedHigh).not.toBe(first);
    expect(changedVolume).not.toBe(first);
  });

  it('defaults every observation to internal-only redistribution', () => {
    const record = toSfmMarketObservationRecord(quote());
    expect(record.distribution_scope).toBe('internal_only');
    expect(record.source_class).toBe('aggregator');
    expect(record.upstream_provider).toBe('finnhub');
    expect(record.price).toBe(320);
  });

  it('requires an explicit call to mark an observation externally redistributable', () => {
    const record = toSfmMarketObservationRecord(quote(), { distributionScope: 'external_allowed' });
    expect(record.distribution_scope).toBe('external_allowed');
  });

  it('skips database access when persistence is disabled', async () => {
    const result = await persistSfmMarketObservation(quote(), { enabled: false, client: null });
    expect(result).toMatchObject({ ok: true, stored: false, reason: 'disabled' });
  });

  it('ships an immutable service-only database contract with no browser grants', () => {
    const migration = readFileSync('supabase/migrations/20260916230000_create_sfm_market_observations.sql', 'utf8');
    expect(migration).toContain('alter table public.sfm_market_observations enable row level security');
    expect(migration).toContain('revoke all on table public.sfm_market_observations from anon, authenticated');
    expect(migration).toContain('grant select, insert on table public.sfm_market_observations to service_role');
    expect(migration).not.toMatch(/grant\s+(update|delete)/i);
    expect(migration).toContain("default 'internal_only'");
    expect(migration).toContain("where distribution_scope = 'external_allowed'");
  });

  it('does not persist opaque raw provider payloads in the canonical schema', () => {
    const migration = readFileSync('supabase/migrations/20260916230000_create_sfm_market_observations.sql', 'utf8').toLowerCase();
    expect(migration).not.toMatch(/\braw_payload\b/);
    expect(migration).not.toMatch(/\bprovider_payload\b/);
    expect(migration).not.toMatch(/\braw_response\b/);
  });
});
