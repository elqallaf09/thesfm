import type { MarketSystemState } from '@/lib/market-state/types';
import type { ShariahStatus } from '@/lib/market/shariah-screening';
import { notInstrumented, type SymbolCoverage } from './types';

/**
 * Derives ONLY the symbol-coverage sub-counts that are genuinely computed today. `staleRecords`
 * and `duplicates` on CatalogBreakdown are hardcoded to 0 by classifyCatalogCompleteness() (see
 * src/lib/market-state/completeness.ts) — never a real measurement — so they are deliberately NOT
 * folded into any count here; "unsupported" is marked not-instrumented instead of silently reading
 * that permanent zero as if it meant something.
 */
export function buildSymbolCoverage(market: MarketSystemState, shariahCounts: Record<ShariahStatus, number>): SymbolCoverage {
  const { catalog } = market;

  return {
    discovered: catalog.discovered,
    fullySupported: notInstrumented(
      'ops_center_not_instrumented_reason_no_composite_flag',
      'ops_center_not_instrumented_infra_per_symbol_capability_table',
      'unavailable',
    ),
    metadataOnly: catalog.metadataAvailable,
    quotesAvailable: { live: catalog.liveQuoteAvailable, delayed: catalog.delayedQuoteAvailable },
    technicalAvailable: notInstrumented(
      'ops_center_not_instrumented_reason_no_per_symbol_flag',
      'ops_center_not_instrumented_infra_per_symbol_capability_table',
      'unavailable',
    ),
    newsAvailable: notInstrumented(
      'ops_center_not_instrumented_reason_no_per_symbol_flag',
      'ops_center_not_instrumented_infra_per_symbol_capability_table',
      'unavailable',
    ),
    recommendationsAvailable: notInstrumented(
      'ops_center_not_instrumented_reason_no_per_symbol_flag',
      'ops_center_not_instrumented_infra_per_symbol_capability_table',
      'unavailable',
    ),
    shariahReady: shariahCounts.compliant + shariahCounts.non_compliant,
    missing: catalog.failed + catalog.malformed,
    unsupported: notInstrumented(
      'ops_center_not_instrumented_reason_unsupported_not_surfaced',
      'ops_center_not_instrumented_infra_expose_unsupported_count',
      'provider',
    ),
  };
}
