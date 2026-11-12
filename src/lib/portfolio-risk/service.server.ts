import 'server-only';
import { cookies } from 'next/headers';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { inspectSessionSecurity, bearerToken } from '@/lib/server/authSession';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadCanonicalInvestmentPositions, InvestmentCanonicalNotReadyError } from '@/lib/investments/canonicalPositions.server';
import { buildCurrentRisk, type CurrentRiskSnapshot } from './current';

export type RiskServiceResult =
  | { ok: true; snapshot: CurrentRiskSnapshot }
  | { ok: false; code: string; status: number; retryAfter?: number };

/** Same authorization and calculation path for the dashboard and assistant. No writes. */
export async function loadCurrentRiskForRequest(request: Request): Promise<RiskServiceResult> {
  if (process.env.SFM_PORTFOLIO_RISK_ENABLED !== '1') return { ok: false, code: 'RISK_FEATURE_DISABLED', status: 404 };
  try {
    const jar = await cookies();
    const hasAuthorization = request.headers.has('authorization');
    // An explicitly malformed/expired header must not fall back to another session.
    const token = hasAuthorization ? bearerToken(request) : jar.get(AUTH_ACCESS_COOKIE)?.value;
    if (!token) return { ok: false, code: 'UNAUTHENTICATED', status: 401 };
    if (!hasAuthorization && request.headers.get('sec-fetch-site') === 'cross-site') return { ok: false, code: 'FORBIDDEN_ORIGIN', status: 403 };
    const session = await inspectSessionSecurity(token, jar.get(EMAIL_MFA_PROOF_COOKIE)?.value);
    if (session.status === 'unauthenticated') return { ok: false, code: 'UNAUTHENTICATED', status: 401 };
    if (session.status !== 'ok') return { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE', status: 503 };
    if (session.mfaRequirement !== 'none') return { ok: false, code: 'MFA_REQUIRED', status: 403 };
    const limit = checkRateLimitWithMetadata(session.userId, { max: 10, windowMs: 60_000, prefix: 'portfolio-risk' });
    if (!limit.allowed) return { ok: false, code: 'RATE_LIMITED', status: 429, retryAfter: limit.retryAfterSeconds };
    // Identity comes only from the verified session, never URL/body fields.
    const { positions } = await loadCanonicalInvestmentPositions(session.userId);
    const result = buildCurrentRisk(positions, Date.now());
    return result.ok ? result : { ...result, status: 422 };
  } catch (error) {
    return { ok: false, status: 503, code: error instanceof InvestmentCanonicalNotReadyError ? 'CANONICAL_INVESTMENTS_NOT_READY' : 'RISK_DATA_UNAVAILABLE' };
  }
}
