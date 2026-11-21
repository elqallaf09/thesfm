import type { TvDisplayMode } from './types';
import type { TvReceiverChannel } from './receiver';

export const TV_DISPLAY_PATHS: Record<TvDisplayMode, string> = {
  viewing: '/tv', browse: '/tv/all-stocks', strips: '/tv/strips',
};
export type TvFeatureView = 'brief' | 'map';
export const tvFeatureDisplayMode = (feature: TvFeatureView): TvDisplayMode => feature === 'map' ? 'browse' : 'viewing';

export function tvDisplayModeFromPath(pathname: string): TvDisplayMode | null {
  const path = pathname.replace(/\/$/, '') || '/';
  return (Object.keys(TV_DISPLAY_PATHS) as TvDisplayMode[]).find(mode => TV_DISPLAY_PATHS[mode] === path) ?? null;
}

/** Features keep their display route, with an identity that survives reloads. */
export function tvFeatureFromLocation(location: { pathname: string; search: string }): TvFeatureView | null {
  const feature = new URLSearchParams(location.search).get('view');
  if (feature !== 'brief' && feature !== 'map') return null;
  const mode = tvDisplayModeFromPath(location.pathname);
  return mode && mode !== tvFeatureDisplayMode(feature) ? null : feature;
}

export function pushTvFeature(feature: TvFeatureView): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const website = Boolean(tvDisplayModeFromPath(url.pathname));
  if (website) { url.pathname = TV_DISPLAY_PATHS[tvFeatureDisplayMode(feature)]; url.hash = ''; }
  url.searchParams.delete('channel');
  url.searchParams.set('view', feature);
  if (url.href !== window.location.href) {
    if (website) window.history.pushState(null, '', url);
    else window.history.replaceState(window.history.state, '', url);
  }
}

// Keep the TV document mounted. Packaged clients retain their asset path.
export function pushTvDisplayMode(mode: TvDisplayMode): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const website = Boolean(tvDisplayModeFromPath(url.pathname));
  if (!website && !url.searchParams.has('channel') && !url.searchParams.has('view')) return;
  if (website) { url.pathname = TV_DISPLAY_PATHS[mode]; url.hash = ''; }
  url.searchParams.delete('channel');
  url.searchParams.delete('view');
  if (url.href !== window.location.href) {
    if (website) window.history.pushState(null, '', url);
    else window.history.replaceState(window.history.state, '', url);
  }
}

// A broadcast is its own history entry, including when selected from /tv.
// Refresh an existing packaged deep link so it cannot override the new selection.
export function pushTvBroadcastChannel(channel: TvReceiverChannel): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const website = Boolean(tvDisplayModeFromPath(url.pathname));
  if (!website && !url.searchParams.has('channel') && !url.searchParams.has('view')) return;
  if (website) { url.pathname = TV_DISPLAY_PATHS.viewing; url.hash = ''; }
  url.searchParams.set('channel', channel);
  url.searchParams.delete('view');
  if (url.href !== window.location.href) {
    if (website) window.history.pushState(null, '', url);
    else window.history.replaceState(window.history.state, '', url);
  }
}
