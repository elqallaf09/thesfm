import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeSfmOwnedHistoryRows } from '@/lib/sfm-market/ownedHistory';

function projectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SFM-owned history API', () => {
  it('normalizes only valid stored observations and preserves nulls/zero volume', () => {
    const points = normalizeSfmOwnedHistoryRows([
      {
        observation_key: 'later', symbol: 'AAPL', observed_at: '2026-09-17T12:01:00Z', received_at: '2026-09-17T12:01:01Z',
        price: 201, change: null, change_percent: null, open: null, high: null, low: null, previous_close: null, volume: 0,
        currency: 'USD', market: 'US', exchange: 'NASDAQ', quality_state: 'usable', source_class: 'licensed_feed',
        upstream_provider: 'finnhub', provider_symbol: 'AAPL', delay_type: 'realtime',
      },
      {
        observation_key: 'earlier', symbol: 'AAPL', observed_at: '2026-09-17T12:00:00Z', received_at: '2026-09-17T12:00:01Z',
        price: 200, change: 1, change_percent: 0.5, volume: null, quality_state: 'partial', source_class: 'licensed_feed',
        upstream_provider: 'finnhub', provider_symbol: 'AAPL',
      },
      { observation_key: 'invalid', symbol: 'AAPL', observed_at: null, received_at: '2026-09-17T12:00:01Z', price: 999, quality_state: 'complete', source_class: 'licensed_feed', upstream_provider: 'finnhub' },
    ]);

    expect(points).toHaveLength(2);
    expect(points.map(point => point.observationKey)).toEqual(['earlier', 'later']);
    expect(points[0]?.volume).toBeNull();
    expect(points[1]?.volume).toBe(0);
    expect(points[1]?.change).toBeNull();
  });

  it('does not contain external provider fallback logic', () => {
    const reader = projectFile('src/lib/sfm-market/ownedHistory.ts');
    const route = projectFile('src/app/api/sfm-market/v1/history/[symbol]/route.ts');
    expect(reader).toContain("SFM_MARKET_OBSERVATIONS_TABLE");
    expect(reader).toContain('externalFallbackUsed: false');
    expect(reader).not.toContain('fetchYahoo');
    expect(reader).not.toContain('getCandlesWithFallback');
    expect(reader).not.toContain('getQuoteWithFallback');
    expect(route).toContain('readSfmOwnedHistory');
    expect(route).toContain('HISTORY_STORE_NOT_CONFIGURED');
  });

  it('keeps the raw observation table private while the API returns a sanitized contract', () => {
    const migration = projectFile('supabase/migrations/20260917142000_create_sfm_market_observations.sql');
    const route = projectFile('src/app/api/sfm-market/v1/history/[symbol]/route.ts');
    expect(migration).toContain('revoke all on table public.sfm_market_observations from anon, authenticated');
    expect(route).not.toContain('provenance:');
    expect(route).not.toContain('createServerSupabaseAdmin');
  });
});
