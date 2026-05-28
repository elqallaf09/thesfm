import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefixes = [
  '/dashboard',
  '/command-center',
  '/today',
  '/tasks',
  '/documents',
  '/expenses',
  '/income',
  '/invest',
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
  '/investment-offers',
  '/projects',
  '/zakat',
  '/ai',
  '/charity',
  '/charity-projects',
  '/settings',
  '/site-map',
  '/security',
  '/profile',
  '/notifications',
  '/market-alerts',
  '/market-analysis',
  '/market-watchlist',
  '/watchlist',
  '/services/investment-firms',
  '/services/accounting-firms',
  '/services/feasibility-firms',
  '/services/advisory-firms',
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

async function hasValidSupabaseSession(request: NextRequest) {
  const token = request.cookies.get('sfm_access_token')?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseAnonKey) return false;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const user = await response.json() as { id?: string };
    return Boolean(user.id);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Content-Security-Policy', 'frame-ancestors *');

  const hasSession = await hasValidSupabaseSession(request);

  if (authPages.includes(pathname) && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (!isProtected(pathname)) return response;
  if (hasSession) return response;

  return redirectToLogin(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
