import { describe, expect, it } from 'vitest';
import { isForexPair, normalizeSentimentRequest } from '@/lib/market/sentimentRequest';

describe('market sentiment request normalization', () => {
  it.each([
    ['EUR/USD', true],
    ['USDJPY=X', true],
    ['BTCUSD', false],
    ['XAUUSD', false],
    ['AAPL', false],
  ])('identifies whether %s is a supported forex pair', (symbol, expected) => {
    expect(isForexPair(symbol)).toBe(expected);
  });

  it.each([
    ['EUR/USD', null, 'forex', 'EURUSD'],
    ['XAUUSD', null, 'metals', 'XAUUSD'],
    ['BTC-USD', null, 'crypto', 'BTCUSD'],
    ['AAPL', null, 'stock', 'AAPL'],
    ['SPY', null, 'etf', 'SPY'],
    ['GC=F', 'commodity', 'metals', 'GCF'],
  ])('classifies %s as %s sentiment', (symbol, assetType, expectedType, expectedSymbol) => {
    expect(normalizeSentimentRequest({ symbol, assetType })).toMatchObject({
      assetType: expectedType,
      symbol: expectedSymbol,
    });
  });

  it('honors a verified explicit ETF type instead of guessing from its ticker', () => {
    expect(normalizeSentimentRequest({ symbol: 'IBIT', assetType: 'etf' })).toMatchObject({
      assetType: 'etf',
      requestedAssetType: 'etf',
      symbol: 'IBIT',
    });
  });

  it('rejects unknown explicit asset types instead of silently treating them as stocks', () => {
    expect(normalizeSentimentRequest({ symbol: 'AAPL', assetType: 'software-project' })).toMatchObject({
      assetType: 'unsupported',
      requestedAssetType: null,
      symbol: 'AAPL',
    });
  });

  it('keeps indices unsupported even when the symbol resembles a stock ticker', () => {
    expect(normalizeSentimentRequest({ symbol: 'SPX', assetType: 'index' })).toMatchObject({
      assetType: 'unsupported',
      requestedAssetType: 'index',
    });
  });

  it('uses the first legacy symbols value when the canonical parameters are absent', () => {
    expect(normalizeSentimentRequest({ symbols: 'BTCUSD,ETHUSD' })).toMatchObject({
      assetType: 'crypto',
      symbol: 'BTCUSD',
      providerSymbol: 'BTCUSD',
    });
  });

  it('returns an honest empty unsupported request when no symbol is supplied', () => {
    expect(normalizeSentimentRequest({})).toEqual({
      symbol: '',
      displaySymbol: '',
      providerSymbol: '',
      assetType: 'unsupported',
      requestedAssetType: null,
    });
  });
});
