import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { aiGenerationIdentities, checkPrivateAiHealth } from '@/lib/server/aiProvider';
import { AI_GENERATION_FRESH_MS, readAiGenerationOutcomes } from '@/lib/server/aiProviderTelemetry';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { OpsFeatureKey, OpsFeatureMeasurement, OpsHealthEvidence } from './types';
import { persistServiceProbeHistory, readServiceProbeHistory, retainServiceProbeSuccesses, serviceHistoryKey } from './serviceHealthHistory';

const PROBE_TIMEOUT_MS = 3_500;
const CACHE_MS = 30_000;
const DELIVERY_WINDOW_MS = 24 * 60 * 60_000;
const REQUIRED_BUCKETS = ['avatars', 'receipts', 'income-attachments', 'project-documents', 'charity-documents', 'company-assets', 'subscription-client-assets'] as const;
const DELIVERY_ERROR_CODES = new Set([
  'WORKER_INTERRUPTED', 'CHANNEL_NOT_CONFIGURED', 'PROVIDER_DELIVERY_FAILED',
  'PROVIDER_RATE_LIMITED', 'DELIVERY_UNKNOWN', 'SOURCE_UNAVAILABLE', 'AUTH_UNAVAILABLE',
]);

type Measurements = Partial<Record<OpsFeatureKey, OpsFeatureMeasurement>>;
type DeliveryRow = { status: string; error_code: string | null; created_at: string; available_at: string | null; locked_at: string | null };
let cached: { key: string; expiresAt: number; value: Measurements } | null = null;
let pending: { key: string; value: Promise<Measurements> } | null = null;

function evidence(source: string, overrides: Partial<OpsHealthEvidence> = {}): OpsHealthEvidence {
  return { source, scope: 'runtime', checkedAt: null, lastSuccessAt: null, reasonKey: null, reason: null, ...overrides };
}

function noAdmin(source: string): OpsFeatureMeasurement {
  return {
    status: 'uninstrumented', detailKey: 'ops_center_probe_admin_not_configured',
    evidence: [evidence(source, { scope: 'configuration', status: 'uninstrumented', reasonKey: 'ops_center_probe_admin_not_configured' })],
  };
}

/** A failed diagnostic query must never disclose the response body or user-controlled values. */
function safeQueryCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'PROBE_UNAVAILABLE';
  const value = error as { code?: unknown; name?: unknown; status?: unknown; statusCode?: unknown };
  if (value.name === 'AbortError' || value.name === 'TimeoutError') return 'PROBE_TIMEOUT';
  const status = Number(value.status ?? value.statusCode);
  if (status === 401 || status === 403) return 'PROBE_ACCESS_REJECTED';
  if (status === 429) return 'PROBE_RATE_LIMITED';
  if (value.code === '42P01' || value.code === 'PGRST205') return 'PROBE_TABLE_UNAVAILABLE';
  if (value.code === '42501') return 'PROBE_ACCESS_REJECTED';
  return 'PROBE_UNAVAILABLE';
}

function safeDeliveryCode(value: string | null): string | null {
  if (!value) return null;
  return DELIVERY_ERROR_CODES.has(value) || /^PROVIDER_[1-5][0-9]{2}$/.test(value) ? value : null;
}

