import { isMetalsMarketNews, matchesMetalSearch, normalizeNewsSearch } from './metalsNews';

type SearchableNews = {
  title?: string | null;
  headline?: string | null;
  summary?: string | null;
  titleOriginal?: string | null;
  summaryOriginal?: string | null;
  source?: string | null;
  sourceName?: string | null;
  ticker?: string | null;
  symbols?: string[];
  companyNames?: string[];
  sectors?: string[];
};

export function filterSpecialNews<T extends SearchableNews>(items: T[], query: string, topic: string): T[] {
  const normalized = normalizeNewsSearch(query);
  return items.filter(item => {
    if (topic === 'metals-news' && !isMetalsMarketNews(item)) return false;
    if (!normalized) return true;
    if (topic === 'metals-news') {
      const metalMatch = matchesMetalSearch(item, normalized);
      if (metalMatch !== null) return metalMatch;
    }
    return [item.title, item.headline, item.summary, item.titleOriginal, item.summaryOriginal,
      item.source, item.sourceName, item.ticker, ...(item.symbols ?? []),
      ...(item.companyNames ?? []), ...(item.sectors ?? []),
    ].some(value => normalizeNewsSearch(String(value ?? '')).includes(normalized));
  });
}
