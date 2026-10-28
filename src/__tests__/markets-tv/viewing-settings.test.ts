import { describe, expect, it } from 'vitest';
import { normalizeTvChannels } from '@/lib/markets-tv/channels';
import { tvPrice, tvTime } from '@/lib/markets-tv/i18n';
import { normalizeTvSettings } from '@/lib/markets-tv/types';

describe('TV viewing preference migration', () => {
  it('opens legacy settings in the overview without losing selected markets, language or rotation', () => {
    const settings = normalizeTvSettings({ language: 'fr', marketIds: ['BOURSA_KUWAIT'], groups: ['gulf'], rotationSeconds: 60, autoRotate: true });
    expect(settings).toMatchObject({ displayMode: 'viewing', scene: 'overview', language: 'fr', marketIds: ['BOURSA_KUWAIT'], groups: ['gulf'], rotationSeconds: 60, autoRotate: true });
  });

  it('restores a saved channel with its viewing scene and instrument selections', () => {
    const original = { id: 'gulf-channel', name: 'الخليج', settings: normalizeTvSettings({ displayMode: 'viewing', scene: 'gulf', marketIds: ['BOURSA_KUWAIT'] }), selections: { BOURSA_KUWAIT: ['NBK'] } };
    expect(normalizeTvChannels(JSON.parse(JSON.stringify([original])))).toEqual([original]);
    expect(normalizeTvSettings({ displayMode: 'strips', scene: 'world' })).toMatchObject({ displayMode: 'strips', scene: 'world' });
  });

  it('rejects invalid display modes and scene values from stored or paired settings', () => {
    expect(normalizeTvSettings({ displayMode: 'constructor', scene: '__proto__' })).toMatchObject({ displayMode: 'viewing', scene: 'overview' });
  });
});

describe('TV quote presentation', () => {
  it('shows source instants in Kuwait time while preserving calendar-only observations', () => {
    expect(tvTime('2026-10-27T12:05:00Z', 'en')).toContain('03:05');
    expect(tvTime('2026-10-27', 'en', true)).toBe('Oct 27');
    expect(tvTime('invalid', 'ar')).toBe('—');
    expect(tvTime('2026-10-27T12:05:00Z', 'ar')).not.toMatch(/[٠-٩]/);
  });

  it('never presents a missing or invalid price as a zero price', () => {
    for (const value of [null, NaN, Infinity, 0, -1]) expect(tvPrice(value, 'KWD')).toBe('—');
    expect(tvPrice(0.982, 'KWD')).toBe('0.982');
  });
});
