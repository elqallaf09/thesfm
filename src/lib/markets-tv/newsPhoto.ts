import { safeTvUrl } from './safeUrl';

function yahooPublisherLogo(path: string) {
  // Yahoo's image resizer can wrap an encoded source URL, including its own generic artwork.
  try { path = decodeURIComponent(path); } catch { /* Some original CDN paths contain a literal percent sign. */ }
  return /\/rz\/.*\/yahoo[_-]finance[^/]*\.(?:png|svg|webp)(?:$|\?)/i.test(path)
    || /\/social\/images\/yahoo_default_logo[-_.]/i.test(path);
}

export function tvNewsPhotoUrl(value: unknown): string | null {
  const href = typeof value === 'string' && safeTvUrl(value);
  if (!href) return null;
  const { hostname, pathname } = new URL(href);
  if (hostname === 's.yimg.com' && yahooPublisherLogo(pathname)) return null;
  if (/^(?:static\d*\.)?finnhub\.io$/.test(hostname) && pathname.startsWith('/file/finnhub/logo/')) return null;
  if (hostname === 'cdn.trefis.com' && pathname.startsWith('/env/prd/logos/')) return null;
  if (/^(?:www\.)?247wallst\.com$/.test(hostname) && /\/247logo(?:[-_.]|$)/i.test(pathname)) return null;
  return href;
}

export function tvNewsPhotoPath(id: string) {
  return /^story-[0-9a-f]{24}$/.test(id) ? `/api/tv/news/photo/${id}` : null;
}
