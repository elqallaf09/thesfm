import { describe, expect, it, vi } from 'vitest';
import { MobileSessionClient, type SessionStorage } from '../../../apps/expo-go/src/session';

function setup(fetcher: typeof fetch, expiresAt = 100) {
  const values = new Map<string, string>([['sfm-investor-session', JSON.stringify({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt })]]);
  const storage: SessionStorage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
  const client = new MobileSessionClient({ product: 'investor', supabaseUrl: 'https://auth.example', apiBaseUrl: 'https://api.example', publicKey: 'test-public-key', storage, fetcher, now: () => 1000 });
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
});
