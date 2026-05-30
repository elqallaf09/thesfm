export const DEFAULT_NEWS_LIMIT = 50;
export const MAX_NEWS_LIMIT = 60;

export function parseNewsLimit(value: string | null) {
  if (!value) return DEFAULT_NEWS_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_NEWS_LIMIT;
  return Math.min(MAX_NEWS_LIMIT, Math.max(1, parsed));
}

type NewsLike = {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translationSource?: string;
  translatedTo?: string;
};

export function compactNewsItem<T extends NewsLike>(item: T) {
  return {
    id: item.id,
    title: item.title || item.headline || '',
    summary: item.summary || item.title || item.headline || '',
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    isTranslated: Boolean(item.isTranslated),
    ...(item.translationSource ? { translationSource: item.translationSource } : {}),
    ...(item.translatedTo ? { translatedTo: item.translatedTo } : {}),
  };
}