async function bounded<T>(operation: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = PROBE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const error = new Error('PROBE_TIMEOUT');
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function measureAi(admin: SupabaseClient | null): Promise<OpsFeatureMeasurement> {
  const identities = aiGenerationIdentities();
  if (identities.length === 0) {
    return {
      status: 'disabled', detailKey: 'ops_center_probe_ai_not_configured',
      evidence: [evidence('ops_center_source_ai_models', { scope: 'configuration', status: 'disabled', reasonKey: 'ops_center_probe_ai_not_configured' })],
    };
  }
  const [nodes, telemetry] = await Promise.all([
    checkPrivateAiHealth({ timeoutMs: PROBE_TIMEOUT_MS }),
    readAiGenerationOutcomes(identities, admin),
  ]);
  const now = Date.now();
  const modelEvidence: OpsHealthEvidence[] = nodes.map(node => evidence('ops_center_source_ai_models', {
    provider: node.provider, capability: 'ops_center_source_ai_models', checkedAt: node.checkedAt,
    lastSuccessAt: node.modelAvailable ? node.checkedAt : null, latencyMs: node.latencyMs,
    status: node.modelAvailable ? 'healthy' : node.status === 404 || node.status === 405 ? 'unmeasured' : node.status === 429 ? 'partial' : 'failed',
    reasonKey: node.modelAvailable ? 'ops_center_probe_ai_models_available' : 'ops_center_probe_ai_models_failed',
    reason: node.reasonCode,
  }));
  const details: OpsHealthEvidence[] = [];
  const generationStatuses: OpsFeatureMeasurement['status'][] = [];
  for (const identity of identities) {
    const outcomes = telemetry.outcomes
      .filter(row => row.capability === identity.capability && row.configurationId === identity.configurationId)
      .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt) || Number(b.outcome === 'failure') - Number(a.outcome === 'failure'));
    const latest = outcomes[0];
    const success = outcomes.find(row => row.outcome === 'success');
    const recent = latest && now - Date.parse(latest.checkedAt) <= AI_GENERATION_FRESH_MS;
    const status = !recent ? 'unmeasured' : latest.outcome === 'success' ? 'healthy'
      : latest.reasonCode === 'AI_PROVIDER_RATE_LIMITED' ? 'partial' : 'failed';
    generationStatuses.push(status);
    details.push(evidence('ops_center_source_ai_generation', {
      provider: latest?.provider ?? null, capability: identity.capability === 'text' ? 'ops_center_ai_text' : 'ops_center_ai_vision',
      status, checkedAt: latest?.checkedAt ?? null, lastSuccessAt: success?.checkedAt ?? null,
      latencyMs: latest?.latencyMs ?? null, reason: latest?.reasonCode ?? null,
      reasonKey: !telemetry.available ? 'ops_center_probe_ai_generation_tracking_unavailable'
        : !latest ? 'ops_center_probe_ai_generation_unmeasured'
        : !recent ? 'ops_center_probe_ai_generation_stale'
        : latest.outcome === 'success' ? 'ops_center_probe_ai_generation_recent' : 'ops_center_probe_ai_generation_failed',
    }));
  }
  // Transport telemetry represents final requests after failover. A failed primary attempt
  // followed by a real fallback answer is recorded as one successful generation.
  const hasSuccess = generationStatuses.includes('healthy');
  const hasFailure = generationStatuses.some(status => status === 'failed' || status === 'partial');
  const allModelProbesFailed = nodes.length > 0 && modelEvidence.every(row => row.status === 'failed');
  const status = hasFailure ? hasSuccess || generationStatuses.includes('partial') ? 'partial' : 'failed'
    : generationStatuses.includes('unmeasured') ? !hasSuccess && allModelProbesFailed ? 'failed' : 'unmeasured'
    : 'healthy';
  return {
    status,
    detailKey: status === 'healthy' ? 'ops_center_probe_ai_generation_recent'
      : hasFailure ? 'ops_center_probe_ai_generation_failed'
      : allModelProbesFailed ? 'ops_center_probe_ai_models_failed' : 'ops_center_probe_ai_models_only',
    evidence: [...details, ...modelEvidence],
  };
}

