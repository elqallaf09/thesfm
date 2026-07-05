import { describe, expect, it } from 'vitest';
import {
  formatTraderMarketHeader,
  normalizeTraderSymbolMetadata,
  resolveTraderMarketContext,
  traderProviderDisplayName,
} from '@/lib/trader/marketMetadata';

describe('trader market metadata', () => {
  it('formats GCC exchange headers with local currencies', () => {
    const oman = resolveTraderMarketContext({ marketId: 'oman' });
    const kuwait = resolveTraderMarketContext({ marketId: 'kuwait' });
    const saudi = resolveTraderMarketContext({ marketId: 'saudi' });
    const uae = resolveTraderMarketContext({ marketId: 'uae' });

    expect(formatTraderMarketHeader(oman, 'ar')).toBe('بورصة عمان · OMR');
    expect(formatTraderMarketHeader(oman, 'en')).toBe('Oman Exchange · OMR');
    expect(formatTraderMarketHeader(kuwait, 'ar')).toBe('بورصة الكويت · KWD');
    expect(formatTraderMarketHeader(kuwait, 'en')).toBe('Boursa Kuwait · KWD');
    expect(formatTraderMarketHeader(saudi, 'en')).toBe('Saudi Exchange · SAR');
    expect(formatTraderMarketHeader(uae, 'en')).toBe('UAE Markets · AED');
  });

  it('resolves asset-class headers for funds, crypto, forex, and metals', () => {
    const spy = resolveTraderMarketContext({ marketId: 'etfs', selectedSymbol: 'SPY' });
    const btcUsd = resolveTraderMarketContext({ marketId: 'crypto', selectedSymbol: 'BTCUSD' });
    const btcUsdt = resolveTraderMarketContext({ marketId: 'crypto', selectedSymbol: 'BTCUSDT' });
    const eurUsd = resolveTraderMarketContext({ marketId: 'forex', selectedSymbol: 'EURUSD' });
    const gold = resolveTraderMarketContext({ selectedSymbol: 'XAUUSD' });

    expect(formatTraderMarketHeader(spy, 'en')).toBe('Funds & ETFs · USD');
    expect(formatTraderMarketHeader(btcUsd, 'en')).toBe('Crypto · USD');
    expect(formatTraderMarketHeader(btcUsdt, 'en')).toBe('Crypto · USDT');
    expect(formatTraderMarketHeader(eurUsd, 'en')).toBe('Forex · USD');
    expect(formatTraderMarketHeader(gold, 'ar')).toBe('المعادن · USD');
    expect(formatTraderMarketHeader(gold, 'en')).toBe('Metals · USD');
  });

  it('normalizes selected and available provider display names', () => {
    const context = resolveTraderMarketContext({
      marketId: 'crypto',
      selectedSymbol: 'BTCUSD',
      selectedProvider: 'yahoo',
      availableProviders: ['fmp', 'finnhub', 'yahoo'],
      fallbackUsed: true,
    });

    expect(context.selectedProvider).toBe('Yahoo Finance');
    expect(context.availableProviders).toEqual(['FMP', 'Finnhub', 'Yahoo Finance']);
    expect(context.fallbackUsed).toBe(true);
    expect(traderProviderDisplayName('twelve_data')).toBe('Twelve Data');
  });

  it('uses catalog exchange metadata ahead of provider quote fields', () => {
    const metadata = normalizeTraderSymbolMetadata({
      symbol: 'AAPL',
      provider: 'yahoo',
      providerSymbol: 'AAPL',
      quote: { exchange: 'NYSE', currency: 'USD', quoteType: 'EQUITY' },
      catalog: { symbol: 'AAPL', exchange: 'NASDAQ', exchangeCode: 'NASDAQ', market: 'US Stocks', currency: 'USD', assetType: 'stock' },
    });

    expect(metadata.exchange).toBe('NASDAQ');
    expect(metadata.exchangeCode).toBe('NASDAQ');
    expect(metadata.market).toBe('US Stocks');
    expect(metadata.currency).toBe('USD');
    expect(metadata.assetType).toBe('stock');
    expect(metadata.providerSymbol).toBe('AAPL');
    expect(metadata.diagnostics.exchangeSource).toBe('catalog');
  });

  it('maps provider exchange fields from FMP, Yahoo, Finnhub, and Twelve Data', () => {
    expect(normalizeTraderSymbolMetadata({
      symbol: 'MSFT',
      provider: 'fmp',
      quote: { exchangeShortName: 'NASDAQ', exchangeName: 'NASDAQ Global Select', currency: 'USD', type: 'stock' },
    }).exchange).toBe('NASDAQ');

    expect(normalizeTraderSymbolMetadata({
      symbol: 'AAPL',
      provider: 'yahoo',
      quote: { fullExchangeName: 'NasdaqGS', exchange: 'NMS', market: 'us_market', quoteType: 'EQUITY', currency: 'USD' },
    }).exchangeCode).toBe('NASDAQ');

    expect(normalizeTraderSymbolMetadata({
      symbol: 'AAPL',
      provider: 'finnhub',
      quote: { mic: 'XNAS', currency: 'USD', type: 'Common Stock' },
    }).exchange).toBe('NASDAQ');

    expect(normalizeTraderSymbolMetadata({
      symbol: 'EMAAR.AE',
      provider: 'twelve_data',
      quote: { exchange: 'Dubai Financial Market', mic_code: 'DFM', currency: 'AED', type: 'Common Stock' },
    }).exchange).toBe('Dubai Financial Market');
  });

  it('infers safe fallback metadata for known symbols and asset classes', () => {
    const samples = [
      ['AAPL', 'NASDAQ', 'US Stocks', 'USD', 'stock'],
      ['SPY', 'NYSE Arca', 'Funds & ETFs', 'USD', 'fund'],
      ['QQQ', 'NASDAQ', 'Funds & ETFs', 'USD', 'fund'],
      ['EMAAR.AE', 'Dubai Financial Market', 'UAE Market', 'AED', 'stock'],
      ['KFH.KW', 'Boursa Kuwait', 'Kuwait Market', 'KWD', 'stock'],
      ['2222.SR', 'Tadawul', 'Saudi Market', 'SAR', 'stock'],
      ['BKMB.OM', 'Muscat Stock Exchange', 'Oman Market', 'OMR', 'stock'],
      ['BTC-USD', 'Crypto', 'Crypto', 'USD', 'crypto'],
      ['BTCUSDT', 'Crypto', 'Crypto', 'USDT', 'crypto'],
      ['XAUUSD', 'Metals', 'Metals', 'USD', 'commodity'],
      ['EURUSD', 'Forex', 'Forex', 'USD', 'forex'],
    ] as const;

    for (const [symbol, exchange, market, currency, assetType] of samples) {
      const metadata = normalizeTraderSymbolMetadata({ symbol });
      expect(metadata.exchange).toBe(exchange);
      expect(metadata.market).toBe(market);
      expect(metadata.currency).toBe(currency);
      expect(metadata.assetType).toBe(assetType);
      expect(metadata.diagnostics.exchangeSource).toBe('fallback');
    }
  });
});
