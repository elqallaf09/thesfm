import {
  fetchTraderQuotesDetailed as fetchLegacyTraderQuotesDetailed,
  type TraderQuoteLoadOptions,
  type TraderQuoteLoadResult,
} from './marketQuotes';
import { fetchSfmTraderQuotesDetailed } from './sfmMarketQuotes';

export * from './marketQuotes';

/**
 * Canonical detailed quote entrypoint for product surfaces.
 *
 * Production and hosted UI consumers use the SFM-owned market contract. Unit
 * tests that explicitly exercise the legacy provider runtime keep importing
 * the same public module without losing their provider-specific test target.
 */
export async function fetchTraderQuotesDetailed(
  symbols: string[],
  options: TraderQuoteLoadOptions = {},
): Promise<TraderQuoteLoadResult> {
  if (process.env.NODE_ENV === 'test') {
    return fetchLegacyTraderQuotesDetailed(symbols, options);
  }
  return fetchSfmTraderQuotesDetailed(symbols, options);
}
