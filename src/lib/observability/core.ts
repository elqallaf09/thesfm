export const OBSERVABILITY_EVENT_TYPES = [
  'web_vital',
  'route_transition',
  'hydration',
  'long_task',
  'memory',
  'client_error',
  'api_metric',
  'provider_metric',
  'session_stability',
] as const;

export type ObservabilityEventType = (typeof OBSERVABILITY_EVENT_TYPES)[number];
export type ObservabilityEnvironment = 'production' | 'preview' | 'development';
export type MetricRating = 'good' | 'needs-improvement' | 'poor' | 'unknown';

export type ObservabilityEvent = {
  type: ObservabilityEventType;
  name: string;
  value: number;
  rating?: MetricRating;
  route: string;
  timestamp: string;
  sessionId: string;
  authenticated: boolean;
  locale: 'ar' | 'en' | 'fr' | 'unknown';
  theme: 'light' | 'dark' | 'system' | 'unknown';
  viewportClass: 'small' | 'medium' | 'large' | 'unknown';
  deviceClass: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browserFamily: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other' | 'Unknown';
  networkClass: 'slow-2g' | '2g' | '3g' | '4g' | 'offline' | 'unknown';
  deploymentSha: string;
  buildVersion: string;
  environment: ObservabilityEnvironment;
  statusClass?: '2xx' | '3xx' | '4xx' | '5xx' | 'unknown';
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'unknown';
  provider?: string;
  endpointClass?: string;
  assetClass?: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'fund' | 'unknown';
  fallbackUsed?: boolean;
  failureClass?: string;
  retryCount?: number;
  count?: number;
  totalDuration?: number;
  longestDuration?: number;
  supportState?: 'supported' | 'unsupported' | 'denied' | 'failed';
  navigationKind?: 'normal' | 'auth_redirect' | 'guest_redirect' | 'cancelled' | 'prefetch_cancelled' | 'offline' | 'hard_reload' | 'failed' | 'redirect';
  cached?: boolean;
  proxy?: boolean;
  errorSignature?: string;
  firstSeen?: string;
  lastSeen?: string;
  correlationId?: string;
};

export type ObservabilityBatch = { events: ObservabilityEvent[] };

const EVENT_TYPES = new Set<string>(OBSERVABILITY_EVENT_TYPES);
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_SEGMENT = /^(?:[0-9]{4,}|[0-9a-f]{16,}|[A-Za-z0-9_-]{24,})$/;
const DYNAMIC_PARENTS: Record<string, string> = {
  invest: '[id]',
  investments: '[id]',
  reports: '[id]',
  projects: '[id]',
  goals: '[id]',
  debts: '[id]',
  companies: '[companyId]',
  roles: '[id]',
  users: '[id]',
  ebooks: '[slug]',
  investor: '[token]',
  subscriptions: '[clientId]',
  'symbol-details': '[symbol]',
  'ai-analysis': '[market]',
  markets: '[market]',
  'market-analysis': '[market]',
  'company-listings': '[id]',
  results: '[resultId]',
  jobs: '[jobId]',
  analysis: '[symbol]',
  signals: '[symbol]',
  owner: '[id]',
};
const STATIC_DYNAMIC_CHILDREN = new Set(['invest/add', 'projects/ad-calculator']);
const SECRET_VALUE = /(?:bearer\s+[a-z0-9._~+/=-]+|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|(?:api[_-]?key|access[_-]?token|authorization|password|secret)\s*[:=])/i;
const URL_IN_TEXT = /https?:\/\/[^\s)\]}>'"]+/gi;

