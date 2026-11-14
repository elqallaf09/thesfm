import type { TvDisplayMode } from './types';

export const TV_DISPLAY_PATHS: Record<TvDisplayMode, string> = {
  viewing: '/tv', browse: '/tv/all-stocks', strips: '/tv/strips',
};

export function tvDisplayModeFromPath(pathname: string): TvDisplayMode | null {
  const path = pathname.replace(/\/$/, '') || '/';
  return (Object.keys(TV_DISPLAY_PATHS) as TvDisplayMode[]).find(mode => TV_DISPLAY_PATHS[mode] === path) ?? null;
}

// Keep the TV document mounted. Packaged clients retain their asset URL.
export function pushTvDisplayMode(mode: TvDisplayMode): void {
  if (typeof window === 'undefined' || !tvDisplayModeFromPath(window.location.pathname)) return;
  const url = new URL(window.location.href);
  url.pathname = TV_DISPLAY_PATHS[mode];
  url.searchParams.delete('channel');
  url.hash = '';
  if (url.href !== window.location.href) window.history.pushState(null, '', url);
}