async function measureNotifications(admin: SupabaseClient | null): Promise<OpsFeatureMeasurement> {
  if (!admin) return noAdmin('ops_center_source_notification_inbox');
  const started = Date.now();
  const since = new Date(started - DELIVERY_WINDOW_MS).toISOString();
  const [inbox, deliveries] = await Promise.allSettled([
    bounded(signal => admin.from('notifications').select('created_at').order('created_at', { ascending: false }).limit(1).abortSignal(signal)),
    bounded(signal => admin.from('sfm_notification_deliveries')
      .select('status,error_code,created_at,available_at,locked_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(100).abortSignal(signal)),
  ]);
  const checkedAt = new Date().toISOString();
  const inboxError = inbox.status === 'rejected' ? inbox.reason : inbox.value.error;
  const inboxOk = !inboxError;
  const details: OpsHealthEvidence[] = [evidence('ops_center_source_notification_inbox', {
    provider: 'supabase', checkedAt, lastSuccessAt: inboxOk ? checkedAt : null,
    status: inboxOk ? 'healthy' : 'failed', latencyMs: Date.now() - started,
    reasonKey: inboxOk ? 'ops_center_probe_notification_read_only' : 'ops_center_probe_notification_inbox_failed',
    reason: inboxOk ? null : safeQueryCode(inboxError),
  })];
  const deliveryError = deliveries.status === 'rejected' ? deliveries.reason : deliveries.value.error;
  if (deliveryError) {
    details.push(evidence('ops_center_source_notification_delivery', {
      provider: 'supabase', checkedAt, status: 'unmeasured',
      reasonKey: 'ops_center_probe_notification_unavailable', reason: safeQueryCode(deliveryError),
    }));
    return { status: inboxOk ? 'unmeasured' : 'failed', detailKey: 'ops_center_probe_notification_unavailable', evidence: details };
  }
  const rows: DeliveryRow[] = deliveries.status === 'fulfilled' ? (deliveries.value.data ?? []) as DeliveryRow[] : [];
  const failed = rows.find(row => row.status === 'failed' || row.status === 'uncertain');
  const retrying = rows.find(row => row.status === 'queued' && safeDeliveryCode(row.error_code));
  const confirmed = rows.some(row => row.status === 'delivered');
  const accepted = rows.some(row => row.status === 'accepted');
  const queued = rows.some(row => row.status === 'queued' || row.status === 'sending');
  if (accepted) {
    details.push(evidence('ops_center_source_notification_handoff', {
      provider: 'notification_delivery_ledger', checkedAt, status: 'healthy',
      // created_at is the enqueue time, not the provider-acceptance timestamp.
      lastSuccessAt: null, reasonKey: 'ops_center_probe_notification_accepted',
    }));
  }
  const deliveryStatus = failed || retrying ? 'partial' : confirmed ? 'healthy' : 'unmeasured';
  details.push(evidence('ops_center_source_notification_delivery', {
    provider: 'notification_delivery_ledger', checkedAt, status: deliveryStatus, lastSuccessAt: null,
    reasonKey: failed ? 'ops_center_probe_notification_failed' : retrying ? 'ops_center_probe_notification_pending' : confirmed ? 'ops_center_probe_notification_confirmed'
      : queued ? 'ops_center_probe_notification_pending' : accepted ? 'ops_center_probe_notification_accepted' : 'ops_center_probe_notification_delivery_none',
    // Even a syntactically plausible error_code can contain a user-controlled value.
    // Emit only reviewed writer/webhook codes, HTTP status markers, or a generic failure.
    reason: failed ? safeDeliveryCode(failed.error_code) ?? (failed.status === 'uncertain' ? 'DELIVERY_UNCONFIRMED' : 'DELIVERY_FAILED')
      : retrying ? safeDeliveryCode(retrying.error_code) : null,
  }));
  return {
    status: !inboxOk ? 'failed' : deliveryStatus,
    detailKey: !inboxOk ? 'ops_center_probe_notification_inbox_failed' : details[details.length - 1].reasonKey,
    evidence: details,
  };
}

function boundedStorageClient(signal: AbortSignal): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Storage listBuckets has no per-call AbortSignal. A dedicated server client gives its
  // actual HTTP request (including body consumption) the same bounded cancellation scope.
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
  });
}

