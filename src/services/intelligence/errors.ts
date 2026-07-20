export type IntelligenceErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'INVALID_SYMBOL'
  | 'INVALID_ASSET'
  | 'UNSUPPORTED_ASSET'
  | 'INSUFFICIENT_MARKET_DATA'
  | 'STALE_DATA'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'ANALYSIS_NOT_FOUND'
  | 'NO_SAVED_ANALYSIS'
  | 'DATABASE_ERROR'
  | 'ANALYSIS_GENERATION_FAILED'
  | 'NETWORK_ERROR'
  | 'PERSISTENCE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class IntelligenceError extends Error {
  constructor(
    public readonly code: IntelligenceErrorCode,
    public readonly retryable: boolean,
    message = code,
  ) {
    super(message);
    this.name = 'IntelligenceError';
  }
}

export function asIntelligenceError(error: unknown) {
  if (error instanceof IntelligenceError) return error;
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new IntelligenceError('PROVIDER_TIMEOUT', true);
  }
  return new IntelligenceError('PROVIDER_UNAVAILABLE', true);
}
