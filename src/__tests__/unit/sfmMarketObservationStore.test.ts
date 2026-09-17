import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sfmMarketObservationKey, toSfmMarketObservationRow } from '@/lib/sfm-market/store';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

function quote(patch: Partial<SfmMarketQuote> = {}): SfmMarketQuote {
  const base: SfmMarketQuote = {
    schemaVersion: 'sfm-market.v1',
    engine: 'THE SFM Market Data Engine',
    engineVersion: '1.0.0',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    market: 'US',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    price: 200,
    change: 2,
    changePercent: 1.01,
    open: 198,
    high: 202,
    low: 197,
    previousClose: 198,
    volume: 50_000_000,
    quality: {
      state: 'complete',
      score: 100,
      completenessPercent: 100,
      freshnessSeconds: 30,
      missingFields: [],
      reasons: [],
    },
    provenance: {
      sourceClass: 'licensed_feed',
      upstreamProvider: 'finnhub',
      upstreamProviderName: 'Finnhub',
      providerSymbol: 'AAPL',
      observedAt: '2026-09-17T12:00:00.000Z',
      receivedAt: '2026-09-17T12:00:05.000Z',
      delayType: 'realtime',
      cached: false,
      cacheAgeSeconds: null,
      attemptCount: 1,
      derivedFields: ['change', 'changePercent'],
    },
  };
  return {
    ...base,
    ...patch,
    quality: { ...base.quality, ...(patch.quality ?? {}) },
    provenance: { ...base.provenance, ...(patch.provenance ?? {}) },
  };
}

function projectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SFM Historical Market Store v1', () => {
  it('deduplicates repeated requests for the same upstream observation', () => {
    const first = quote();
    const repeated = quote({ provenance: { ...first.provenance, receivedAt: '2026-09-17T12:00:20.000Z', attemptCount: 4 } });
    expect(sfmMarketObservationKey(first)).toBe(sfmMarketObservationKey(repeated));
  });

  it('changes identity when the observed fact or upstream timestamp changes', () => {
    const base = quote();
    expect(sfmMarketObservationKey(quote({ price: 201 }))).not.toBe(sfmMarketObservationKey(base));
    expect(sfmMarketObservationKey(quote({ provenance: { ...base.provenance, observedAt: '2026-09-17T12:01:00.000Z' } }))).not.toBe(sfmMarketObservationKey(base));
  });

  it('refuses to persist unavailable, non-positive, providerless or untimestamped observations', () => {
    expect(toSfmMarketObservationRow(quote({ quality: { ...quote().quality, state: 'unavailable' } }))).toBeNull();
    expect(toSfmMarketObservationRow(quote({ price: 0 }))).toBeNull();
    expect(toSfmMarketObservationRow(quote({ provenance: { ...quote().provenance, upstreamProvider: null } }))).toBeNull();
    expect(toSfmMarketObservationRow(quote({ provenance: { ...quote().provenance, observedAt: null } }))).toBeNull();
  });

  it('preserves real zero volume and source lineage without analyst output', () => {
    const row = toSfmMarketObservationRow(quote({ volume: 0 }));
    expect(row).not.toBeNull();
    expect(row?.volume).toBe(0);
    expect(row?.upstream_provider).toBe('finnhub');
    expect(row?.source_class).toBe('licensed_feed');
    expect(row?.observed_at).toBe('2026-09-17T12:00:00.000Z');
    expect(row).not.toHaveProperty('confidence');
    expect(row).not.toHaveProperty('recommendation');
    expect(row).not.toHaveProperty('target_price');
  });

  it('ships a service-role-only immutable raw observation schema', () => {
    const migration = projectFile('supabase/migrations/20260917142000_create_sfm_market_observations.sql');
    expect(migration).toContain('create table if not exists public.sfm_market_observations');
    expect(migration).toContain('unique (observation_key)');
    expect(migration).toContain('price > 0');
    expect(migration).toContain('to service_role');
    expect(migration).toContain('revoke all on table public.sfm_market_observations from anon, authenticated');
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete).*authenticated/i);
  });
});
