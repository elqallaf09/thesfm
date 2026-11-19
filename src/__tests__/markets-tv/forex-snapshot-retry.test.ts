import { describe, expect, it } from 'vitest';
import type { TvQuote } from '@/lib/markets-tv/types';
import { tvSnapshotRetryAt } from '@/lib/server/markets-tv/quoteAvailability';

const now = Date.parse('2026-11-19T10:00:00Z');
const retryAt = new Date(now + 61_000).toISOString();
const reference: TvQuote = {
  symbol: 'AED/KWD', name: 'AED/KWD', nameAr: 'AED/KWD', price: 0.08,
  currency: 'KWD', changePercent: null, source: 'Reference test fixture',
  observedAt: '2026-11-19', receivedAt: new Date(now).toISOString(),
  status: 'reference', delayType: 'eod', exchange: 'FOREX', country: null,
};
const unavailable: TvQuote = {
  ...reference, symbol: 'AED/KRW', price: null, source: null, observedAt: null,
  receivedAt: null, status: 'unavailable', issue: 'rate_limited', retryAt,
};

describe('Forex snapshot account cooldown', () => {
  it('suspends repeated account requests even when part of the page has verified prices', () => {
    expect(tvSnapshotRetryAt([reference, unavailable], now, 'forex')).toBe(retryAt);
    expect(reference).toMatchObject({ price: 0.08, observedAt: '2026-11-19', status: 'reference' });
  });

  it('preserves the recovery deadline when a reference source fills every pair', () => {
    expect(tvSnapshotRetryAt([{ ...reference, retryAt }], now, 'forex')).toBe(retryAt);
  });

  it('releases an expired deadline and ignores invalid source metadata', () => {
    expect(tvSnapshotRetryAt([unavailable], now + 61_000, 'forex')).toBeUndefined();
    expect(tvSnapshotRetryAt([{ ...reference, retryAt: 'invalid' }], now, 'forex')).toBeUndefined();
  });

  it('chooses the earliest future retry and keeps unrelated healthy feeds updating', () => {
    const later = { ...unavailable, retryAt: new Date(now + 120_000).toISOString() };
    expect(tvSnapshotRetryAt([reference, later, unavailable], now, 'forex')).toBe(retryAt);
    expect(tvSnapshotRetryAt([reference, unavailable], now, 'commodities')).toBeUndefined();
    expect(tvSnapshotRetryAt([reference, unavailable], now, 'watchlist')).toBeUndefined();
    expect(tvSnapshotRetryAt([unavailable, later], now)).toBe(retryAt);
  });
});
