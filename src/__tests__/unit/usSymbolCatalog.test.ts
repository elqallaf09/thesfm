import { describe, expect, it } from 'vitest';
import { findBundledUsSymbol, getBundledUsSymbolCatalog } from '@/lib/server/usSymbolCatalog';

describe('bundled US symbol catalog', () => {
  it('loads once and reuses the same catalog promise', async () => {
    const first = getBundledUsSymbolCatalog();
    const second = getBundledUsSymbolCatalog();

    expect(second).toBe(first);
    const catalog = await first;
    expect(catalog.rows.length).toBeGreaterThan(1_000);
    expect(catalog.bySymbol.get('AAPL')?.name).toContain('Apple');
  });

  it('resolves either canonical or provider symbols', async () => {
    await expect(findBundledUsSymbol('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      providerSymbol: 'AAPL',
    });
    await expect(findBundledUsSymbol('missing-symbol')).resolves.toBeNull();
  });
});
