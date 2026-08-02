import type { TechNewsItem } from '@/lib/market/fetchTechNews';

// The upstream pipeline (src/lib/market/fetchTechNews.ts) assigns this literal
// ticker when a story could not be matched to a tracked symbol. It must never
// be displayed as a real ticker or used to render a price block -- callers
// should treat it identically to "no ticker".
export const UNRESOLVED_TICKER = 'TECH';

export function isResolvedTicker(ticker: string | null | undefined): boolean {
  const value = String(ticker ?? '').trim().toUpperCase();
  return Boolean(value) && value !== UNRESOLVED_TICKER;
}

export type TechNewsDashboardCategory =
  | 'all'
  | 'ai'
  | 'semiconductors'
  | 'cloud'
  | 'software'
  | 'cybersecurity'
  | 'hardware'
  | 'ev'
  | 'techCrypto'
  | 'breaking';

export type TechNewsImpactFilter = 'all' | 'high' | 'medium' | 'low';
export type TechNewsTimeFilter = 'today' | 'week' | 'month' | 'all';
export type TechNewsSort = 'recent' | 'oldest' | 'impact' | 'market' | 'company' | 'source';

export const CATEGORY_ORDER: TechNewsDashboardCategory[] = [
  'all',
  'ai',
  'semiconductors',
  'cloud',
  'software',
  'cybersecurity',
  'hardware',
  'ev',
  'techCrypto',
  'breaking',
];

