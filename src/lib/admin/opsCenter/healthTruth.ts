import { isMeasuredCapabilityCell } from '@/lib/market-state/capabilityMatrixView';
import type { MarketCapabilityKey, MarketSystemState, ProviderCapabilityCell } from '@/lib/market-state/types';
import type {
  FeatureHealthRow,
  OperationsCenterState,
  OpsFeatureHealthStatus,
  OpsFeatureKey,
} from './types';

const FEATURE_CAPABILITIES: Partial<Record<OpsFeatureKey, MarketCapabilityKey[]>> = {
  market_data: ['symbols', 'quotes', 'historical_prices', 'profiles', 'logos', 'forex', 'crypto', 'commodities', 'gcc_markets'],
  economic_calendar: ['economic_calendar'],
  earnings: ['earnings'],
  dividends: ['dividends'],
  ipos: ['ipos'],
  recommendations: ['recommendations'],
  technical_analysis: ['technical_data'],
  shariah_research: ['shariah_financials'],
};

function statusForCapability(market: MarketSystemState, capability: MarketCapabilityKey): OpsFeatureHealthStatus {
  const cells = market.capabilityMatrix.filter(cell => cell.capability === capability);
  if (cells.length === 0) return 'disabled';

  // Capability health is about whether THE FEATURE can currently be served. A broken optional
  // provider must not degrade the feature when a connected fallback is already serving it.
  if (cells.some(cell => cell.status === 'connected')) return 'healthy';

  const measured = cells.filter(isMeasuredCapabilityCell);
  if (measured.some(cell => cell.status === 'degraded' || cell.status === 'rate_limited')) return 'partial';
  if (measured.some(cell => cell.status === 'disconnected' || cell.status === 'misconfigured')) return 'failed';
  if (measured.length > 0 && measured.every(cell => cell.status === 'disabled')) return 'disabled';

  // Supported but not measured is not a failure. Keep it visibly distinct from healthy.
  return 'maintenance';
}

function combineCapabilityStatuses(statuses: OpsFeatureHealthStatus[]): OpsFeatureHealthStatus {
  if (statuses.length === 0) return 'disabled';
  if (statuses.every(status => status === 'healthy')) return 'healthy';
  if (statuses.every(status => status === 'disabled')) return 'disabled';

  const active = statuses.filter(status => status !== 'disabled');
  if (active.length === 0) return 'disabled';
  if (active.every(status => status === 'failed')) return 'failed';
  if (active.some(status => status === 'failed') && !active.some(status => status === 'healthy')) return 'failed';
  if (active.some(status => status === 'failed' || status === 'partial')) return 'partial';
  if (active.some(status => status === 'healthy')) return active.every(status => status === 'healthy') ? 'healthy' : 'partial';
  return 'maintenance';
}

function marketFeatureStatus(market: MarketSystemState, feature: OpsFeatureKey): OpsFeatureHealthStatus | null {
  const capabilities = FEATURE_CAPABILITIES[feature];
  if (!capabilities) return null;
  return combineCapabilityStatuses(capabilities.map(capability => statusForCapability(market, capability)));
}

function newsStatus(ops: OperationsCenterState): OpsFeatureHealthStatus {
  const enabled = ops.marketNews.filter(provider => provider.enabled);
  if (enabled.length === 0) return 'disabled';
  if (enabled.some(provider => provider.healthStatus === 'healthy')) return 'healthy';
  if (enabled.some(provider => provider.healthStatus === 'degraded' || provider.healthStatus === 'rate_limited')) return 'partial';
  if (enabled.some(provider => provider.healthStatus === 'unhealthy')) return 'failed';
  return 'maintenance';
}

function latestReminderRunPerType(ops: OperationsCenterState) {
  const latest = new Map<string, OperationsCenterState['subscriptionReminders']['recentRuns'][number]>();
  for (const run of ops.subscriptionReminders.recentRuns) {
    const current = latest.get(run.runType);
    if (!current) {
      latest.set(run.runType, run);
      continue;
    }
    const nextTime = run.startedAt ? Date.parse(run.startedAt) : Number.NEGATIVE_INFINITY;
    const currentTime = current.startedAt ? Date.parse(current.startedAt) : Number.NEGATIVE_INFINITY;
    if (nextTime > currentTime) latest.set(run.runType, run);
  }
  return Array.from(latest.values());
}

function emailStatus(ops: OperationsCenterState): OpsFeatureHealthStatus {
  const latestRuns = latestReminderRunPerType(ops);
  if (latestRuns.length === 0) return 'disabled';
  if (latestRuns.some(run => run.status === 'failed')) return 'failed';
  if (latestRuns.some(run => run.status === 'partial')) return 'partial';
  return 'healthy';
}

function detailFor(base: FeatureHealthRow | undefined, status: OpsFeatureHealthStatus): string | null {
  if (status === 'healthy') return null;
  return base?.detailKey ?? null;
}

/**
 * Rebuild the visible feature-health rows from active measurements rather than from historical
 * failures or redundant-provider configuration. This is intentionally pure: no extra network
 * calls and no invented health signals.
 */
export function buildTruthfulFeatureHealth(ops: OperationsCenterState): FeatureHealthRow[] {
  const byFeature = new Map(ops.featureHealth.map(row => [row.feature, row]));
  const output: FeatureHealthRow[] = [];

  for (const base of ops.featureHealth) {
    let status = marketFeatureStatus(ops.market, base.feature) ?? base.status;
    if (base.feature === 'news') status = newsStatus(ops);
    if (base.feature === 'email') status = emailStatus(ops);

    if (base.feature === 'shariah_research') {
      const activeIssue = ops.rootCause.find(issue => issue.affectedFeature === 'shariah_research');
      if (activeIssue?.severity === 'critical') status = 'failed';
      else if (activeIssue && status === 'healthy') status = 'partial';
    }

    output.push({
      feature: base.feature,
      status,
      detailKey: detailFor(byFeature.get(base.feature), status),
    });
  }

  return output;
}

function scoreFeatureRows(rows: FeatureHealthRow[]): number {
  const active = rows.filter(row => row.status !== 'disabled' && row.status !== 'maintenance');
  if (active.length === 0) return 100;
  const points = active.reduce((sum, row) => {
    if (row.status === 'healthy') return sum + 1;
    if (row.status === 'partial') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / active.length) * 100);
}

export function buildTruthfulOverview(
  ops: OperationsCenterState,
  featureHealth: FeatureHealthRow[] = buildTruthfulFeatureHealth(ops),
): OperationsCenterState['overview'] {
  const criticalIssueCount = ops.rootCause.filter(issue => issue.severity === 'critical').length;
  const warningCount = ops.rootCause.filter(issue => issue.severity === 'warning').length;
  const activeRows = featureHealth.filter(row => row.status !== 'disabled');
  const hasFailedFeature = activeRows.some(row => row.status === 'failed');
  const hasPartialFeature = activeRows.some(row => row.status === 'partial');
  const hasMeasuredMarketCell = ops.market.capabilityMatrix.some((cell: ProviderCapabilityCell) => isMeasuredCapabilityCell(cell));

  const overall: OperationsCenterState['overview']['overall'] = !hasMeasuredMarketCell
    ? 'maintenance'
    : criticalIssueCount > 0
      ? 'critical'
      : warningCount > 0 || hasFailedFeature || hasPartialFeature
        ? 'degraded'
        : 'healthy';

  return {
    ...ops.overview,
    overall,
    healthScorePercent: scoreFeatureRows(featureHealth),
    criticalIssueCount,
    warningCount,
    healthyServiceCount: featureHealth.filter(row => row.status === 'healthy').length,
  };
}
