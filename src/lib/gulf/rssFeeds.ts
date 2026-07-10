import type { GulfMarketId } from '@/lib/gulf/gulfMarkets';

export type GulfRssFeed = {
  market: GulfMarketId;
  source: string;
  url: string;
};

// The former Mubasher feeds were HTTP-only and represented one publisher
// network for every Gulf market. They are intentionally disabled. The shared
// market-news registry now supplies HTTPS search, market-data, licensed, and
// administrator-configured official exchange feeds.
export const GULF_RSS_FEEDS: GulfRssFeed[] = [];
