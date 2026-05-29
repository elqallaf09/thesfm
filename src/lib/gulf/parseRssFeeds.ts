import { GULF_RSS_FEEDS, type GulfRssFeed } from '@/lib/gulf/rssFeeds';
import type { GulfMarketId } from '@/lib/gulf/gulfMarkets';

export type GulfNewsItem = {
  id: string;
  market: GulfMarketId;
  headline: string;
  summary: string;
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  title: string;
  translatedTo?: string;
  isTranslated?: boolean;
  translationSource?: string;
  source: string;
  publishedAt: string;
  url: string;
};

type ParsedFeedResult = {
  items: GulfNewsItem[];
  failedFeeds: Array<{ source: string; url: string; reason: string }>;
};

function decodeEntity(entity: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    quot: '"',
    lt: '<',
    gt: '>',
    nbsp: ' ',
  };
  if (entity in named) return named[entity];
  if (entity.startsWith('#x')) {
    const code = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  return `&${entity};`;
}

function cleanText(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-zA-Z0-9#]+);/g, (_, entity: string) => decodeEntity(entity))
    .replace(/&([a-zA-Z0-9#]+);/g, (_, entity: string) => decodeEntity(entity))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tagName: string) {
  const escaped = tagName.replace(':', '\\:');
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return cleanText(match?.[1] ?? '');
}

function extractLink(block: string) {
  const link = extractTag(block, 'link');
  if (link) return link;
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return cleanText(atomLink?.[1] ?? '');
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function excerpt(value: string, fallback: string) {
  const text = cleanText(value || fallback);
  if (text.length <= 190) return text;
  return `${text.slice(0, 187).trim()}...`;
}

function itemId(feed: GulfRssFeed, title: string, link: string) {
  return `${feed.market}-${feed.source}-${link || title}`.toLowerCase().replace(/\s+/g, '-');
}

function parseItems(feed: GulfRssFeed, xml: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks
    .map(block => {
      const headline = extractTag(block, 'title');
      const url = extractLink(block);
      if (!headline || !url) return null;
      const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded');
      const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
      return {
        id: itemId(feed, headline, url),
        market: feed.market,
        headline,
        summary: excerpt(description, headline),
        titleOriginal: headline,
        summaryOriginal: excerpt(description, headline),
        languageOriginal: 'unknown',
        title: headline,
        source: feed.source,
        publishedAt: safeDate(published),
        url,
      } satisfies GulfNewsItem;
    })
    .filter((item): item is GulfNewsItem => Boolean(item));
}

async function fetchFeed(feed: GulfRssFeed) {
  const response = await fetch(feed.url, {
    next: { revalidate: 300 },
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

export async function parseGulfRssFeeds(feeds = GULF_RSS_FEEDS): Promise<ParsedFeedResult> {
  const settled = await Promise.allSettled(
    feeds.map(async feed => ({
      feed,
      items: parseItems(feed, await fetchFeed(feed)),
    })),
  );

  const failedFeeds: ParsedFeedResult['failedFeeds'] = [];
  const seen = new Map<string, GulfNewsItem>();

  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      const feed = feeds[index];
      failedFeeds.push({
        source: feed.source,
        url: feed.url,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      return;
    }

    result.value.items.forEach(item => {
      const key = (item.url || item.headline).toLowerCase();
      if (!seen.has(key)) seen.set(key, item);
    });
  });

  const items = Array.from(seen.values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 120);

  return { items, failedFeeds };
}
