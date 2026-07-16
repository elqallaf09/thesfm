import { describe, expect, it } from 'vitest';
import { aggregateObservability, type ObservabilityRow } from '@/lib/observability/dashboard';
import { evaluateAlertCandidates } from '@/lib/observability/alerts';

function row(overrides: Partial<ObservabilityRow> = {}): ObservabilityRow {
  return { event_type: 'web_vital', metric_name: 'LCP', metric_value: 1000, rating: 'good', route_template: '/dashboard', browser_family: 'Chrome', device_class: 'desktop', network_class: '4g', deployment_sha: 'sha-current', environment: 'production', occurred_at: '2026-07-16T10:00:00Z', status_class: null, provider: null, fallback_used: null, failure_class: null, cache_status: null, error_signature: null, is_proxy: false, ...overrides };
}

describe('observability aggregation data quality', () => {
  it('shows sample counts and withholds percentiles for tiny samples', () => {
    const result = aggregateObservability([row(), row({ metric_value: 2000 })]);
    expect(result.vitals.find(item => item.name === 'LCP')).toMatchObject({ samples: 2, p75: null });
  });

  it('calculates an authoritative p75 at twenty samples', () => {
    const result = aggregateObservability(Array.from({ length: 20 }, (_, index) => row({ metric_value: index + 1 })));
    expect(result.vitals.find(item => item.name === 'LCP')?.p75).toBe(15.25);
  });

  it('classifies provider degradation only after minimum samples', () => {
    const failures = Array.from({ length: 50 }, () => row({ event_type: 'provider_metric', metric_name: 'provider_failure', provider: 'metals_live', failure_class: 'tls', fallback_used: true }));
    const alerts = evaluateAlertCandidates(failures);
    expect(alerts.map(alert => alert.key)).toEqual(expect.arrayContaining(['provider_failure_rate', 'provider_fallback_rate']));
    expect(evaluateAlertCandidates(failures.slice(0, 49))).toHaveLength(0);
  });
});
