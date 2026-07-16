import { authoritativePercentile } from './core';

export type ObservabilityRow = {
  event_type: string;
  metric_name: string;
  metric_value: number;
  rating: string | null;
  route_template: string;
  browser_family: string;
  device_class: string;
  network_class: string;
  deployment_sha: string;
  environment: string;
  occurred_at: string;
  status_class: string | null;
  provider: string | null;
  fallback_used: boolean | null;
  failure_class: string | null;
  cache_status: string | null;
  error_signature: string | null;
  is_proxy: boolean | null;
};

type Group = { values: number[]; samples: number; failures: number; fallbacks: number; cacheHits: number; lastSeen: string | null };

function grouped(rows: ObservabilityRow[], key: (row: ObservabilityRow) => string) {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const name = key(row);
    const group = groups.get(name) ?? { values: [], samples: 0, failures: 0, fallbacks: 0, cacheHits: 0, lastSeen: null };
    if (Number.isFinite(row.metric_value)) group.values.push(row.metric_value);
    group.samples += 1;
    if (row.failure_class || row.status_class === '5xx') group.failures += 1;
    if (row.fallback_used) group.fallbacks += 1;
    if (row.cache_status === 'hit') group.cacheHits += 1;
    if (!group.lastSeen || row.occurred_at > group.lastSeen) group.lastSeen = row.occurred_at;
    groups.set(name, group);
  }
  return groups;
}

function summary(group: Group) {
  return {
    samples: group.samples,
    p50: authoritativePercentile(group.values, 0.50),
    p75: authoritativePercentile(group.values, 0.75),
    p95: authoritativePercentile(group.values, 0.95),
    failureRate: group.samples ? group.failures / group.samples : 0,
    fallbackRate: group.samples ? group.fallbacks / group.samples : 0,
    cacheHitRate: group.samples ? group.cacheHits / group.samples : 0,
    lastSeen: group.lastSeen,
  };
}

export function aggregateObservability(rows: ObservabilityRow[]) {
  const vitals = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map(name => {
    const metricRows = rows.filter(row => row.event_type === 'web_vital' && row.metric_name === name);
    const values = metricRows.map(row => row.metric_value);
    return {
      name,
      samples: metricRows.length,
      p75: authoritativePercentile(values, 0.75),
      good: metricRows.filter(row => row.rating === 'good').length,
      needsImprovement: metricRows.filter(row => row.rating === 'needs-improvement').length,
      poor: metricRows.filter(row => row.rating === 'poor').length,
    };
  });

  const routeRows = rows.filter(row => row.event_type === 'route_transition' || row.event_type === 'hydration' || row.event_type === 'client_error');
  const routes = Array.from(grouped(routeRows, row => row.route_template).entries()).map(([route, group]) => {
    const relevant = routeRows.filter(row => row.route_template === route);
    return {
      route,
      ...summary(group),
      transitionP75: authoritativePercentile(relevant.filter(row => row.event_type === 'route_transition').map(row => row.metric_value), 0.75),
      hydrationProxyP75: authoritativePercentile(relevant.filter(row => row.event_type === 'hydration').map(row => row.metric_value), 0.75),
      errors: relevant.filter(row => row.event_type === 'client_error').length,
    };
  }).sort((a, b) => (b.transitionP75 ?? -1) - (a.transitionP75 ?? -1)).slice(0, 30);

  const errors = Array.from(grouped(rows.filter(row => row.event_type === 'client_error'), row => row.error_signature || 'unclassified').entries())
    .map(([signature, group]) => {
      const matching = rows.filter(row => row.event_type === 'client_error' && (row.error_signature || 'unclassified') === signature);
      const seen = matching.map(row => row.occurred_at).sort();
      return { signature, frequency: group.samples, firstSeen: seen[0] ?? null, lastSeen: seen.at(-1) ?? null, routes: [...new Set(matching.map(row => row.route_template))].slice(0, 5), browsers: [...new Set(matching.map(row => row.browser_family))].slice(0, 5), deployments: [...new Set(matching.map(row => row.deployment_sha))].slice(0, 3) };
    }).sort((a, b) => b.frequency - a.frequency).slice(0, 30);

  const apis = Array.from(grouped(rows.filter(row => row.event_type === 'api_metric'), row => row.route_template).entries())
    .map(([route, group]) => ({ route, ...summary(group) })).sort((a, b) => (b.p95 ?? -1) - (a.p95 ?? -1)).slice(0, 30);

  const providers = Array.from(grouped(rows.filter(row => row.event_type === 'provider_metric'), row => row.provider || 'unclassified').entries())
    .map(([provider, group]) => ({ provider, ...summary(group) })).sort((a, b) => b.failureRate - a.failureRate).slice(0, 30);

  const deployments = Array.from(grouped(rows, row => row.deployment_sha).entries())
    .map(([deploymentSha, group]) => ({ deploymentSha, ...summary(group) })).sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')).slice(0, 5);

  const deploymentComparison: Array<{ metric: string; current: number; previous: number; delta: number; status: 'improved' | 'regressed' | 'stable'; currentSamples: number; previousSamples: number }> = [];
  if (deployments.length >= 2) {
    const [current, previous] = deployments;
    for (const metric of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']) {
      const currentRows = rows.filter(row => row.deployment_sha === current.deploymentSha && row.event_type === 'web_vital' && row.metric_name === metric);
      const previousRows = rows.filter(row => row.deployment_sha === previous.deploymentSha && row.event_type === 'web_vital' && row.metric_name === metric);
      const currentP75 = authoritativePercentile(currentRows.map(row => row.metric_value), 0.75);
      const previousP75 = authoritativePercentile(previousRows.map(row => row.metric_value), 0.75);
      if (currentP75 == null || previousP75 == null || previousP75 === 0) continue;
      const delta = (currentP75 - previousP75) / previousP75;
      deploymentComparison.push({ metric: `${metric} p75`, current: currentP75, previous: previousP75, delta, status: delta > 0.10 ? 'regressed' : delta < -0.10 ? 'improved' : 'stable', currentSamples: currentRows.length, previousSamples: previousRows.length });
    }
  }

  const distributions = {
    browsers: Array.from(grouped(rows, row => row.browser_family).entries()).map(([name, group]) => ({ name, samples: group.samples })).sort((a, b) => b.samples - a.samples),
    devices: Array.from(grouped(rows, row => row.device_class).entries()).map(([name, group]) => ({ name, samples: group.samples })).sort((a, b) => b.samples - a.samples),
    networks: Array.from(grouped(rows, row => row.network_class).entries()).map(([name, group]) => ({ name, samples: group.samples })).sort((a, b) => b.samples - a.samples),
  };

  return { vitals, routes, errors, apis, providers, deployments, deploymentComparison, distributions };
}
