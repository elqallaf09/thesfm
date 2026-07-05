import { describe, expect, it } from 'vitest';
import {
  filterAssetsByMarket,
  isAssetAllowedForSelection,
  marketFilterDecision,
  strictMarketContextForSelection,
} from '@/lib/trader/marketFilters';

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

  it('returns canonical exchange and currency for strict market selections', () => {
    expect(strictMarketContextForSelection('Bahrain Market / BHD')).toMatchObject({
      marketId: 'bahrain',
      exchange: 'Bahrain Bourse',
      currency: 'BHD',
    });
  });

  it.each([
    ['qatar', 'QNBK.QA', 'Qatar Exchange', 'Qatar Market', 'Qatar', 'QAR'],
    ['kuwait', 'KFH.KW', 'Boursa Kuwait', 'Kuwait Market', 'Kuwait', 'KWD'],
    ['bahrain', 'AUB.BH', 'Bahrain Bourse', 'Bahrain Market', 'Bahrain', 'BHD'],
    ['saudi', '2222.SR', 'Tadawul', 'Saudi Market', 'Saudi Arabia', 'SAR'],
    ['uae', 'EMAAR.AE', 'Dubai Financial Market', 'UAE Market', 'UAE', 'AED'],
  ])('allows only the selected local market and currency for %s', (market, symbol, exchange, marketName, country, currency) => {
    const localAsset = { symbol, exchange, market: marketName, country, currency, assetType: 'stock' };
    const forbiddenAssets = [
      { symbol: 'NVDA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' },
      { symbol: 'TSLA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' },
      { symbol: 'BTC-USD', exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' },
      { symbol: 'EURUSD', exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' },
      { symbol: 'GLD', exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' },
    ];

    expect(isAssetAllowedForSelection(localAsset, market, 'all')).toBe(true);
    for (const asset of forbiddenAssets) {
      expect(isAssetAllowedForSelection(asset, market, 'all')).toBe(false);
    }
  });

  it('keeps technology and semiconductor categories to equities only', () => {
    const nvda = { symbol: 'NVDA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Semiconductors' };
    const msft = { symbol: 'MSFT', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Software' };
    const btc = { symbol: 'BTC-USD', exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' };
    const eurusd = { symbol: 'EURUSD', exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' };
    const gold = { symbol: 'GLD', exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' };

    expect(isAssetAllowedForSelection(nvda, 'technology', 'technology')).toBe(true);
    expect(isAssetAllowedForSelection(msft, 'technology', 'technology')).toBe(true);
    expect(isAssetAllowedForSelection(nvda, 'semiconductors', 'semiconductors')).toBe(true);
    expect(isAssetAllowedForSelection(msft, 'semiconductors', 'semiconductors')).toBe(false);
    expect(isAssetAllowedForSelection(btc, 'technology', 'technology')).toBe(false);
    expect(isAssetAllowedForSelection(eurusd, 'technology', 'technology')).toBe(false);
    expect(isAssetAllowedForSelection(gold, 'technology', 'technology')).toBe(false);
  });

  it('keeps asset-class categories isolated', () => {
    const equity = { symbol: 'NVDA', exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock' };
    const crypto = { symbol: 'BTC-USD', exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' };
    const forex = { symbol: 'EURUSD', exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' };
    const commodity = { symbol: 'XAUUSD', exchange: 'Commodities', market: 'Commodities', country: 'Global', currency: 'USD', assetType: 'commodity' };
    const etf = { symbol: 'GLD', exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' };

    expect(isAssetAllowedForSelection(crypto, 'crypto', 'crypto')).toBe(true);
    expect(isAssetAllowedForSelection(equity, 'crypto', 'crypto')).toBe(false);
    expect(isAssetAllowedForSelection(forex, 'forex', 'forex')).toBe(true);
    expect(isAssetAllowedForSelection(equity, 'forex', 'forex')).toBe(false);
    expect(isAssetAllowedForSelection(commodity, 'commodities', 'commodity')).toBe(true);
    expect(isAssetAllowedForSelection(crypto, 'commodities', 'commodity')).toBe(false);
    expect(isAssetAllowedForSelection(etf, 'etfs', 'fund')).toBe(true);
    expect(isAssetAllowedForSelection(equity, 'etfs', 'fund')).toBe(false);
  });

  it('keeps fund subtype filters strict', () => {
    const reit = { symbol: 'ENBDREIT', exchange: 'Dubai Financial Market', market: 'UAE Market', country: 'AE', currency: 'AED', assetType: 'fund', fundType: 'reit', fundStructure: 'reit' };
    const bondFund = { symbol: 'BND', exchange: 'NYSE Arca', market: 'Funds & ETFs', country: 'US', currency: 'USD', assetType: 'fund', fundType: 'bond_fund', fundStructure: 'etf' };
    const shariahFund = { symbol: 'SPUS', exchange: 'NYSE Arca', market: 'Funds & ETFs', country: 'US', currency: 'USD', assetType: 'fund', fundType: 'shariah_compliant_fund', shariahStatus: 'needs_review', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF' };
    const genericEtf = { symbol: 'SPY', exchange: 'NYSE Arca', market: 'Funds & ETFs', country: 'US', currency: 'USD', assetType: 'fund', fundType: 'etf', fundStructure: 'etf', shariahStatus: 'needs_review' };
    const equity = { symbol: 'VNQ', exchange: 'NYSE Arca', market: 'Funds & ETFs', country: 'US', currency: 'USD', assetType: 'stock', fundType: 'reit' };

    expect(isAssetAllowedForSelection(reit, 'etfs', 'reit')).toBe(true);
    expect(isAssetAllowedForSelection(bondFund, 'etfs', 'bond_sukuk_fund')).toBe(true);
    expect(isAssetAllowedForSelection(shariahFund, 'etfs', 'shariah_fund')).toBe(true);
    expect(isAssetAllowedForSelection(genericEtf, 'etfs', 'shariah_fund')).toBe(false);
    expect(isAssetAllowedForSelection(equity, 'etfs', 'reit')).toBe(false);
  });
});
