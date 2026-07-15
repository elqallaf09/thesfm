export type RuntimeFailureCode =
  | 'UNAUTHORIZED'
  | 'AUTHENTICATION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TLS_FAILURE'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'NETWORK_FAILURE'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_MAINTENANCE'
  | 'NO_MARKET_DATA'
  | 'INVALID_SYMBOL'
  | 'UNSUPPORTED_ASSET'
  | 'GUEST_RESTRICTION'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN_ERROR';

export type RuntimeFailureCategory =
  | 'authentication'
  | 'permission'
  | 'not_found'
  | 'rate_limit'
  | 'tls'
  | 'dns'
  | 'timeout'
  | 'network'
  | 'provider'
  | 'no_data'
  | 'invalid_symbol'
  | 'unsupported'
  | 'guest_restriction'
  | 'server'
  | 'invalid_response'
  | 'configuration'
  | 'unknown';

export type ClassifiedRuntimeFailure = {
  code: RuntimeFailureCode;
  category: RuntimeFailureCategory;
  retryable: boolean;
  httpStatus: number | null;
  messageKey: string;
};

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  cause?: unknown;
  status?: unknown;
};

function errorText(error: unknown) {
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as ErrorLike;
  const cause = value.cause && typeof value.cause === 'object' ? value.cause as ErrorLike : null;
  return [value.name, value.message, value.code, cause?.name, cause?.message, cause?.code]
    .filter(part => typeof part === 'string')
    .join(' ')
    .toLowerCase();
}

function statusFrom(error: unknown, explicitStatus?: number | null) {
  if (typeof explicitStatus === 'number') return explicitStatus;
  if (error && typeof error === 'object' && typeof (error as ErrorLike).status === 'number') {
    return (error as { status: number }).status;
  }
  return null;
}

export function classifyRuntimeFailure(
  error: unknown,
  options: {
    httpStatus?: number | null;
    authenticationExpired?: boolean;
    invalidSymbol?: boolean;
    unsupportedAsset?: boolean;
    noData?: boolean;
    guestRestriction?: boolean;
    notConfigured?: boolean;
  } = {},
): ClassifiedRuntimeFailure {
  const httpStatus = statusFrom(error, options.httpStatus);
  if (options.guestRestriction) return { code: 'GUEST_RESTRICTION', category: 'guest_restriction', retryable: false, httpStatus, messageKey: 'guest_restriction' };
  if (options.authenticationExpired) return { code: 'AUTHENTICATION_EXPIRED', category: 'authentication', retryable: false, httpStatus: httpStatus ?? 401, messageKey: 'authentication_expired' };
  if (options.invalidSymbol) return { code: 'INVALID_SYMBOL', category: 'invalid_symbol', retryable: false, httpStatus: httpStatus ?? 400, messageKey: 'invalid_symbol' };
  if (options.unsupportedAsset) return { code: 'UNSUPPORTED_ASSET', category: 'unsupported', retryable: false, httpStatus: httpStatus ?? 422, messageKey: 'unsupported_asset' };
  if (options.noData) return { code: 'NO_MARKET_DATA', category: 'no_data', retryable: false, httpStatus, messageKey: 'no_market_data' };
  if (options.notConfigured) return { code: 'NOT_CONFIGURED', category: 'configuration', retryable: false, httpStatus, messageKey: 'provider_not_configured' };

  if (httpStatus === 401) return { code: 'UNAUTHORIZED', category: 'authentication', retryable: false, httpStatus, messageKey: 'unauthorized' };
  if (httpStatus === 403) return { code: 'FORBIDDEN', category: 'permission', retryable: false, httpStatus, messageKey: 'forbidden' };
  if (httpStatus === 404) return { code: 'NOT_FOUND', category: 'not_found', retryable: false, httpStatus, messageKey: 'not_found' };
  if (httpStatus === 429) return { code: 'RATE_LIMITED', category: 'rate_limit', retryable: true, httpStatus, messageKey: 'provider_rate_limited' };
  if (httpStatus === 503) return { code: 'PROVIDER_MAINTENANCE', category: 'provider', retryable: true, httpStatus, messageKey: 'provider_maintenance' };
  if (httpStatus !== null && httpStatus >= 500) return { code: 'SERVER_ERROR', category: 'server', retryable: true, httpStatus, messageKey: 'server_error' };

  const text = errorText(error);
  if (/aborterror|timeouterror|timed?\s*out|etimedout|und_err_(connect_)?timeout/.test(text)) {
    return { code: 'TIMEOUT', category: 'timeout', retryable: true, httpStatus, messageKey: 'provider_timeout' };
  }
  if (/err_tls|certificate|cert_|unable_to_verify|self_signed|ssl|tls/.test(text)) {
    return { code: 'TLS_FAILURE', category: 'tls', retryable: true, httpStatus, messageKey: 'provider_tls_failure' };
  }
  if (/enotfound|eai_again|dns/.test(text)) {
    return { code: 'DNS_FAILURE', category: 'dns', retryable: true, httpStatus, messageKey: 'provider_dns_failure' };
  }
  if (/econnrefused|connection refused/.test(text)) {
    return { code: 'PROVIDER_UNAVAILABLE', category: 'provider', retryable: true, httpStatus, messageKey: 'provider_temporarily_unavailable' };
  }
  if (/econnreset|socket|fetch failed|networkerror|network request failed/.test(text)) {
    return { code: 'NETWORK_FAILURE', category: 'network', retryable: true, httpStatus, messageKey: 'provider_network_failure' };
  }
  if (/invalid (json|response)|unexpected token|parse/.test(text)) {
    return { code: 'INVALID_RESPONSE', category: 'invalid_response', retryable: true, httpStatus, messageKey: 'provider_invalid_response' };
  }
  if (/maintenance|temporarily unavailable|service unavailable/.test(text)) {
    return { code: 'PROVIDER_MAINTENANCE', category: 'provider', retryable: true, httpStatus, messageKey: 'provider_maintenance' };
  }
  return { code: 'UNKNOWN_ERROR', category: 'unknown', retryable: true, httpStatus, messageKey: 'provider_temporarily_unavailable' };
}

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api.?key|credential/i;

function safeMetadata(metadata: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key) || value === undefined) continue;
    if (typeof value === 'string') safe[key] = value.slice(0, 240);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) safe[key] = value;
    else if (Array.isArray(value)) safe[key] = value.slice(0, 20).map(item => typeof item === 'string' ? item.slice(0, 80) : item);
  }
  return safe;
}

export function logReliabilityEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  metadata: Record<string, unknown>,
) {
  const entry = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...safeMetadata(metadata),
  });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}
