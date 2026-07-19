export type IntelligenceErrorCode =
  | 'INVALID_ASSET'
  | 'UNSUPPORTED_ASSET'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'ANALYSIS_NOT_FOUND'
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
