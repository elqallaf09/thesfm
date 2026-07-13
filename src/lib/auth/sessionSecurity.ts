export const AUTH_ACCESS_COOKIE = 'sfm_access_token';
export const AUTH_STATE_COOKIE = 'sfm_auth';
export const EMAIL_MFA_CHALLENGE_COOKIE = 'sfm_email_mfa_challenge';
export const EMAIL_MFA_PROOF_COOKIE = 'sfm_email_mfa_proof';
export const LEGACY_MFA_COOKIE = 'sfm_mfa_required';

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2' | null;
export type MfaRequirement = 'none' | 'totp' | 'email' | 'unavailable';

export interface JwtClaims {
  sub?: string;
  aal?: string;
  session_id?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface EmailMfaChallengePayload {
  kind: 'email-challenge';
  sub: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
}

export interface EmailMfaProofPayload {
  kind: 'email-proof';
  sub: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as JwtClaims : null;
  } catch {
    return null;
  }
}

export function accessTokenMaxAge(token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const expiry = decodeJwtClaims(token)?.exp;
  if (typeof expiry !== 'number' || !Number.isFinite(expiry)) return 60 * 60;
  return Math.max(0, Math.min(expiry - nowSeconds, 60 * 60 * 24 * 7));
}

export function authCookieOptions(maxAge: number, production = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function decideMfaRequirement(input: {
  aal: AuthenticatorAssuranceLevel;
  hasVerifiedTotp: boolean;
  emailTwoFactorEnabled: boolean;
  emailProofValid: boolean;
  profileAvailable: boolean;
}): MfaRequirement {
  if (!input.profileAvailable) return 'unavailable';
  if (input.hasVerifiedTotp && input.aal !== 'aal2') return 'totp';
  if (input.aal === 'aal2') return 'none';
  if (input.emailTwoFactorEnabled && !input.emailProofValid) return 'email';
  return 'none';
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid Base64URL encoding');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== value) throw new Error('Non-canonical Base64URL encoding');
  return bytes;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signAuthPayload(payload: object, secret: string) {
  if (!secret) throw new Error('MFA signing is not configured');
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthPayload<T extends { expiresAt?: number }>(
  value: string | null | undefined,
  secret: string,
): Promise<T | null> {
  if (!value || !secret) return null;
  const [encodedPayload, encodedSignature, extra] = value.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as T;
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.expiresAt === 'number' && payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getMfaSigningSecret() {
  return (
    process.env.AUTH_MFA_SECRET ||
    process.env.ADMIN_DIAGNOSTICS_TOKEN ||
    process.env.DATABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}
