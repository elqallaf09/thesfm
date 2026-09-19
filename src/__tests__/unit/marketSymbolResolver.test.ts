import { describe, expect, it } from 'vitest';
import { findKnownMarketSymbol, isKnownExactMarketSymbol } from '@/lib/market/knownSymbols';
import { normalizeMarketSymbol } from '@/lib/market/normalizeSymbol';
import { providerSymbolsForAlias } from '@/lib/market/providerSymbolAliases';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';

describe('market symbol resolver exact ticker support', () => {
  it.each([
    ['T', 'AT&T', 'NYSE'],
    ['F', 'Ford', 'NYSE'],
    ['C', 'Citigroup', 'NYSE'],
    ['V', 'Visa', 'NYSE'],
    ['O', 'Realty Income', 'NYSE'],
  ])('resolves one-letter ticker %s before fuzzy search', async (input, expectedName, expectedExchange) => {
    const result = await resolveMarketSymbol(input, 'stock');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toBe(input);
    expect(result.asset.providerSymbol).toBe(input);
    expect(result.asset.name).toBe(expectedName);
    expect(result.asset.exchange).toBe(expectedExchange);
    expect(result.asset.currency).toBe('USD');
    expect(result.asset.assetType).toBe('stock');
    expect(result.asset.resolution).toBe('exact_symbol');
  });

  it.each([
    ['AAPL', 'Apple Inc.'],
    ['MSFT', 'Microsoft Corporation'],
    ['NVDA', 'NVIDIA Corporation'],
    ['GOOGL', 'Alphabet Inc.'],
    ['TSLA', 'Tesla Inc.'],
    ['AMD', 'Advanced Micro Devices'],
  ])('keeps normal exact ticker %s available in the known-symbol map', (input, expectedName) => {
    const item = findKnownMarketSymbol(input, 'stock');

    expect(item).toMatchObject({
      symbol: input,
      providerSymbol: input,
      name: expectedName,
      assetType: 'stock',
      currency: 'USD',
    });
    expect(isKnownExactMarketSymbol(input, 'stock')).toBe(true);
  });

  it.each([
    ['BOUBYAN.KW', 'BOUBYAN.KW', 'boubyan'],
    ['KFH.KW', 'KFH.KW', 'kuwait finance house'],
  ])('resolves Kuwait provider symbol %s when the bundled market directory supports it', async (input, expectedSymbol, expectedName) => {
    const result = await resolveMarketSymbol(input, 'stock');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toBe(expectedSymbol);
    expect(result.asset.providerSymbol).toBe(input);
    expect(result.asset.name.toLowerCase()).toContain(expectedName);
  });

  it.each(['بيتك', 'بيت التمويل الكويتي', 'Kuwait Finance House'])('resolves the localized KFH alias %s to the verified Kuwait provider symbol', async (input) => {
    const result = await resolveMarketSymbol(input, 'stock');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toMatch(/^KFH(?:\.KW)?$/);
    expect(result.asset.providerSymbol).toBe('KFH.KW');
    expect(result.asset.assetType).toBe('stock');
    expect(result.asset.currency).toBe('KWD');
    expect(result.asset.exchange).toBe('Boursa Kuwait');
  });

  it.each(['بوبيان', 'بنك بوبيان', 'Boubyan Bank'])('resolves the localized Boubyan alias %s to the verified Kuwait provider symbol', async (input) => {
    const result = await resolveMarketSymbol(input, 'stock');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toMatch(/^BOUBYAN(?:\.KW)?$/);
    expect(result.asset.providerSymbol).toBe('BOUBYAN.KW');
    expect(result.asset.assetType).toBe('stock');
    expect(result.asset.currency).toBe('KWD');
    expect(result.asset.exchange).toBe('Boursa Kuwait');
  });

  it.each([
    ['XAUUSD', 'gold', 'XAUUSD', 'GC=F'],
    ['Gold', 'gold', 'XAUUSD', 'GC=F'],
    ['GC=F', 'gold', 'XAUUSD', 'GC=F'],
    ['XAGUSD', 'commodity', 'XAGUSD', 'SI=F'],
    ['EURUSD', 'forex', 'EURUSD', 'EURUSD=X'],
    ['GBPUSD', 'forex', 'GBPUSD', 'GBPUSD=X'],
    ['USDJPY', 'forex', 'USDJPY', 'USDJPY=X'],
    ['BTCUSD', 'crypto', 'BTC/USD', 'BTC-USD'],
    ['BTC-USD', 'crypto', 'BTC/USD', 'BTC-USD'],
    ['ETHUSD', 'crypto', 'ETH/USD', 'ETH-USD'],
    ['APTUSD', 'crypto', 'APT/USD', 'APT-USD'],
    ['BCH/USD', 'crypto', 'BCH/USD', 'BCH-USD'],
    ['ADAUSD', 'crypto', 'ADA/USD', 'ADA-USD'],
  ])('maps provider alias %s to %s', async (input, assetType, expectedSymbol, expectedProviderSymbol) => {
    const result = await resolveMarketSymbol(input, assetType);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toBe(expectedSymbol);
    expect(result.asset.providerSymbol).toBe(expectedProviderSymbol);
  });

  it('normalizes provider aliases with ordered fallbacks', () => {
    expect(normalizeMarketSymbol('XAUUSD', 'gold')).toMatchObject({
      displaySymbol: 'XAUUSD',
      providerSymbol: 'GC=F',
      assetType: 'gold',
    });
    expect(providerSymbolsForAlias('XAUUSD', 'gold')).toEqual(['GC=F', 'XAUUSD=X']);
    expect(providerSymbolsForAlias('USDJPY', 'forex')).toEqual(['USDJPY=X', 'JPY=X']);
    expect(normalizeMarketSymbol('ADAUSD', 'crypto')).toMatchObject({
      displaySymbol: 'ADA/USD',
      providerSymbol: 'ADA-USD',
      assetType: 'crypto',
    });
  });
});


describe('Arabic market names', () => {
  it.each([
    ['ذهب', 'XAUUSD', 'gold'], ['الذَّهَب', 'XAUUSD', 'gold'], ['فضّة', 'XAGUSD', 'commodity'],
    ['الفضه', 'XAGUSD', 'commodity'], ['سعر الذهب', 'XAUUSD', 'gold'],
    ['أبل', 'AAPL', 'stock'], ['سهم آبل', 'AAPL', 'stock'], ['شركة مايكروسوفت', 'MSFT', 'stock'],
    ['إنفيديا', 'NVDA', 'stock'], ['تيسلا', 'TSLA', 'stock'], ['أمازون', 'AMZN', 'stock'],
    ['بيت كوين', 'BTC/USD', 'crypto'], ['عملة إيثريوم', 'ETH/USD', 'crypto'],
    ['سولانا', 'SOL/USD', 'crypto'], ['اليورو مقابل الدولار', 'EURUSD', 'forex'],
    ['دولار ين', 'USDJPY', 'forex'], ['بنك الكويت الوطني', 'NBK.KW', 'stock'],
  ])('resolves %s to its canonical identity', async (input, symbol, assetType) => {
    const result = await resolveMarketSymbol(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset).toMatchObject({ symbol, assetType });
    expect(result.asset.aliases?.length).toBeGreaterThan(0);
  });
  it('offers choices for an ambiguous Kuwait bank name instead of selecting the first bank', async () => {
    const result = await resolveMarketSymbol('بنك');
    expect(result.ok).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(1);
  });
});
