import { describe, expect, it } from 'vitest';
import { findKnownMarketSymbol, isKnownExactMarketSymbol } from '@/lib/market/knownSymbols';
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

  it('resolves BOUBYAN.KW when the bundled market directory supports it', async () => {
    const result = await resolveMarketSymbol('BOUBYAN.KW', 'stock');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.asset.symbol).toBe('BOUBYAN.KW');
    expect(result.asset.providerSymbol).toBe('BOUBYAN.KW');
    expect(result.asset.name.toLowerCase()).toContain('boubyan');
  });
});
