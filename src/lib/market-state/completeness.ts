import type { CatalogBreakdown, Completeness } from './types';

export function computeCompleteness(requested: number, returned: number): Completeness {
  const safeRequested = Math.max(0, Math.trunc(requested));
  const safeReturned = Math.max(0, Math.trunc(returned));
  const missing = Math.max(0, safeRequested - safeReturned);
  const percentage = safeRequested > 0 ? Math.round((safeReturned / safeRequested) * 100) : safeReturned > 0 ? 100 : 0;
  return { requested: safeRequested, returned: safeReturned, missing, percentage };
}

export type CatalogDiagnosticsLike = {
  totalSymbolsDiscovered: number;
  totalSymbolsLoaded: number;
  failedSymbols: Array<{ symbol: string; provider: string; reason: string }>;
  generatedAt: string;
};

/**
 * The literal fix for "13,307 discovered ≠ 13,307 live quotes". `liveQuoteSampleResult` must come
 * from an ACTUAL quote fetch/sample — if none was measured this pass, liveQuoteAvailable and
 * delayedQuoteAvailable stay `null` ("not measured"), never fabricated as equal to `discovered`.
 */
export function classifyCatalogCompleteness(
  diagnostics: CatalogDiagnosticsLike,
  liveQuoteSampleResult?: { liveCount: number; delayedCount: number } | null,
): CatalogBreakdown {
  const discovered = Math.max(0, diagnostics.totalSymbolsDiscovered);
  const loaded = Math.max(0, diagnostics.totalSymbolsLoaded);
  const failed = diagnostics.failedSymbols.length;
  const metadataAvailable = Math.min(loaded, discovered);

  return {
    discovered,
    metadataAvailable,
    liveQuoteAvailable: liveQuoteSampleResult ? Math.max(0, liveQuoteSampleResult.liveCount) : null,
    delayedQuoteAvailable: liveQuoteSampleResult ? Math.max(0, liveQuoteSampleResult.delayedCount) : null,
    staleRecords: 0,
    duplicates: 0,
    malformed: Math.max(0, discovered - loaded - failed),
    failed,
    lastSyncAt: diagnostics.generatedAt ?? null,
  };
}
