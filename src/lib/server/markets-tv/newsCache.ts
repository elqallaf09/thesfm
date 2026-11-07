import 'server-only';
import { unstable_cache } from 'next/cache';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import type { TvNewsChannel } from './newsChannels';

type NewsSnapshot = { stories: TvNews[]; generatedAt: string };
const pending = new Map<string, Promise<NewsSnapshot>>();

/** Next's shared data cache amortizes provider work across TV clients/instances.
 * In-flight coalescing additionally bounds simultaneous misses in one process.
 * Failed refreshes must not replace a successful snapshot with an empty list.
 */
export function cachedTvNews(language: TvLanguage, load: () => Promise<TvNews[]>, channel: TvNewsChannel = 'all') {
  const key = `${language}:${channel}`;
  const read = unstable_cache(async () => {
    const existing = pending.get(key);
    if (existing) return existing;
    const request = Promise.resolve().then(async () => {
      const stories = await load();
      if (!stories.length) throw new Error('TV_NEWS_UNAVAILABLE');
      return { stories, generatedAt: new Date().toISOString() };
    });
    pending.set(key, request);
    try { return await request; } finally { if (pending.get(key) === request) pending.delete(key); }
  }, ['tv-news-channels-v3', language, channel], { revalidate: 180 });
  return read();
}
