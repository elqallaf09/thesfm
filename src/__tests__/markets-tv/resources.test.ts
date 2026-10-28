import { describe, expect, it, vi } from 'vitest';
import { createTvSnapshotQueue } from '@/components/markets-tv/snapshotQueue';
import { isPublicTvSnapshot, TvResourceCache, TvResourceError, tvRetryDelay, tvSnapshotRetryDelay } from '@/components/markets-tv/tvResourceCache';
import { retainVisibleTvSnapshot } from '@/components/markets-tv/retainedSnapshot';
import type { TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const path = '/api/tv/snapshot?group=global&pageSize=6';
const options = (controller = new AbortController()) => ({ signal: controller.signal, ttlMs: 30_000 });
const quote = (overrides: Partial<TvQuote> = {}): TvQuote => ({ symbol: 'TEST', name: 'Test fixture', nameAr: 'اختبار', currency: 'USD',
  price: 100, changePercent: 2, source: 'fixture', observedAt: '2026-10-27T09:00:00Z', receivedAt: '2026-10-27T09:01:00Z',
  status: 'available', exchange: 'TEST', country: 'US', ...overrides });
const snapshot = (overrides: Partial<TvQuote> = {}): TvSnapshot => ({ group: 'global', generatedAt: '2026-10-27T09:01:00Z',
  quotes: [quote(overrides)], available: 1, total: 1 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('TV public resource lifecycle', () => {
  it.each([401, 403])('clears an offscreen-retained watchlist on HTTP %s and cannot revive it during retry', status => {
    const owned: TvSnapshot = { ...snapshot(), group: 'watchlist' };
    let visible = retainVisibleTvSnapshot(null, { data: owned, errorStatus: null });
    visible = retainVisibleTvSnapshot(visible, { data: null, errorStatus: null }); // Row leaves the viewport.
    visible = retainVisibleTvSnapshot(visible, { data: null, errorStatus: 503 }); // A transient network failure.
    expect(visible?.quotes[0]).toMatchObject({ symbol: 'TEST', observedAt: '2026-10-27T09:00:00Z' });
    // Authorization wins even if an older response is still present for this render.
    visible = retainVisibleTvSnapshot(visible, { data: owned, errorStatus: status });
    expect(visible).toBeNull();
    visible = retainVisibleTvSnapshot(visible, { data: null, errorStatus: null }); // Refresh starts; no new data yet.
    expect(visible).toBeNull();
    visible = retainVisibleTvSnapshot(visible, { data: { ...owned, quotes: [quote({ symbol: 'NEW_OWNER' })] }, errorStatus: null });
    expect(visible?.quotes.map(item => item.symbol)).toEqual(['NEW_OWNER']);
  });

  it('shares a canonical request without one offscreen consumer cancelling a visible scene', async () => {
    const cache = new TvResourceCache();
    const work = deferred<TvSnapshot>();
    let upstream: AbortSignal | undefined;
    const load = vi.fn((signal: AbortSignal) => { upstream = signal; return work.promise; });
    const offscreen = new AbortController(), visible = new AbortController();
    const first = cache.request(path, options(offscreen), load).catch(error => error);
    const second = cache.request('/api/tv/snapshot?pageSize=6&group=global', options(visible), load);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    offscreen.abort();
    expect(await first).toMatchObject({ name: 'AbortError' });
    expect(upstream?.aborted).toBe(false);
    work.resolve(snapshot());
    expect((await second).quotes[0].price).toBe(100);
    expect(cache.peek<TvSnapshot>(path)?.quotes[0].observedAt).toBe('2026-10-27T09:00:00Z');
  });

  it('aborts the upstream request when its last subscriber leaves and allows a fresh mount', async () => {
    const cache = new TvResourceCache();
    let upstream: AbortSignal | undefined;
    const load = vi.fn((signal: AbortSignal) => new Promise<TvSnapshot>((_resolve, reject) => {
      upstream = signal;
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const firstController = new AbortController(), secondController = new AbortController();
    const first = cache.request(path, options(firstController), load).catch(error => error);
    const second = cache.request(path, options(secondController), load).catch(error => error);
    await Promise.resolve();
    firstController.abort(); secondController.abort();
    expect((await first).name).toBe('AbortError'); expect((await second).name).toBe('AbortError');
    expect(upstream?.aborted).toBe(true); expect(cache.peek(path)).toBeNull();
    const next = await cache.request(path, options(), async () => snapshot({ price: 101 }));
    expect(next.quotes[0].price).toBe(101);
  });

  it('reuses fresh snapshots, forces a real refresh and retains source time through a partial failure', async () => {
    let now = 1000;
    const cache = new TvResourceCache(32, () => now);
    const load = vi.fn().mockResolvedValueOnce(snapshot()).mockResolvedValueOnce(snapshot({ price: null, status: 'unavailable' }));
    await cache.request(path, options(), load);
    now += 10_000;
    await cache.request(path, options(), load);
    expect(load).toHaveBeenCalledTimes(1);
    const retained = await cache.request<TvSnapshot>(path, { ...options(), force: true }, load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(retained.quotes[0]).toMatchObject({ price: 100, observedAt: '2026-10-27T09:00:00Z', receivedAt: '2026-10-27T09:01:00Z' });
    expect(retained.quotes[0].status).not.toBe('available');
  });

  it('evicts the least recently used snapshot instead of growing with every directory page', async () => {
    const cache = new TvResourceCache(2);
    const first = `${path}&page=0`, second = `${path}&page=1`, third = `${path}&page=2`;
    await cache.request(first, options(), async () => snapshot());
    await cache.request(second, options(), async () => snapshot());
    await cache.request(first, options(), async () => snapshot());
    await cache.request(third, options(), async () => snapshot());
    expect(cache.peek(first)).not.toBeNull(); expect(cache.peek(second)).toBeNull(); expect(cache.peek(third)).not.toBeNull();
  });

  it('retains summary quotes within their scene without filling a different scene from old data', async () => {
    const cache = new TvResourceCache();
    const overview = `${path}&scene=overview`, world = `${path}&scene=world`;
    const first: TvSnapshot = { ...snapshot(), scene: 'overview', summary: [quote({ symbol: 'SUMMARY', price: 500 })] };
    await cache.request(overview, options(), async () => first);
    const unavailable: TvSnapshot = { ...first, summary: [quote({ symbol: 'SUMMARY', price: null, status: 'unavailable' })] };
    const retained = await cache.request(overview, { ...options(), force: true }, async () => unavailable);
    expect(retained.summary?.[0]).toMatchObject({ price: 500, observedAt: '2026-10-27T09:00:00Z' });
    const separate = await cache.request(world, options(), async () => ({ ...unavailable, scene: 'world' as const }));
    expect(separate.summary?.[0].price).toBeNull();
  });

  it('isolates device credentials and never stores or coalesces private resources', async () => {
    const cache = new TvResourceCache();
    await cache.request(path, options(), async () => ({ owner: 'public' }));
    const privateLoad = vi.fn(async () => ({ owner: 'device A' }));
    const otherLoad = vi.fn(async () => ({ owner: 'device B' }));
    const [a, b] = await Promise.all([
      cache.request(path, { ...options(), token: 'test-device-a' }, privateLoad),
      cache.request(path, { ...options(), token: 'test-device-b' }, otherLoad),
    ]);
    expect(a.owner).toBe('device A'); expect(b.owner).toBe('device B');
    expect(cache.peek(path, 'test-device-a')).toBeNull(); expect(cache.peek(path)).toEqual({ owner: 'public' });
    for (const privatePath of ['/api/tv/device', '/api/tv/account', '/api/tv/snapshot?group=watchlist', '/api/tv/snapshot?group=global&scene=watchlist']) {
      const load = vi.fn(async () => ({ owner: 'private' }));
      await Promise.all([cache.request(privatePath, options(), load), cache.request(privatePath, options(), load)]);
      expect(load).toHaveBeenCalledTimes(2); expect(cache.peek(privatePath)).toBeNull();
      expect(isPublicTvSnapshot(privatePath)).toBe(false);
    }
  });

  it('keeps last good data and respects Retry-After even when refresh is pressed repeatedly', async () => {
    let now = 1000;
    const cache = new TvResourceCache(32, () => now);
    const load = vi.fn().mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new TvResourceError('RATE_LIMITED', 429, 120_000)).mockResolvedValue(snapshot({ price: 102 }));
    await cache.request(path, options(), load);
    now += 30_000;
    await expect(cache.request(path, options(), load)).rejects.toMatchObject({ status: 429 });
    expect(cache.peek<TvSnapshot>(path)?.quotes[0].price).toBe(100);
    await expect(cache.request(path, { ...options(), force: true }, load)).rejects.toMatchObject({ status: 429 });
    expect(load).toHaveBeenCalledTimes(2);
    now += 120_000;
    expect((await cache.request<TvSnapshot>(path, options(), load)).quotes[0].price).toBe(102);
    expect(tvRetryDelay(100, 30_000)).toBe(300_000);
    expect(tvRetryDelay(1, 0)).toBeGreaterThanOrEqual(5000);
  });

  it('honors provider cooldown in a successful snapshot across refresh and remount, then recovers', async () => {
    let now = Date.parse('2026-10-27T09:02:00Z');
    const cache = new TvResourceCache(32, () => now);
    const retryAt = new Date(now + 120_000).toISOString();
    const blocked: TvSnapshot = { ...snapshot({ price: null, status: 'unavailable', issue: 'rate_limited', retryAt }), retryAt };
    const load = vi.fn().mockResolvedValueOnce(snapshot()).mockResolvedValueOnce(blocked).mockResolvedValue(snapshot({ price: 102 }));
    await cache.request(path, options(), load);
    now += 30_000;
    const delayed = await cache.request<TvSnapshot>(path, options(), load);
    expect(delayed.quotes[0]).toMatchObject({ price: 100, status: 'stale', issue: 'rate_limited', retryAt, observedAt: '2026-10-27T09:00:00Z' });
    expect(delayed.retryAt).toBe(retryAt);
    now += 30_000;
    expect(await cache.request(path, { ...options(), force: true }, load)).toEqual(delayed);
    expect(await cache.request(path, options(), load)).toEqual(delayed);
    expect(load).toHaveBeenCalledTimes(2);
    now += 60_000;
    expect((await cache.request<TvSnapshot>(path, options(), load)).quotes[0].price).toBe(102);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('bounds status rechecks without treating arbitrary responses or invalid dates as provider cooldowns', () => {
    const now = Date.parse('2026-10-27T09:02:00Z');
    expect(tvSnapshotRetryDelay({ ...snapshot(), retryAt: new Date(now + 86_400_000).toISOString() }, now)).toBe(300_000);
    expect(tvSnapshotRetryDelay({ ...snapshot(), retryAt: 'invalid' }, now)).toBe(0);
    expect(tvSnapshotRetryDelay({ ...snapshot(), retryAt: new Date(now - 1).toISOString() }, now)).toBe(0);
    expect(tvSnapshotRetryDelay({ retryAt: new Date(now + 60_000).toISOString() }, now)).toBe(0);
  });

  it('does not cache a private provider cooldown or postpone the next authorization response', async () => {
    const cache = new TvResourceCache();
    const ownedPath = '/api/tv/snapshot?group=watchlist&scene=watchlist';
    const blocked: TvSnapshot = { ...snapshot({ price: null, status: 'unavailable', issue: 'rate_limited' }),
      group: 'watchlist', retryAt: new Date(Date.now() + 300_000).toISOString() };
    const load = vi.fn().mockResolvedValueOnce(blocked).mockRejectedValueOnce(new TvResourceError('UNAUTHORIZED', 401));
    await cache.request(ownedPath, { ...options(), token: 'test-device' }, load);
    await expect(cache.request(ownedPath, { ...options(), token: 'test-device' }, load)).rejects.toMatchObject({ status: 401 });
    expect(cache.peek(ownedPath, 'test-device')).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('TV bounded snapshot queue', () => {
  it('bounds active and waiting work and removes an offscreen request before it can fetch', async () => {
    const queue = createTvSnapshotQueue(1, 1);
    const active = deferred<string>();
    const first = queue(new AbortController().signal, () => active.promise);
    const offscreen = new AbortController();
    const staleLoad = vi.fn(async () => 'stale');
    const waiting = queue(offscreen.signal, staleLoad).catch(error => error);
    const overflowLoad = vi.fn(async () => 'overflow');
    await expect(queue(new AbortController().signal, overflowLoad)).rejects.toThrow('TV_QUEUE_BUSY');
    offscreen.abort(); expect((await waiting).name).toBe('AbortError');
    const nextLoad = vi.fn(async () => 'next');
    const next = queue(new AbortController().signal, nextLoad);
    active.resolve('first'); expect(await first).toBe('first'); expect(await next).toBe('next');
    expect(staleLoad).not.toHaveBeenCalled(); expect(overflowLoad).not.toHaveBeenCalled(); expect(nextLoad).toHaveBeenCalledTimes(1);
  });

  it('releases capacity after a failed request so other visible scenes still load', async () => {
    const queue = createTvSnapshotQueue(1, 1);
    const failed = queue(new AbortController().signal, async () => { throw new Error('provider failed'); }).catch(error => error);
    const visible = queue(new AbortController().signal, async () => 'visible');
    expect((await failed).message).toBe('provider failed'); expect(await visible).toBe('visible');
  });
});
