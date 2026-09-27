import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

export type GulfDailyMarketBrief = {
  marketAvailable: boolean;
  indexValue: number | null;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat' | 'unavailable';
  source: string | null;
  updatedAt: string | null;
  recentStoryCount: number;
  officialStoryCount: number;
  latestStory: Pick<GulfNewsItem, 'title' | 'headline' | 'url' | 'publishedAt'> | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Produces a factual daily brief from the delayed index and published market
 * stories. It deliberately does not infer a trading recommendation.
 */
export function buildGulfDailyMarketBrief(
  marketData: GulfMarketData | undefined,
  stories: GulfNewsItem[],
  now = Date.now(),
): GulfDailyMarketBrief {
  const recentStories = stories.filter(story => {
    const publishedAt = timestamp(story.publishedAt);
    return publishedAt !== null && publishedAt <= now && now - publishedAt <= DAY_MS;
  });
  const latestStory = recentStories
    .slice()
    .sort((left, right) => (timestamp(right.publishedAt) ?? 0) - (timestamp(left.publishedAt) ?? 0))[0] ?? null;
  const changePercent = marketData?.changePercent ?? null;
  const direction = marketData?.available !== true || changePercent === null
    ? 'unavailable'
    : changePercent > 0
      ? 'up'
      : changePercent < 0
        ? 'down'
        : 'flat';

  return {
    marketAvailable: marketData?.available === true && marketData.value !== null,
    indexValue: marketData?.value ?? null,
    changePercent,
    direction,
    source: marketData?.sourceLabel ?? marketData?.source ?? null,
    updatedAt: marketData?.updatedAt ?? null,
    recentStoryCount: recentStories.length,
    officialStoryCount: recentStories.filter(story => story.isOfficial === true || story.verificationStatus === 'official').length,
    latestStory: latestStory
      ? { title: latestStory.title, headline: latestStory.headline, url: latestStory.url, publishedAt: latestStory.publishedAt }
      : null,
  };
}
