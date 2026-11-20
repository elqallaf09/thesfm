import { describe, expect, it } from 'vitest';
import { tvQuoteMovement, tvTableQuotePrice } from '@/lib/markets-tv/quote-presentation';
import { tvQuotePrice } from '@/lib/markets-tv/i18n';

describe('TV quote movement presentation', () => {
  it.each([0, -0])('shows exact zero %s as neutral without a negative sign', change => {
    expect(tvQuoteMovement(change)).toEqual({ trend: 'flat', value: '0.00%', label: 'unchanged' });
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'keeps unavailable change %s distinct from an unchanged stock', change => {
      expect(tvQuoteMovement(change)).toEqual({ trend: 'unknown', value: '—', label: 'changeUnavailable' });
    },
  );

  it.each([
    [3.38, 'up', '+3.38%', 'rising'],
    [-4.82, 'down', '−4.82%', 'falling'],
    [0.01, 'up', '+0.01%', 'rising'],
    [-0.01, 'down', '−0.01%', 'falling'],
    [0.009, 'up', '+<0.01%', 'rising'],
    [-0.009, 'down', '−<0.01%', 'falling'],
    [Number.MIN_VALUE, 'up', '+<0.01%', 'rising'],
    [-Number.MIN_VALUE, 'down', '−<0.01%', 'falling'],
  ] as const)('preserves the direction of %s without displaying a signed zero', (change, trend, value, label) => {
    expect(tvQuoteMovement(change)).toEqual({ trend, value, label });
  });

  it('formats large moves with English digits and readable grouping', () => {
    expect(tvQuoteMovement(1234.567)).toEqual({ trend: 'up', value: '+1,234.57%', label: 'rising' });
  });
});

describe('TV table stock price presentation', () => {
  const stock = { currency: 'AED', exchange: 'DFM', symbol: 'ALANSARI' };

  it.each([
    [0.939, '0.939'],
    [0.275, '0.275'],
    [0.1, '0.10'],
    [0.001, '0.001'],
    [0.100001, '0.100001'],
    [0.999999, '0.999999'],
  ] as const)('removes only padded zeros from the stock price %s', (price, expected) => {
    expect(tvTableQuotePrice({ ...stock, price })).toBe(expected);
  });

  it('leaves the shared formatter unchanged outside the table', () => {
    expect(tvQuotePrice({ ...stock, price: 0.939 })).toBe('0.939000');
  });

  it.each(['KWD', 'BHD', 'OMR'])('preserves three currency decimals for %s', currency => {
    expect(tvTableQuotePrice({ ...stock, currency, price: 0.1 })).toBe('0.100');
  });

  it.each([
    { price: 0.275, currency: 'USD', exchange: 'FOREX', symbol: 'AED/USD' },
    { price: 0.275, currency: 'USD', exchange: null, symbol: 'AEDUSD=X' },
    { price: 150.12, currency: 'JPY', exchange: 'FOREX', symbol: 'USD/JPY' },
    { price: 0.275, currency: 'USD', exchange: 'CRYPTO', symbol: 'XRP' },
    { price: 0.275, currency: 'USD', exchange: 'COINBASE', symbol: 'XRP-USD' },
  ])('preserves specialized quote precision for $symbol', quote => {
    expect(tvTableQuotePrice(quote)).toBe(tvQuotePrice(quote));
  });

  it.each([0.0000000123456, 0.0001, 1.88, 5961.2, null, Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'preserves tiny digits, ordinary prices, and invalid-price handling for %s', price => {
      const quote = { ...stock, price };
      expect(tvTableQuotePrice(quote)).toBe(tvQuotePrice(quote));
    },
  );
});
