/**
 * Integration test: every key defined in any TR_* domain file
 * must be present in the merged TR barrel and have non-empty ar + en values.
 *
 * This catches the regression that happened during translations.ts split
 * (tasks #45/#50) where 152 invest_ keys and all investment_offers_ keys
 * were silently dropped from the barrel.
 */
import { describe, it, expect } from 'vitest';
import { TR } from '@/lib/translations';
import { TR_INVEST } from '@/lib/translations/invest';
import { TR_CHARITY } from '@/lib/translations/charity';
import { TR_INVESTMENT_OFFERS } from '@/lib/translations/investment-offers';
import { TR_MARKET } from '@/lib/translations/market';
import { TR_SAVINGS } from '@/lib/translations/savings';
import { TR_COMMON } from '@/lib/translations/common';

function checkDomain(name: string, domain: Record<string, { ar: string; en: string; fr?: string }>) {
  describe(`domain: ${name}`, () => {
    it('all keys are present in merged TR barrel', () => {
      for (const key of Object.keys(domain)) {
        expect(TR[key], `Key missing from TR: "${key}"`).toBeDefined();
      }
    });

    it('all keys have non-empty Arabic text', () => {
      for (const [key, entry] of Object.entries(domain)) {
        expect(entry.ar, `Empty Arabic for "${key}"`).toBeTruthy();
      }
    });

    it('all keys have non-empty English text', () => {
      for (const [key, entry] of Object.entries(domain)) {
        expect(entry.en, `Empty English for "${key}"`).toBeTruthy();
      }
    });

    it('all keys have non-empty French text', () => {
      for (const [key, entry] of Object.entries(domain)) {
        expect(entry.fr, `Empty French for "${key}"`).toBeTruthy();
      }
    });
  });
}

describe('i18n completeness', () => {
  checkDomain('invest', TR_INVEST);
  checkDomain('charity', TR_CHARITY);
  checkDomain('investment_offers', TR_INVESTMENT_OFFERS);
  checkDomain('market', TR_MARKET);
  checkDomain('savings', TR_SAVINGS);
  checkDomain('common', TR_COMMON);

  it('invest_ domain has ≥ 232 keys', () => {
    expect(Object.keys(TR_INVEST).length).toBeGreaterThanOrEqual(232);
  });

  it('investment_offers_ domain has exactly 41 keys', () => {
    expect(Object.keys(TR_INVESTMENT_OFFERS).length).toBe(41);
  });

  it('charity. domain has ≥ 40 keys', () => {
    expect(Object.keys(TR_CHARITY).length).toBeGreaterThanOrEqual(40);
  });

  it('TR barrel has no key whose Arabic value is empty', () => {
    const broken = Object.entries(TR)
      .filter(([, v]) => !v.ar)
      .map(([k]) => k);
    expect(broken, `Keys with empty Arabic: ${broken.join(', ')}`).toHaveLength(0);
  });

  it('TR barrel has no key whose French value is empty', () => {
    const broken = Object.entries(TR)
      .filter(([, value]) => !value.fr)
      .map(([key]) => key);
    expect(broken, `Keys with empty French: ${broken.join(', ')}`).toHaveLength(0);
  });
});
