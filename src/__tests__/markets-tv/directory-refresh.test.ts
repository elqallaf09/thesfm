import { describe, expect, it, vi } from 'vitest';
import { isPublicTvSnapshot, tvDirectoryRefreshDelay, TvResourceCache } from '@/components/markets-tv/tvResourceCache';

describe('Directory refresh hints', () => {
  it('rechecks pending and partial public directories then returns to normal after completion', () => {
    for (const path of ['/api/tv/instruments?group=world&market=europe', '/api/tv/catalog']) {
      expect(tvDirectoryRefreshDelay(path, { coverage: 'pending', retryAfterMs: 5000 }, 300000)).toBe(5000);
      expect(tvDirectoryRefreshDelay(path, { coverage: 'partial', retryAfterMs: 10000 }, 300000)).toBe(10000);
      expect(tvDirectoryRefreshDelay(path, { coverage: 'directory' }, 300000)).toBe(300000);
    }
  });
  it('bounds invalid hints and does not alter private or quote polling', () => {
    const path = '/api/tv/instruments?group=world';
    expect(tvDirectoryRefreshDelay(path, { retryAfterMs: 1 }, 300000)).toBe(5000);
    expect(tvDirectoryRefreshDelay(path, { retryAfterMs: 86400000 }, 300000)).toBe(300000);
    for (const retryAfterMs of [NaN, Infinity, -1, 0, '5000', null]) expect(tvDirectoryRefreshDelay(path, { retryAfterMs }, 60000)).toBe(60000);
    for (const other of ['/api/tv/account', '/api/tv/snapshot?group=world', '/api/tv/catalog/private', '//evil.example/api/tv/catalog', 'https://evil.example/api/tv/catalog']) {
      expect(tvDirectoryRefreshDelay(other, { retryAfterMs: 5000 }, 60000)).toBe(60000);
    }
    expect(tvDirectoryRefreshDelay(path, { retryAfterMs: 5000 }, 60000, 'device-token')).toBe(60000);
  });
  it('shares only identical listing selections and keeps European venues separate', async () => {
    const options = () => ({ signal: new AbortController().signal, ttlMs: 60000 });
    const path = (key: string) => `/api/tv/snapshot?${new URLSearchParams({ group: 'world', market: 'europe', listingKeys: JSON.stringify([key]), pageSize: '6' })}`;
    const cache = new TvResourceCache();
    const amsterdam = path('TD_XAMS:QA'), swiss = path('TD_XSWX:QA');
    expect(isPublicTvSnapshot(amsterdam)).toBe(true);
    const loadAmsterdam = vi.fn(async () => ({ venue: 'Amsterdam' }));
    const loadSwiss = vi.fn(async () => ({ venue: 'Swiss' }));
    await cache.request(amsterdam, options(), loadAmsterdam);
    await cache.request(amsterdam, options(), loadAmsterdam);
    await cache.request(swiss, options(), loadSwiss);
    expect(loadAmsterdam).toHaveBeenCalledTimes(1);
    expect(loadSwiss).toHaveBeenCalledTimes(1);
    expect(cache.peek(amsterdam)).toEqual({ venue: 'Amsterdam' });
    expect(cache.peek(swiss)).toEqual({ venue: 'Swiss' });
  });
});
