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

export function normalizeNewsTitle(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function dedupeNewsItems<T extends DedupeNewsItem>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const url = safeExternalNewsUrl(item.url);
    const title = normalizeNewsTitle(item.titleOriginal || item.title || item.headline);
    const key = url ? `url:${url}` : item.id ? `id:${item.id}` : `${item.source ?? ''}:${title}`;

    if (!url && !title) continue;
    if (seen.has(key) || seen.has(`title:${title}`)) continue;

    seen.add(key);
    if (title) seen.add(`title:${title}`);
    result.push(item);
  }

  return result;
}
