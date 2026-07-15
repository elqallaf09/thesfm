import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isProtectedApiPath } from '@/lib/auth/accessPolicy';
import {
  authCookieOptions,
  decideMfaRequirement,
  signAuthPayload,
  verifyAuthPayload,
} from '@/lib/auth/sessionSecurity';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('production auth security contracts', () => {
  it('uses production-safe HttpOnly session cookie flags', () => {
    expect(authCookieOptions(600, true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  });

  it('rejects MFA bypasses until the server-observed assurance requirement is satisfied', () => {
    expect(decideMfaRequirement({
      aal: 'aal1',
      hasVerifiedTotp: true,
      emailTwoFactorEnabled: false,
      emailProofValid: false,
      profileAvailable: true,
    })).toBe('totp');
    expect(decideMfaRequirement({
      aal: 'aal1',
      hasVerifiedTotp: false,
      emailTwoFactorEnabled: true,
      emailProofValid: false,
      profileAvailable: true,
    })).toBe('email');
    expect(decideMfaRequirement({
      aal: 'aal2',
      hasVerifiedTotp: true,
      emailTwoFactorEnabled: true,
      emailProofValid: false,
      profileAvailable: true,
    })).toBe('none');
    expect(decideMfaRequirement({
      aal: 'aal1',
      hasVerifiedTotp: false,
      emailTwoFactorEnabled: false,
      emailProofValid: false,
      profileAvailable: false,
    })).toBe('unavailable');
  });

  it('detects tampering in signed server MFA state', async () => {
    const signed = await signAuthPayload({ kind: 'email-proof', expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret');
    const [encodedPayload, encodedSignature] = signed.split('.');
    const base64UrlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const signatureLastIndex = base64UrlAlphabet.indexOf(encodedSignature.at(-1) ?? '');
    const nonCanonicalSignature = `${encodedSignature.slice(0, -1)}${base64UrlAlphabet.charAt(signatureLastIndex + 1)}`;

    await expect(verifyAuthPayload(signed, 'test-secret')).resolves.toMatchObject({ kind: 'email-proof' });
    await expect(verifyAuthPayload(`A${encodedPayload.slice(1)}.${encodedSignature}`, 'test-secret')).resolves.toBeNull();
    expect(signatureLastIndex).toBeGreaterThanOrEqual(0);
    expect(signatureLastIndex % 4).toBe(0);
    await expect(verifyAuthPayload(`${encodedPayload}.${nonCanonicalSignature}`, 'test-secret')).resolves.toBeNull();
  });

  it('classifies sensitive APIs without redirecting all public APIs', () => {
    expect(isProtectedApiPath('/api/admin/diagnostics')).toBe(true);
    expect(isProtectedApiPath('/api/projects/123/pitch-deck')).toBe(true);
    expect(isProtectedApiPath('/api/business/subscriptions/reminders/status')).toBe(true);
    expect(isProtectedApiPath('/api/auth/login')).toBe(false);
    expect(isProtectedApiPath('/api/health')).toBe(false);
  });

  it('does not expose username or reset account lookup results', () => {
    const usernameRoute = source('src/app/api/auth/resolve-username/route.ts');
    const resetCheckRoute = source('src/app/api/auth/password-reset/check/route.ts');
    expect(usernameRoute).not.toContain('serviceRole');
    expect(usernameRoute).not.toContain("select('id");
    expect(usernameRoute).not.toContain('exists:');
    expect(resetCheckRoute).not.toContain('listUsers');
    expect(resetCheckRoute).not.toContain('exists:');
  });

  it('keeps access tokens out of JavaScript-written cookies and ignores legacy MFA flags', () => {
    const authProvider = source('src/hooks/useAuth.tsx');
    const login = source('src/app/(auth)/login/page.tsx');
    const mfa = source('src/app/mfa/verify/page.tsx');
    const middleware = source('src/middleware.ts');
    expect(authProvider).not.toMatch(/document\.cookie\s*=.*sfm_access_token/);
    expect(login).not.toMatch(/document\.cookie\s*=.*sfm_access_token/);
    expect(mfa).not.toMatch(/document\.cookie\s*=.*sfm_access_token/);
    expect(middleware).not.toContain("request.cookies.get('sfm_mfa_required')");
    expect(middleware).toContain("apiError('UNAUTHORIZED', 401)");
    expect(middleware).toContain("apiError('MFA_REQUIRED', 403");
    expect(middleware).toContain("'/api/:path*'");
  });

  it('preserves guest-page access while requiring real sessions for protected APIs', () => {
    const middleware = source('src/middleware.ts');
    expect(middleware).toContain("request.cookies.get('sfm_guest')?.value === 'true'");
    expect(middleware).toContain('hasGuestSession && isGuestAllowed(pathname)');
    expect(middleware).toContain('const session = await sessionForRequest(request)');
  });

  it('keeps local Dashboard and trader QA bypasses separate and disabled on Vercel', () => {
    const middleware = source('src/middleware.ts');
    expect(middleware).toContain("process.env.SFM_LOCAL_DASHBOARD_QA === '1'");
    expect(middleware).toContain("process.env.SFM_LOCAL_TRADER_QA === '1'");
    expect(middleware).toContain("if (process.env.VERCEL === '1') return false");
    expect(middleware).toContain('if (isTraderPath)');
    expect(middleware).toContain('if (isDashboardPath)');
  });
});
