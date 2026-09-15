import { describe, expect, it } from 'vitest';
import { getWorldStockDetail } from '@/lib/world-stocks/detail';

describe('getWorldStockDetail (in-memory bundled regions, no network)', () => {
  it('returns null for an unsupported region rather than attempting a lookup', async () => {
    expect(await getWorldStockDetail('AAA', 'TADAWUL', 'en')).toBeNull();
    expect(await getWorldStockDetail('AAA', 'ADX', 'en')).toBeNull();
  });

  it('returns null for an empty or malformed symbol', async () => {
    expect(await getWorldStockDetail('', 'BOURSA_KUWAIT', 'en')).toBeNull();
    expect(await getWorldStockDetail('   ', 'BOURSA_KUWAIT', 'en')).toBeNull();
  });

  it('finds a real Boursa Kuwait symbol by exact match only', async () => {
    const stock = await getWorldStockDetail('MKHZN', 'BOURSA_KUWAIT', 'en');
    expect(stock).not.toBeNull();
    expect(stock?.canonicalSymbol).toBe('MKHZN');
    expect(stock?.region).toBe('BOURSA_KUWAIT');
  });

  it('is case-insensitive on the input symbol', async () => {
    const stock = await getWorldStockDetail('mkhzn', 'BOURSA_KUWAIT', 'en');
    expect(stock?.canonicalSymbol).toBe('MKHZN');
  });

  it('returns null for a real symbol looked up under a region it is not listed on -- canonical symbols are only unique per exchange', async () => {
    // NBK (National Bank of Kuwait) exists only in boursa-kuwait.json, unlike
    // MKHZN above which is a genuine dual listing (Kuwait + DFM) -- verified
    // directly against src/data/market-symbols/*.json, not assumed.
    expect(await getWorldStockDetail('NBK', 'DFM', 'en')).toBeNull();
  });

  it('returns null for a symbol that does not exist in the bundled catalog', async () => {
    expect(await getWorldStockDetail('THISDOESNOTEXIST', 'BOURSA_KUWAIT', 'en')).toBeNull();
  });
});
