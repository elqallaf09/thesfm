import { describe, expect, it } from 'vitest';

import {
  financialCurrencyLabel,
  financialUnavailableLabel,
  formatFinancialCurrency,
} from '@/lib/financialDisplay';

const ARABIC_KWD = '\u062f.\u0643';
const ARABIC_UNAVAILABLE = '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d';
const NON_LATIN_DIGITS_OR_BIDI = /[\u061C\u0660-\u0669\u06F0-\u06F9\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

describe('financial display formatting', () => {
  it('renders KWD with three decimals, Latin digits, and a clean Arabic label', () => {
    expect(formatFinancialCurrency(0, 'KWD', 'ar')).toBe(`0.000 ${ARABIC_KWD}`);
    expect(formatFinancialCurrency(125.5, 'KWD', 'ar')).toBe(`125.500 ${ARABIC_KWD}`);
    expect(formatFinancialCurrency(1250, 'KWD', 'ar')).toBe(`1,250.000 ${ARABIC_KWD}`);
  });

  it('does not emit Arabic digits or bidi control marks in currency output', () => {
    const value = formatFinancialCurrency(1250.5, 'KWD', 'ar');
    expect(value).not.toMatch(NON_LATIN_DIGITS_OR_BIDI);
  });

  it('uses a clean unavailable state for missing and invalid values', () => {
    expect(financialUnavailableLabel('ar')).toBe(ARABIC_UNAVAILABLE);
    expect(formatFinancialCurrency(null, 'KWD', 'ar')).toBe(ARABIC_UNAVAILABLE);
    expect(formatFinancialCurrency(Number.NaN, 'KWD', 'ar')).toBe(ARABIC_UNAVAILABLE);
  });

  it('keeps the Arabic KWD label out of Intl bidi formatting', () => {
    expect(financialCurrencyLabel('KWD', 'ar')).toBe(ARABIC_KWD);
  });
});
