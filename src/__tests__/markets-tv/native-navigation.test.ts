import { describe, expect, it } from 'vitest';
import { TV_RECEIVER_CHANNELS, nextTvReceiverChannel } from '@/lib/markets-tv/receiver';
import { TV_ATLAS_CITIES } from '@/lib/markets-tv/atlas';
import { backNativeNavigation, DEFAULT_NATIVE_NAVIGATION, NATIVE_FEATURES, NATIVE_GUIDE, NATIVE_GUIDE_PAGE_SIZE, NATIVE_GUIDE_PAGES,
  nativeCanRotate, nativeDestinationText, nativeFeatureFromLink, nativeGuidePage, nativeLaunchNavigation, restoreNativePreferences,
  selectNativeDestination, selectNativeRegion, stepNativeChannel } from '../../../apps/markets-tv-native/src/nativeNavigation';

describe('native TV feature navigation', () => {
  it('keeps every numbered receiver channel in order and includes every feature in the dynamic guide', () => {
    expect(NATIVE_GUIDE.slice(0, TV_RECEIVER_CHANNELS.length)).toEqual([...TV_RECEIVER_CHANNELS]);
    expect(NATIVE_GUIDE.slice(TV_RECEIVER_CHANNELS.length)).toEqual(['brief', 'map', 'account']);
    expect(new Set(NATIVE_GUIDE).size).toBe(NATIVE_GUIDE.length);
    expect(NATIVE_GUIDE_PAGES).toBe(Math.ceil(NATIVE_GUIDE.length / NATIVE_GUIDE_PAGE_SIZE));
    for (const destination of NATIVE_GUIDE) {
      const page = nativeGuidePage(destination);
      expect(NATIVE_GUIDE.slice(page * NATIVE_GUIDE_PAGE_SIZE, (page + 1) * NATIVE_GUIDE_PAGE_SIZE)).toContain(destination);
      for (const language of ['ar', 'en', 'fr'] as const) expect(nativeDestinationText(language, destination).trim()).not.toBe('');
    }
  });
  it('restores legacy channel preferences and safely defaults malformed local values', () => {
    expect(restoreNativePreferences(JSON.stringify({ channel: 'investments', language: 'fr', light: true, rotation: false })))
      .toEqual({ navigation: { destination: 'investments', channel: 'investments' }, language: 'fr', light: true, rotation: false, wallpaper: 'original' });
    for (const raw of [null, '{', '[]', 'null', '42', '{"channel":"__proto__","destination":"https://evil.example","region":"private","language":{"toString":"fr"}}']) {
      expect(restoreNativePreferences(raw)).toEqual({ navigation: DEFAULT_NATIVE_NAVIGATION, language: 'ar', light: false, rotation: true, wallpaper: 'original' });
    }
  });
  it('persists public features and selected atlas regions without accepting arbitrary filter values', () => {
    for (const destination of NATIVE_FEATURES) {
      const chosen = selectNativeDestination({ destination: 'technology', channel: 'technology' }, destination);
      expect(restoreNativePreferences(JSON.stringify(chosen)).navigation).toEqual(chosen);
    }
    for (const city of TV_ATLAS_CITIES) {
      const chosen = selectNativeRegion(city.group);
      expect(restoreNativePreferences(JSON.stringify(chosen)).navigation).toEqual(chosen);
    }
    expect(restoreNativePreferences('{"destination":"allStocks","region":"watchlist"}').navigation).toEqual(DEFAULT_NATIVE_NAVIGATION);
    expect(restoreNativePreferences('{"destination":"account","region":"gulf"}').navigation.region).toBeUndefined();
  });
  it('keeps CH navigation on the original receiver order while leaving public features', () => {
    for (const channel of TV_RECEIVER_CHANNELS) for (const feature of NATIVE_FEATURES) for (const step of [-1, 1]) {
      const current = selectNativeDestination({ destination: channel, channel }, feature);
      const expected = nextTvReceiverChannel(channel, step);
      expect(stepNativeChannel(current, step)).toEqual({ destination: expected, channel: expected });
    }
    expect(stepNativeChannel(selectNativeRegion('europe'), 1).region).toBeUndefined();
  });
  it('returns from a selected region to its map, then home, and lets Back fall through only at home', () => {
    const regional = selectNativeRegion('asia');
    const map = backNativeNavigation(regional)!;
    expect(map).toEqual({ destination: 'map', channel: 'allStocks', region: 'asia' });
    expect(backNativeNavigation(map)).toEqual(DEFAULT_NATIVE_NAVIGATION);
    expect(backNativeNavigation(DEFAULT_NATIVE_NAVIGATION)).toBeNull();
    expect(backNativeNavigation(selectNativeDestination(DEFAULT_NATIVE_NAVIGATION, 'account'))).toEqual(DEFAULT_NATIVE_NAVIGATION);
    expect(nativeCanRotate('brief')).toBe(true);
    expect(nativeCanRotate('map')).toBe(false);
    expect(nativeCanRotate('account')).toBe(false);
  });
});

describe('native TV public feature deep links', () => {
  it('allows exactly the three public destinations, without URL components or auth actions', () => {
    for (const feature of NATIVE_FEATURES) expect(nativeFeatureFromLink(`sfm-tv-native://${feature}`)).toBe(feature);
    for (const value of [null, {}, '', 'https://www.the-sfm.com/profile', 'sfm-tv-native://pair', 'sfm-tv-native://unlink',
      'sfm-tv-native://map/', 'sfm-tv-native://map?', 'sfm-tv-native://map#', 'sfm-tv-native://map?token=secret',
      'sfm-tv-native://account#ABCDEF123456', 'sfm-tv-native://user:secret@map', 'sfm-tv-native://map:443',
      'sfm-tv-native://%6dap', 'sfm-tv-native://map\\account', ' sfm-tv-native://map', 'sfm-tv-native://map\n']) {
      expect(nativeFeatureFromLink(value)).toBeNull();
    }
  });
  it('applies launch links after restored preferences and gives a newer startup event precedence', () => {
    const saved = { destination: 'investments', channel: 'investments' } as const;
    expect(nativeLaunchNavigation(saved, 'sfm-tv-native://brief', null)).toEqual({ destination: 'brief', channel: 'investments' });
    expect(nativeLaunchNavigation(saved, 'sfm-tv-native://brief', 'account')).toEqual({ destination: 'account', channel: 'investments' });
    expect(nativeLaunchNavigation(saved, 'sfm-tv-native://account?token=private', null)).toEqual(saved);
  });
});
