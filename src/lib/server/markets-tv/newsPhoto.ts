import 'server-only';
import { tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { extractMetaImage, normalizePublicImageInput, resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';

type SchemaNode = { '@type'?: unknown; '@graph'?: unknown; image?: unknown };

function imageReference(image: unknown) {
  if (typeof image === 'string') return image;
  if (!image || typeof image !== 'object') return null;
  if ('contentUrl' in image && typeof image.contentUrl === 'string') return image.contentUrl;
  return 'url' in image && typeof image.url === 'string' ? image.url : null;
}

function articleImage(value: unknown, pageUrl: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const root = value as SchemaNode;
  const nodes: SchemaNode[] = Array.isArray(value) ? value : [root, ...(Array.isArray(root['@graph']) ? root['@graph'] : [])];
  for (const node of nodes) {
    const types = [node?.['@type']].flat();
    if (!types.some(type => typeof type === 'string' && /(?:Article|BlogPosting)$/.test(type))) continue;
    for (const image of [node.image].flat()) {
      const url = imageReference(image);
      if (!url?.trim()) continue;
      try {
        const photo = tvNewsPhotoUrl(normalizePublicImageInput(new URL(url, pageUrl).href));
        if (photo) return photo;
      } catch { /* The next image may have a usable URL. */ }
    }
  }
  return null;
}

export function publisherArticleImage(html: string, pageUrl: string) {
  const scripts = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const [, json] of html.matchAll(scripts)) {
    try {
      const photo = articleImage(JSON.parse(json), pageUrl);
      if (photo) return photo;
    } catch { /* Some pages contain incomplete or non-JSON metadata. */ }
  }
  return extractMetaImage(html, pageUrl, url => Boolean(tvNewsPhotoUrl(url)));
}

export async function resolvePublisherArticlePhoto(articleUrl: string) {
  const result = await resolvePublicImageUrl(articleUrl, { selectHtmlImage: publisherArticleImage });
  return result.ok ? tvNewsPhotoUrl(result.imageUrl) : null;
}
