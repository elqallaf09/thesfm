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

  it.each([
    ['XAUUSD', 'gold', 'XAUUSD', 'GC=F'],
    ['Gold', 'gold', 'XAUUSD', 'GC=F'],
    ['GC=F', 'gold', 'XAUUSD', 'GC=F'],
    ['XAGUSD', 'commodity', 'XAGUSD', 'SI=F'],
    ['EURUSD', 'forex', 'EURUSD', 'EURUSD=X'],
    ['GBPUSD', 'forex', 'GBPUSD', 'GBPUSD=X'],
    ['USDJPY', 'forex', 'USDJPY', 'USDJPY=X'],
    ['BTCUSD', 'crypto', 'BTCUSD', 'BTC-USD'],
    ['BTC-USD', 'crypto', 'BTCUSD', 'BTC-USD'],
    ['ETHUSD', 'crypto', 'ETHUSD', 'ETH-USD'],
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
  });
});
