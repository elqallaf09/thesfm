import os from 'node:os';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { getMarketNewsAdminProviderStatus, type MarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import { computeShariahCounts } from '@/lib/market/shariahAdminCatalog';
import type { ShariahStatus } from '@/lib/market/shariah-screening';
import type { MarketCapabilityKey, MarketSystemState } from '@/lib/market-state/types';
import { buildRootCauseIssues } from './rootCauseDiagnostics';
import { buildSymbolCoverage } from './symbolCoverage';
import {
  notInstrumented,
  type DataQualityBucket,
  type ErrorCenterCategory,
  type ErrorCenterEntry,
  type FeatureHealthRow,
  type JobSourceStats,
  type OperationsCenterState,
  type OpsAction,
  type OpsFeatureHealthStatus,
  type OpsFeatureKey,
  type OpsHealthLevel,
} from './types';

const EMPTY_MARKET_STATE: MarketSystemState = {
  generatedAt: new Date(0).toISOString(),
  overall: 'unknown',
  providers: {},
  capabilityMatrix: [],
  providerProfiles: [],
  configuration: null,
  featuresSucceeded: [],
  featuresDegraded: [],
  featuresFailed: [],
  catalog: { discovered: 0, metadataAvailable: 0, liveQuoteAvailable: null, delayedQuoteAvailable: null, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: null },
  lastSynchronizedAt: null,
};

const QUERY_TIMEOUT_MS = 4_000;
const RECENT_JOBS_LIMIT = 200;
const RECENT_RUNS_LIMIT = 50;
const RECENT_FETCH_LOGS_LIMIT = 200;

type ShariahJobRow = OperationsCenterState['shariah']['recentJobs'][number];
type ReminderRunRow = OperationsCenterState['subscriptionReminders']['recentRuns'][number];
type FetchLogRow = { id: string; status: string; startedAt: string | null; durationMs: number | null };

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error('ops_center_query_timeout')), QUERY_TIMEOUT_MS);
    }),
  ]);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchRecentShariahJobs(admin: SupabaseClient): Promise<ShariahJobRow[]> {
  const { data, error } = await admin
    .from('sharia_research_jobs')
    .select('id,status,current_step,progress,created_at,completed_at,error_code')
    .order('created_at', { ascending: false })
    .limit(RECENT_JOBS_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: String(row.id),
    status: row.status,
    currentStep: String(row.current_step ?? ''),
    progress: Number(row.progress ?? 0),
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
  }));
}

/** Admin-wide read — deliberately no `user_id` filter, unlike the business-owner-scoped route at
 *  /api/business/subscriptions/reminders/status which only ever sees one user's own runs. */
async function fetchRecentReminderRuns(admin: SupabaseClient): Promise<ReminderRunRow[]> {
  const { data, error } = await admin
    .from('subscription_reminder_runs')
    .select('id,run_type,status,started_at,finished_at,email_sent_count,email_failed_count,message')
    .order('started_at', { ascending: false })
    .limit(RECENT_RUNS_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: String(row.id),
    runType: String(row.run_type),
    status: String(row.status),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    emailSentCount: Number(row.email_sent_count ?? 0),
    emailFailedCount: Number(row.email_failed_count ?? 0),
    message: row.message ? String(row.message) : null,
  }));
}

async function fetchRecentMarketNewsFetchLogs(admin: SupabaseClient): Promise<FetchLogRow[]> {
  const { data, error } = await admin
    .from('market_news_fetch_logs')
    .select('id,status,started_at,duration_ms')
    .order('started_at', { ascending: false })
    .limit(RECENT_FETCH_LOGS_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: String(row.id),
    status: String(row.status),
    startedAt: row.started_at ? String(row.started_at) : null,
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
  }));
}

