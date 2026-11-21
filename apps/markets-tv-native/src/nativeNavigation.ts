import { isTvReceiverChannel, nextTvReceiverChannel, receiverText, TV_RECEIVER_CHANNELS, type TvReceiverChannel } from '../../../src/lib/markets-tv/receiver';
import { TV_ATLAS_CITIES, type TvAtlasRegion } from '../../../src/lib/markets-tv/atlas';
import { tvText } from '../../../src/lib/markets-tv/i18n';
import type { Language } from './api';
import { featureText } from './featureCopy';

export const NATIVE_FEATURES = ['brief', 'map', 'account'] as const;
export type NativeFeature = typeof NATIVE_FEATURES[number];
export type NativeDestination = TvReceiverChannel | NativeFeature;
export type NativeNavigation = { destination: NativeDestination; channel: TvReceiverChannel; region?: TvAtlasRegion };
export const NATIVE_GUIDE = [...TV_RECEIVER_CHANNELS, ...NATIVE_FEATURES];
export const NATIVE_GUIDE_PAGE_SIZE = 5;
export const NATIVE_GUIDE_PAGES = Math.ceil(NATIVE_GUIDE.length / NATIVE_GUIDE_PAGE_SIZE);
export const DEFAULT_NATIVE_NAVIGATION: NativeNavigation = { destination: 'allStocks', channel: 'allStocks' };

export function isNativeDestination(value: unknown): value is NativeDestination {
  return isTvReceiverChannel(value) || NATIVE_FEATURES.includes(value as NativeFeature);
}
export function selectNativeDestination(current: NativeNavigation, destination: NativeDestination): NativeNavigation {
  return { destination, channel: isTvReceiverChannel(destination) ? destination : current.channel };
}
export function selectNativeRegion(region: TvAtlasRegion): NativeNavigation {
  return { destination: 'allStocks', channel: 'allStocks', region };
}
export function stepNativeChannel(current: NativeNavigation, step: number): NativeNavigation {
  return selectNativeDestination(current, nextTvReceiverChannel(current.channel, step));
}
export function backNativeNavigation(current: NativeNavigation): NativeNavigation | null {
  if (current.destination === 'allStocks' && current.region) return { ...current, destination: 'map' };
  return current.destination !== 'allStocks' ? { ...DEFAULT_NATIVE_NAVIGATION } : null;
}
export function nativeCanRotate(destination: NativeDestination) { return destination !== 'map' && destination !== 'account'; }
export function nativeGuidePage(destination: NativeDestination) { return Math.floor(NATIVE_GUIDE.indexOf(destination) / NATIVE_GUIDE_PAGE_SIZE); }
export function nativeDestinationText(language: Language, destination: NativeDestination) {
  return isTvReceiverChannel(destination) ? receiverText(language, destination)
    : destination === 'account' ? featureText(language, 'account') : tvText(language, destination);
}

/** Public screen routes only; no URL components can carry credentials or actions. */
export function nativeFeatureFromLink(value: unknown): NativeFeature | null {
  return typeof value === 'string' ? NATIVE_FEATURES.find(feature => value === `sfm-tv-native://${feature}`) ?? null : null;
}
export function nativeLaunchNavigation(saved: NativeNavigation, initialUrl: string | null, pendingFeature: NativeFeature | null): NativeNavigation {
  const feature = pendingFeature ?? nativeFeatureFromLink(initialUrl);
  return feature ? selectNativeDestination(saved, feature) : saved;
}
export function restoreNativePreferences(raw: string | null) {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed as Record<string, unknown>;
  } catch { /* Invalid local preferences fall back to the public stock directory. */ }
  const channel = isTvReceiverChannel(value.channel) ? value.channel : 'allStocks';
  const destination = isNativeDestination(value.destination) ? value.destination : channel;
  const region = (destination === 'allStocks' || destination === 'map')
    ? TV_ATLAS_CITIES.find(city => city.group === value.region)?.group : undefined;
  const navigation: NativeNavigation = { destination, channel: isTvReceiverChannel(destination) ? destination : channel, ...(region ? { region } : {}) };
  return {
    language: value.language === 'ar' || value.language === 'en' || value.language === 'fr' ? value.language : 'ar' as Language,
    light: value.light === true, rotation: value.rotation !== false, navigation,
  };
}
