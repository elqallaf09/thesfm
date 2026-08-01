import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { asIntelligenceError, type IntelligenceErrorCode } from '@/services/intelligence/errors';

export type IntelligenceApiErrorCode = IntelligenceErrorCode
  | 'INVALID_REQUEST'
  | 'FORCE_REFRESH_FORBIDDEN'
  | 'RATE_LIMITED'
  | 'APPLICATION_RATE_LIMITED';

const STATUS_BY_CODE: Record<IntelligenceApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  INVALID_SYMBOL: 400,
  INVALID_ASSET: 404,
  UNSUPPORTED_ASSET: 422,
  INSUFFICIENT_MARKET_DATA: 422,
  STALE_DATA: 409,
  FORCE_REFRESH_FORBIDDEN: 403,
  RATE_LIMITED: 429,
  APPLICATION_RATE_LIMITED: 429,
  PROVIDER_TIMEOUT: 503,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_RATE_LIMITED: 429,
  ANALYSIS_NOT_FOUND: 404,
  NO_SAVED_ANALYSIS: 404,
  DATABASE_ERROR: 503,
  ANALYSIS_GENERATION_FAILED: 500,
  NETWORK_ERROR: 503,
  PERSISTENCE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export const INTELLIGENCE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function intelligenceErrorResponse(input: {
  code: IntelligenceApiErrorCode;
  correlationId: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
  status?: number;
  validation?: ZodError['issues'];
}) {
  const validation = input.validation?.map(issue => ({
    path: issue.path.join('.'),
    code: issue.code,
  }));
  return NextResponse.json({
    ok: false,
    error: {
      code: input.code,
      messageKey: `intelligence_error_${input.code.toLowerCase()}`,
      retryable: input.retryable ?? false,
      ...(validation?.length ? { validation } : {}),
    },
    correlationId: input.correlationId,
  }, {
    status: input.status ?? STATUS_BY_CODE[input.code],
    headers: {
      ...INTELLIGENCE_RESPONSE_HEADERS,
      'X-Correlation-ID': input.correlationId,
      ...((input.code === 'RATE_LIMITED' || input.code === 'APPLICATION_RATE_LIMITED' || input.code === 'PROVIDER_RATE_LIMITED')
        ? { 'Retry-After': String(Math.max(1, input.retryAfterSeconds ?? 60)) }
        : {}),
    },
  });
}

export function mappedIntelligenceErrorResponse(error: unknown, correlationId: string) {
  const mapped = asIntelligenceError(error);
  return intelligenceErrorResponse({
    code: mapped.code,
    correlationId,
    retryable: mapped.retryable,
  });
}

export async function readBoundedJson(request: NextRequest, maxBytes = 16_384): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RangeError('REQUEST_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new RangeError('REQUEST_TOO_LARGE');
  if (!text.trim()) throw new SyntaxError('EMPTY_JSON');
  return JSON.parse(text) as unknown;
}