async function measureStorage(admin: SupabaseClient | null): Promise<OpsFeatureMeasurement> {
  if (!admin) return noAdmin('ops_center_source_storage_buckets');
  const started = Date.now();
  try {
    const { data, error } = await bounded(async signal => {
      const storage = boundedStorageClient(signal);
      if (!storage) throw new Error('PROBE_UNAVAILABLE');
      return storage.storage.listBuckets({ limit: 100, offset: 0 });
    });
    if (error) throw error;
    const checkedAt = new Date().toISOString();
    const ids = new Set((data ?? []).map(row => row.id));
    const missing = REQUIRED_BUCKETS.filter(id => !ids.has(id));
    const details: OpsHealthEvidence[] = [evidence('ops_center_source_storage_buckets', {
      provider: 'supabase', capability: 'ops_center_source_storage_buckets', checkedAt, lastSuccessAt: checkedAt,
      status: 'healthy', latencyMs: Date.now() - started, reasonKey: 'ops_center_probe_storage_admin_only',
    })];
    const scanLimited = missing.length > 0 && (data?.length ?? 0) >= 100;
    details.push(evidence('ops_center_source_storage_buckets', {
      provider: 'supabase', capability: 'ops_center_storage_required_buckets', checkedAt,
      status: scanLimited ? 'unmeasured' : missing.length ? 'partial' : 'healthy',
      lastSuccessAt: !missing.length ? checkedAt : null,
      reasonKey: scanLimited ? 'ops_center_probe_storage_scan_limited' : missing.length ? 'ops_center_probe_storage_missing_bucket' : 'ops_center_probe_storage_admin_only',
      reason: scanLimited ? 'BUCKET_SCAN_LIMIT_REACHED' : missing.length ? missing.join(', ') : null,
    }));
    return { status: scanLimited ? 'unmeasured' : missing.length ? 'partial' : 'healthy', detailKey: 'ops_center_probe_storage_admin_only', evidence: details };
  } catch (error) {
    return {
      status: 'failed', detailKey: 'ops_center_probe_storage_failed',
      evidence: [evidence('ops_center_source_storage_buckets', {
        provider: 'supabase', capability: 'ops_center_source_storage_buckets', checkedAt: new Date().toISOString(), status: 'failed', latencyMs: Date.now() - started,
        reasonKey: 'ops_center_probe_storage_failed', reason: safeQueryCode(error),
      })],
    };
  }
}

/** Independent real, bounded observations. These never send an AI prompt, notification, or
 * upload; normal traffic supplies generation and delivery evidence. The 30s cache retains
 * original checkedAt timestamps. Manual refresh bypasses that cache but shares in-flight work. */
export async function getOperationalServiceHealth(options: {
  admin?: SupabaseClient | null; forceFresh?: boolean;
} = {}): Promise<Measurements> {
  const admin = options.admin === undefined ? createServerSupabaseAdmin() : options.admin;
  const key = serviceHistoryKey(JSON.stringify([
    Boolean(admin), process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY || null,
    aiGenerationIdentities(),
  ]));
  if (!options.forceFresh && cached?.key === key && cached.expiresAt > Date.now()) return cached.value;
  if (pending?.key === key) return pending.value;
  const previous = cached?.key === key ? Object.values(cached.value) : [];
  const value = Promise.all([measureAi(admin), measureNotifications(admin), measureStorage(admin), readServiceProbeHistory(admin, key)])
    .then(([ai_services, notifications, storage, history]) => {
      const result = { ai_services, notifications, storage };
      const successes = retainServiceProbeSuccesses(Object.values(result), previous, history);
      persistServiceProbeHistory(admin, key, successes);
      cached = { key, expiresAt: Date.now() + CACHE_MS, value: result };
      return result;
    }).finally(() => { if (pending?.value === value) pending = null; });
  pending = { key, value };
  return value;
}

export function __resetOperationalServiceHealthForTests() {
  cached = null;
  pending = null;
}
