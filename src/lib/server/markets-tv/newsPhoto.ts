import 'server-only';
import { tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { extractMetaImage, normalizePublicImageInput, resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';

type Article = { '@id'?: string; url?: string; mainEntityOfPage?: unknown; image?: unknown };

function references(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function articleNodes(value: unknown): Article[] {
  return references(value).flatMap(root => {
    if (!root || typeof root !== 'object') return [];
    return [root, ...('@graph' in root ? references(root['@graph']) : [])].filter((node): node is Article =>
      Boolean(node && typeof node === 'object' && '@type' in node
        && references(node['@type']).some(type => typeof type === 'string' && /(?:Article|BlogPosting)$/.test(type))));
  });
}

function metadataUrl(value: unknown, base: string) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { return new URL(value, base); } catch { return null; }
}

function identifiesPage(article: Article, pageUrl: string) {
  const page = new URL(pageUrl);
  const main = article.mainEntityOfPage;
  const identity = main && typeof main === 'object' && '@id' in main ? main['@id'] : main;
  return [article.url, article['@id'], identity].some(value => {
    const url = metadataUrl(value, pageUrl);
    return url?.origin === page.origin && url.pathname.replace(/\/$/, '') === page.pathname.replace(/\/$/, '');
  });
}

function articleImage(article: Article, pageUrl: string) {
  for (const image of references(article.image)) {
    const values = image && typeof image === 'object'
      ? ['contentUrl' in image && image.contentUrl, 'url' in image && image.url] : [image];
    for (const value of values) {
      const url = metadataUrl(value, pageUrl);
      const photo = url && tvNewsPhotoUrl(normalizePublicImageInput(url.href));
      if (photo) return photo;
    }
  }
  return null;
}

export function publisherArticleImage(html: string, pageUrl: string) {
  const articles: Article[] = [];
  const scripts = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const [, json] of html.matchAll(scripts)) {
    try { articles.push(...articleNodes(JSON.parse(json))); } catch { /* Ignore incomplete metadata. */ }
  }
  // Graphs sometimes also describe recommended stories. Only the main story may supply the photo.
  const article = articles.find(node => identifiesPage(node, pageUrl)) ?? (articles.length === 1 ? articles[0] : undefined);
  const photo = article && articleImage(article, pageUrl);
  if (photo) return photo;
  // An unresolved Google News RSS wrapper advertises the aggregator's social artwork.
  if (new URL(pageUrl).hostname === 'news.google.com') return null;
  return extractMetaImage(html, pageUrl, url => Boolean(tvNewsPhotoUrl(url)));
}

export async function resolvePublisherArticlePhoto(articleUrl: string) {
  const result = await resolvePublicImageUrl(articleUrl, { selectHtmlImage: publisherArticleImage });
  return result.ok ? tvNewsPhotoUrl(result.imageUrl) : null;
}
