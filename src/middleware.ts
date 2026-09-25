import { tvPackagedOrigin, tvCorsHeaders } from '@/lib/markets-tv/cors';
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
  '/dashboard', '/onboarding', '/command-center', '/decisions', '/today', '/tasks', '/documents',
  '/expenses', '/income', '/invest', '/investments', '/debts', '/savings', '/education/investments',
  '/goals', '/reports', '/reports-center', '/business', '/business-hub', '/business-operations',
  '/employees', '/sales', '/customers', '/invoices', '/suppliers', '/operating-expenses',
  '/investment-offers', '/projects', '/zakat', '/khums', '/ai', '/charity', '/charity-projects',
  '/settings', '/site-map', '/security', '/mfa/verify', '/profile', '/notifications',
  '/sfm-admin-control', '/thesfm-trader-own', '/wakeel',
];

const authPages = ['/login', '/reset-password'];
const guestAllowedPaths = new Set([
  '/dashboard', '/income', '/expenses', '/expenses/monthly-subscriptions', '/invest', '/investments',
  '/savings', '/goals', '/reports', '/reports-center', '/ai',
]);

function isProtected(pathname: string) {
  return protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isGuestAllowed(pathname: string) {
  return guestAllowedPaths.has(pathname);
}

function isAdminPath(pathname: string) {
  return pathname === '/sfm-admin-control' || pathname.startsWith('/sfm-admin-control/');
}

function superAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function hasAdminRole(session: Extract<SessionSecurityResult, { status: 'ok' }>) {
  const normalizedEmail = session.email?.trim().toLowerCase() || '';
  if (normalizedEmail && superAdminEmails().includes(normalizedEmail)) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const url = new URL(`${supabaseUrl}/rest/v1/admin_roles`);
  url.searchParams.set('select', 'user_id,role,is_active');
  url.searchParams.set('user_id', `eq.${session.userId}`);
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const rows = await response.json().catch(() => []) as Array<{ user_id?: string; role?: string; is_active?: boolean }>;
    const role = rows[0];
    return role?.user_id === session.userId && role.is_active === true && (role.role === 'admin' || role.role === 'super_admin');
  } catch {
    return false;
  }
}

function noIndex<T extends NextResponse>(response: T) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function withSecurityHeaders<T extends NextResponse>(response: T) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'self'");
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

function secured<T extends NextResponse>(response: T, pathname?: string) {
  const next = withSecurityHeaders(response);
  return pathname && isAdminPath(pathname) ? noIndex(next) : next;
}

function isLegacyMarketCompatibilityRoute(request: NextRequest) {
  return request.nextUrl.pathname === '/ai-analyst/overview'
    && request.nextUrl.searchParams.get('legacy') === 'market';
}

function isLocalQaBypass(pathname: string) {
  if (process.env.VERCEL === '1') return false;
  const isTraderPath = pathname === '/thesfm-trader-own' || pathname.startsWith('/thesfm-trader-own/');
  const isDashboardPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (isTraderPath) return process.env.SFM_LOCAL_TRADER_QA === '1';
  if (isDashboardPath) return process.env.SFM_LOCAL_DASHBOARD_QA === '1' || process.env.SFM_LOCAL_TRADER_QA === '1';
  return false;
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
  if (authPages.includes(pathname) || pathname === '/mfa/verify') return explicitNext ?? DEFAULT_AUTH_DESTINATION;
  return requestDestination(pathname, request.nextUrl.search);
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', authTransitionDestination(request));
  if (reason) loginUrl.searchParams.set('auth', reason);
  return secured(NextResponse.redirect(loginUrl), request.nextUrl.pathname);
}

function redirectToMfa(request: NextRequest, type: 'totp' | 'email') {
  const url = request.nextUrl.clone();
  url.pathname = type === 'totp' ? '/mfa/verify' : '/login';
  url.search = '';
  url.searchParams.set('next', authTransitionDestination(request));
  if (type === 'email') url.searchParams.set('mfa', 'email');
  return secured(NextResponse.redirect(url), request.nextUrl.pathname);
}

async function sessionForRequest(request: NextRequest): Promise<SessionSecurityResult> {
  const token = bearerToken(request) || request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  if (!token) return { status: 'unauthenticated' };
  return inspectSessionSecurity(token, request.cookies.get(EMAIL_MFA_PROOF_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = secured(NextResponse.next(), pathname);
  if (tvPackagedOrigin(request)) {
    for (const [key, value] of Object.entries(tvCorsHeaders(request.headers.get('origin')!))) response.headers.set(key, value);
    if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: response.headers });
  }

  if (pathname.startsWith('/api/')) {
    if (!isProtectedApiPath(pathname)) return response;
    if (isCronApiPath(pathname) && isCronAuthorized(request)) return response;
    const session = await sessionForRequest(request);
    if (session.status === 'unauthenticated') return apiError('UNAUTHORIZED', 401);
    if (session.status === 'unavailable') return apiError('AUTH_UNAVAILABLE', 503);
    if (session.mfaRequirement !== 'none') return apiError('MFA_REQUIRED', 403, { mfaType: session.mfaRequirement });
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
      if (session.status === 'unauthenticated' && request.cookies.has(AUTH_ACCESS_COOKIE)) clearAuthenticatedCookies(response);
      return response;
    }
    if (session.mfaRequirement === 'totp') return redirectToMfa(request, 'totp');
    if (session.mfaRequirement === 'email') return response;
    const nextPath = resolveInternalDestination(request.nextUrl.searchParams.get('next'));
    const nextPathname = internalDestinationPathname(nextPath);
    const nextIsAuthTransition = Boolean(nextPathname && (authPages.includes(nextPathname) || nextPathname === '/mfa/verify'));
    if (nextPath && nextPathname && !nextIsAuthTransition) {
      const protectedTargetUrl = request.nextUrl.clone();
      applyInternalDestination(protectedTargetUrl, nextPath);
      return secured(NextResponse.redirect(protectedTargetUrl), pathname);
    }
    const defaultUrl = request.nextUrl.clone();
    applyInternalDestination(defaultUrl, DEFAULT_AUTH_DESTINATION);
    return secured(NextResponse.redirect(defaultUrl), pathname);
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

  if (isAdminPath(pathname)) {
    const allowed = await hasAdminRole(session);
    if (!allowed) {
      return noIndex(withSecurityHeaders(new NextResponse('Not Found', { status: 404 })));
    }
  }

  if (pathname === '/mfa/verify') {
    const target = resolveInternalDestination(request.nextUrl.searchParams.get('next')) || DEFAULT_AUTH_DESTINATION;
    const targetUrl = request.nextUrl.clone();
    applyInternalDestination(targetUrl, target);
    return secured(NextResponse.redirect(targetUrl), pathname);
  }
  if (pathname === '/dashboard' && !session.onboardingComplete) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = '/onboarding';
    onboardingUrl.search = '';
    return secured(NextResponse.redirect(onboardingUrl), pathname);
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
