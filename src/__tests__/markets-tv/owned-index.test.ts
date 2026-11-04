import { expect, it, vi } from 'vitest';
const { read, fresh } = vi.hoisted(() => ({ read: vi.fn(), fresh: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: fresh }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => ({
  from: () => {
    const query = { select: () => query, eq: () => query, lte: () => query,
      order: () => query, limit: () => query, abortSignal: read };
    return query;
  },
}) }));
import { resolveTvQuotes } from '@/lib/server/markets-tv/quoteLoader';

it('serves a dated SFM index observation during an outage and rejects another listing', async () => {
  fresh.mockResolvedValue(null);
  const observedAt = '2026-10-01T20:00:00.000Z';
  const row = { symbol: '^GSPC', observation_key: 'fixture', observed_at: observedAt, received_at: observedAt,
    price: 123, source_class: 'aggregator', quality_state: 'usable', upstream_provider: 'yahoo', provider_symbol: '^GSPC' };
  const assets = [{ symbol: '^GSPC', name: 'S&P 500', assetType: 'index' as const }];
  read.mockResolvedValueOnce({ data: [row] });
  expect((await resolveTvQuotes(assets, 'global'))[0]).toMatchObject({
    price: 123, source: 'SFM · yahoo', observedAt, status: 'stale', currency: null,
  });
  read.mockResolvedValueOnce({ data: [{ ...row, provider_symbol: 'SPY' }] });
  expect((await resolveTvQuotes(assets, 'global'))[0].price).toBeNull();
});
