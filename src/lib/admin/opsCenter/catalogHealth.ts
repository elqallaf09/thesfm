import 'server-only';

import type { TraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { sanitizeOpsDiagnosticReason } from './diagnosticSafety';
import type { OperationsCenterState, OpsFeatureMeasurement, OpsHealthEvidence } from './types';

const SOURCE = 'ops_center_evidence_source_symbol_catalog';

function validTimestamp(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

/** Adds the actual catalog action's outcome without treating its bundled symbols as proof that
 * quote providers or its database source are healthy. No catalog records enter diagnostics. */
export function getCatalogRefreshMeasurement(
  state: OperationsCenterState,
  catalog: TraderMarketCatalog,
  startedAt: number,
  checkedAt: string,
): OpsFeatureMeasurement {
  const previous = state.featureHealth.find(row => row.feature === 'market_data');
  const diagnostics = catalog.diagnostics;
  const generatedAt = validTimestamp(diagnostics?.generatedAt);
  const stale = diagnostics?.cacheStatus === 'stale' || diagnostics?.cacheStatus === 'hit'
    || !generatedAt || Date.parse(generatedAt) < startedAt || Date.parse(generatedAt) > Date.parse(checkedAt) + 60_000;
  const failures = diagnostics?.failedSymbols ?? [];
  const loaded = Number.isFinite(diagnostics?.totalSymbolsLoaded) && diagnostics.totalSymbolsLoaded > 0;
  const evidence: OpsHealthEvidence[] = [{
    source: SOURCE, capability: 'symbols', scope: 'runtime',
    status: stale || !loaded ? 'unmeasured' : 'healthy', checkedAt,
    lastSuccessAt: loaded ? generatedAt : null,
    reasonKey: stale ? 'ops_center_catalog_refresh_stale'
      : !loaded ? 'ops_center_catalog_refresh_incomplete' : 'ops_center_catalog_refresh_measured',
    reason: null,
  }];
  const uniqueFailures = new Map<string, { provider: string | null; reason: string | null }>();
  for (const failure of failures) {
    const provider = ['supabase', 'fmp', 'bundled', 'seed'].includes(failure.provider) ? failure.provider : null;
    const reason = sanitizeOpsDiagnosticReason(failure.reason);
    uniqueFailures.set(`${provider}:${reason}`, { provider, reason });
  }
  for (const failure of [...uniqueFailures.values()].slice(0, 12)) {
    const lastSuccessAt = previous?.evidence?.find(item => item.source === SOURCE && item.provider === failure.provider)?.lastSuccessAt ?? null;
    evidence.push({
      source: SOURCE, capability: 'symbols', provider: failure.provider, scope: 'runtime',
      status: 'failed', checkedAt, lastSuccessAt,
      reasonKey: 'ops_center_catalog_refresh_source_failed', reason: failure.reason,
    });
  }
  // A missing client produces bundled records with no SQL error. A null query latency is the
  // catalog's explicit no-query signal; an empty but successfully queried table is not a gap.
  const supabaseMeasured = typeof diagnostics?.providerLatencyMs?.supabase === 'number'
    && Number.isFinite(diagnostics.providerLatencyMs.supabase);
  if (!supabaseMeasured && !failures.some(failure => failure.provider === 'supabase')) {
    evidence.push({
      source: SOURCE, capability: 'symbols', provider: 'supabase', scope: 'none',
      status: 'unmeasured', checkedAt: null, lastSuccessAt: null,
      reasonKey: 'ops_center_catalog_refresh_source_unmeasured', reason: null,
    });
  }
  const hasFailure = failures.length > 0 || (diagnostics?.summary?.failedSymbols ?? 0) > 0;
  if (hasFailure && failures.length === 0) {
    evidence.push({
      source: SOURCE, capability: 'symbols', scope: 'runtime', status: 'failed', checkedAt, lastSuccessAt: null,
      reasonKey: 'ops_center_root_cause_reason_not_reported', reason: null,
    });
  }
  const hasGap = evidence.some(item => item.status === 'unmeasured');
  const status = previous?.status === 'failed' ? 'failed'
    : previous?.status === 'partial' || hasFailure && loaded ? 'partial'
    : hasFailure ? 'failed'
    : hasGap || previous?.status !== 'healthy' ? 'unmeasured' : 'healthy';
  return {
    status,
    detailKey: hasFailure ? 'ops_center_catalog_refresh_source_failed'
      : hasGap ? 'ops_center_catalog_refresh_incomplete' : previous?.detailKey ?? null,
    evidence: [...(previous?.evidence ?? []), ...evidence],
  };
}
