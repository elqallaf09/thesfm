import { safeTvUrl } from './safeUrl';

export function tvNewsPhotoUrl(value: unknown): string | null {
  const href = typeof value === 'string' && safeTvUrl(value);
  if (!href) return null;
  const { hostname, pathname } = new URL(href);
  // These are publisher identity images distributed as article photos in both RSS and Finnhub.
  if (hostname === 's.yimg.com' && /^\/rz\/.*\/yahoo[_-]finance[^/]*\.(png|svg|webp)$/i.test(pathname)) return null;
  if (/^(?:static\d*\.)?finnhub\.io$/.test(hostname) && pathname.startsWith('/file/finnhub/logo/')) return null;
  return href;
}

export function tvNewsPhotoPath(id: string) {
  return /^story-[0-9a-f]{24}$/.test(id) ? `/api/tv/news/photo/${id}` : null;
}
