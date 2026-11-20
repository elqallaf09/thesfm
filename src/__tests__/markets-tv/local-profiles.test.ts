import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeTvProfiles, readTvProfiles, TV_PROFILES_KEY, validTvProfileToken, writeTvProfiles } from '@/lib/markets-tv/localProfiles';

const firstToken = 'a'.repeat(64), secondToken = 'b'.repeat(64);
afterEach(() => vi.unstubAllGlobals());

describe('saved TV profile boundaries', () => {
  it('accepts only the exact lowercase hexadecimal device-token contract', () => {
    expect(validTvProfileToken(firstToken)).toBe(true);
    expect(validTvProfileToken('0123456789abcdef'.repeat(4))).toBe(true);
    for (const value of [undefined, null, 64, {}, [], '', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 'g'.repeat(64), ` ${firstToken}`, `${firstToken}\n`]) {
      expect(validTvProfileToken(value), `invalid token shape ${typeof value}`).toBe(false);
    }
  });

  it('rejects non-array storage and malformed rows without manufacturing credentials', () => {
    for (const value of [null, undefined, '', {}, { token: firstToken, name: 'First' }]) expect(normalizeTvProfiles(value)).toEqual([]);
    expect(normalizeTvProfiles([null, undefined, 'profile', 1, [], {}, { token: firstToken }, { token: firstToken, name: 1 }, { token: 'legacy-token', name: 'Legacy' }])).toEqual([]);
  });

  it('trims and bounds labels, supplies a neutral blank label, and preserves only public label and credential fields', () => {
    const input = [
      { token: firstToken, name: '  First living room  ', portfolio: ['private holding'], deviceId: 'private-id' },
      { token: secondToken, name: '   ' },
      { token: 'c'.repeat(64), name: 'ط'.repeat(81) },
    ];
    expect(normalizeTvProfiles(input)).toEqual([
      { token: firstToken, name: 'First living room' },
      { token: secondToken, name: 'SFM TV' },
      { token: 'c'.repeat(64), name: 'ط'.repeat(80) },
    ]);
    expect(input[0].name).toBe('  First living room  ');
  });

  it('keeps the first label for a duplicate credential and preserves distinct account order', () => {
    expect(normalizeTvProfiles([
      { token: firstToken, name: 'First' }, { token: secondToken, name: 'Second' },
      { token: firstToken, name: 'Replacement' }, { token: secondToken, name: 'Duplicate' },
    ])).toEqual([{ token: firstToken, name: 'First' }, { token: secondToken, name: 'Second' }]);
  });

  it('caps storage at eight distinct valid profiles without counting rejected or duplicate rows', () => {
    const unique = Array.from({ length: 10 }, (_, index) => ({ token: index.toString(16).padStart(64, '0'), name: `Room ${index}` }));
    const input = unique.flatMap(profile => [null, { token: 'invalid', name: 'Invalid' }, profile, { ...profile, name: 'Duplicate' }]);
    expect(normalizeTvProfiles(input)).toEqual(unique.slice(0, 8));
  });

  it('normalizes stored JSON and recovers from missing, malformed, or inaccessible storage', () => {
    const getItem = vi.fn().mockReturnValue(JSON.stringify([{ token: firstToken, name: ' First ' }, { token: 'bad', name: 'Bad' }]));
    vi.stubGlobal('localStorage', { getItem });
    expect(readTvProfiles()).toEqual([{ token: firstToken, name: 'First' }]);
    expect(getItem).toHaveBeenCalledWith(TV_PROFILES_KEY);
    for (const value of [null, '{', 'null', '{}']) {
      getItem.mockReturnValue(value);
      expect(readTvProfiles()).toEqual([]);
    }
    getItem.mockImplementation(() => { throw new Error('Storage denied'); });
    expect(readTvProfiles()).toEqual([]);
  });

  it('writes normalized profiles only and remains usable when device storage is full or denied', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    writeTvProfiles([{ token: firstToken, name: ' First ' }, { token: firstToken, name: 'Duplicate' }, { token: 'bad', name: 'Invalid' }]);
    expect(setItem).toHaveBeenCalledWith(TV_PROFILES_KEY, JSON.stringify([{ token: firstToken, name: 'First' }]));
    setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(() => writeTvProfiles([{ token: secondToken, name: 'Second' }])).not.toThrow();
  });
});