async function fetchAiUsageSummary(admin: SupabaseClient) {
  const usageDate = new Date().toISOString().slice(0, 10);
  const [eventsResult, limitsResult] = await Promise.all([
    admin.from('ai_usage_events').select('feature,user_id').eq('usage_date', usageDate).limit(5000),
    admin.from('ai_usage_limits').select('user_id').eq('is_blocked', true).limit(5000),
  ]);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const byFeature = new Map<string, number>();
  const distinctUsers = new Set<string>();
  for (const row of eventsResult.data ?? []) {
    const feature = String(row.feature);
    byFeature.set(feature, (byFeature.get(feature) ?? 0) + 1);
    if (row.user_id) distinctUsers.add(String(row.user_id));
  }
  const blockedUsersCount = limitsResult.error
    ? 0
    : new Set((limitsResult.data ?? []).map(row => String(row.user_id))).size;

  return {
    last24h: Array.from(byFeature.entries()).map(([feature, eventCount24h]) => ({ feature: feature as OperationsCenterState['aiUsage']['last24h'][number]['feature'], eventCount24h })),
    blockedUsersCount,
    distinctUsersToday: distinctUsers.size,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function bucketShariahJobs(jobs: ShariahJobRow[]): JobSourceStats {
  let queued = 0;
  let running = 0;
  let succeeded = 0;
  let failed = 0;
  let cancelled = 0;
  const durations: number[] = [];
  for (const job of jobs) {
    if (job.status === 'queued') queued += 1;
    else if (job.status === 'running' || job.status === 'awaiting_selection') running += 1;
    else if (job.status === 'completed') succeeded += 1;
    else if (job.status === 'failed') failed += 1;
    else cancelled += 1; // 'cancelled' | 'expired'
    const duration = durationMs(job.createdAt, job.completedAt);
    if (duration !== null) durations.push(duration);
  }
  return {
    sourceKey: 'shariah_research',
    queued, running, succeeded, failed, cancelled,
    averageDurationMs: average(durations),
    recent: jobs.slice(0, 20).map(job => ({
      id: job.id, status: job.status, startedAt: job.createdAt, finishedAt: job.completedAt,
      durationMs: durationMs(job.createdAt, job.completedAt), errorSummary: job.errorCode,
    })),
  };
}

function bucketMarketNewsFetchLogs(logs: FetchLogRow[]): JobSourceStats {
  let queued = 0;
  let running = 0;
  let succeeded = 0;
  let failed = 0;
  let cancelled = 0;
  const durations: number[] = [];
  for (const log of logs) {
    if (log.status === 'started') running += 1;
    else if (log.status === 'completed') succeeded += 1;
    else if (log.status === 'partial' || log.status === 'failed' || log.status === 'rate_limited') failed += 1;
    else cancelled += 1; // 'skipped'
    if (log.durationMs !== null) durations.push(log.durationMs);
  }
  return {
    sourceKey: 'market_news_fetch',
    queued, running, succeeded, failed, cancelled,
    averageDurationMs: average(durations),
    recent: logs.slice(0, 20).map(log => ({
      id: log.id, status: log.status, startedAt: log.startedAt, finishedAt: null,
      durationMs: log.durationMs, errorSummary: null,
    })),
  };
}

function bucketReminderRuns(runs: ReminderRunRow[]): JobSourceStats {
  let succeeded = 0;
  let failed = 0;
  let cancelled = 0;
  const durations: number[] = [];
  for (const run of runs) {
    if (run.status === 'completed') succeeded += 1;
    else if (run.status === 'failed' || run.status === 'partial') failed += 1;
    else cancelled += 1; // 'skipped'
    const duration = durationMs(run.startedAt, run.finishedAt);
    if (duration !== null) durations.push(duration);
  }
  return {
    // Write-once completed-run logs — this source never has a live "queued"/"running" state.
    sourceKey: 'subscription_reminders',
    queued: 0, running: 0, succeeded, failed, cancelled,
    averageDurationMs: average(durations),
    recent: runs.slice(0, 20).map(run => ({
      id: run.id, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt,
      durationMs: durationMs(run.startedAt, run.finishedAt), errorSummary: run.message,
    })),
  };
}

const MARKET_DATA_CAPABILITIES: MarketCapabilityKey[] = ['symbols', 'quotes', 'historical_prices', 'profiles', 'logos', 'forex', 'crypto', 'commodities', 'gcc_markets'];

function capabilityBucketStatus(market: MarketSystemState, capabilities: MarketCapabilityKey[]): OpsFeatureHealthStatus {
  const relevant = market.capabilityMatrix.filter(cell => capabilities.includes(cell.capability));
  if (relevant.length === 0) return 'healthy';
  if (relevant.every(cell => cell.status === 'disabled')) return 'disabled';
  if (relevant.some(cell => cell.status === 'connected')) {
    return relevant.some(cell => cell.status === 'disconnected' || cell.status === 'misconfigured') ? 'partial' : 'healthy';
  }
  return 'failed';
}

function buildFeatureHealth(market: MarketSystemState, shariahJobs: ShariahJobRow[], reminderRuns: ReminderRunRow[], databaseReachable: boolean, adminConfigured: boolean): FeatureHealthRow[] {
  const recentFailedShariahJobs = shariahJobs.slice(0, 20).filter(job => job.status === 'failed').length;
  const recentFailedReminderRuns = reminderRuns.slice(0, 10).filter(run => run.status === 'failed').length;

  const rows: FeatureHealthRow[] = [
    { feature: 'market_data', status: capabilityBucketStatus(market, MARKET_DATA_CAPABILITIES), detailKey: null },
    { feature: 'news', status: capabilityBucketStatus(market, ['news']), detailKey: null },
    { feature: 'economic_calendar', status: capabilityBucketStatus(market, ['economic_calendar']), detailKey: null },
    { feature: 'earnings', status: capabilityBucketStatus(market, ['earnings']), detailKey: null },
    { feature: 'dividends', status: capabilityBucketStatus(market, ['dividends']), detailKey: null },
    { feature: 'ipos', status: capabilityBucketStatus(market, ['ipos']), detailKey: null },
    { feature: 'recommendations', status: capabilityBucketStatus(market, ['recommendations']), detailKey: null },
    { feature: 'technical_analysis', status: capabilityBucketStatus(market, ['technical_data']), detailKey: null },
    {
      feature: 'shariah_research',
      status: recentFailedShariahJobs > 0 ? 'partial' : capabilityBucketStatus(market, ['shariah_financials']),
      detailKey: recentFailedShariahJobs > 0 ? 'ops_center_feature_detail_shariah_jobs_failing' : null,
    },
    { feature: 'ai_services', status: 'disabled', detailKey: 'ops_center_feature_detail_ai_quota_only' },
    { feature: 'authentication', status: 'healthy', detailKey: 'ops_center_feature_detail_auth_request_scoped' },
    {
      feature: 'email',
      status: recentFailedReminderRuns > 0 ? 'partial' : reminderRuns.length === 0 ? 'disabled' : 'healthy',
      detailKey: 'ops_center_feature_detail_email_subscription_only',
    },
    { feature: 'notifications', status: 'disabled', detailKey: 'ops_center_feature_detail_not_instrumented' },
    { feature: 'storage', status: 'disabled', detailKey: 'ops_center_feature_detail_not_instrumented' },
    {
      feature: 'database',
      status: !adminConfigured ? 'failed' : databaseReachable ? 'healthy' : 'partial',
      detailKey: !adminConfigured ? 'ops_center_feature_detail_database_not_configured' : null,
    },
  ];
  return rows;
}

function computeOverall(market: MarketSystemState, criticalIssueCount: number, warningCount: number): OpsHealthLevel {
  if (market.overall === 'unknown') return 'maintenance';
  if (market.overall === 'disconnected' || criticalIssueCount > 0) return 'critical';
  if (market.overall === 'degraded' || warningCount > 0) return 'degraded';
  return 'healthy';
}

function computeHealthScore(market: MarketSystemState): number {
  const succeeded = market.featuresSucceeded.length;
  const degraded = market.featuresDegraded.length;
  const failed = market.featuresFailed.length;
  const total = succeeded + degraded + failed;
  if (total === 0) return 100;
  return Math.round(((succeeded + degraded * 0.5) / total) * 100);
}

function buildErrorCenter(
  rootCause: OperationsCenterState['rootCause'],
  reminderRuns: ReminderRunRow[],
): OperationsCenterState['errorCenter'] {
  const byCategory: Record<ErrorCenterCategory, ErrorCenterEntry[]> = { provider: [], api: [], shariah: [], email: [], ai: [] };
  for (const issue of rootCause) {
    const category: ErrorCenterCategory | null =
      issue.id.startsWith('market:') ? 'provider'
      : issue.id.startsWith('market_news:') ? 'provider'
      : issue.id.startsWith('shariah_job:') ? 'shariah'
      : issue.id.startsWith('reminder_run:') ? 'email'
      : null;
    if (!category) continue;
    byCategory[category].push({
      id: issue.id,
      category,
      severity: issue.severity,
      occurredAt: issue.lastOccurrence,
      retryAvailable: issue.retryAvailable,
      logKey: issue.rootCauseKey,
      recommendationKey: issue.suggestedFixKey,
    });
  }
  void reminderRuns;
  return { byCategory, notInstrumented: ['database', 'frontend', 'notifications'] };
}

function buildDataQuality(market: MarketSystemState): Record<DataQualityBucket, number> {
  const buckets: Record<DataQualityBucket, number> = { fresh: 0, delayed: 0, cached: 0, partial: 0, stale: 0, unavailable: 0 };
  for (const cell of market.capabilityMatrix) {
    if (cell.status === 'unsupported') continue; // structural non-existence, not a data-quality dimension
    if (cell.status === 'connected') buckets.fresh += 1;
    else if (cell.status === 'degraded' || cell.status === 'rate_limited') buckets.delayed += 1;
    else if (cell.status === 'unknown') buckets.stale += 1;
    else buckets.unavailable += 1; // disconnected | misconfigured | disabled
  }
  // 'cached' and 'partial' are real bucket definitions but not distinguishable from fresh/delayed at
  // today's per-cell status granularity — left at 0 rather than guessed.
  return buckets;
}

function buildActions(rootCause: OperationsCenterState['rootCause']): OpsAction[] {
  const hasProviderIssue = rootCause.some(issue => issue.id.startsWith('market:') && issue.retryAvailable);
  return [
    { id: 'retry_market_providers', labelKey: 'ops_center_action_retry_providers', kind: 'retry_market_providers', available: hasProviderIssue },
    { id: 'refresh_symbol_catalog', labelKey: 'ops_center_action_refresh_catalog', kind: 'refresh_symbol_catalog', available: true },
    { id: 'retry_shariah_job', labelKey: 'ops_center_action_retry_shariah_job', kind: 'retry_shariah_job', available: false, disabledReasonKey: 'ops_center_action_disabled_no_retry_endpoint' },
    { id: 'recalculate_recommendations', labelKey: 'ops_center_action_recalculate_recommendations', kind: 'recalculate_recommendations', available: false, disabledReasonKey: 'ops_center_action_disabled_computed_live' },
  ];
}

/**
 * The single Operations Center composer. Every field is either read straight from an existing
 * exported function (`getMarketSystemState`, `getMarketNewsAdminProviderStatus`,
 * `computeShariahCounts`) or from one of 3 new bounded, read-only Supabase queries. Uses
 * Promise.allSettled so one failing sub-source degrades only its own section (recorded in
 * `degradedSources`), never the whole payload — mirrors the bounded-timeout pattern already used
 * for the live provider-health probe in aggregateMarketState.ts.
 */
export async function getOperationsCenterState(options: { forceFresh?: boolean } = {}): Promise<OperationsCenterState> {
  const generatedAt = new Date().toISOString();
  const admin = createServerSupabaseAdmin();
  const degradedSources: OperationsCenterState['degradedSources'] = {};

  const [marketSettled, marketNewsSettled, shariahCountsSettled, shariahJobsSettled, reminderRunsSettled, fetchLogsSettled, aiUsageSettled] = await Promise.allSettled([
    getMarketSystemState({ forceFresh: options.forceFresh }),
    withTimeout(getMarketNewsAdminProviderStatus(admin ?? undefined)),
    admin ? withTimeout(computeShariahCounts(admin)) : Promise.reject(new Error('supabase_admin_not_configured')),
    admin ? withTimeout(fetchRecentShariahJobs(admin)) : Promise.reject(new Error('supabase_admin_not_configured')),
    admin ? withTimeout(fetchRecentReminderRuns(admin)) : Promise.reject(new Error('supabase_admin_not_configured')),
    admin ? withTimeout(fetchRecentMarketNewsFetchLogs(admin)) : Promise.reject(new Error('supabase_admin_not_configured')),
    admin ? withTimeout(fetchAiUsageSummary(admin)) : Promise.reject(new Error('supabase_admin_not_configured')),
  ]);

  // getMarketSystemState() never actually rejects (it has its own internal persisted-snapshot /
  // "unknown" fallback) — this branch exists only so a hypothetical future change can't crash the
  // whole Operations Center response.
  const market: MarketSystemState = marketSettled.status === 'fulfilled' ? marketSettled.value : (() => {
    degradedSources.market = describeError(marketSettled.reason);
    return EMPTY_MARKET_STATE;
  })();

  const marketNews: MarketNewsAdminProviderStatus[] = marketNewsSettled.status === 'fulfilled' ? marketNewsSettled.value.providers : (() => { degradedSources.marketNews = describeError(marketNewsSettled.reason); return []; })();
  const shariahCounts: Record<ShariahStatus, number> = shariahCountsSettled.status === 'fulfilled' ? shariahCountsSettled.value : (() => { degradedSources.shariah = describeError(shariahCountsSettled.reason); return { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 }; })();
  const shariahJobs: ShariahJobRow[] = shariahJobsSettled.status === 'fulfilled' ? shariahJobsSettled.value : (() => { degradedSources.shariahJobs = describeError(shariahJobsSettled.reason); return []; })();
  const reminderRuns: ReminderRunRow[] = reminderRunsSettled.status === 'fulfilled' ? reminderRunsSettled.value : (() => { degradedSources.subscriptionReminders = describeError(reminderRunsSettled.reason); return []; })();
  const fetchLogs: FetchLogRow[] = fetchLogsSettled.status === 'fulfilled' ? fetchLogsSettled.value : [];
  const aiUsage = aiUsageSettled.status === 'fulfilled' ? aiUsageSettled.value : (() => { degradedSources.aiUsage = describeError(aiUsageSettled.reason); return { last24h: [], blockedUsersCount: 0, distinctUsersToday: 0 }; })();

  const rootCause = buildRootCauseIssues({ market, marketNews, shariahJobs, reminderRuns });
  const criticalIssueCount = rootCause.filter(issue => issue.severity === 'critical').length;
  const warningCount = rootCause.filter(issue => issue.severity === 'warning').length;
  const databaseReachable = Object.keys(degradedSources).length === 0;
  const featureHealth = buildFeatureHealth(market, shariahJobs, reminderRuns, databaseReachable, Boolean(admin));
  const healthyServiceCount = featureHealth.filter(row => row.status === 'healthy').length;

  const memory = process.memoryUsage();
  const loadAvg = os.platform() === 'win32' ? null : (os.loadavg() as [number, number, number]);
  const latencies = market.providerProfiles.map(profile => profile.latencyMs).filter((value): value is number => value !== null);
  const slowestProviders = market.capabilityMatrix
    .filter(cell => cell.latencyMs !== null)
    .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))
    .slice(0, 5)
    .map(cell => ({ provider: cell.provider, latencyMs: cell.latencyMs as number }));

  return {
    generatedAt,
    overview: {
      overall: computeOverall(market, criticalIssueCount, warningCount),
      healthScorePercent: computeHealthScore(market),
      criticalIssueCount,
      warningCount,
      healthyServiceCount,
      lastSyncAt: market.lastSynchronizedAt,
      processUptimeSeconds: process.uptime(),
    },
    market,
    marketNews,
    featureHealth,
    rootCause,
    symbolCoverage: buildSymbolCoverage(market, shariahCounts),
    shariah: { counts: shariahCounts, recentJobs: shariahJobs },
    subscriptionReminders: { recentRuns: reminderRuns },
    backgroundJobs: {
      shariahResearch: bucketShariahJobs(shariahJobs),
      marketNewsFetch: bucketMarketNewsFetchLogs(fetchLogs),
      subscriptionReminders: bucketReminderRuns(reminderRuns),
      genericQueue: notInstrumented('ops_center_not_instrumented_reason_no_queue_system', 'ops_center_not_instrumented_infra_job_queue', 'unavailable'),
    },
    errorCenter: buildErrorCenter(rootCause, reminderRuns),
    dataQuality: buildDataQuality(market),
    performance: {
      processUptimeSeconds: process.uptime(),
      memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
      loadAvg,
      averageProviderLatencyMs: average(latencies),
      slowestProviders,
      apiRouteTiming: notInstrumented('ops_center_not_instrumented_reason_no_route_timing', 'ops_center_not_instrumented_infra_request_timing_middleware', 'request'),
      cacheHitRate: notInstrumented('ops_center_not_instrumented_reason_no_cache_metrics', 'ops_center_not_instrumented_infra_cache_instrumentation', 'request'),
      mostExpensiveFunctions: notInstrumented('ops_center_not_instrumented_reason_no_profiling', 'ops_center_not_instrumented_infra_profiler', 'unavailable'),
      backgroundQueueDepth: notInstrumented('ops_center_not_instrumented_reason_no_queue_system', 'ops_center_not_instrumented_infra_job_queue', 'unavailable'),
    },
    aiUsage: {
      last24h: aiUsage.last24h,
      blockedUsersCount: aiUsage.blockedUsersCount,
      distinctUsersToday: aiUsage.distinctUsersToday,
      healthScore: notInstrumented('ops_center_not_instrumented_reason_ai_quota_only', 'ops_center_not_instrumented_infra_ai_call_tracking', 'unavailable'),
    },
    actions: buildActions(rootCause),
    degradedSources,
  };
}
