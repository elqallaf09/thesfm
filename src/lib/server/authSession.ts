import {
  type AuthenticatorAssuranceLevel,
  type EmailMfaProofPayload,
  decideMfaRequirement,
  decodeJwtClaims,
  getMfaSigningSecret,
  verifyAuthPayload,
} from '@/lib/auth/sessionSecurity';
import { getSupabasePublicConfig } from '@/integrations/supabase/environment';

const AUTH_TIMEOUT_MS = 4_500;

type SupabaseFactor = {
  factor_type?: string;
  status?: string;
};

type SupabaseUser = {
  id?: string;
  email?: string;
  factors?: SupabaseFactor[];
};

type ProfileSecurity = {
  email_2fa_enabled?: boolean | null;
  onboarding_completed?: boolean | null;
  onboarding_skipped?: boolean | null;
};

export type SessionSecurityResult =
  | { status: 'unauthenticated' }
  | { status: 'unavailable'; reason: 'configuration' | 'provider' | 'profile' | 'mfa_configuration' }
  | {
      status: 'ok';
      token: string;
      userId: string;
      email: string | null;
      sessionId: string | null;
      aal: AuthenticatorAssuranceLevel;
      mfaRequirement: 'none' | 'totp' | 'email';
      onboardingComplete: boolean;
    };

async function fetchWithTimeout(input: string | URL, init: RequestInit, timeoutMs = AUTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function inspectSessionSecurity(
  token: string,
  emailProofCookie?: string | null,
): Promise<SessionSecurityResult> {
  const config = getSupabasePublicConfig();
  const supabaseUrl = config?.url.replace(/\/$/, '');
  const supabaseAnonKey = config?.key;
  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return token ? { status: 'unavailable', reason: 'configuration' } : { status: 'unauthenticated' };
  }

  let userResponse: Response;
  try {
    userResponse = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    return { status: 'unavailable', reason: 'provider' };
  }

  if (userResponse.status === 401 || userResponse.status === 403) return { status: 'unauthenticated' };
  if (!userResponse.ok) return { status: 'unavailable', reason: 'provider' };

  const user = await userResponse.json().catch(() => null) as SupabaseUser | null;
  if (!user?.id) return { status: 'unauthenticated' };

  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set('select', 'email_2fa_enabled,onboarding_completed,onboarding_skipped');
  profileUrl.searchParams.set('id', `eq.${user.id}`);
  profileUrl.searchParams.set('limit', '1');

  let profileResponse: Response;
  try {
    profileResponse = await fetchWithTimeout(profileUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    return { status: 'unavailable', reason: 'profile' };
  }
  if (!profileResponse.ok) return { status: 'unavailable', reason: 'profile' };

  const profiles = await profileResponse.json().catch(() => null) as ProfileSecurity[] | null;
  const profile = profiles?.[0];
  if (!profile) return { status: 'unavailable', reason: 'profile' };

  const claims = decodeJwtClaims(token);
  const aal = claims?.aal === 'aal2' ? 'aal2' : claims?.aal === 'aal1' ? 'aal1' : null;
  const sessionId = typeof claims?.session_id === 'string' ? claims.session_id : null;
  const hasVerifiedTotp = Boolean(user.factors?.some(
    factor => factor.factor_type === 'totp' && factor.status === 'verified',
  ));

  let emailProofValid = false;
  if (profile.email_2fa_enabled && aal !== 'aal2') {
    const secret = getMfaSigningSecret();
    if (!secret) return { status: 'unavailable', reason: 'mfa_configuration' };
    const proof = await verifyAuthPayload<EmailMfaProofPayload>(emailProofCookie, secret);
    emailProofValid = Boolean(
      proof?.kind === 'email-proof' &&
      proof.sub === user.id &&
      sessionId &&
      proof.sessionId === sessionId,
    );
  }

  const mfaRequirement = decideMfaRequirement({
    aal,
    hasVerifiedTotp,
    emailTwoFactorEnabled: profile.email_2fa_enabled === true,
    emailProofValid,
    profileAvailable: true,
  });
  if (mfaRequirement === 'unavailable') return { status: 'unavailable', reason: 'profile' };

  return {
    status: 'ok',
    token,
    userId: user.id,
    email: typeof user.email === 'string' ? user.email.trim().toLowerCase() : null,
    sessionId,
    aal,
    mfaRequirement,
    onboardingComplete: profile.onboarding_completed === true || profile.onboarding_skipped === true,
  };
}
