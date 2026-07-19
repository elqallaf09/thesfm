import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCronApiPath, isCronAuthorized, isProtectedApiPath } from '@/lib/auth/accessPolicy';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import {
  applyInternalDestination,
  DEFAULT_AUTH_DESTINATION,
  internalDestinationPathname,
  requestDestination,
  resolveInternalDestination,
} from '@/lib/auth/redirects';
import { clearAuthenticatedCookies } from '@/lib/server/authCookies';
import { bearerToken, inspectSessionSecurity, type SessionSecurityResult } from '@/lib/server/authSession';

const protectedPrefixes = [
  '/dashboard',
  '/onboarding',
  '/command-center',
  '/decisions',
  '/today',
  '/tasks',
  '/documents',
  '/expenses',
  '/income',
  '/invest',
  '/debts',
  '/savings',
  '/education/investments',
  '/goals',
  '/reports',
  '/reports-center',
  '/business',
  '/business-hub',
  '/business-operations',
  '/employees',
  '/sales',
  '/customers',
  '/invoices',
  '/suppliers',
  '/operating-expenses',
  '/investment-offers',
  '/projects',
  '/zakat',
  '/khums',
  '/ai',
  '/charity',
  '/charity-projects',
  '/settings',
  '/site-map',
  '/security',
  '/mfa/verify',
  '/profile',
  '/notifications',
  '/sfm-admin-control',
  '/thesfm-trader-own',
  '/wakeel',
];

const authPages = ['/login', '/reset-password'];
const guestAllowedPaths = new Set([
  '/dashboard',
  '/income',
  '/expenses',
  '/expenses/monthly-subscriptions',
  '/invest',
  '/savings',
  '/goals',
  '/reports',
  '/reports-center',
  '/ai',
]);

function isProtected(pathname: string) {
  return protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isGuestAllowed(pathname: string) {
  return guestAllowedPaths.has(pathname);
}

/**
 * The retained legacy market adapter is intentionally isolated while its
 * remaining route-by-route parity work is completed. It must never become a
 * public backdoor to legacy directional UI merely because the canonical AI
 * Analyst shell is publicly readable.
 */
function isLegacyMarketCompatibilityRoute(request: NextRequest) {
  return request.nextUrl.pathname === '/ai-analyst/overview'
    && request.nextUrl.searchParams.get('legacy') === 'market';
}

function isLocalQaBypass(pathname: string) {
  if (process.env.VERCEL === '1') return false;
  const isTraderPath = pathname === '/thesfm-trader-own' || pathname.startsWith('/thesfm-trader-own/');
  const isDashboardPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (isTraderPath) return process.env.SFM_LOCAL_TRADER_QA === '1';
  if (isDashboardPath) {
    return process.env.SFM_LOCAL_DASHBOARD_QA === '1' || process.env.SFM_LOCAL_TRADER_QA === '1';
  }
  return false;
}

function withSecurityHeaders<T extends NextResponse>(response: T) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  response.headers.set('Permissions-Policy', 'microphone=(self), camera=(self)');
  return response;
}

function apiError(code: string, status: number, extra?: object) {
  return withSecurityHeaders(NextResponse.json(
    { ok: false, code, ...extra },
    { status, headers: { 'Cache-Control': 'no-store' } },
  ));
}

function authTransitionDestination(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const explicitNext = resolveInternalDestination(request.nextUrl.searchParams.get('next'));
  if (authPages.includes(pathname) || pathname === '/mfa/verify') {
    return explicitNext ?? DEFAULT_AUTH_DESTINATION;
  }
  return requestDestination(pathname, request.nextUrl.search);
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', authTransitionDestination(request));
  if (reason) loginUrl.searchParams.set('auth', reason);
  return withSecurityHeaders(NextResponse.redirect(loginUrl));
}

