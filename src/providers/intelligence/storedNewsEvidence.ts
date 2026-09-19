import { searchStoredNews } from '@/lib/market-news/persistence';
import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
import type { IntelligenceContextEvidence } from './contextEvidence';

/** Reuse the site's ingested news without fanning out to every publisher per analysis. */
export async function loadStoredNewsEvidence(asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['news'] | null> {
  const now = Date.now();
  const response = await searchStoredNews({ symbols: [asset.providerSymbol], from: new Date(now - 7 * 86_400_000).toISOString(), to: new Date(now).toISOString(), limit: 24, sort: 'latest' });
  if (!response.available) return null;
  const seen = new Set<string>();
  const articles = response.stories.filter(story => {
    const at = Date.parse(story.publishedAt);
    const url = story.canonicalUrl || story.originalUrl;
    if (!story.symbols.includes(asset.providerSymbol) || !story.title || !story.sourceName || !Number.isFinite(at) || at > now || now - at > 7 * 86_400_000) return false;
    try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false; } catch { return false; }
    if (seen.has(url)) return false;
    seen.add(url); return true;
  }).slice(0, 12).map(story => ({ headline: story.title, source: story.sourceName, sourceUrl: story.canonicalUrl || story.originalUrl, publishedAt: story.publishedAt,
    // Stored classifications can be rule-based. Do not promote them to provider sentiment.
    sentiment: null, sentimentSource: null }));
  return articles.length ? { provider: 'sfm-news', observedAt: articles[0].publishedAt, articles, stale: false, failureCode: null } : null;
}
