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
  '/business-hub',
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
  '/market-analysis',
  '/services/investment-firms',
  '/services/accounting-firms',
  '/services/feasibility-firms',
  '/services/advisory-firms',
];

function isProtected(pathname: string) {
  return protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Content-Security-Policy', 'frame-ancestors *');

  if (!isProtected(pathname)) return response;

  const hasAuth = request.cookies.get('sfm_auth')?.value === 'true';
  const isGuest = request.cookies.get('sfm_guest')?.value === 'true';

  if (hasAuth || isGuest) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
