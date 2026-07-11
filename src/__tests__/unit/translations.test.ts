import { describe, it, expect } from 'vitest';
import { t, TR } from '@/lib/translations';

describe('translation function t()', () => {
  it('returns Arabic text for ar lang', () => {
    expect(t('invest_summary', 'ar')).toBe('ملخص الاستثمارات');
  });

  it('returns English text for en lang', () => {
    expect(t('invest_summary', 'en')).toBe('Investment Summary');
  });

  it('falls back to English when French is missing', () => {
    // French may not exist for every key — must not return raw key
    const result = t('invest_summary', 'fr');
    expect(result).not.toBe('invest_summary');
  });

  it('returns raw key string if key does not exist (safe fallback)', () => {
    const result = t('nonexistent_key_xyz', 'ar');
    expect(result).toBe('nonexistent_key_xyz');
  });

  it('invest_ domain has arabic text for all keys', () => {
    const investKeys = Object.keys(TR).filter(k => k.startsWith('invest_'));
    expect(investKeys.length).toBeGreaterThan(200);
    for (const key of investKeys) {
      expect(TR[key].ar, `Missing Arabic for key: ${key}`).toBeTruthy();
    }
  });

  it('charity. domain has arabic text for all keys', () => {
    const charityKeys = Object.keys(TR).filter(k => k.startsWith('charity.'));
    expect(charityKeys.length).toBeGreaterThan(10);
    for (const key of charityKeys) {
      expect(TR[key].ar, `Missing Arabic for key: ${key}`).toBeTruthy();
    }
  });

  it('investment_offers_ domain has arabic text for all keys', () => {
    const keys = Object.keys(TR).filter(k => k.startsWith('investment_offers_'));
    expect(keys.length).toBeGreaterThanOrEqual(41);
    for (const key of keys) {
      expect(TR[key].ar, `Missing Arabic for key: ${key}`).toBeTruthy();
    }
  });

  it('no translation key returns an empty string as Arabic', () => {
    for (const [key, entry] of Object.entries(TR)) {
      expect(entry.ar, `Empty Arabic for key: ${key}`).toBeTruthy();
    }
  });
});
