import type { GulfMarketId } from '@/lib/gulf/gulfMarkets';

export type GulfRssFeed = {
  market: GulfMarketId;
  source: string;
  url: string;
};

// Free public RSS endpoints. Feeds are fetched server-side and skipped gracefully
// when a publisher blocks or temporarily fails the request.
export const GULF_RSS_FEEDS: GulfRssFeed[] = [
  { market: 'kuwait', source: 'Mubasher Kuwait', url: 'http://feeds.mubasher.info/ar/KSE/news' },
  { market: 'saudi', source: 'Mubasher Saudi Arabia', url: 'http://feeds.mubasher.info/ar/TDWL/news' },
  { market: 'oman', source: 'Mubasher Oman', url: 'http://feeds.mubasher.info/ar/MSM/news' },
  { market: 'bahrain', source: 'Mubasher Bahrain', url: 'http://feeds.mubasher.info/ar/BB/news' },
  { market: 'uae', source: 'Mubasher Dubai Financial Market', url: 'http://feeds.mubasher.info/ar/DFM/news' },
  { market: 'uae', source: 'Mubasher Abu Dhabi Securities Exchange', url: 'http://feeds.mubasher.info/ar/ADX/news' },
  { market: 'qatar', source: 'Mubasher Qatar', url: 'http://feeds.mubasher.info/ar/QE/news' },
];
