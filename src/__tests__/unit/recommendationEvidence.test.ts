import { describe, expect, it } from 'vitest';
import { recommendationEvidence } from '@/lib/trader/quoteEvidence';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';

describe('recommendation evidence coverage', () => {
  it('separates technical history and reference prices from tradable recommendations', () => {
    expect(recommendationEvidence([
      { price: null, available: false, lastKnownPrice: 337, technicalAvailable: true, chartAvailable: true, signalAvailable: false },
      { price: 200, available: true, signalAvailable: false, dataSufficiency: { sufficient: true } },
      { price: 100, available: true, signalAvailable: true, dataSufficiency: { sufficient: true } },
      { price: null, available: false, lastKnownPrice: NaN },
    ])).toEqual({ referencePriceCount: 1, historicalAnalysisCount: 1, evidenceCount: 3, sufficientRecommendationCount: 1 });
  });
  it('reports partial evidence as a successful partial response without calling the provider disconnected', () => {
    expect(createMarketFeatureDiagnostic({ feature: 'prices', providerStatus: 'partial', count: 2 }))
      .toMatchObject({ ok: true, status: 'partial', dataQuality: 'partial' });
    expect(createMarketFeatureDiagnostic({ feature: 'prices', providerStatus: 'provider_error', count: 2 }))
      .toMatchObject({ ok: false, status: 'provider_error', dataQuality: 'unavailable' });
    expect(recommendationEvidence([{ price: null, available: false }]).evidenceCount).toBe(0);
  });
});
