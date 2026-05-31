import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getUserFromBearerToken,
  isAdminAccessCodeConfigured,
  isAdminEmail,
  isValidAdminAccessCode,
} from '@/lib/server/adminAccess';

const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function attemptKey(userId: string, request: Request) {
  return `${userId}:${clientIp(request)}`;
}

function blocked(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil) attempts.delete(key);
  return false;
}

function recordFailure(key: string) {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const count = entry.count + 1;
  attempts.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!isAdminAccessCodeConfigured()) return NextResponse.json({ error: 'admin_code_not_configured' }, { status: 500 });

  const key = attemptKey(user.id, request);
  if (blocked(key)) return NextResponse.json({ error: 'temporarily_locked' }, { status: 429 });

  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code : '';

  if (!isValidAdminAccessCode(code)) {
    recordFailure(key);
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
  }

  attempts.delete(key);
  const adminToken = createAdminSessionToken(user);
  if (!adminToken) return NextResponse.json({ error: 'session_failed' }, { status: 500 });

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
