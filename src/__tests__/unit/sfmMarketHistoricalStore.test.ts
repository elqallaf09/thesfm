import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSfmMarketObservation,
  sfmMarketEvidenceHash,
} from '@/lib/sfm-market/store';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

function quote(patch: Partial<SfmMarketQuote> = {}): SfmMarketQuote {
  return {
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
    price: 210,
    change: 2,
    changePercent: 0.9615,
    open: 208,
    high: 211,
    low: 207,
    previousClose: 208,
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
      sourceClass: 'aggregator',
      upstreamProvider: 'finnhub',
      upstreamProviderName: 'Finnhub',
      providerSymbol: 'AAPL',
      observedAt: '2026-09-17T04:30:00.000Z',
      receivedAt: '2026-09-17T04:30:30.000Z',
      delayType: 'realtime',
      cached: false,
      cacheAgeSeconds: null,
      attemptCount: 1,
      derivedFields: ['change', 'changePercent'],
    },
    ...patch,
  };
}

describe('SFM market historical store', () => {
  it('keeps source lineage and licensing policy beside every observation', () => {
    const row = buildSfmMarketObservation(quote());
    expect(row.symbol).toBe('AAPL');
    expect(row.upstream_provider).toBe('finnhub');
    expect(row.source_class).toBe('aggregator');
    expect(row.observed_at).toBe('2026-09-17T04:30:00.000Z');
    expect(row.received_at).toBe('2026-09-17T04:30:30.000Z');
    expect(row.redistribution_policy).toBe('internal_only');
    expect(row.price).toBe(210);
    expect(row.volume).toBe(50_000_000);
  });

  it('never assumes official or licensed evidence is redistributable without an explicit rights review', () => {
    const licensed = quote({
      provenance: { ...quote().provenance, sourceClass: 'licensed_feed', upstreamProvider: 'licensed-direct-feed' },
    });
    const primary = quote({
      provenance: { ...quote().provenance, sourceClass: 'primary_exchange', upstreamProvider: 'exchange-feed' },
    });
    expect(buildSfmMarketObservation(licensed).redistribution_policy).toBe('rights_review_required');
    expect(buildSfmMarketObservation(primary).redistribution_policy).toBe('rights_review_required');
  });

  it('uses evidence content in its immutable deduplication hash', () => {
    const first = sfmMarketEvidenceHash(quote());
    const same = sfmMarketEvidenceHash(quote());
    const changedPrice = sfmMarketEvidenceHash(quote({ price: 211 }));
    const changedTimestamp = sfmMarketEvidenceHash(quote({
      provenance: { ...quote().provenance, observedAt: '2026-09-17T04:31:00.000Z' },
    }));
    expect(first).toBe(same);
    expect(first).not.toBe(changedPrice);
    expect(first).not.toBe(changedTimestamp);
  });

  it('ships an append-only service-role schema with browser roles revoked', () => {
    const sql = readFileSync('supabase/migrations/20260917044000_create_sfm_market_observations.sql', 'utf8').toLowerCase();
    expect(sql).toContain('create table if not exists public.sfm_market_observations');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('force row level security');
    expect(sql).toContain('revoke all on table public.sfm_market_observations from public, anon, authenticated');
    expect(sql).toContain('revoke update, delete, truncate on table public.sfm_market_observations from service_role');
    expect(sql).toContain('grant select, insert on table public.sfm_market_observations to service_role');
    expect(sql).not.toMatch(/grant\s+(update|delete|truncate|all)[^;]*to\s+service_role/i);
  });

  it('ingests through the SFM engine on a guarded hourly cron without reintroducing Yahoo', () => {
    const route = readFileSync('src/app/api/sfm-market/v1/ingest/route.ts', 'utf8');
    const vercel = readFileSync('vercel.json', 'utf8');
    expect(route).toContain("getSfmMarketQuote(symbol, { forceFresh })");
    expect(route).toContain('persistSfmMarketQuoteObservation');
    expect(route).toContain('ADMIN_API_POLICY_EXCEPTION: cron-or-admin-sfm-market-ingest');
    expect(route.toLowerCase()).not.toContain('yahoo');
    expect(vercel).toContain('"path": "/api/sfm-market/v1/ingest"');
    expect(vercel).toContain('"schedule": "5 * * * *"');
  });
});