function redirectToMfa(request: NextRequest, type: 'totp' | 'email') {
  const url = request.nextUrl.clone();
  url.pathname = type === 'totp' ? '/mfa/verify' : '/login';
  url.search = '';
  url.searchParams.set('next', authTransitionDestination(request));
  if (type === 'email') url.searchParams.set('mfa', 'email');
  return withSecurityHeaders(NextResponse.redirect(url));
}

async function sessionForRequest(request: NextRequest): Promise<SessionSecurityResult> {
  const token = bearerToken(request) || request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  if (!token) return { status: 'unauthenticated' };
  return inspectSessionSecurity(token, request.cookies.get(EMAIL_MFA_PROOF_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = withSecurityHeaders(NextResponse.next());

  if (pathname.startsWith('/api/')) {
    if (!isProtectedApiPath(pathname)) return response;
    if (isCronApiPath(pathname) && isCronAuthorized(request)) return response;
    const session = await sessionForRequest(request);
    if (session.status === 'unauthenticated') return apiError('UNAUTHORIZED', 401);
    if (session.status === 'unavailable') return apiError('AUTH_UNAVAILABLE', 503);
    if (session.mfaRequirement !== 'none') {
      return apiError('MFA_REQUIRED', 403, { mfaType: session.mfaRequirement });
    }
    return response;
  }

  if (isLocalQaBypass(pathname)) return response;
  const isLegacyMarketCompatibility = isLegacyMarketCompatibilityRoute(request);
  const needsSession = authPages.includes(pathname) || isProtected(pathname) || isLegacyMarketCompatibility;
  if (!needsSession) return response;

  const session = await sessionForRequest(request);
  const hasGuestSession = request.cookies.get('sfm_guest')?.value === 'true';

  if (authPages.includes(pathname)) {
    if (session.status !== 'ok') {
      if (session.status === 'unauthenticated' && request.cookies.has(AUTH_ACCESS_COOKIE)) {
        clearAuthenticatedCookies(response);
      }
      return response;
    }
    if (session.mfaRequirement === 'totp') return redirectToMfa(request, 'totp');
    if (session.mfaRequirement === 'email') return response;
    const nextPath = resolveInternalDestination(request.nextUrl.searchParams.get('next'));
    const nextPathname = internalDestinationPathname(nextPath);
    const nextIsAuthTransition = Boolean(nextPathname
      && (authPages.includes(nextPathname) || nextPathname === '/mfa/verify'));
    if (nextPath && nextPathname && !nextIsAuthTransition) {
      const protectedTargetUrl = request.nextUrl.clone();
      applyInternalDestination(protectedTargetUrl, nextPath);
      return withSecurityHeaders(NextResponse.redirect(protectedTargetUrl));
    }
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return withSecurityHeaders(NextResponse.redirect(dashboardUrl));
  }

  if (session.status === 'unauthenticated') {
    if (hasGuestSession && isGuestAllowed(pathname)) return response;
    if (hasGuestSession && isLegacyMarketCompatibility) return response;
    const redirect = redirectToLogin(request);
    if (request.cookies.has(AUTH_ACCESS_COOKIE)) clearAuthenticatedCookies(redirect);
    return redirect;
  }
  if (session.status === 'unavailable') return redirectToLogin(request, 'unavailable');

  if (session.mfaRequirement !== 'none') {
    if (pathname === '/mfa/verify' && session.mfaRequirement === 'totp') return response;
    return redirectToMfa(request, session.mfaRequirement);
  }
  if (pathname === '/mfa/verify') {
    const target = resolveInternalDestination(request.nextUrl.searchParams.get('next')) || DEFAULT_AUTH_DESTINATION;
    const targetUrl = request.nextUrl.clone();
    applyInternalDestination(targetUrl, target);
    return withSecurityHeaders(NextResponse.redirect(targetUrl));
  }
  if (pathname === '/dashboard' && !session.onboardingComplete) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = '/onboarding';
    onboardingUrl.search = '';
    return withSecurityHeaders(NextResponse.redirect(onboardingUrl));
  }
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
