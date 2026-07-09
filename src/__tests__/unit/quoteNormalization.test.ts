import { describe, expect, it } from 'vitest';
import {
  normalizeQuote,
  normalizeSymbol,
  rankQuotesByChange,
} from '@/lib/market/quoteNormalization';

describe('quote normalization', () => {
  it('does not normalize a missing price to zero', () => {
    const quote = normalizeQuote({
      symbol: 'COMPUSD',
      assetType: 'crypto',
      price: null,
      previousClose: 16.89,
    });

    expect(quote.price).toBeNull();
    expect(quote.currentPrice).toBeNull();
    expect(quote.available).toBe(false);
    expect(quote.unavailableReason).toBe('price_unavailable');
  });

  it('does not render a missing previous close as a fake -100 percent change', () => {
    const quote = normalizeQuote({
      symbol: 'COMPUSD',
      assetType: 'crypto',
      price: 16.89,
      previousClose: null,
      changePercent: -100,
    });

    expect(quote.previousClose).toBeNull();
    expect(quote.change).toBeNull();
    expect(quote.changePercent).toBeNull();
  });

  it('normalizes COMPUSD to the COMP/USD canonical crypto symbol and Yahoo provider symbol', () => {
    expect(normalizeSymbol('COMPUSD', 'crypto')).toMatchObject({
      canonicalSymbol: 'COMP/USD',
      displaySymbol: 'COMP/USD',
      providerSymbol: 'COMP-USD',
      assetType: 'crypto',
    });

    expect(normalizeQuote({
      symbol: 'COMPUSD',
      provider: 'Yahoo Finance',
      providerSymbol: 'COMP/USD',
      assetType: 'crypto',
      price: 16.89,
      previousClose: 17.2,
    })).toMatchObject({
      canonicalSymbol: 'COMP/USD',
      displaySymbol: 'COMP/USD',
      providerSymbol: 'COMP-USD',
      providerSymbolUsed: 'COMP-USD',
    });
  });

  it('excludes invalid quotes from top losers', () => {
    const losers = rankQuotesByChange([
      {
        symbol: 'COMPUSD',
        assetType: 'crypto',
        price: null,
        previousClose: null,
        changePercent: -100,
      },
      {
        symbol: 'ETHUSD',
        assetType: 'crypto',
        price: 3000,
        previousClose: 3100,
      },
    ], 'asc', 5);

    expect(losers).toHaveLength(1);
    expect(losers[0]).toMatchObject({
      canonicalSymbol: 'ETH/USD',
      price: 3000,
    });
    expect(losers.map(item => item.canonicalSymbol)).not.toContain('COMP/USD');
  });

  it('uses one normalized quote shape for card and detail displays', () => {
    const rawQuote = {
      symbol: 'COMPUSD',
      provider: 'Yahoo Finance',
      assetType: 'crypto',
      price: 16.89,
      previousClose: 17.2,
    };
    const cardQuote = normalizeQuote(rawQuote);
    const detailQuote = normalizeQuote({ ...rawQuote, symbol: 'COMP/USD' });

    expect(detailQuote).toMatchObject({
      canonicalSymbol: cardQuote.canonicalSymbol,
      displaySymbol: cardQuote.displaySymbol,
      providerSymbol: cardQuote.providerSymbol,
      price: cardQuote.price,
      currentPrice: cardQuote.currentPrice,
      change: cardQuote.change,
      changePercent: cardQuote.changePercent,
    });
  });
});
