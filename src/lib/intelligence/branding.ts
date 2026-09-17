import type { AnalysisResult } from '@/domain/intelligence/contracts';

export const SFM_MARKET_INTELLIGENCE_ENGINE_NAME = 'THE SFM Market Intelligence Engine';
export const SFM_MARKET_INTELLIGENCE_ENGINE_SHORT_NAME = 'THE SFM Intelligence Engine';

/**
 * Presentation-only projection used by THE SFM analysis surfaces.
 *
 * The canonical result continues to retain the real upstream provider in
 * providerProvenance. This clone changes only the label shown inside the
 * canonical evidence ledger so users can distinguish the analytical source
 * (THE SFM) from the upstream market-data provider shown separately in the
 * transparency surface.
 */
export function withSfmAnalyticalSource(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    providerProvenance: {
      ...result.providerProvenance,
      selectedProvider: SFM_MARKET_INTELLIGENCE_ENGINE_NAME,
    },
  };
}
