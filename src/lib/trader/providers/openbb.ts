// OpenBB provider stub — the Render-hosted OpenBB Python service has been removed.
// All exported types and function signatures are preserved for API compatibility.
// No external network calls are made; the provider always reports "not_configured".

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

const STUB: OpenbbRuntimeStatus = {
  configured: false,
  healthy: false,
  status: 'not_configured',
  baseUrl: null,
  lastSuccessfulFetch: null,
  lastError: 'openbb_not_configured',
  lastErrorAt: null,
  cacheAvailable: false,
  supportedFeatures: [],
};

/** @deprecated OpenBB service has been removed. Always returns empty string. */
export function getOpenbbBaseUrl(): string {
  return '';
}

export function getOpenbbConfiguredStatus(): OpenbbRuntimeStatus {
  return STUB;
}

/** @deprecated OpenBB service has been removed. Always returns not_configured stub. */
export async function getOpenbbHealthStatus(
  _options?: { force?: boolean },
): Promise<OpenbbRuntimeStatus> {
  return STUB;
}

export function __resetOpenbbRuntimeForTests(): void {
  // No-op: stub has no mutable state to reset.
}