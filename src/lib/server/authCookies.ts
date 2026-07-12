import type { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_STATE_COOKIE,
  EMAIL_MFA_CHALLENGE_COOKIE,
  EMAIL_MFA_PROOF_COOKIE,
  LEGACY_MFA_COOKIE,
  accessTokenMaxAge,
  authCookieOptions,
} from '@/lib/auth/sessionSecurity';

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', authCookieOptions(0));
}

export function setAuthenticatedCookies(response: NextResponse, token: string) {
  const maxAge = accessTokenMaxAge(token);
  response.cookies.set(AUTH_ACCESS_COOKIE, token, authCookieOptions(maxAge));
  response.cookies.set(AUTH_STATE_COOKIE, 'true', authCookieOptions(maxAge));
  response.cookies.set('sfm_guest', '', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  clearCookie(response, LEGACY_MFA_COOKIE);
}

export function clearAuthenticatedCookies(response: NextResponse) {
  clearCookie(response, AUTH_ACCESS_COOKIE);
  clearCookie(response, AUTH_STATE_COOKIE);
  clearCookie(response, EMAIL_MFA_PROOF_COOKIE);
  clearCookie(response, EMAIL_MFA_CHALLENGE_COOKIE);
  clearCookie(response, LEGACY_MFA_COOKIE);
}

export function setEmailMfaChallengeCookie(response: NextResponse, value: string, maxAge = 10 * 60) {
  response.cookies.set(EMAIL_MFA_CHALLENGE_COOKIE, value, authCookieOptions(maxAge));
}

export function clearEmailMfaChallengeCookie(response: NextResponse) {
  clearCookie(response, EMAIL_MFA_CHALLENGE_COOKIE);
}

export function setEmailMfaProofCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set(EMAIL_MFA_PROOF_COOKIE, value, authCookieOptions(maxAge));
}
