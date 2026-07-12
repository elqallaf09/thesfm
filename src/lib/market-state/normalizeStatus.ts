import type { FeatureDataStatus, ProviderConnectionStatus, ResearchOrAnalysisStatus } from './types';

/**
 * Every raw status vocabulary already in the codebase funnels through here. Keyword lists are
 * ordered by precedence (checked top to bottom) — e.g. a status text containing both "rate" and
 * "error" should read as rate_limited, since that's the more actionable/specific signal.
 */
const RATE_LIMITED_KEYWORDS = ['rate_limited', 'rate limit', '429', 'too_many_requests'];
const MISCONFIGURED_KEYWORDS = ['not_configured', 'misconfigured', 'missing_api_key', 'no_api_key'];
const DISABLED_KEYWORDS = ['disabled', 'not_entitled', 'forbidden'];
const DEGRADED_KEYWORDS = ['degraded', 'slow', 'partial'];
const DISCONNECTED_KEYWORDS = [
  // 'unhealthy' must be checked before the connected list below — otherwise its "healthy"
  // substring would falsely match as connected.
  'disconnected', 'unavailable', 'unhealthy', 'provider_error', 'error', 'failed', 'failure',
  'unauthorized', 'invalid_request', 'timeout',
];
const CONNECTED_KEYWORDS = ['healthy', 'connected', 'available', 'success', 'ok', 'live'];

function classifyStatusText(text: string | null | undefined): ProviderConnectionStatus | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (RATE_LIMITED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'rate_limited';
  if (MISCONFIGURED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'misconfigured';
  if (DISABLED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'disabled';
  if (DEGRADED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'degraded';
  if (DISCONNECTED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'disconnected';
  if (CONNECTED_KEYWORDS.some(keyword => normalized.includes(keyword))) return 'connected';
  return null;
}

export type RawProviderStatusInput = {
  configured?: boolean | null;
  healthy?: boolean | null;
  rateLimited?: boolean | null;
  status?: string | null;
};

/**
 * Single funnel absorbing every existing status vocabulary in the codebase (ProviderHealthResult,
 * FmpRuntimeStatus, ProviderCapability, ProxyState, ProviderApiStatus, canonicalProviderStatusKey).
 * Explicit booleans (when known) take precedence over free-text status, since they're closer to
 * ground truth than a string that may itself already be a lossy summary.
 */
export function normalizeProviderConnectionStatus(input: RawProviderStatusInput): ProviderConnectionStatus {
  if (input.configured === false) return 'misconfigured';
  if (input.rateLimited === true) return 'rate_limited';

  const fromText = classifyStatusText(input.status);
  if (fromText === 'rate_limited' || fromText === 'misconfigured' || fromText === 'disabled') return fromText;

  if (input.healthy === true) {
    return fromText === 'degraded' || fromText === 'disconnected' ? fromText : 'connected';
  }
  if (input.healthy === false) {
    return fromText ?? 'disconnected';
  }
  return fromText ?? 'unknown';
}

export type RawFeatureStatusInput = {
  isLoading: boolean;
  hasError: boolean;
  providerStatus: ProviderConnectionStatus;
  requested?: number | null;
  returned?: number | null;
  isStale?: boolean;
};

/**
 * Encodes the hard rules from the task spec as a literal decision table:
 * never empty while loading, never disconnected-for-one-capability here (that's computed at the
 * system-aggregate level, not per feature), never conflate a connection error with "empty".
 */
export function normalizeFeatureDataStatus(input: RawFeatureStatusInput): FeatureDataStatus {
  if (input.isLoading) return 'loading';
  if (input.hasError) return 'error';
  const providerCannotServe = input.providerStatus === 'disconnected'
    || input.providerStatus === 'misconfigured'
    || input.providerStatus === 'disabled'
    || input.providerStatus === 'rate_limited'
    || input.providerStatus === 'unsupported'
    || input.providerStatus === 'unknown';
  // Cached/partial data can still be rendered during a provider outage. Without returned data,
  // these states are unavailable rather than a misleading successful empty result.
  if (providerCannotServe && (input.returned === null || input.returned === undefined || input.returned === 0)) {
    return 'unavailable';
  }

  const requested = input.requested ?? null;
  const returned = input.returned ?? null;
  if (returned !== null && returned === 0) return 'empty';
  if (requested !== null && returned !== null && returned < requested) return 'partial';
  if (input.isStale) return 'stale';
  return 'fresh';
}

export type RawResearchStatusInput = {
  isLoading?: boolean;
  ok: boolean;
  dataStatus?: 'available' | 'unavailable' | null;
  code?: string | null;
};

/**
 * Builds on marketAgent.ts's already-clean discriminated union (`ok`/`dataStatus`/`code`) rather
 * than reinventing it — this just maps that union (and the analogous TraderFeatureStatus.status
 * from providerStatus.ts) onto the shared ResearchOrAnalysisStatus enum.
 */
export function normalizeResearchStatus(input: RawResearchStatusInput): ResearchOrAnalysisStatus {
  if (input.isLoading) return 'running';
  if (input.ok && input.dataStatus !== 'unavailable') return 'completed';
  if (input.code === 'INSUFFICIENT_MARKET_DATA') return 'insufficient_data';
  return 'failed';
}
