import { ProviderError, mapHttpProviderStatus, messageCodeForStatus } from '@/lib/providers/shared';
import { classifyRuntimeFailure } from '@/lib/runtime/reliability';
import type { StatusMessage } from './types';

export type ErrorCategory = 'authentication' | 'permission' | 'not_found' | 'rate_limit' | 'not_configured' | 'network' | 'tls' | 'dns' | 'provider' | 'no_data' | 'invalid_symbol' | 'unsupported' | 'server' | 'invalid_response' | 'timeout' | 'unknown';

export type ClassifiedError = {
  code: string;
  messageKey: string;
  category: ErrorCategory;
  retryable: boolean;
};

const RETRYABLE_CATEGORIES: ErrorCategory[] = ['rate_limit', 'network', 'tls', 'dns', 'provider', 'server', 'timeout', 'invalid_response'];

/**
 * Never leaks raw HTTP status text or provider error bodies — every branch resolves to a fixed,
 * translatable messageKey. Preserves the existing traderProviderRateLimit.test.ts guarantee that
 * rate-limit errors never surface as a raw "http_429" string.
 */
export function classifyProviderError(error: unknown): ClassifiedError {
  if (error instanceof ProviderError) {
    const category: ErrorCategory = error.status === 'rate_limited' ? 'rate_limit'
      : error.status === 'not_configured' ? 'not_configured'
      : error.status === 'unauthorized' ? 'authentication'
      : error.status === 'forbidden' || error.status === 'not_entitled' ? 'permission'
      : error.status === 'not_found' ? 'not_found'
      : error.status === 'no_data' ? 'no_data'
      : error.status === 'invalid_symbol' ? 'invalid_symbol'
      : error.status === 'unsupported_asset' ? 'unsupported'
      : error.status === 'maintenance' ? 'provider'
      : error.status === 'timeout' ? 'timeout'
      : error.status === 'tls_error' ? 'tls'
      : error.status === 'dns_error' ? 'dns'
      : error.status === 'server_error' ? 'server'
      : error.status === 'invalid_response' || error.status === 'invalid_request' ? 'invalid_response'
      : 'network';
    return {
      code: error.status,
      messageKey: messageCodeForStatus(error.status) ?? 'provider_temporarily_unavailable',
      category,
      retryable: RETRYABLE_CATEGORIES.includes(category),
    };
  }

  if (typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status: unknown }).status === 'number') {
    const httpStatus = (error as { status: number }).status;
    const apiStatus = mapHttpProviderStatus(httpStatus);
    const category: ErrorCategory = apiStatus === 'rate_limited' ? 'rate_limit'
      : apiStatus === 'unauthorized' ? 'authentication'
      : apiStatus === 'forbidden' ? 'permission'
      : apiStatus === 'not_found' ? 'not_found'
      : apiStatus === 'maintenance' ? 'provider'
      : apiStatus === 'server_error' ? 'server'
      : 'network';
    return {
      code: apiStatus,
      messageKey: messageCodeForStatus(apiStatus) ?? 'provider_temporarily_unavailable',
      category,
      retryable: RETRYABLE_CATEGORIES.includes(category),
    };
  }

  const runtime = classifyRuntimeFailure(error);
  const categoryMap: Record<typeof runtime.category, ErrorCategory> = {
    authentication: 'authentication', permission: 'permission', not_found: 'not_found', rate_limit: 'rate_limit',
    tls: 'tls', dns: 'dns', timeout: 'timeout', network: 'network', provider: 'provider', no_data: 'no_data',
    invalid_symbol: 'invalid_symbol', unsupported: 'unsupported', guest_restriction: 'permission', server: 'server',
    invalid_response: 'invalid_response', configuration: 'not_configured', unknown: 'unknown',
  };
  return { code: runtime.code.toLowerCase(), messageKey: runtime.messageKey, category: categoryMap[runtime.category], retryable: runtime.retryable };
}

export function classifiedErrorToStatusMessage(classified: ClassifiedError): StatusMessage {
  return { code: classified.code, messageKey: classified.messageKey };
}