const CATEGORY_SEARCH_TERMS: Record<TechNewsDashboardCategory, string[]> = {
  all: [],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'openai', 'anthropic', 'copilot', 'gemini', 'data center ai'],
  semiconductors: ['semiconductor', 'semiconductors', 'chip', 'chips', 'gpu', 'cpu', 'nvidia', 'amd', 'intel', 'broadcom', 'tsmc', 'qualcomm', 'micron', 'asml'],
  cloud: ['cloud', 'cloud computing', 'aws', 'azure', 'google cloud', 'oracle cloud', 'data center'],
  software: ['software', 'saas', 'microsoft', 'salesforce', 'oracle', 'adobe', 'servicenow', 'palantir', 'datadog', 'snowflake'],
  cybersecurity: ['cybersecurity', 'cyber security', 'crowdstrike', 'palo alto', 'fortinet', 'zscaler', 'ransomware', 'breach'],
  hardware: ['devices', 'hardware', 'iphone', 'mac', 'pc', 'smartphones', 'apple', 'dell', 'hp'],
  ev: ['electric vehicle', 'ev', 'tesla', 'rivian', 'lucid', 'autonomous driving', 'battery'],
  techCrypto: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'stablecoin', 'coinbase', 'mining'],
  breaking: ['breaking', 'urgent', 'alert', 'just in', 'beats estimates', 'misses estimates', 'guidance', 'lawsuit', 'acquisition', 'merger', 'sec probe', 'stock jumps', 'stock falls', 'shares jump', 'shares fall'],
};

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an|to|for|and|or|of|in|on|with|as|by|from)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'guccounter'].forEach(param => url.searchParams.delete(param));
    return `${url.origin}${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function dedupeNewsItems(items: TechNewsItem[]): TechNewsItem[] {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter(item => {
    const urlKey = item.url ? `url:${normalizeUrl(item.url)}` : '';
    const idKey = item.id ? `id:${item.id.toLowerCase()}` : '';
    const titleKey = normalizeTitle(item.titleOriginal || item.headline || item.title);
    const primaryKey = urlKey || idKey || `title:${titleKey}`;
    if (!primaryKey || seen.has(primaryKey) || (titleKey && seenTitles.has(titleKey))) return false;
    seen.add(primaryKey);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
}

function itemSearchText(item: TechNewsItem): string {
  return [
    item.companyName,
    item.ticker,
    item.source,
    item.sector,
    ...(item.sectors ?? []),
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
  ].join(' ').toLowerCase();
}

function hasKeyword(item: TechNewsItem, keywords: string[]): boolean {
  const haystack = itemSearchText(item);
  return keywords.some(keyword => haystack.includes(keyword.toLowerCase()));
}

export function itemMatchesSearch(item: TechNewsItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

export function canonicalSourceLabel(source: string): string {
  const raw = String(source ?? '').trim();
  const normalized = raw.toLowerCase().replace(/[\s._-]+/g, '');
  if (!raw) return '';
  if (normalized.includes('yahoo')) return 'Yahoo';
  if (normalized.includes('finnhub')) return 'Finnhub';
  if (normalized.includes('benzinga')) return 'Benzinga';
  if (normalized.includes('cnbc')) return 'CNBC';
  if (normalized.includes('seekingalpha')) return 'SeekingAlpha';
  return raw;
}

export function sourceMatches(item: TechNewsItem, source: string): boolean {
  if (source === 'all') return true;
  return canonicalSourceLabel(item.source) === source;
}

export function timeMatches(item: TechNewsItem, filter: TechNewsTimeFilter): boolean {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffHours = (Date.now() - date.getTime()) / 3600000;
  if (filter === 'today') return diffHours <= 24;
  if (filter === 'week') return diffHours <= 24 * 7;
  return diffHours <= 24 * 30;
}

export function impactScore(item: TechNewsItem): number {
  const changeImpact = Math.abs(Number(item.changePercent ?? 0));
  const tickerBonus = isResolvedTicker(item.ticker) ? 0.35 : 0;
  const translatedBonus = item.isTranslated ? 0.1 : 0;
  return changeImpact + tickerBonus + translatedBonus;
}

export function impactLevel(item: TechNewsItem): TechNewsImpactFilter {
  const score = impactScore(item);
  if (score >= 3 || hasKeyword(item, ['earnings', 'guidance', 'acquisition', 'merger', 'lawsuit', 'sec probe', 'stock jumps', 'stock falls', 'shares jump', 'shares fall'])) {
    return 'high';
  }
  if (score >= 1 || hasKeyword(item, ['launch', 'partnership', 'deal', 'contract', 'upgrade', 'downgrade', 'analyst', 'forecast'])) {
    return 'medium';
  }
  return 'low';
}

export function impactMatches(item: TechNewsItem, filter: TechNewsImpactFilter): boolean {
  return filter === 'all' || impactLevel(item) === filter;
}

export function categoryMatches(item: TechNewsItem, category: TechNewsDashboardCategory): boolean {
  if (category === 'all') return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])]);

  if (category === 'ai') return sectors.has('ai') || hasKeyword(item, CATEGORY_SEARCH_TERMS.ai);
  if (category === 'semiconductors') return sectors.has('semiconductors') || hasKeyword(item, CATEGORY_SEARCH_TERMS.semiconductors);
  if (category === 'cloud') return sectors.has('cloud') || hasKeyword(item, CATEGORY_SEARCH_TERMS.cloud);
  if (category === 'software') return sectors.has('software') || hasKeyword(item, CATEGORY_SEARCH_TERMS.software);
  if (category === 'cybersecurity') return sectors.has('cybersecurity') || hasKeyword(item, CATEGORY_SEARCH_TERMS.cybersecurity);
  if (category === 'hardware') return sectors.has('hardware') || hasKeyword(item, CATEGORY_SEARCH_TERMS.hardware);
  if (category === 'ev') return sectors.has('ev') || hasKeyword(item, CATEGORY_SEARCH_TERMS.ev);
  if (category === 'techCrypto') return hasKeyword(item, CATEGORY_SEARCH_TERMS.techCrypto);
  if (category === 'breaking') return hasKeyword(item, CATEGORY_SEARCH_TERMS.breaking) || (timeMatches(item, 'today') && impactLevel(item) === 'high');

  return false;
}

export function marketConnectionScore(item: TechNewsItem): number {
  const tickerBonus = isResolvedTicker(item.ticker) ? 12 : 0;
  const priceBonus = Math.min(Math.abs(Number(item.changePercent ?? 0)), 8);
  const marketTermsBonus = hasKeyword(item, ['stock', 'shares', 'earnings', 'revenue', 'profit', 'guidance', 'nasdaq', 'downgrade', 'upgrade', 'analyst', 'market']) ? 8 : 0;
  const sectorBonus = item.sectors?.length ? Math.min(item.sectors.length, 4) : 0;
  return tickerBonus + priceBonus + marketTermsBonus + sectorBonus + new Date(item.publishedAt).getTime() / 100000000000;
}

export type MentionedTicker = {
  ticker: string;
  companyName: string;
  count: number;
};

export function computeMentionedTickers(items: TechNewsItem[], limit = 6): MentionedTicker[] {
  const counts = new Map<string, MentionedTicker>();
  items.forEach(item => {
    const ticker = String(item.ticker ?? '').trim().toUpperCase();
    if (!isResolvedTicker(ticker)) return;
    const companyName = item.companyName && item.companyName !== 'Technology market' ? item.companyName : ticker;
    const current = counts.get(ticker);
    counts.set(ticker, {
      ticker,
      companyName: current?.companyName && current.companyName !== ticker ? current.companyName : companyName,
      count: (current?.count ?? 0) + 1,
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

export type SourceCount = [source: string, count: number];

export function computeSourceCounts(items: TechNewsItem[], limit = 6): SourceCount[] {
  const counts = new Map<string, number>();
  items.forEach(item => {
    if (!item.source) return;
    counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export type TechNewsSortComparator = (a: TechNewsItem, b: TechNewsItem, locale: string) => number;

export function sortNewsItems(items: TechNewsItem[], sort: TechNewsSort, locale: string): TechNewsItem[] {
  return [...items].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    if (sort === 'impact') {
      const impactDiff = impactScore(b) - impactScore(a);
      if (impactDiff !== 0) return impactDiff;
    }
    if (sort === 'market') {
      const marketDiff = marketConnectionScore(b) - marketConnectionScore(a);
      if (marketDiff !== 0) return marketDiff;
    }
    if (sort === 'company') {
      const companyDiff = a.companyName.localeCompare(b.companyName, locale);
      if (companyDiff !== 0) return companyDiff;
      return a.ticker.localeCompare(b.ticker, 'en-US');
    }
    if (sort === 'source') {
      const sourceDiff = canonicalSourceLabel(a.source).localeCompare(canonicalSourceLabel(b.source), locale);
      if (sourceDiff !== 0) return sourceDiff;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export type EvidenceKind = 'official' | 'confirmed' | 'single_source' | 'conflicting' | 'unverified';

export type EvidenceState = {
  kind: EvidenceKind;
  independentCount: number;
};

export function resolveEvidenceState(item: Pick<TechNewsItem, 'verificationStatus' | 'isOfficial' | 'independentSourceCount'>): EvidenceState {
  const independentCount = Math.max(1, item.independentSourceCount || 0);
  const isConflicting = item.verificationStatus === 'conflicting';
  const isOfficial = item.isOfficial || item.verificationStatus === 'official';
  const kind: EvidenceKind = isConflicting
    ? 'conflicting'
    : isOfficial
      ? 'official'
      : item.verificationStatus === 'confirmed'
        ? 'confirmed'
        : item.verificationStatus === 'single_source'
          ? 'single_source'
          : 'unverified';
  return { kind, independentCount };
}
