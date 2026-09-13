const LOCAL_ANALYTICS_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function stripPort(host: string) {
  const value = host.trim().toLowerCase();
  if (!value) return '';
  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']');
    return closingBracket >= 0 ? value.slice(1, closingBracket) : value;
  }
  return value.split(':')[0] ?? value;
}

export function analyticsHostname(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    if (raw.includes('://')) return new URL(raw).hostname.toLowerCase();
  } catch {
    // Fall through to host-header parsing.
  }

  return stripPort(raw.split(',')[0] ?? raw);
}

export function isLocalAnalyticsHost(value: string | null | undefined) {
  const host = analyticsHostname(value);
  return Boolean(host) && (LOCAL_ANALYTICS_HOSTS.has(host) || host.endsWith('.local'));
}

export function isPreviewAnalyticsHost(value: string | null | undefined) {
  const host = analyticsHostname(value);
  return Boolean(host) && host.endsWith('.vercel.app');
}

/**
 * Historical admin analytics should represent the public production site only.
 * Development traffic and Vercel preview deployments are intentionally excluded.
 */
export function isNonProductionAnalyticsReferrer(value: string | null | undefined) {
  return isLocalAnalyticsHost(value) || isPreviewAnalyticsHost(value);
}

/**
 * The tracking API is the authoritative gate. Client checks are not trusted because
 * automated browsers and old bundles may still call the endpoint directly.
 */
export function shouldIgnoreAnalyticsRequest(request: Request, bodyReferrer?: string | null) {
  const vercelEnvironment = String(process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  if (vercelEnvironment && vercelEnvironment !== 'production') return true;

  const candidates = [
    request.url,
    request.headers.get('x-forwarded-host'),
    request.headers.get('host'),
    request.headers.get('origin'),
    request.headers.get('referer'),
    bodyReferrer,
  ];

  return candidates.some(candidate => isLocalAnalyticsHost(candidate));
}
