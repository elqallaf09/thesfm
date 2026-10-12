import { describe, expect, it } from 'vitest';
import { mergeMarketSearchResults } from '@/lib/market/usSymbolResolver';

describe('market search result merging', () => {
  it('deduplicates aliases that resolve to the same provider symbol', () => {
    const results = mergeMarketSearchResults(
      [{ symbol: 'KFH', providerSymbol: 'KFH.KW', name: 'Kuwait Finance House', assetType: 'stock' }],
      [{ symbol: 'KFH.KW', providerSymbol: 'KFH.KW', name: 'Kuwait Finance House', assetType: 'stock' }],
    );

    expect(results).toEqual([
      expect.objectContaining({ symbol: 'KFH', providerSymbol: 'KFH.KW' }),
    ]);
  });

  it('keeps separate listings when their provider symbols differ', () => {
    const results = mergeMarketSearchResults(
      [{ symbol: 'VOD', providerSymbol: 'VOD.L', name: 'Vodafone London', assetType: 'stock' }],
      [{ symbol: 'VOD', providerSymbol: 'VOD', name: 'Vodafone ADR', assetType: 'stock' }],
    );

    expect(results.map(item => item.providerSymbol)).toEqual(['VOD', 'VOD.L']);
  });
});
