import { AsyncLocalStorage } from 'node:async_hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkStore } from 'next/dist/server/app-render/work-async-storage.external';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import type { TvNewsChannel } from '@/lib/server/markets-tv/newsChannels';

const now = Date.parse('2026-11-03T09:00:00Z');
const stories: TvNews[] = [{ id: 'test', title: 'Test headline', source: 'Test source', url: 'https://example.com/news', publishedAt: '2026-11-03T08:00:00Z' }];
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubGlobal('AsyncLocalStorage', AsyncLocalStorage); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fixture() {
  const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external');
  const { cachedTvNews } = await import('@/lib/server/markets-tv/newsCache');
  const entries = new Map<string, { value: unknown; savedAt: number }>();
  const incrementalCache = {
    generateSimpleCacheKey: async (key: string) => key,
    get: async (key: string, options: { revalidate: number }) => {
      const entry = entries.get(key);
      return entry ? { value: entry.value, isStale: Date.now() - entry.savedAt > options.revalidate * 1000 } : null;
    },
    set: async (key: string, value: unknown) => { entries.set(key, { value, savedAt: Date.now() }); },
  };
  const read = async (language: TvLanguage, load: () => Promise<TvNews[]>, channel: TvNewsChannel = 'all') => {
    const store = { incrementalCache, pendingRevalidates: {} } as unknown as WorkStore;
    return workAsyncStorage.run(store, async () => {
      const result = await cachedTvNews(language, load, channel);
      await Promise.all(Object.values(store.pendingRevalidates || {}));
      return result;
    });
  };
  return { read };
}

describe('TV shared news cache', () => {
  it('isolates Kuwait, technology and general feeds in simultaneous cache misses and hits', async () => {
    const { read } = await fixture();
    const loads = ['all','kuwait','technology'].map(channel => vi.fn(async () => [{ ...stories[0], title: channel }]));
    const channels = ['all','kuwait','technology'] as const;
    const values = await Promise.all(channels.map((channel, index) => read('ar', loads[index], channel)));
    expect(values.map(value => value.stories[0].title)).toEqual([...channels]);
    for (let index = 0; index < channels.length; index++) {
      expect((await read('ar', loads[index], channels[index])).stories[0].title).toBe(channels[index]);
      expect(loads[index]).toHaveBeenCalledTimes(1);
    }
  });
  it('coalesces simultaneous cold loads, caches for 180 seconds and isolates languages', async () => {
    const { read } = await fixture();
    let resolve!: (value: TvNews[]) => void;
    const load = vi.fn(() => new Promise<TvNews[]>(done => { resolve = done; }));
    const pending = Promise.all([read('ar', load), read('ar', load), read('ar', load)]);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    resolve(stories);
    const results = await pending;
    vi.setSystemTime(now + 179_000);
    expect(await read('ar', load)).toEqual(results[0]);
    expect(load).toHaveBeenCalledTimes(1);
    const english = vi.fn().mockResolvedValue(stories);
    await read('en', english);
    expect(english).toHaveBeenCalledTimes(1);
  });
  it('retains original story and generation timestamps after failure and retries recovery', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { read } = await fixture();
    const load = vi.fn().mockResolvedValueOnce(stories).mockResolvedValueOnce([]).mockResolvedValue([{ ...stories[0], title: 'Recovered headline' }]);
    const first = await read('ar', load);
    vi.setSystemTime(now + 181_000);
    expect(await read('ar', load)).toEqual(first);
    await read('ar', load);
    expect((await read('ar', load)).stories[0].title).toBe('Recovered headline');
    expect(load).toHaveBeenCalledTimes(3);
  });
  it('does not poison the cache with an empty initial load', async () => {
    const { read } = await fixture();
    await expect(read('fr', async () => [])).rejects.toThrow('TV_NEWS_UNAVAILABLE');
    expect((await read('fr', async () => stories)).stories).toEqual(stories);
  });
});
