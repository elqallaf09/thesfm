import { describe, expect, it } from 'vitest';
import { intelligenceAssetTypeFromMarket } from '@/lib/intelligence/assetTypes';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { assetTypeDisplayFromResult } from '@/components/ai-analyst/assetTypeDisplay';
import { ASSET_TYPE_LABELS } from '@/components/ai-analyst/copy';

// Reuses the repository's real, existing symbol catalog/resolver
// (src/lib/market/symbolResolver.ts) rather than any bespoke classification
// logic — the badge must display exactly what that verified resolution
// produces, never a guess derived from the symbol string alone.
describe('assetTypeDisplayFromResult — representative supported instruments', () => {
  it.each([
    ['AAPL', 'stock', 'STOCK'],
    ['SPY', 'etf', 'FUND'],
    ['BTCUSD', 'crypto', 'CRYPTO'],
    ['EURUSD', 'forex', 'FOREX'],
    ['XAUUSD', 'gold', 'COMMODITY'],
  ] as const)('classifies %s as %s (verified) -> %s', async (symbol, marketAssetType, expectedIntelligenceType) => {
    const resolved = await resolveMarketSymbol(symbol, marketAssetType);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const intelligenceType = intelligenceAssetTypeFromMarket(resolved.asset.assetType);
    expect(intelligenceType).toBe(expectedIntelligenceType);

    const state = assetTypeDisplayFromResult({ assetType: intelligenceType }, false, null, 'en');
    expect(state).toEqual({ status: 'resolved', assetType: expectedIntelligenceType, label: ASSET_TYPE_LABELS.en[expectedIntelligenceType] });
  });

  it('never guesses a type while resolution is still loading and nothing has failed yet', () => {
    expect(assetTypeDisplayFromResult(null, true, null, 'en')).toEqual({ status: 'loading' });
  });

  it('reports a truthful unresolved state once resolution has actually failed', () => {
    expect(assetTypeDisplayFromResult(null, false, 'INVALID_SYMBOL', 'en')).toEqual({ status: 'unresolved' });
    expect(assetTypeDisplayFromResult(null, false, 'UNSUPPORTED_ASSET', 'ar')).toEqual({ status: 'unresolved' });
  });

  it('falls back to unresolved rather than a guess when there is no result, no error, and no longer loading', () => {
    expect(assetTypeDisplayFromResult(null, false, null, 'fr')).toEqual({ status: 'unresolved' });
  });

  it('produces a localized label for every supported intelligence asset type in ar/en/fr', () => {
    const assetTypes = ['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND'] as const;
    for (const locale of ['ar', 'en', 'fr'] as const) {
      for (const assetType of assetTypes) {
        const state = assetTypeDisplayFromResult({ assetType }, false, null, locale);
        expect(state.status).toBe('resolved');
        if (state.status === 'resolved') {
          expect(state.label).toBe(ASSET_TYPE_LABELS[locale][assetType]);
          expect(state.label.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
