import 'server-only';

import { after } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

type ProviderMetric = {
  provider: string;
  endpointClass: string;
  assetClass?: string | null;
  durationMs: number;
  fallbackUsed: boolean;
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'unknown';
  failureClass?: string | null;
  retryCount?: number;
};

function environment() {
  return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_ENV : 'development';
}

function normalizedAssetClass(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('crypto')) return 'crypto';
  if (normalized.includes('forex') || normalized.includes('currency')) return 'forex';
  if (normalized.includes('commodity') || normalized.includes('metal')) return 'commodity';
  if (normalized.includes('index')) return 'index';
  if (normalized.includes('fund') || normalized.includes('etf')) return 'fund';
  if (normalized.includes('stock') || normalized.includes('equity')) return 'stock';
  return 'unknown';
}

async function writeProviderMetric(metric: ProviderMetric) {
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED !== 'true') return;
  const admin = createServerSupabaseAdmin();
  if (!admin) return;
  const deploymentSha = (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 80);
  const { error } = await admin.from('observability_events').insert({
    event_type: 'provider_metric', metric_name: metric.failureClass ? 'provider_failure' : 'provider_duration',
    metric_value: Math.max(0, metric.durationMs), rating: null, route_template: '/server/provider',
    session_id: `server_${crypto.randomUUID().replaceAll('-', '')}`, authenticated: false,
    locale: 'unknown', theme: 'unknown', viewport_class: 'unknown', device_class: 'unknown',
    browser_family: 'Unknown', network_class: 'unknown', deployment_sha: deploymentSha,
    build_version: (process.env.NEXT_PUBLIC_BUILD_VERSION || process.env.npm_package_version || 'unknown').slice(0, 80),
    environment: environment(), occurred_at: new Date().toISOString(), provider: metric.provider.slice(0, 80),
    endpoint_class: metric.endpointClass.slice(0, 80), asset_class: normalizedAssetClass(metric.assetClass),
    fallback_used: metric.fallbackUsed, cache_status: metric.cacheStatus ?? 'unknown',
    failure_class: metric.failureClass?.slice(0, 80) ?? null, retry_count: Math.min(20, Math.max(0, metric.retryCount ?? 0)),
  });
  if (error) console.error('[observability] provider metric insert failed', { code: error.code, provider: metric.provider, deploymentSha });
}

export function recordProviderMetric(metric: ProviderMetric) {
  const successRate = Number(process.env.OBSERVABILITY_PROVIDER_SUCCESS_SAMPLE_RATE ?? '0.05');
  if (!metric.failureClass && Math.random() >= Math.max(0, Math.min(1, successRate))) return;
  try {
    after(() => writeProviderMetric(metric));
  } catch {
    // When invoked outside a request lifecycle, preserve provider behavior and rely on structured logs.
  }
}
