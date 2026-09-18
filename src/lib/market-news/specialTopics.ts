import type { NewsFetchParams } from './types';

export type TopicId =
  | 'federal-reserve'
  | 'healthcare-stocks'
  | 'new-stocks'
  | 'stocks-under-1'
  | 'metals-news'
  | 'earnings-news'
  | 'analyst-ratings-news'
  | 'mergers-acquisitions-news'
  | 'unusual-moves-news';

type TopicConfig = {
  query: string;
  days: number;
  sort: 'latest' | 'importance' | 'official' | 'relevance';
  params: Partial<NewsFetchParams>;
};

export type StaticTickerConfig = {
  symbol: string;
  name: string;
  assetType: 'stock' | 'etf' | 'unknown';
  currency: 'USD';
  meta?: string;
};

export type MetalTickerConfig = StaticTickerConfig & {
  id: 'gold' | 'silver' | 'copper' | 'platinum' | 'palladium';
};

export const TOPICS: Record<TopicId, TopicConfig> = {
  'federal-reserve': {
    query: '"Federal Reserve" OR FOMC OR "Jerome Powell" OR "الاحتياطي الفيدرالي"',
    days: 14,
    sort: 'official',
    params: {
      marketCodes: ['US'],
    },
  },
  'healthcare-stocks': {
    query: 'healthcare OR biotech OR pharmaceutical OR FDA OR "clinical trial" OR "الرعاية الصحية" OR "الأدوية"',
    days: 14,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
    },
  },
  'new-stocks': {
    query: 'IPO OR "initial public offering" OR "direct listing" OR "trading debut" OR "begins trading" OR اكتتاب OR إدراج',
    days: 30,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
    },
  },
  'stocks-under-1': {
    query: '"penny stock" OR "penny stocks" OR "minimum bid" OR "bid price" OR "sub-dollar" OR "under $1" OR "أقل من دولار"',
    days: 30,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
    },
  },
  'metals-news': {
    query: 'gold OR silver OR copper OR platinum OR palladium OR bullion OR الذهب OR الفضة OR النحاس OR البلاتين',
    days: 14,
    sort: 'importance',
    params: {
    },
  },
  'earnings-news': {
    query: 'earnings OR "quarterly results" OR "financial results" OR EPS OR "revenue guidance" OR "نتائج مالية" OR أرباح',
    days: 14,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
    },
  },
  'analyst-ratings-news': {
    query: '"price target" OR upgrade OR downgrade OR "initiates coverage" OR "initiated coverage" OR "السعر المستهدف" OR "توصية السهم"',
    days: 14,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
    },
  },
  'mergers-acquisitions-news': {
    query: 'merger OR acquisition OR takeover OR buyout OR acquired OR استحواذ OR اندماج',
    days: 30,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
    },
  },
  'unusual-moves-news': {
    query: 'surges OR plunges OR soars OR tumbles OR jumps OR rallies OR "unusual volume" OR "trading halt" OR "ارتفاع السهم" OR "هبوط السهم"',
    days: 14,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
    },
  },
};

