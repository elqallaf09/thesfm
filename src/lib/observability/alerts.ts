import { percentile } from './core';
import type { ObservabilityRow } from './dashboard';

export type AlertCandidate = {
  key: string;
  severity: 'warning' | 'critical';
  metricName: string;
  route: string;
  provider: string;
  deploymentSha: string;
  environment: string;
  observedValue: number;
  thresholdValue: number;
  sampleCount: number;
};

function rateAlert(rows: ObservabilityRow[], options: { key: string; metric: string; threshold: number; minimum: number; failure: (row: ObservabilityRow) => boolean; provider?: string }) {
  if (rows.length < options.minimum) return null;
  const rate = rows.filter(options.failure).length / rows.length;
  if (rate <= options.threshold) return null;
  const latest = [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  return {
    key: options.key, severity: rate > options.threshold * 2 ? 'critical' as const : 'warning' as const,
    metricName: options.metric, route: '*', provider: options.provider ?? '*', deploymentSha: latest.deployment_sha,
    environment: latest.environment, observedValue: rate, thresholdValue: options.threshold, sampleCount: rows.length,
  };
}

export function evaluateAlertCandidates(rows: ObservabilityRow[]): AlertCandidate[] {
  const candidates: AlertCandidate[] = [];
  for (const [name, threshold] of [['LCP', 4_000], ['INP', 500], ['CLS', 0.25]] as const) {
    const matching = rows.filter(row => row.event_type === 'web_vital' && row.metric_name === name);
    if (matching.length < 50) continue;
    const p75 = percentile(matching.map(row => row.metric_value), 0.75);
    if (p75 == null || p75 <= threshold) continue;
    const latest = matching[0];
    candidates.push({ key: `web_vital_${name.toLowerCase()}_p75`, severity: p75 > threshold * 1.25 ? 'critical' : 'warning', metricName: `${name} p75`, route: '*', provider: '*', deploymentSha: latest.deployment_sha, environment: latest.environment, observedValue: p75, thresholdValue: threshold, sampleCount: matching.length });
  }

  const apiRows = rows.filter(row => row.event_type === 'api_metric');
  const apiAlert = rateAlert(apiRows, { key: 'api_5xx_rate', metric: 'API 5xx rate', threshold: 0.05, minimum: 100, failure: row => row.status_class === '5xx' });
  if (apiAlert) candidates.push(apiAlert);

  const providerNames = [...new Set(rows.filter(row => row.event_type === 'provider_metric' && row.provider).map(row => row.provider as string))];
  for (const provider of providerNames) {
    const matching = rows.filter(row => row.event_type === 'provider_metric' && row.provider === provider);
    const failureAlert = rateAlert(matching, { key: 'provider_failure_rate', metric: 'Provider failure rate', threshold: 0.20, minimum: 50, failure: row => Boolean(row.failure_class), provider });
    const fallbackAlert = rateAlert(matching, { key: 'provider_fallback_rate', metric: 'Provider fallback rate', threshold: 0.25, minimum: 50, failure: row => Boolean(row.fallback_used), provider });
    if (failureAlert) candidates.push(failureAlert);
    if (fallbackAlert) candidates.push(fallbackAlert);
  }

  const runtimeGroups = new Map<string, ObservabilityRow[]>();
  for (const row of rows.filter(item => item.event_type === 'client_error' && (item.failure_class === 'hydration' || item.failure_class === 'chunk_load'))) {
    const key = `${row.failure_class}:${row.error_signature || 'unknown'}`;
    runtimeGroups.set(key, [...(runtimeGroups.get(key) ?? []), row]);
  }
  for (const [key, matching] of runtimeGroups) {
    if (matching.length < 5) continue;
    const latest = matching[0];
    candidates.push({ key: `repeated_${key}`, severity: matching.length >= 10 ? 'critical' : 'warning', metricName: key, route: latest.route_template, provider: '*', deploymentSha: latest.deployment_sha, environment: latest.environment, observedValue: matching.length, thresholdValue: 5, sampleCount: matching.length });
  }
  return candidates;
}
