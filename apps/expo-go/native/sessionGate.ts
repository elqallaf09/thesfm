export class NativeMfaRequired extends Error {
  constructor(readonly kind: 'totp' | 'email') { super('MFA_REQUIRED'); }
}
// Check the server's MFA decision before every native account data request.
export async function assertNativeSessionSecurity(site: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${site}/api/mobile/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', redirect: 'error', signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401) throw new Error('SESSION_EXPIRED');
    if (response.status === 403 && body?.code === 'MFA_REQUIRED') {
      if (body.mfaType === 'totp' || body.mfaType === 'email') throw new NativeMfaRequired(body.mfaType);
      throw new Error('MFA_REQUIRED');
    }
    if (!response.ok || body?.ok !== true) throw new Error('AUTH_UNAVAILABLE');
  } finally { clearTimeout(timeout); }
}