export function normalizeRoute(input: string): string {
  let pathname = '/';
  try {
    pathname = input.startsWith('http://') || input.startsWith('https://')
      ? new URL(input).pathname
      : input.split(/[?#]/, 1)[0] || '/';
  } catch {
    pathname = '/';
  }

  const segments = pathname.split('/').filter(Boolean);
  const normalized = segments.map((segment, index) => {
    let decoded = segment;
    try { decoded = decodeURIComponent(segment); } catch { decoded = segment; }
    const parent = index > 0 ? segments[index - 1].toLowerCase() : '';
    if (DYNAMIC_PARENTS[parent] && !STATIC_DYNAMIC_CHILDREN.has(`${parent}/${decoded.toLowerCase()}`)) {
      return DYNAMIC_PARENTS[parent];
    }
    if (UUID_SEGMENT.test(decoded) || OPAQUE_SEGMENT.test(decoded)) return '[id]';
    return decoded.slice(0, 80).replace(/[^a-zA-Z0-9._~\-[\]]/g, '-');
  });
  return `/${normalized.join('/')}`.slice(0, 240) || '/';
}

export function sanitizeUrl(input: string): string {
  return normalizeRoute(input);
}

export function containsSecretLikeValue(value: unknown): boolean {
  if (typeof value === 'string') return SECRET_VALUE.test(value);
  if (Array.isArray(value)) return value.some(containsSecretLikeValue);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, item]) =>
      /token|secret|password|cookie|authorization|api.?key|jwt/i.test(key) || containsSecretLikeValue(item),
    );
  }
  return false;
}

