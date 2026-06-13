import { describe, expect, it } from 'vitest';
import {
  approximateFxRate,
  convertCurrencyAmount,
  fxKey,
  normalizeMoneyCurrencyCode,
} from '@/lib/currencyConversion';

describe('currencyConversion', () => {
  it('converts USD expenses to KWD using the fallback rate', () => {
    const converted = convertCurrencyAmount(5, 'USD', 'KWD');

    expect(converted).toBeCloseTo(1.538, 3);
  });

  it('prefers a live FX rate when provided', () => {
    const converted = convertCurrencyAmount(10, 'USD', 'KWD', {
      [fxKey('USD', 'KWD')]: 0.3075,
    });

    expect(converted).toBeCloseTo(3.075, 3);
  });

  it('normalizes currency input safely', () => {
    expect(normalizeMoneyCurrencyCode(' usd ')).toBe('USD');
    expect(normalizeMoneyCurrencyCode('bad-code', 'KWD')).toBe('KWD');
  });

  it('returns null when no rate is available', () => {
    expect(approximateFxRate('XXX', 'KWD')).toBeNull();
    expect(convertCurrencyAmount(10, 'XXX', 'KWD')).toBeNull();
  });
});
