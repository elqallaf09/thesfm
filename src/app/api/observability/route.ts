import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { validateObservabilityBatch } from '@/lib/observability/core';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function serverEnvironment() {
  const value = process.env.VERCEL_ENV;
  return value === 'production' || value === 'preview' ? value : 'development';
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return serverEnvironment() === 'development';
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  return origin === requestOrigin || Boolean(configured && origin === configured);
}

function rateLimitKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const agentClass = (request.headers.get('user-agent') || 'unknown').slice(0, 80);
  return createHash('sha256').update(`${forwarded}:${agentClass}`).digest('hex').slice(0, 20);
}

function rateLimited(request: Request, now = Date.now()) {
  if (rateBuckets.size > 2_000) {
    for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
  const key = rateLimitKey(request);
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  existing.count += 1;
  return existing.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED !== 'true') return new NextResponse(null, { status: 204 });
  if (!allowedOrigin(request)) return NextResponse.json({ code: 'ORIGIN_REJECTED' }, { status: 403 });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ code: 'CONTENT_TYPE_REQUIRED' }, { status: 415 });
  }
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_BODY_BYTES) return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  if (rateLimited(request)) return NextResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } });

  const raw = await request.text().catch(() => '');
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ code: 'INVALID_JSON' }, { status: 400 }); }
  const batch = validateObservabilityBatch(parsed);
  if (!batch) return NextResponse.json({ code: 'INVALID_EVENT_SCHEMA' }, { status: 400 });
  if (batch.events.some(event => event.type === 'provider_metric')) {
    return NextResponse.json({ code: 'SERVER_METRIC_REQUIRED' }, { status: 400 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ code: 'OBSERVABILITY_NOT_CONFIGURED' }, { status: 503 });
  const now = Date.now();
  const deploymentSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_DEPLOYMENT_SHA || 'unknown').slice(0, 80);
  const buildVersion = (process.env.NEXT_PUBLIC_BUILD_VERSION || process.env.npm_package_version || 'unknown').slice(0, 80);
  const environment = serverEnvironment();
  const rows = batch.events.map(event => ({
    event_type: event.type,
    metric_name: event.name,
    metric_value: event.value,
    rating: event.rating ?? null,
    route_template: event.route,
    session_id: event.sessionId,
    authenticated: event.authenticated,
    locale: event.locale,
    theme: event.theme,
    viewport_class: event.viewportClass,
    device_class: event.deviceClass,
    browser_family: event.browserFamily,
    network_class: event.networkClass,
    deployment_sha: deploymentSha,
    build_version: buildVersion,
    environment,
    occurred_at: new Date(Math.min(now + 60_000, Math.max(now - 24 * 60 * 60_000, Date.parse(event.timestamp)))).toISOString(),
    status_class: event.statusClass ?? null,
    method: event.method ?? null,
    cache_status: event.cacheStatus ?? null,
    provider: event.provider ?? null,
    endpoint_class: event.endpointClass ?? null,
    asset_class: event.assetClass ?? null,
    fallback_used: event.fallbackUsed ?? null,
    failure_class: event.failureClass ?? null,
    retry_count: event.retryCount ?? null,
    event_count: event.count ?? null,
    total_duration: event.totalDuration ?? null,
    longest_duration: event.longestDuration ?? null,
    support_state: event.supportState ?? null,
    navigation_kind: event.navigationKind ?? null,
    cached: event.cached ?? null,
    is_proxy: event.proxy ?? null,
    error_signature: event.errorSignature ?? null,
    correlation_id: event.correlationId ?? null,
  }));
  const { error } = await admin.from('observability_events').insert(rows);
  if (error) {
    console.error('[observability] ingestion failed', { code: error.code, eventCount: rows.length, environment, deploymentSha });
    return NextResponse.json({ code: 'INGESTION_FAILED' }, { status: 503 });
  }
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
