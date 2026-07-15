import type { Session } from '@supabase/supabase-js';

export type ServerSessionSyncResult =
  | { ok: true }
  | { ok: false; code: 'UNAUTHORIZED' | 'MFA_REQUIRED' | 'AUTH_UNAVAILABLE'; mfaType?: 'totp' | 'email' };

const RECENT_SYNC_WINDOW_MS = 1_000;
let inFlightSync: { key: string; promise: Promise<ServerSessionSyncResult> } | null = null;
let lastCompletedSync: { key: string; result: ServerSessionSyncResult; at: number } | null = null;

function syncKey(session: Session | null, guest: boolean) {
  return session ? `session:${session.access_token}` : guest ? 'guest' : 'signed-out';
}

async function requestServerSessionSync(session: Session | null, guest: boolean): Promise<ServerSessionSyncResult> {
  const response = await fetch('/api/auth/session', {
    method: session ? 'POST' : 'DELETE',
    headers: session
      ? { Authorization: `Bearer ${session.access_token}` }
      : guest
        ? { 'X-SFM-Guest-Session': 'activate' }
        : undefined,
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
}

export function syncServerAuthSession(
  session: Session | null,
  options: { guest?: boolean; force?: boolean } = {},
): Promise<ServerSessionSyncResult> {
  const guest = options.guest === true;
  const key = syncKey(session, guest);
  if (inFlightSync?.key === key) return inFlightSync.promise;
  if (
    !options.force &&
    lastCompletedSync?.key === key &&
    Date.now() - lastCompletedSync.at < RECENT_SYNC_WINDOW_MS
  ) return Promise.resolve(lastCompletedSync.result);

  const promise = requestServerSessionSync(session, guest)
    .catch((): ServerSessionSyncResult => ({ ok: false, code: 'AUTH_UNAVAILABLE' }))
    .then(result => {
      lastCompletedSync = { key, result, at: Date.now() };
      return result;
    })
    .finally(() => {
      if (inFlightSync?.promise === promise) inFlightSync = null;
    });
  inFlightSync = { key, promise };
  return promise;
}

export function activateGuestServerSession() {
  return syncServerAuthSession(null, { guest: true });
}

export function resetClientSessionSyncForTests() {
  inFlightSync = null;
  lastCompletedSync = null;
}
