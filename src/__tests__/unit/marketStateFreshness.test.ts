import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeFreshness, FRESHNESS_THRESHOLDS_SECONDS } from '@/lib/market-state/freshness';

const TTL_MS = { earnings: 3 * 60 * 60 * 1000, dividends: 3 * 60 * 60 * 1000, ipos: 3 * 60 * 60 * 1000, economic: 60 * 60 * 1000 };

describe('freshness thresholds stay consistent with the real calendar cache TTLs', () => {
  it('earnings/dividends/ipos stale threshold is never below the real 3h cache TTL', () => {
    expect(FRESHNESS_THRESHOLDS_SECONDS.earnings.stale * 1000).toBeGreaterThanOrEqual(TTL_MS.earnings);
    expect(FRESHNESS_THRESHOLDS_SECONDS.dividends.stale * 1000).toBeGreaterThanOrEqual(TTL_MS.dividends);
    expect(FRESHNESS_THRESHOLDS_SECONDS.ipos.stale * 1000).toBeGreaterThanOrEqual(TTL_MS.ipos);
  });

  it('economic_calendar stale threshold is never below the real 1h cache TTL', () => {
    expect(FRESHNESS_THRESHOLDS_SECONDS.economic_calendar.stale * 1000).toBeGreaterThanOrEqual(TTL_MS.economic);
  });
});

describe('computeFreshness', () => {
  it('treats a missing asOf as stale with no age', () => {
    const freshness = computeFreshness(null, 'quotes', Date.now());
    expect(freshness.isStale).toBe(true);
    expect(freshness.ageSeconds).toBeNull();
  });

  it('treats an invalid date string as stale, not a thrown error', () => {
    const freshness = computeFreshness('not-a-date', 'quotes', Date.now());
    expect(freshness.isStale).toBe(true);
    expect(freshness.ageSeconds).toBeNull();
  });

  it('is fresh and not delayed just inside the fresh threshold', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const asOf = new Date(now - 10_000).toISOString(); // 10s old, quotes fresh threshold = 15s
    const freshness = computeFreshness(asOf, 'quotes', now);
    expect(freshness.isDelayed).toBe(false);
    expect(freshness.isStale).toBe(false);
  });

  it('is delayed but not stale between the fresh and stale thresholds', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const asOf = new Date(now - 30_000).toISOString(); // 30s old: past 15s fresh, under 60s stale
    const freshness = computeFreshness(asOf, 'quotes', now);
    expect(freshness.isDelayed).toBe(true);
    expect(freshness.isStale).toBe(false);
  });

  it('is stale past the stale threshold', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const asOf = new Date(now - 120_000).toISOString(); // 120s old: past 60s stale threshold
    const freshness = computeFreshness(asOf, 'quotes', now);
    expect(freshness.isStale).toBe(true);
  });
});

describe('freshness env overrides', () => {
  afterEach(() => {
    delete process.env.MARKET_STATE_FRESHNESS_OVERRIDES_JSON;
    vi.resetModules();
  });

  it('merges valid JSON overrides on top of defaults', async () => {
    vi.resetModules();
    process.env.MARKET_STATE_FRESHNESS_OVERRIDES_JSON = JSON.stringify({ news: { fresh: 60 } });
    const mod = await import('@/lib/market-state/freshness');
    const thresholds = mod.getFreshnessThresholds();
    expect(thresholds.news.fresh).toBe(60);
    expect(thresholds.news.stale).toBe(FRESHNESS_THRESHOLDS_SECONDS.news.stale);
  });

  it('ignores malformed JSON and falls back to defaults', async () => {
    vi.resetModules();
    process.env.MARKET_STATE_FRESHNESS_OVERRIDES_JSON = '{not valid json';
    const mod = await import('@/lib/market-state/freshness');
    const thresholds = mod.getFreshnessThresholds();
    expect(thresholds.news).toEqual(FRESHNESS_THRESHOLDS_SECONDS.news);
  });
});
