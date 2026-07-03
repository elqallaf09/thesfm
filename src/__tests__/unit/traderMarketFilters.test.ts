import { describe, expect, it } from 'vitest';
import { filterAssetsByMarket, marketFilterDecision } from '@/lib/trader/marketFilters';

describe('trader recommendation market filters', () => {
  const bahrainStock = {
    symbol: 'AUB.BH',
    exchange: 'Bahrain Bourse',
    exchangeCode: 'BHB',
    market: 'Bahrain Market',
    country: 'BH',
    currency: 'BHD',
    assetType: 'stock',
  };

  it('keeps only Bahrain-listed equities for Bahrain Market', () => {
    const assets = [
      bahrainStock,
      { symbol: 'TSLA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' },
      { symbol: 'NVDA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' },
      { symbol: 'BTC-USD', exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' },
      { symbol: 'EURUSD', exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' },
      { symbol: 'GLD', exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' },
    ];

    expect(filterAssetsByMarket(assets, 'bahrain')).toEqual([bahrainStock]);
  });

  it('rejects Bahrain-looking assets when currency or asset type is wrong', () => {
    expect(marketFilterDecision({ ...bahrainStock, currency: 'USD' }, 'Bahrain Market / BHD')).toMatchObject({
      allowed: false,
      reason: 'currency_mismatch',
    });
    expect(marketFilterDecision({ ...bahrainStock, assetType: 'fund' }, 'Bahrain Market / BHD')).toMatchObject({
      allowed: false,
      reason: 'asset_type_mismatch',
    });
  });

  it('does not apply strict GCC market rules to global selections', () => {
    const globalAssets = [
      { symbol: 'TSLA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' },
      { symbol: 'BTC-USD', exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' },
    ];

    expect(filterAssetsByMarket(globalAssets, 'global')).toEqual(globalAssets);
    expect(filterAssetsByMarket(globalAssets, 'all markets')).toEqual(globalAssets);
  });
});
