import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { TV_ATLAS_CITIES } from '@/lib/markets-tv/atlas';
import { nativeAtlasFormatters, nativeAtlasSize } from '../../../apps/markets-tv-native/src/nativeAtlas';
import { NATIVE_PROFILE_URL, NATIVE_PROFILE_QR_OPTIONS } from '../../../apps/markets-tv-native/src/nativeAccount';

describe('native atlas projection and city clocks', () => {
  it('uses the shared projection positions and time zones, including civil daylight-saving changes', () => {
    const winter = Date.parse('2026-11-20T12:00:00Z'), summer = Date.parse('2026-07-20T12:00:00Z');
    for (const language of ['ar', 'en', 'fr'] as const) {
      const cities = nativeAtlasFormatters(language);
      expect(cities.map(({ group, city, zone, x, y }) => ({ group, city, zone, x, y }))).toEqual([...TV_ATLAS_CITIES]);
      expect(cities.map(city => city.clock.format(winter))).toEqual(['15:00', '12:00', '07:00', '21:00']);
      expect(cities.map(city => city.clock.format(summer))).toEqual(['15:00', '13:00', '08:00', '21:00']);
      expect(cities.every(city => city.weekday.format(winter).length > 0)).toBe(true);
    }
  });
  it('fits the 2:1 map within both 1080p and 720p layouts without stretching the pin coordinate space', () => {
    for (const [width, height] of [[1180, 400], [787, 267], [600, 500], [0, 0]]) {
      const size = nativeAtlasSize(width, height);
      expect(size.width).toBe(size.height * 2);
      expect(size.width).toBeLessThanOrEqual(Math.max(0, width - 40));
      expect(size.height).toBeLessThanOrEqual(Math.max(0, height - 40));
      expect(size.width).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('native account phone handoff', () => {
  it('bundles a square QR for exactly the public profile URL, without pairing or session information', async () => {
    expect(NATIVE_PROFILE_URL).toBe('https://www.the-sfm.com/profile');
    const url = new URL(NATIVE_PROFILE_URL);
    expect([url.username, url.password, url.port, url.search, url.hash]).toEqual(['', '', '', '', '']);
    const actual = await readFile(new URL('../../../apps/markets-tv-native/assets/profile-qr.png', import.meta.url));
    const expected = await QRCode.toBuffer('https://www.the-sfm.com/profile', NATIVE_PROFILE_QR_OPTIONS);
    expect(actual.equals(expected)).toBe(true);
    expect(actual.readUInt32BE(16)).toBe(actual.readUInt32BE(20));
  });
});
