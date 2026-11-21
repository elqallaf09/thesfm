import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { wallpaperIds } from '@/lib/markets-tv/wallpapers';
import { backNativeDialog, nativeFeatureFromLink, restoreNativePreferences, selectNativeRegion } from '../../../apps/markets-tv-native/src/nativeNavigation';

describe('native TV wallpaper preferences', () => {
  it('restores every shared wallpaper while retaining the selected market, theme and language', () => {
    const navigation = selectNativeRegion('europe');
    for (const wallpaper of wallpaperIds) {
      const saved = { ...navigation, wallpaper, language: 'fr', light: true, rotation: false };
      expect(restoreNativePreferences(JSON.stringify(saved)))
        .toEqual({ navigation, wallpaper, language: 'fr', light: true, rotation: false });
    }
  });

  it('uses the original for legacy, corrupt and unrecognized wallpaper preferences', () => {
    for (const wallpaper of [undefined, null, false, 0, {}, ['dunes'], 'obsolete', '__proto__', 'constructor', 'https://evil.example/photo.png', '../other.png']) {
      expect(restoreNativePreferences(JSON.stringify({ channel: 'technology', wallpaper })))
        .toMatchObject({ wallpaper: 'original', navigation: { destination: 'technology', channel: 'technology' } });
    }
    for (const raw of [null, '{', '[]', 'null', '42']) expect(restoreNativePreferences(raw).wallpaper).toBe('original');
  });

  it('returns Back from the gallery to the guide and then closes the guide before channel navigation', () => {
    expect(backNativeDialog('wallpapers')).toBe('guide');
    expect(backNativeDialog(backNativeDialog('wallpapers'))).toBeNull();
    expect(backNativeDialog('pair')).toBeNull();
    expect(backNativeDialog(null)).toBeNull();
    // A modal is not a saved destination or a new externally addressable action.
    expect(restoreNativePreferences(JSON.stringify({ destination: 'wallpapers', channel: 'technology', wallpaper: 'dunes' })))
      .toMatchObject({ wallpaper: 'dunes', navigation: { destination: 'technology', channel: 'technology' } });
    expect(nativeFeatureFromLink('sfm-tv-native://wallpapers')).toBeNull();
  });
});

describe('native TV bundled wallpaper gallery', () => {
  it('bundles usable PNG images for tvOS and Android without an online image service', async () => {
    let totalBytes = 0;
    for (const id of wallpaperIds) {
      const image = await readFile(new URL(`../../../apps/markets-tv-native/assets/wallpapers/${id}.png`, import.meta.url));
      expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
      expect(width).toBeGreaterThanOrEqual(960);
      expect(width / height).toBeCloseTo(16 / 9);
      totalBytes += image.length;
    }
    expect(totalBytes).toBeLessThan(3 * 1024 * 1024);
  });
});
