import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/ai',
  '/charity',
  '/charity-projects',
  '/settings',
  '/site-map',
  '/security',
  '/mfa/verify',
  '/profile',
  '/notifications',
  '/market-alerts',
  '/market-analysis',
  '/market-watchlist',
  '/watchlist',
  '/sfm-admin-control',
  '/thesfm-trader-own',
];

const authPages = ['/login', '/reset-password'];

function isProtected(pathname: string) {
  return protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

type SessionCheck = {
  hasSession: boolean;
  userId?: string;
  email?: string;
  token?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function isAdminEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return false;
  const allowedEmails = adminEmails
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(normalizedEmail);
}

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

async function getSupabaseSession(request: NextRequest): Promise<SessionCheck> {
  const token = request.cookies.get('sfm_access_token')?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseAnonKey) return { hasSession: false };

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!response.ok) return { hasSession: false };
    const user = await response.json() as { id?: string; email?: string };
    return {
      hasSession: Boolean(user.id),
      userId: user.id,
      email: user.email,
      token,
      supabaseUrl,
      supabaseAnonKey,
    };
  } catch {
    return { hasSession: false };
  }
}

async function onboardingCompleted(session: SessionCheck) {
  if (!session.userId || !session.token || !session.supabaseUrl || !session.supabaseAnonKey) return true;

  try {
    const url = new URL(`${session.supabaseUrl}/rest/v1/profiles`);
    url.searchParams.set('select', 'onboarding_completed,onboarding_skipped');
    url.searchParams.set('id', `eq.${session.userId}`);
    url.searchParams.set('limit', '1');
    const response = await fetch(url, {
      headers: {
        apikey: session.supabaseAnonKey,
        Authorization: `Bearer ${session.token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return true;
    const rows = await response.json() as Array<{ onboarding_completed?: boolean | null; onboarding_skipped?: boolean | null }>;
    return rows[0]?.onboarding_completed === true || rows[0]?.onboarding_skipped === true;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Security: prevent clickjacking by restricting iframe embedding to same origin only
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");

  const session = await getSupabaseSession(request);
  const hasSession = session.hasSession;

  if (authPages.includes(pathname) && hasSession) {
    if (request.cookies.get('sfm_mfa_required')?.value === 'true') {
      const mfaUrl = request.nextUrl.clone();
      mfaUrl.pathname = '/mfa/verify';
      mfaUrl.searchParams.set('next', request.nextUrl.searchParams.get('next') || '/dashboard');
      return NextResponse.redirect(mfaUrl);
    }
    const nextPath = safeInternalPath(request.nextUrl.searchParams.get('next'));
    if (nextPath === '/sfm-admin-control') {
      const adminTargetUrl = request.nextUrl.clone();
      adminTargetUrl.pathname = isAdminEmail(session.email) ? nextPath : '/dashboard';
      adminTargetUrl.search = '';
      return NextResponse.redirect(adminTargetUrl);
    }
    if (nextPath && isProtected(nextPath)) {
      const protectedTargetUrl = request.nextUrl.clone();
      protectedTargetUrl.pathname = nextPath;
      protectedTargetUrl.search = '';
      return NextResponse.redirect(protectedTargetUrl);
    }
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (!isProtected(pathname)) return response;
  if (hasSession) {
    if (pathname === '/sfm-admin-control' && !isAdminEmail(session.email)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }
    if (request.cookies.get('sfm_mfa_required')?.value === 'true' && pathname !== '/mfa/verify') {
      const mfaUrl = request.nextUrl.clone();
      mfaUrl.pathname = '/mfa/verify';
      mfaUrl.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(mfaUrl);
    }
    if (pathname === '/dashboard' && !(await onboardingCompleted(session))) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/onboarding';
      onboardingUrl.search = '';
      return NextResponse.redirect(onboardingUrl);
    }
    return response;
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
