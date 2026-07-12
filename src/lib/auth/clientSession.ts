import type { Session } from '@supabase/supabase-js';

export type ServerSessionSyncResult =
  | { ok: true }
  | { ok: false; code: 'UNAUTHORIZED' | 'MFA_REQUIRED' | 'AUTH_UNAVAILABLE'; mfaType?: 'totp' | 'email' };

export async function syncServerAuthSession(session: Session | null): Promise<ServerSessionSyncResult> {
  try {
    const response = await fetch('/api/auth/session', {
      method: session ? 'POST' : 'DELETE',
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as {
      ok?: boolean;
      code?: 'UNAUTHORIZED' | 'MFA_REQUIRED' | 'AUTH_UNAVAILABLE';
      mfaType?: 'totp' | 'email';
    } | null;
    if (response.ok && payload?.ok === true) return { ok: true };
    if (payload?.code === 'MFA_REQUIRED') return { ok: false, code: 'MFA_REQUIRED', mfaType: payload.mfaType };
    if (payload?.code === 'UNAUTHORIZED') return { ok: false, code: 'UNAUTHORIZED' };
    return { ok: false, code: 'AUTH_UNAVAILABLE' };
  } catch {
    return { ok: false, code: 'AUTH_UNAVAILABLE' };
  }
}
