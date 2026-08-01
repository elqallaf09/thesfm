import type {
  MetricRating,
  ObservabilityEnvironment,
  ObservabilityEvent,
} from '@/lib/observability/core';

export type WebVitalMetricInput = {
  id: string;
  label: string;
  name: string;
  rating?: string;
  type?: ObservabilityEvent['type'];
  value: number;
};

type ClientRumMetricListener = (metric: WebVitalMetricInput) => void;
const clientRumMetricListeners = new Set<ClientRumMetricListener>();

export function reportClientRumMetric(metric: WebVitalMetricInput) {
  for (const listener of clientRumMetricListeners) listener(metric);
}

export function subscribeClientRumMetric(listener: ClientRumMetricListener) {
  clientRumMetricListeners.add(listener);
  return () => { clientRumMetricListeners.delete(listener); };
}

export type ClientRumContext = Pick<ObservabilityEvent,
  | 'authenticated'
  | 'browserFamily'
  | 'buildVersion'
  | 'deploymentSha'
  | 'deviceClass'
  | 'environment'
  | 'locale'
  | 'networkClass'
  | 'route'
  | 'sessionId'
  | 'theme'
  | 'viewportClass'
>;

export function normalizeRumSampleRate(value: string | undefined, fallback = 0.1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

export function isSampledRumSession(sessionId: string, rate: number) {
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  let hash = 2166136261;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash ^= sessionId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff < rate;
}

export function browserFamily(userAgent: string): ObservabilityEvent['browserFamily'] {
  if (!userAgent) return 'Unknown';
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  return 'Other';
}

export function viewportClass(width: number): ObservabilityEvent['viewportClass'] {
  if (!Number.isFinite(width) || width <= 0) return 'unknown';
  if (width < 640) return 'small';
  if (width < 1024) return 'medium';
  return 'large';
}

export function deviceClass(width: number): ObservabilityEvent['deviceClass'] {
  if (!Number.isFinite(width) || width <= 0) return 'unknown';
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function observabilityEnvironment(hostname: string): ObservabilityEnvironment {
  const host = hostname.toLowerCase();
  if (host === 'the-sfm.com' || host === 'www.the-sfm.com') return 'production';
  if (host.endsWith('.vercel.app')) return 'preview';
  return 'development';
}

function metricRating(value: string | undefined): MetricRating {
  return value === 'good' || value === 'needs-improvement' || value === 'poor'
    ? value
    : 'unknown';
}

function metricType(metric: WebVitalMetricInput): ObservabilityEvent['type'] {
  if (metric.type) return metric.type;
  if (metric.label !== 'custom') return 'web_vital';
  return metric.name === 'Next.js-hydration' ? 'hydration' : 'route_transition';
}

export function createRumMetricEvent(
  metric: WebVitalMetricInput,
  context: ClientRumContext,
  timestamp = new Date(),
): ObservabilityEvent {
  const type = metricType(metric);
  return {
    ...context,
    type,
    name: metric.name.slice(0, 80),
    value: Math.max(0, Number.isFinite(metric.value) ? metric.value : 0),
    rating: metricRating(metric.rating),
    timestamp: timestamp.toISOString(),
    correlationId: metric.id.slice(0, 80),
    navigationKind: type === 'route_transition' ? 'normal' : undefined,
    errorSignature: type === 'client_error' ? metric.id.slice(0, 80) : undefined,
  };
}
