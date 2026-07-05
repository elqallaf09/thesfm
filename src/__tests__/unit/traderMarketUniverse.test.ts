import { describe, expect, it } from 'vitest';
import { getFullSymbolUniverse, getSymbolsForMarketOrSector, getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

describe('trader market and sector symbol universe', () => {
  it('expands the semiconductor universe with required real symbols and metadata', async () => {
    const universe = await getSymbolsForMarketOrSector({ market: 'semiconductors' });

    expect(universe.symbols).toEqual(expect.arrayContaining([
      'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
      'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
      'COHR', 'UMC', 'GFS', 'WOLF',
    ]));
    expect(universe.symbols.length).toBeGreaterThanOrEqual(28);
    expect(universe.entries.find(entry => entry.symbol === 'NVDA')).toMatchObject({
      selectedSector: 'semiconductors',
      assetType: 'stock',
      providerSymbol: 'NVDA',
      currency: 'USD',
    });
  });

  it('applies the selected market before a sector filter', async () => {
    const bahrainSemis = await getSymbolsForMarketOrSector({
      market: 'bahrain',
      sector: 'Semiconductor Equipment',
    });

    expect(bahrainSemis.symbols).not.toContain('NVDA');
    expect(bahrainSemis.entries.every(entry => entry.selectedMarket === 'bahrain')).toBe(true);
  });

  it('does not let category filtering override the selected market', async () => {
    const qatarStocks = await getSymbolsForMarketOrSector({ market: 'qatar', category: 'stock' });

    expect(qatarStocks.symbols.length).toBeGreaterThan(5);
    expect(qatarStocks.entries.every(entry => entry.selectedMarket === 'qatar')).toBe(true);
    expect(qatarStocks.entries.every(entry => entry.country === 'QA' || entry.symbol.endsWith('.QA'))).toBe(true);
  });

  it('does not expose GCC as an aggregate recommendation market', async () => {
    const catalog = await getTraderMarketCatalog();
    const gccRequest = await getSymbolsForMarketOrSector({ market: 'gcc', catalog });

    expect(catalog.markets.map(market => market.id)).not.toContain('gcc');
    expect(gccRequest.selectedMarket).not.toBe('gcc');
    expect(gccRequest.entries.some(entry => entry.selectedMarket === 'gcc')).toBe(false);
    expect(catalog.symbols.find(symbol => symbol.symbol === 'KFH.KW')?.marketIds).toContain('kuwait');
    expect(catalog.symbols.find(symbol => symbol.symbol === 'KFH.KW')?.marketIds).not.toContain('gcc');
  });

  it('loads the full Kuwait listed universe beyond preview symbols', async () => {
    const universe = await getFullSymbolUniverse({ market: 'kuwait', category: 'stock' });
    const dedupeKeys = universe.symbolMeta.map(symbol => [
      symbol.providerSymbol,
      symbol.exchange,
      symbol.currency,
    ].join('|'));

    expect(universe.symbols.length).toBeGreaterThanOrEqual(100);
    expect(universe.entries.every(entry => entry.selectedMarket === 'kuwait')).toBe(true);
    expect(universe.entries.every(entry => entry.currency === 'KWD')).toBe(true);
    expect(universe.entries[0]).toEqual(expect.objectContaining({
      providerSymbol: expect.any(String),
      displaySymbol: expect.any(String),
      exchange: expect.any(String),
      market: expect.any(String),
      country: expect.any(String),
      currency: 'KWD',
      assetType: 'stock',
      companyName: expect.any(String),
    }));
    expect(new Set(dedupeKeys).size).toBe(dedupeKeys.length);
  });

  it.each([
    ['kuwait', 'KWD'],
    ['saudi', 'SAR'],
    ['uae', 'AED'],
    ['qatar', 'QAR'],
    ['bahrain', 'BHD'],
    ['oman', 'OMR'],
  ])('keeps the %s local market universe to listed instruments in the local currency', async (market, currency) => {
    const universe = await getFullSymbolUniverse({ market });

    expect(universe.symbols.length).toBeGreaterThan(0);
    expect(universe.entries.every(entry => entry.selectedMarket === market)).toBe(true);
    expect(universe.entries.every(entry => ['stock', 'fund'].includes(entry.assetType))).toBe(true);
    expect(universe.entries.every(entry => entry.currency === currency)).toBe(true);
  });

  it('loads the provider catalog for US stocks instead of the preview list', async () => {
    const universe = await getFullSymbolUniverse({ market: 'us-stocks', assetType: 'stock' });

    expect(universe.symbols.length).toBeGreaterThan(1000);
    expect(universe.entries.every(entry => entry.assetType === 'stock')).toBe(true);
    expect(universe.entries.every(entry => entry.currency === 'USD')).toBe(true);
    expect(universe.entries.some(entry => entry.symbol === 'AAPL')).toBe(true);
    expect(universe.symbols).not.toEqual(expect.arrayContaining(['SPY', 'QQQ', 'AMCREIT', 'AAYAN', 'ABK', '2317.TW', '2330.TW']));
  });

  it('adds Funds & ETFs as a dedicated fund universe', async () => {
    const catalog = await getTraderMarketCatalog();
    const fundMarket = catalog.markets.find(market => market.id === 'etfs');
    const universe = await getFullSymbolUniverse({ market: 'etfs', assetType: 'fund', catalog });

    expect(fundMarket).toMatchObject({
      ar: 'الصناديق الاستثمارية',
      en: 'Funds & ETFs',
      family: 'Funds',
    });
    expect(universe.symbols.length).toBeGreaterThan(20);
    expect(universe.entries.every(entry => entry.assetType === 'fund')).toBe(true);
    expect(universe.symbols).toEqual(expect.arrayContaining(['SPY', 'QQQ']));
    expect(universe.symbols).not.toEqual(expect.arrayContaining(['AAPL', 'BTCUSD', 'EURUSD', 'XAUUSD']));
    expect(universe.entries.find(entry => entry.symbol === 'SPY')).toEqual(expect.objectContaining({
      assetType: 'fund',
      fundType: expect.any(String),
      providerSymbol: expect.any(String),
      displaySymbol: expect.any(String),
      fundName: expect.any(String),
      currency: 'USD',
      dataAvailability: expect.any(String),
    }));
  });

  it('filters ETFs, REITs, bond/sukuk funds, and Shariah funds strictly', async () => {
    const catalog = await getTraderMarketCatalog();
    const etfs = await getFullSymbolUniverse({ market: 'etfs', assetType: 'fund', fundType: 'etf', catalog });
    const reits = await getFullSymbolUniverse({ market: 'etfs', assetType: 'fund', fundType: 'reit', catalog });
    const bondSukukFunds = await getFullSymbolUniverse({ market: 'etfs', assetType: 'fund', fundType: 'bond_sukuk_fund', catalog });
    const shariahFunds = await getFullSymbolUniverse({ market: 'etfs', assetType: 'fund', fundType: 'shariah_fund', catalog });

    expect(etfs.entries.length).toBeGreaterThan(10);
    expect(etfs.entries.every(entry => entry.assetType === 'fund' && (entry.fundStructure === 'etf' || ['etf', 'leveraged_etf', 'inverse_etf'].includes(String(entry.fundType))))).toBe(true);

    expect(reits.entries.length).toBeGreaterThan(0);
    expect(reits.entries.every(entry => entry.assetType === 'fund' && entry.fundType === 'reit')).toBe(true);

    expect(bondSukukFunds.entries.length).toBeGreaterThan(0);
    expect(bondSukukFunds.entries.every(entry => entry.assetType === 'fund' && ['bond_fund', 'sukuk_fund'].includes(String(entry.fundType)))).toBe(true);

    expect(shariahFunds.entries.length).toBeGreaterThan(0);
    expect(shariahFunds.symbols).not.toContain('SPY');
    expect(shariahFunds.symbolMeta.every(symbol => (
      symbol.assetType === 'fund'
      && (symbol.fundType === 'shariah_compliant_fund' || symbol.fundType === 'sukuk_fund' || symbol.shariahStatus === 'compliant')
    ))).toBe(true);
  });

  it('keeps asset classes isolated for technology, crypto, forex, and commodities', async () => {
    const technology = await getFullSymbolUniverse({ market: 'technology' });
    const crypto = await getFullSymbolUniverse({ market: 'crypto' });
    const forex = await getFullSymbolUniverse({ market: 'forex' });
    const commodities = await getFullSymbolUniverse({ market: 'commodities' });
    const etfs = await getFullSymbolUniverse({ market: 'etfs' });

    expect(technology.entries.every(entry => entry.assetType === 'stock')).toBe(true);
    expect(technology.symbols).not.toEqual(expect.arrayContaining(['BTC', 'BTCUSD', 'EURUSD', 'XAUUSD', 'WTI']));
    expect(crypto.entries.every(entry => entry.assetType === 'crypto')).toBe(true);
    expect(forex.entries.every(entry => entry.assetType === 'forex')).toBe(true);
    expect(commodities.entries.every(entry => entry.assetType === 'commodity')).toBe(true);
    expect(etfs.entries.every(entry => entry.assetType === 'fund')).toBe(true);
  });
});
