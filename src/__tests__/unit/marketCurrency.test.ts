import { describe, expect, it } from 'vitest';
import { formatMarketPrice, normalizeMarketPrice } from '@/lib/market/marketCurrency';

describe('formatMarketPrice forex formatting', () => {
  it('does not round small inverse JPY pairs to a two-decimal USD amount', () => {
    expect(formatMarketPrice({
      price: 0.006200589,
      currency: 'USD',
      symbol: 'JPYUSD',
      providerSymbol: 'JPYUSD=X',
      assetType: 'forex',
      locale: 'ar',
    })).toBe('0.006201 USD');
  });

  it('keeps JPY quote pairs readable with three decimals', () => {
    expect(formatMarketPrice({
      price: 161.274993,
      currency: 'JPY',
      symbol: 'USDJPY',
      providerSymbol: 'USDJPY=X',
      assetType: 'forex',
      locale: 'ar',
    })).toBe('161.275 JPY');
  });

  it('still formats ordinary USD assets with currency style', () => {
    expect(formatMarketPrice({
      price: 123.45,
      currency: 'USD',
      symbol: 'AAPL',
      assetType: 'stock',
      locale: 'ar',
    })).toBe('$123.45');
  });

  it('does not infer forex formatting when the caller explicitly provides a non-forex asset type', () => {
    expect(formatMarketPrice({
      price: 0.006200589,
      currency: 'USD',
      symbol: 'JPYUSD',
      assetType: 'stock',
      locale: 'ar',
    })).toBe('$0.01');
  });
});

describe('market price normalization', () => {
  it('converts raw Boursa Kuwait fils prices into KWD once', () => {
    const normalized = normalizeMarketPrice({
      price: 770,
      currency: 'KWD',
      symbol: 'KFH.KW',
      providerSymbol: 'KFH.KW',
      exchange: 'Boursa Kuwait',
      assetType: 'stock',
    });

    expect(normalized.price).toBe(0.77);
    expect(normalized.priceUnit).toBe('fils');
    expect(formatMarketPrice({
      price: 770,
      currency: 'KWD',
      symbol: 'KFH.KW',
      providerSymbol: 'KFH.KW',
      exchange: 'Boursa Kuwait',
      assetType: 'stock',
      locale: 'en',
    })).toBe('0.770 KWD');
  });

  it('does not convert already-normalized Kuwait prices a second time', () => {
    const normalized = normalizeMarketPrice({
      price: 0.77,
      currency: 'KWD',
      symbol: 'KFH.KW',
      providerSymbol: 'KFH.KW',
      exchange: 'Boursa Kuwait',
      assetType: 'stock',
      priceUnit: 'fils',
      priceIsNormalized: true,
    });

    expect(normalized.price).toBe(0.77);
    expect(formatMarketPrice({
      price: 0.77,
      currency: 'KWD',
      symbol: 'KFH.KW',
      providerSymbol: 'KFH.KW',
      exchange: 'Boursa Kuwait',
      assetType: 'stock',
      priceUnit: 'fils',
      priceIsNormalized: true,
      includeKuwaitDinarEquivalent: true,
      locale: 'en',
    })).toBe('0.770 KWD · 770 fils');
  });

  it('formats normalized Kuwait stock prices without appending a duplicate fils equivalent by default', () => {
    expect(formatMarketPrice({
      price: 0.636,
      currency: 'KWD',
      symbol: 'BOUBYAN',
      providerSymbol: 'BOUBYAN.KW',
      exchange: 'Boursa Kuwait - Premier Market',
      assetType: 'stock',
      priceIsNormalized: true,
      locale: 'en',
    })).toBe('0.636 KWD');
  });

  it.each([
    ['BOUBYAN', 'BOUBYAN.KW', 'Boursa Kuwait - Premier Market', 'KWD', 0.636, '0.636 KWD'],
    ['KFH.KW', 'KFH.KW', 'Boursa Kuwait', 'KWD', 0.77, '0.770 KWD'],
    ['NBK.KW', 'NBK.KW', 'Boursa Kuwait', 'KWD', 1.23, '1.230 KWD'],
    ['AAPL', 'AAPL', 'NASDAQ', 'USD', 214.56, '$214.56'],
    ['GOOGL', 'GOOGL', 'NASDAQ', 'USD', 173.28, '$173.28'],
  ])('keeps %s prices readable without duplicate currency fragments', (symbol, providerSymbol, exchange, currency, price, expected) => {
    const formatted = formatMarketPrice({
      price,
      currency,
      symbol,
      providerSymbol,
      exchange,
      assetType: 'stock',
      priceIsNormalized: true,
      locale: 'en',
    });

    expect(formatted).toBe(expected);
    expect(formatted).not.toMatch(/\b\d+\s+(?:fils|KWD)\s+.*\b(?:fils|KWD)\b/i);
  });

  it('does not treat ordinary KWD amounts as fils without Kuwait market context', () => {
    const formatted = formatMarketPrice({
      price: 1000,
      currency: 'KWD',
      locale: 'en',
    });

    expect(formatted).toContain('1,000.000');
    expect(formatted).not.toContain('1.000');
  });

  it('returns unavailable for missing prices instead of a fake zero', () => {
    expect(normalizeMarketPrice({
      price: null,
      currency: 'KWD',
      symbol: 'KFH.KW',
      exchange: 'Boursa Kuwait',
      assetType: 'stock',
    }).price).toBeNull();
  });
});
