import { describe, expect, it, vi } from 'vitest';
import { MobileSessionClient, PendingMobileMfa, type SessionStorage } from '../../../apps/expo-go/src/session';

function setup(fetcher: typeof fetch, expiresAt = 100, preflight = true) {
  const values = new Map<string, string>([['sfm-investor-session', JSON.stringify({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt })]]);
  const storage: SessionStorage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
  const guardedFetcher: typeof fetch = async (input, init) => preflight && String(input).endsWith('/api/mobile/session') ? json({ ok: true }) : fetcher(input, init);
  const client = new MobileSessionClient({ product: 'investor', supabaseUrl: 'https://auth.example', apiBaseUrl: 'https://api.example', publicKey: 'test-public-key', storage, fetcher: guardedFetcher, now: () => 1000 });
  return { client, values };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
describe('mobile renewable user sessions', () => {
  it('coalesces refresh and duplicate reads and uses the rotated token', async () => {
    const fetcher = vi.fn(async (input, init) => String(input).includes('refresh_token')
      ? json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 })
      : json({ authorization: (init?.headers as Record<string, string>).Authorization }));
    const { client } = setup(fetcher); await client.restore();
    const [left, right] = await Promise.all([client.request('/api/mobile/account'), client.request('/api/mobile/account')]);
    expect(left).toEqual({ authorization: 'Bearer new-access' }); expect(right).toEqual(left); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('preserves renewable credentials after a provider outage and can recover', async () => {
    let available = false;
    const { client, values } = setup(vi.fn(async input => !available ? json({}, 503) : String(input).includes('refresh_token') ? json({ access_token: 'new', refresh_token: 'renewed', expires_in: 3600 }) : json({ ok: true })));
    await client.restore();
    await expect(client.request('/api/mobile/account')).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' });
    expect(client.signedIn).toBe(true); expect(values.has('sfm-investor-session')).toBe(true);
    available = true; await expect(client.request('/api/mobile/account')).resolves.toEqual({ ok: true });
  });
  it('removes invalid sessions and never treats a permission denial as expired authentication', async () => {
    const invalid = setup(vi.fn(async () => json({}, 400))); await invalid.client.restore();
    await expect(invalid.client.request('/api/mobile/account')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(invalid.client.signedIn).toBe(false); expect(invalid.values.size).toBe(0);
    const forbidden = setup(vi.fn(async () => json({ code: 'MFA_REQUIRED' }, 403)), 100_000); await forbidden.client.restore();
    await expect(forbidden.client.request('/api/mobile/account')).rejects.toMatchObject({ code: 'MFA_REQUIRED' }); expect(forbidden.client.signedIn).toBe(true);
  });
  it('rejects late account responses after logout and clears cached private data', async () => {
    let finish!: (response: Response) => void;
    const { client } = setup(vi.fn(async () => new Promise<Response>(resolve => { finish = resolve; })), 100_000);
    await client.restore();
    const pending = client.request('/api/mobile/account', {}, 60_000);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const rejected = expect(pending).rejects.toMatchObject({ code: 'STALE_SESSION' });
    await client.signOut(false); finish(json({ private: 'previous-user' })); await rejected;
    await expect(client.request('/api/mobile/account', {}, 60_000)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  it('does not restore a session when a refresh finishes after logout', async () => {
    let finish!: (response: Response) => void;
    const { client, values } = setup(vi.fn(async () => new Promise<Response>(resolve => { finish = resolve; })));
    await client.restore(); const pending = client.request('/api/mobile/account');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const rejected = expect(pending).rejects.toMatchObject({ code: 'STALE_SESSION' });
    await client.signOut(false); finish(json({ access_token: 'late', refresh_token: 'late', expires_in: 3600 })); await rejected;
    expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
  });
  it('invalidates cached reads after a successful mutation', async () => {
    let count = 0;
    const { client } = setup(vi.fn(async () => json({ sequence: ++count })), 100_000); await client.restore();
    expect(await client.request('/api/mobile/account', {}, 60_000)).toEqual({ sequence: 1 });
    expect(await client.request('/api/mobile/account', {}, 60_000)).toEqual({ sequence: 1 });
    await client.request('/api/mobile/account', { method: 'PATCH', body: '{}' });
    expect(await client.request('/api/mobile/account', {}, 60_000)).toEqual({ sequence: 3 });
  });
  it('rechecks MFA before serving a cached private response', async () => {
    let mfaRequired = false; let privateReads = 0; let reported: PendingMobileMfa | null = null;
    const fetcher = vi.fn(async input => {
      const url = String(input);
      if (url.endsWith('/api/mobile/session')) return mfaRequired ? json({ code: 'MFA_REQUIRED', mfaType: 'totp' }, 403) : json({ ok: true });
      privateReads += 1; return json({ balance: 42 });
    });
    const { client } = setup(fetcher, 100_000, false); client.subscribeMfaRequired(pending => { reported = pending; }); await client.restore();
    await expect(client.request('/api/mobile/account', {}, 60_000)).resolves.toEqual({ balance: 42 });
    mfaRequired = true;
    await expect(client.request('/api/mobile/account', {}, 60_000)).rejects.toBeInstanceOf(PendingMobileMfa);
    expect(privateReads).toBe(1); expect(reported).toBeInstanceOf(PendingMobileMfa);
  });
  it('keeps the first-factor session out of storage until email MFA succeeds', async () => {
    const fetcher = vi.fn(async (input, init) => {
      const url = String(input); const authorization = new Headers(init?.headers).get('Authorization') ?? '';
      if (url.includes('/auth/v1/token?grant_type=password')) return json({ access_token: 'first-factor', refresh_token: 'first-refresh', expires_in: 3600 });
      if (url.endsWith('/api/mobile/session')) return authorization === 'Bearer verified-access' ? json({ ok: true }) : json({ code: 'MFA_REQUIRED', mfaType: 'email' }, 403);
      if (url.endsWith('/api/auth/mfa/mobile-email')) {
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) as { action?: string } : {};
        return body.action === 'start' ? json({ challenge: 'server-signed-challenge' }) : json({ access_token: 'verified-access', refresh_token: 'verified-refresh', expires_in: 3600 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const { client, values } = setup(fetcher, 100_000, false);
    let pending: PendingMobileMfa | null = null;
    try { await client.signIn('member@example.com', 'correct-password'); } catch (error) { if (error instanceof PendingMobileMfa) pending = error; else throw error; }
    expect(pending).toBeInstanceOf(PendingMobileMfa); expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
    await client.sendMfaEmail(pending!); await client.verifyMfa(pending!, '123456');
    expect(client.signedIn).toBe(true); expect(values.get('sfm-investor-session')).toContain('verified-access');
  });
  it('verifies an enrolled TOTP factor before accepting a mobile session', async () => {
    const fetcher = vi.fn(async (input, init) => {
      const url = String(input); const authorization = new Headers(init?.headers).get('Authorization') ?? '';
      if (url.includes('/auth/v1/token?grant_type=password')) return json({ access_token: 'first-factor', refresh_token: 'first-refresh', expires_in: 3600 });
      if (url.endsWith('/api/mobile/session')) return authorization === 'Bearer verified-access' ? json({ ok: true }) : json({ code: 'MFA_REQUIRED', mfaType: 'totp' }, 403);
      if (url.endsWith('/auth/v1/user')) return json({ factors: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }] });
      if (url.endsWith('/auth/v1/factors/factor-1/challenge')) return json({ id: 'totp-challenge' });
      if (url.endsWith('/auth/v1/factors/factor-1/verify')) return json({ access_token: 'verified-access', refresh_token: 'verified-refresh', expires_in: 3600 });
      throw new Error(`Unexpected request: ${url}`);
    });
    const { client, values } = setup(fetcher, 100_000, false);
    let pending: PendingMobileMfa | null = null;
    try { await client.signIn('member@example.com', 'correct-password'); } catch (error) { if (error instanceof PendingMobileMfa) pending = error; else throw error; }
    expect(pending?.type).toBe('totp'); expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
    await client.verifyMfa(pending!, '123456');
    expect(client.signedIn).toBe(true); expect(values.get('sfm-investor-session')).toContain('verified-access');
  });
});
