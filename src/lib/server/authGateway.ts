import { createHash } from 'node:crypto';
import { isEmail } from '@/lib/authSecurity';

const PROVIDER_TIMEOUT_MS = 6_000;

export type PasswordGrantResult =
  | {
      status: 'ok';
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type EmailOtpVerificationResult =
  | {
      status: 'ok';
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
  | { status: 'invalid' }
  | { status: 'unavailable' };

function providerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

async function fetchWithTimeout(input: string | URL, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizedUsername(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_.-]{3,80}$/i.test(normalized) ? normalized : null;
}

export function normalizeIdentifier(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : '';
}

export async function resolveIdentifierEmail(identifier: string) {
  if (isEmail(identifier)) return { status: 'ok' as const, email: identifier };
  const username = normalizedUsername(identifier);
  if (!username) return { status: 'not_found' as const };

  const config = providerConfig();
  const serviceKey = process.env.DATABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) return { status: 'unavailable' as const };

  const url = new URL(`${config.url}/rest/v1/profiles`);
  url.searchParams.set('select', 'email');
  url.searchParams.set('username', `eq.${username}`);
  url.searchParams.set('limit', '1');
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return { status: 'unavailable' as const };
    const rows = await response.json().catch(() => null) as Array<{ email?: unknown }> | null;
    const email = typeof rows?.[0]?.email === 'string' ? rows[0].email.trim().toLowerCase() : '';
    return isEmail(email) ? { status: 'ok' as const, email } : { status: 'not_found' as const };
  } catch {
    return { status: 'unavailable' as const };
  }
}

function dummyEmail(identifier: string) {
  const digest = createHash('sha256').update(identifier).digest('hex').slice(0, 32);
  return `missing-${digest}@invalid.local`;
}

export async function passwordGrant(identifier: string, password: string): Promise<PasswordGrantResult> {
  const config = providerConfig();
  if (!config) return { status: 'unavailable' };
  const resolved = await resolveIdentifierEmail(identifier);
  if (resolved.status === 'unavailable') return { status: 'unavailable' };
  const email = resolved.status === 'ok' ? resolved.email : dummyEmail(identifier);

  try {
    const response = await fetchWithTimeout(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
    } | null;
    if (!response.ok) {
      return response.status >= 500 ? { status: 'unavailable' } : { status: 'invalid' };
    }
    if (
      typeof payload?.access_token !== 'string' ||
      typeof payload.refresh_token !== 'string'
    ) return { status: 'unavailable' };
    return {
      status: 'ok',
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : 3600,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function sendEmailOtp(email: string) {
  const config = providerConfig();
  if (!config) return { status: 'unavailable' as const };
  try {
    const response = await fetchWithTimeout(`${config.url}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, create_user: false }),
      cache: 'no-store',
    });
    return response.ok ? { status: 'ok' as const } : { status: 'unavailable' as const };
  } catch {
    return { status: 'unavailable' as const };
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<EmailOtpVerificationResult> {
  const config = providerConfig();
  if (!config) return { status: 'unavailable' };
  try {
    const response = await fetchWithTimeout(`${config.url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, token, type: 'email' }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
    } | null;
    if (!response.ok) return response.status >= 500 ? { status: 'unavailable' } : { status: 'invalid' };
    if (typeof payload?.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
      return { status: 'unavailable' };
    }
    return {
      status: 'ok',
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : 3600,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function requestPasswordRecovery(email: string, redirectTo: string) {
  const config = providerConfig();
  if (!config) return { status: 'unavailable' as const };
  const endpoint = new URL(`${config.url}/auth/v1/recover`);
  endpoint.searchParams.set('redirect_to', redirectTo);
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
    return response.status >= 500 ? { status: 'unavailable' as const } : { status: 'accepted' as const };
  } catch {
    return { status: 'unavailable' as const };
  }
}
