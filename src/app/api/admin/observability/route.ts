import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { aggregateObservability, type ObservabilityRow } from '@/lib/observability/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = 'event_type,metric_name,metric_value,rating,route_template,browser_family,device_class,network_class,deployment_sha,environment,occurred_at,status_class,provider,fallback_used,failure_class,cache_status,error_signature,is_proxy';

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard');
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status });
  const url = new URL(request.url);
  const environment = url.searchParams.get('environment') === 'preview' ? 'preview' : 'production';
  const hours = url.searchParams.get('range') === '7d' ? 24 * 7 : url.searchParams.get('range') === '48h' ? 48 : 24;
  const from = new Date(Date.now() - hours * 60 * 60_000).toISOString();
  const { data, error } = await auth.admin
    .from('observability_events')
    .select(SELECT_COLUMNS)
    .eq('environment', environment)
    .gte('occurred_at', from)
    .order('occurred_at', { ascending: false })
    .limit(20_000);
  if (error) {
    const missing = error.code === '42P01' || error.code === 'PGRST205';
    if (!missing) console.error('[admin-observability] load failed', { code: error.code });
    return NextResponse.json({ ok: true, hasData: false, configured: !missing, environment, rangeHours: hours, sampleCount: 0, generatedAt: new Date().toISOString(), vitals: [], routes: [], errors: [], apis: [], providers: [], deployments: [], deploymentComparison: [], distributions: { browsers: [], devices: [], networks: [] }, alerts: [] });
  }
  const rows = (data ?? []) as unknown as ObservabilityRow[];
  const [{ data: alerts }, { data: fingerprints }] = await Promise.all([
    auth.admin.from('observability_alerts')
      .select('alert_key,severity,metric_name,route_template,provider,deployment_sha,observed_value,threshold_value,sample_count,last_seen_at,cooldown_until,resolved_at')
      .eq('environment', environment).is('resolved_at', null).order('last_seen_at', { ascending: false }).limit(50),
    auth.admin.from('observability_error_fingerprints')
      .select('error_signature,route_template,browser_family,deployment_sha,frequency,first_seen_at,last_seen_at')
      .eq('environment', environment).gte('last_seen_at', from).order('frequency', { ascending: false }).limit(100),
  ]);
  const aggregated = aggregateObservability(rows);
  const retainedErrors = (fingerprints ?? []).map(row => ({
    signature: row.error_signature,
    frequency: Number(row.frequency) || 0,
    firstSeen: row.first_seen_at,
    lastSeen: row.last_seen_at,
    routes: [row.route_template],
    browsers: [row.browser_family],
    deployments: [row.deployment_sha],
  }));
  return NextResponse.json({
    ok: true,
    hasData: rows.length > 0,
    configured: true,
    environment,
    rangeHours: hours,
    sampleCount: rows.length,
    truncated: rows.length === 20_000,
    generatedAt: new Date().toISOString(),
    lastEventAt: rows[0]?.occurred_at ?? null,
    ...aggregated,
    errors: retainedErrors.length ? retainedErrors : aggregated.errors,
    alerts: alerts ?? [],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
