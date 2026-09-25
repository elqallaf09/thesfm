export type DedupeNewsItem = {
  id?: string | null;
  source?: string | null;
  url?: string | null;
  title?: string | null;
  headline?: string | null;
  titleOriginal?: string | null;
};

export function safeExternalNewsUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

// Canonical form of a safety-validated article URL for deduplication: no
// fragment, sorted query params, no trailing slash. Returns '' (not null)
// for an unsafe/malformed URL so callers can use it directly in a
// `.filter(Boolean)` dedup-key list.
export function canonicalExternalNewsUrl(url: string | null | undefined): string {
  const safeUrl = safeExternalNewsUrl(url);
  if (!safeUrl) return '';

  try {
    const parsed = new URL(safeUrl);
    parsed.hash = '';
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function normalizeNewsTitle(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Legacy aggregation IDs can collide across distinct stories. Use the article
// URL for rendering and translation joins, matching the deduplication identity.
export function newsArticleKey(item: DedupeNewsItem): string {
  const url = canonicalExternalNewsUrl(item.url);
  return url ? `url:${url}` : item.id ? `id:${item.id}`
    : `${item.source ?? ''}:${normalizeNewsTitle(item.titleOriginal || item.title || item.headline)}`;
}

export function dedupeNewsItems<T extends DedupeNewsItem>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const url = canonicalExternalNewsUrl(item.url);
    const title = normalizeNewsTitle(item.titleOriginal || item.title || item.headline);
    const key = newsArticleKey(item);

    if (!url && !title) continue;
    if (seen.has(key) || seen.has(`title:${title}`)) continue;

    seen.add(key);
    if (title) seen.add(`title:${title}`);
    result.push(item);
  }

  return result;
}
