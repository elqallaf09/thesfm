import { describe, expect, it } from 'vitest';
import { formatMarketPrice } from '@/lib/market/marketCurrency';

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
