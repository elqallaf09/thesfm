const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i;

type ResolveImageResult =
  | { ok: true; imageUrl: string }
  | { ok: false; code: 'INVALID_URL' | 'BLOCKED_URL' | 'FETCH_FAILED' | 'NO_IMAGE_FOUND' };

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '0.0.0.0' || host.startsWith('127.') || host === '::1') return true;
  if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

export function normalizePublicImageInput(value: unknown) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || /[^\x00-\x7F]/.test(raw)) return null;

  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    if (isBlockedHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isDirectImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return IMAGE_EXTENSION_PATTERN.test(`${parsed.pathname}${parsed.search}`);
  } catch {
    return false;
  }
}

function extractMetaImage(html: string, baseUrl: string) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]*>/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const absolute = new URL(decodeHtmlAttribute(match[1]), baseUrl).toString();
      const normalized = normalizePublicImageInput(absolute);
      if (normalized) return normalized;
    } catch {
      // Try the next meta pattern.
    }
  }

  return null;
}

export async function resolvePublicImageUrl(value: unknown): Promise<ResolveImageResult> {
  const normalized = normalizePublicImageInput(value);
  if (!normalized) return { ok: false, code: 'INVALID_URL' };

  if (isDirectImageUrl(normalized)) return { ok: true, imageUrl: normalized };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(normalized, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.5',
        'User-Agent': 'THE-SFM-image-resolver/1.0',
      },
    });

    if (!response.ok) return { ok: false, code: 'FETCH_FAILED' };

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType.startsWith('image/')) {
      const finalUrl = normalizePublicImageInput(response.url) ?? normalized;
      return { ok: true, imageUrl: finalUrl };
    }

    const html = (await response.text()).slice(0, 350_000);
    const imageUrl = extractMetaImage(html, response.url || normalized);
    if (!imageUrl) return { ok: false, code: 'NO_IMAGE_FOUND' };

    return { ok: true, imageUrl };
  } catch {
    return { ok: false, code: 'FETCH_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}
