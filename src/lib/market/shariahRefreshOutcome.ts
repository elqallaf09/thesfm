/** Execution status is separate from a stock's Shariah classification. */
export type ShariahRefreshOutcome = 'completed' | 'partial' | 'failed';
export type ShariahRefreshSummary = {
  ok: boolean;
  scanned: number;
  updated: number;
  hasMore: boolean;
  failed: Array<{ symbol: string; reason: string }>;
  fatal?: boolean;
};

export function shariahRefreshOutcome(result: ShariahRefreshSummary): ShariahRefreshOutcome {
  if (result.fatal || (!result.updated && result.failed.length)) return 'failed';
  return result.failed.length || result.hasMore ? 'partial' : 'completed';
}

export function shariahRefreshHttpStatus(result: ShariahRefreshSummary) {
  // Partial source failures are explicit in the body, not an opaque page-wide 500.
  // Database/run-ledger failures remain non-2xx, even if earlier rows were saved.
  if (result.ok) return 200;
  return result.updated > 0 && !result.fatal ? 200 : 500;
}
