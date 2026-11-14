import 'server-only';
import { cookies } from 'next/headers';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { inspectSessionSecurity } from '@/lib/server/authSession';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadCanonicalInvestmentPositions, InvestmentCanonicalNotReadyError } from '@/lib/investments/canonicalPositions.server';
import { buildCurrentRisk, type CurrentRiskSnapshot } from './current';

export type RiskServiceFailure = { ok: false; code: string; status: number; retryAfter?: number };
export type RiskServiceResult = { ok: true; snapshot: CurrentRiskSnapshot } | RiskServiceFailure;

/** Shared by current and historical reads. Identity never comes from URL/body fields. */
export async function authorizeRiskRequest(request: Request): Promise<{ ok: true; userId: string } | RiskServiceFailure> {
  if (process.env.SFM_PORTFOLIO_RISK_ENABLED !== '1') return { ok: false, code: 'RISK_FEATURE_DISABLED', status: 404 };
  const authorization = request.headers.get('authorization');
  const hasAuthorization = authorization !== null;
  // Reject malformed/joined credentials before cookie/provider access. Never downgrade to a cookie.
  const bearer = authorization?.match(/^Bearer +([A-Za-z0-9._~+\/-]+=*)$/i)?.[1];
  if (hasAuthorization && !bearer) return { ok: false, code: 'UNAUTHENTICATED', status: 401 };
  if (!hasAuthorization && request.headers.get('sec-fetch-site') === 'cross-site') return { ok: false, code: 'FORBIDDEN_ORIGIN', status: 403 };
  try {
    const jar = await cookies();
    const token = hasAuthorization ? bearer : jar.get(AUTH_ACCESS_COOKIE)?.value;
    if (!token) return { ok: false, code: 'UNAUTHENTICATED', status: 401 };
    const session = await inspectSessionSecurity(token, jar.get(EMAIL_MFA_PROOF_COOKIE)?.value);
    if (session.status === 'unauthenticated') return { ok: false, code: 'UNAUTHENTICATED', status: 401 };
    if (session.status !== 'ok') return { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE', status: 503 };
    if (session.mfaRequirement !== 'none') return { ok: false, code: 'MFA_REQUIRED', status: 403 };
    const limit = checkRateLimitWithMetadata(session.userId, { max: 10, windowMs: 60_000, prefix: 'portfolio-risk' });
    if (!limit.allowed) return { ok: false, code: 'RATE_LIMITED', status: 429, retryAfter: limit.retryAfterSeconds };
    return { ok: true, userId: session.userId };
  } catch {
    return { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE', status: 503 };
  }
}

/** Same authorization and calculation path for the dashboard and assistant. No writes. */
export async function loadCurrentRiskForRequest(request: Request): Promise<RiskServiceResult> {
  const access = await authorizeRiskRequest(request);
  if (!access.ok) return access;
  try {
    const { positions } = await loadCanonicalInvestmentPositions(access.userId);
    const result = buildCurrentRisk(positions, Date.now());
    return result.ok ? result : { ...result, status: 422 };
  } catch (error) {
    return { ok: false, status: 503, code: error instanceof InvestmentCanonicalNotReadyError ? 'CANONICAL_INVESTMENTS_NOT_READY' : 'RISK_DATA_UNAVAILABLE' };
  }
}
