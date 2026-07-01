import { cleanEnv } from '@/lib/market/providerConfig';
import { shortText } from '@/lib/providers/shared';

export type OpenbbRuntimeStatus = {
  configured: boolean;
  healthy: boolean;
  status: 'healthy' | 'not_configured' | 'provider_error';
  baseUrl: string | null;
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  cacheAvailable: boolean;
  supportedFeatures: string[];
};

const HEALTH_CACHE_MS = 3 * 60 * 1000;
const OPENBB_TIMEOUT_MS = 5000;

let healthCache: { expiresAt: number; status: OpenbbRuntimeStatus } | null = null;
let lastSuccessfulFetch: string | null = null;
let lastError: string | null = null;
let lastErrorAt: string | null = null;

export function getOpenbbBaseUrl() {
  return cleanEnv(process.env.OPENBB_SERVICE_URL).replace(/\/+$/, '');
}

function baseStatus(baseUrl: string | null, status: OpenbbRuntimeStatus['status']): OpenbbRuntimeStatus {
  return {
    configured: Boolean(baseUrl),
    healthy: status === 'healthy',
    status,
    baseUrl,
    lastSuccessfulFetch,
    lastError: baseUrl ? lastError : 'openbb_not_configured',
    lastErrorAt,
    cacheAvailable: false,
    supportedFeatures: ['quotes', 'technicalAnalysis'],
  };
}

export function getOpenbbConfiguredStatus(): OpenbbRuntimeStatus {
  const baseUrl = getOpenbbBaseUrl();
  if (!baseUrl) return baseStatus(null, 'not_configured');
  return baseStatus(baseUrl, lastError ? 'provider_error' : 'healthy');
}

export async function getOpenbbHealthStatus(options: { force?: boolean } = {}): Promise<OpenbbRuntimeStatus> {
  const baseUrl = getOpenbbBaseUrl();
  if (!baseUrl) {
    healthCache = null;
    return baseStatus(null, 'not_configured');
  }

  const now = Date.now();
  if (!options.force && healthCache && healthCache.expiresAt > now && healthCache.status.baseUrl === baseUrl) {
    return healthCache.status;
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(OPENBB_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      lastError = `openbb_health_http_${response.status}`;
      lastErrorAt = new Date().toISOString();
      const status = baseStatus(baseUrl, 'provider_error');
      healthCache = { expiresAt: now + HEALTH_CACHE_MS, status };
      return status;
    }
    lastSuccessfulFetch = new Date().toISOString();
    lastError = null;
    lastErrorAt = null;
    const status = baseStatus(baseUrl, 'healthy');
    healthCache = { expiresAt: now + HEALTH_CACHE_MS, status };
    return status;
  } catch (error) {
    lastError = shortText(error instanceof Error ? error.message || error.name : 'openbb_health_failed', 180) || 'openbb_health_failed';
    lastErrorAt = new Date().toISOString();
    const status = baseStatus(baseUrl, 'provider_error');
    healthCache = { expiresAt: now + HEALTH_CACHE_MS, status };
    return status;
  }
}

export function __resetOpenbbRuntimeForTests() {
  healthCache = null;
  lastSuccessfulFetch = null;
  lastError = null;
  lastErrorAt = null;
}
