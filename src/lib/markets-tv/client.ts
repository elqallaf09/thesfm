/** Packaged clients have a fixed build-time origin. It is never read from a URL. */
export function tvOrigin(): string {
  if (typeof window === 'undefined') return 'https://www.the-sfm.com';
  const configured = (window as Window & { SFM_TV_ORIGIN?: string }).SFM_TV_ORIGIN;
  if (configured) { const url = new URL(configured); if (url.protocol !== 'https:') throw new Error('INVALID_TV_ORIGIN'); return url.origin; }
  return window.location.origin;
}
export function tvFetch(path: string, init?: RequestInit) {
  const origin = tvOrigin();
  return fetch(`${origin}${path}`, { ...init, credentials: origin === window.location.origin ? 'same-origin' : 'omit' });
}
