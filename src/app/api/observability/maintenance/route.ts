import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { evaluateAlertCandidates } from '@/lib/observability/alerts';
import type { ObservabilityRow } from '@/lib/observability/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  const presented = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!configured || !presented) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(presented);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function retention(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ code: 'OBSERVABILITY_NOT_CONFIGURED' }, { status: 503 });
  const rawDays = retention('OBSERVABILITY_RETENTION_DAYS', 14, 7, 30);
  const rollupDays = retention('OBSERVABILITY_ROLLUP_RETENTION_DAYS', 180, 30, 365);
  const alertDays = retention('OBSERVABILITY_ALERT_RETENTION_DAYS', 90, 30, 180);
  const [rollup, cleanup] = await Promise.all([
    admin.rpc('rollup_observability_events', { p_now: new Date().toISOString() }),
    admin.rpc('cleanup_observability_data', { p_raw_days: rawDays, p_rollup_days: rollupDays, p_alert_days: alertDays }),
  ]);
  if (rollup.error || cleanup.error) {
    console.error('[observability] maintenance failed', { rollupCode: rollup.error?.code, cleanupCode: cleanup.error?.code });
    return NextResponse.json({ code: 'MAINTENANCE_FAILED' }, { status: 503 });
  }

  let alertCount = 0;
  if (process.env.OBSERVABILITY_ALERTS_ENABLED === 'true') {
    const from = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const { data } = await admin.from('observability_events')
      .select('event_type,metric_name,metric_value,rating,route_template,browser_family,device_class,network_class,deployment_sha,environment,occurred_at,status_class,provider,fallback_used,failure_class,cache_status,error_signature,is_proxy')
      .eq('environment', 'production').gte('occurred_at', from).order('occurred_at', { ascending: false }).limit(20_000);
    const candidates = (data ?? []).length < 20_000 ? evaluateAlertCandidates((data ?? []) as unknown as ObservabilityRow[]) : [];
    if ((data ?? []).length === 20_000) console.warn('[observability] alert evaluation skipped because the query reached its safety limit');
    const { data: existing } = await admin.from('observability_alerts').select('id,alert_key,route_template,provider,deployment_sha,cooldown_until').eq('environment', 'production').is('resolved_at', null);
    const active = new Map((existing ?? []).map(row => [`${row.alert_key}:${row.route_template}:${row.provider}:${row.deployment_sha}`, Date.parse(row.cooldown_until)]));
    const now = Date.now();
    const candidateKeys = new Set(candidates.map(candidate => `${candidate.key}:${candidate.route}:${candidate.provider}:${candidate.deploymentSha}`));
    const resolvedIds = (existing ?? []).filter(row => !candidateKeys.has(`${row.alert_key}:${row.route_template}:${row.provider}:${row.deployment_sha}`)).map(row => row.id);
    if (resolvedIds.length) await admin.from('observability_alerts').update({ resolved_at: new Date(now).toISOString() }).in('id', resolvedIds);
    const rows = candidates.filter(candidate => (active.get(`${candidate.key}:${candidate.route}:${candidate.provider}:${candidate.deploymentSha}`) ?? 0) <= now).map(candidate => ({
      alert_key: candidate.key, severity: candidate.severity, metric_name: candidate.metricName, route_template: candidate.route,
      provider: candidate.provider, deployment_sha: candidate.deploymentSha, environment: candidate.environment,
      observed_value: candidate.observedValue, threshold_value: candidate.thresholdValue, sample_count: candidate.sampleCount,
      last_seen_at: new Date().toISOString(), cooldown_until: new Date(now + 60 * 60_000).toISOString(), resolved_at: null,
    }));
    if (rows.length) {
      const result = await admin.from('observability_alerts').upsert(rows, { onConflict: 'alert_key,route_template,provider,deployment_sha,environment' });
      if (!result.error) {
        alertCount = rows.length;
        for (const row of rows) console.warn(JSON.stringify({ level: 'warn', event: 'observability_alert', ...row }));
      }
    }
  }
  return NextResponse.json({ ok: true, rollupRows: rollup.data ?? 0, cleanup: cleanup.data ?? [], alertsEvaluated: alertCount, retention: { rawDays, rollupDays, alertDays } }, { headers: { 'Cache-Control': 'no-store' } });
}
