import { ProviderError, mapHttpProviderStatus, messageCodeForStatus } from '@/lib/providers/shared';
import type { StatusMessage } from './types';

export type ErrorCategory = 'rate_limit' | 'not_configured' | 'network' | 'invalid_response' | 'timeout' | 'unknown';

export type ClassifiedError = {
  code: string;
  messageKey: string;
  category: ErrorCategory;
  retryable: boolean;
};

const RETRYABLE_CATEGORIES: ErrorCategory[] = ['rate_limit', 'network', 'timeout', 'invalid_response'];

/**
 * Never leaks raw HTTP status text or provider error bodies — every branch resolves to a fixed,
 * translatable messageKey. Preserves the existing traderProviderRateLimit.test.ts guarantee that
 * rate-limit errors never surface as a raw "http_429" string.
 */
export function classifyProviderError(error: unknown): ClassifiedError {
  if (error instanceof ProviderError) {
    const category: ErrorCategory = error.status === 'rate_limited' ? 'rate_limit'
      : error.status === 'not_configured' ? 'not_configured'
      : error.status === 'invalid_request' ? 'invalid_response'
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
    const category: ErrorCategory = apiStatus === 'rate_limited' ? 'rate_limit' : 'network';
    return {
      code: apiStatus,
      messageKey: messageCodeForStatus(apiStatus) ?? 'provider_temporarily_unavailable',
      category,
      retryable: RETRYABLE_CATEGORIES.includes(category),
    };
  }

  if (error instanceof Error && /timeout|aborted/i.test(error.message)) {
    return { code: 'timeout', messageKey: 'provider_timeout', category: 'timeout', retryable: true };
  }

  return { code: 'unknown_error', messageKey: 'provider_temporarily_unavailable', category: 'unknown', retryable: true };
}

export function classifiedErrorToStatusMessage(classified: ClassifiedError): StatusMessage {
  return { code: classified.code, messageKey: classified.messageKey };
}