export function sanitizeErrorText(value: unknown, limit = 320): string {
  const raw = value instanceof Error ? `${value.name}: ${value.message}` : String(value ?? 'Unknown error');
  return raw
    .replace(URL_IN_TEXT, match => sanitizeUrl(match))
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[id]')
    .replace(/\beyJ[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+){1,2}\b/g, '[redacted]')
    .replace(/(?:bearer\s+)[^\s]+/gi, 'Bearer [redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, limit);
}

export function errorSignature(value: unknown): string {
  const normalized = sanitizeErrorText(value, 200)
    .replace(/\b\d+(?:\.\d+)?\b/g, '#')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `err_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function shouldSample(rate: number, random = Math.random): boolean {
  if (!Number.isFinite(rate) || rate <= 0) return false;
  if (rate >= 1) return true;
  return random() < rate;
}

export function isDuplicateError(seen: Map<string, number>, signature: string, now = Date.now(), windowMs = 60_000) {
  const duplicate = (seen.get(signature) ?? 0) > now - windowMs;
  if (!duplicate) seen.set(signature, now);
  for (const [key, timestamp] of seen) if (timestamp <= now - windowMs) seen.delete(key);
  return duplicate;
}

export function boundOfflineQueue<T extends { queuedAt: number }>(entries: T[], now = Date.now(), maximum = 40, maximumAgeMs = 5 * 60_000) {
  return entries.filter(entry => entry.queuedAt >= now - maximumAgeMs).slice(-maximum);
}

export function batchEvents<T>(events: T[], maximum = 20) {
  if (maximum < 1) return [];
  const batches: T[][] = [];
  for (let index = 0; index < events.length; index += maximum) batches.push(events.slice(index, index + maximum));
  return batches;
}

export function percentile(values: number[], quantile: number): number | null {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(quantile) || quantile < 0 || quantile > 1) return null;
  const index = (clean.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

export function authoritativePercentile(values: number[], quantile: number, minimumSamples = 20): number | null {
  return values.length >= minimumSamples ? percentile(values, quantile) : null;
}

export function statusClass(status: number): ObservabilityEvent['statusClass'] {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'unknown';
}

function isString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isOneOf(value: unknown, allowed: readonly string[]) {
  return typeof value === 'string' && allowed.includes(value);
}

export function validateObservabilityEvent(input: unknown): ObservabilityEvent | null {
  if (!input || typeof input !== 'object' || Array.isArray(input) || containsSecretLikeValue(input)) return null;
  const event = input as Record<string, unknown>;
  if (!EVENT_TYPES.has(String(event.type)) || !isString(event.name, 80)) return null;
  if (!Number.isFinite(event.value) || Number(event.value) < 0 || Number(event.value) > Number.MAX_SAFE_INTEGER) return null;
  if (!isString(event.route, 300) || !isString(event.timestamp, 40) || Number.isNaN(Date.parse(String(event.timestamp)))) return null;
  if (!isString(event.sessionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(String(event.sessionId))) return null;
  if (typeof event.authenticated !== 'boolean') return null;
  if (!isOneOf(event.locale, ['ar', 'en', 'fr', 'unknown'])) return null;
  if (!isOneOf(event.theme, ['light', 'dark', 'system', 'unknown'])) return null;
  if (!isOneOf(event.viewportClass, ['small', 'medium', 'large', 'unknown'])) return null;
  if (!isOneOf(event.deviceClass, ['mobile', 'tablet', 'desktop', 'unknown'])) return null;
  if (!isOneOf(event.browserFamily, ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other', 'Unknown'])) return null;
  if (!isOneOf(event.networkClass, ['slow-2g', '2g', '3g', '4g', 'offline', 'unknown'])) return null;
  if (!isString(event.deploymentSha, 80) || !isString(event.buildVersion, 80)) return null;
  if (!isOneOf(event.environment, ['production', 'preview', 'development'])) return null;

  const allowedKeys = new Set([
    'type', 'name', 'value', 'rating', 'route', 'timestamp', 'sessionId', 'authenticated', 'locale', 'theme',
    'viewportClass', 'deviceClass', 'browserFamily', 'networkClass', 'deploymentSha', 'buildVersion', 'environment',
    'statusClass', 'method', 'cacheStatus', 'provider', 'endpointClass', 'assetClass', 'fallbackUsed', 'failureClass', 'retryCount', 'count',
    'totalDuration', 'longestDuration', 'supportState', 'navigationKind', 'cached', 'proxy', 'errorSignature',
    'firstSeen', 'lastSeen', 'correlationId',
  ]);
  if (Object.keys(event).some(key => !allowedKeys.has(key))) return null;

  const enums: Array<[unknown, readonly string[]]> = [
    [event.rating, ['good', 'needs-improvement', 'poor', 'unknown']],
    [event.statusClass, ['2xx', '3xx', '4xx', '5xx', 'unknown']],
    [event.method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']],
    [event.cacheStatus, ['hit', 'miss', 'stale', 'unknown']],
    [event.assetClass, ['stock', 'crypto', 'forex', 'commodity', 'index', 'fund', 'unknown']],
    [event.supportState, ['supported', 'unsupported', 'denied', 'failed']],
    [event.navigationKind, ['normal', 'auth_redirect', 'guest_redirect', 'cancelled', 'prefetch_cancelled', 'offline', 'hard_reload', 'failed', 'redirect']],
  ];
  if (enums.some(([value, allowed]) => value !== undefined && !isOneOf(value, allowed))) return null;
  for (const key of ['retryCount', 'count', 'totalDuration', 'longestDuration'] as const) {
    if (event[key] !== undefined && !Number.isFinite(event[key])) return null;
  }
  if (event.retryCount !== undefined && (Number(event.retryCount) < 0 || Number(event.retryCount) > 20)) return null;
  if (event.count !== undefined && (Number(event.count) < 0 || Number(event.count) > 10_000)) return null;
  for (const key of ['fallbackUsed', 'cached', 'proxy'] as const) {
    if (event[key] !== undefined && typeof event[key] !== 'boolean') return null;
  }

  const safe = { ...event, route: normalizeRoute(String(event.route)) } as ObservabilityEvent;
  for (const key of ['provider', 'endpointClass', 'failureClass', 'errorSignature', 'correlationId'] as const) {
    if (safe[key] && !isString(safe[key], 80)) return null;
  }
  return safe;
}

export function validateObservabilityBatch(input: unknown, maximumEvents = 20): ObservabilityBatch | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const keys = Object.keys(input as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'events') return null;
  const events = (input as { events?: unknown }).events;
  if (!Array.isArray(events) || events.length < 1 || events.length > maximumEvents) return null;
  const validated = events.map(validateObservabilityEvent);
  return validated.every(Boolean) ? { events: validated as ObservabilityEvent[] } : null;
}
