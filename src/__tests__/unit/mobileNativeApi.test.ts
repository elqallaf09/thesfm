import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resourceFor } from '../../../apps/expo-go/native/catalog';

const store = vi.hoisted(() => new Map<string, string>());
const gate = vi.hoisted(() => vi.fn());
vi.mock('../../../apps/expo-go/native/sessionGate', async importOriginal => ({ ...(await importOriginal<object>()), assertNativeSessionSecurity: gate }));
vi.mock('../../../apps/expo-go/node_modules/expo-constants', () => ({ default: { expoConfig: { extra: { sfmProduct: 'business', supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'public-test-key' } } } }));
vi.mock('../../../apps/expo-go/node_modules/expo-secure-store', () => ({ getItemAsync: async (key: string) => store.get(key) || null, setItemAsync: async (key: string, value: string) => { store.set(key, value); }, deleteItemAsync: async (key: string) => { store.delete(key); }, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6 }));
// Keep the native dependency graph out of the website TypeScript program.
// Vitest still loads and mocks the actual module at runtime.
const nativeApiPath = '../../../apps/expo-go/native/api';
const { loadRecords, refreshSession, saveRecord, signOut, signIn, request, activeSession, PendingNativeMfa, verifyNativeMfa, sendNativeEmailCode, cancelNativeMfa } = await import(nativeApiPath);

const owner = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';
const customers = resourceFor('/customers', 'business')!;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  store.clear();
  store.set('sfm-business-session', JSON.stringify({ accessToken: 'user-jwt', refreshToken: 'refresh-token', expiresAt: Date.now() + 3600000 }));
  vi.restoreAllMocks();
  gate.mockReset().mockResolvedValue(undefined);
});
describe('native data access', () => {
  it('verifies a TOTP challenge and rechecks server assurance before saving', async () => {
    store.clear();
    const gatePath = '../../../apps/expo-go/native/sessionGate';
    const { NativeMfaRequired } = await import(gatePath);
    gate.mockRejectedValueOnce(new NativeMfaRequired('totp')).mockResolvedValue(undefined);
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async endpoint => {
      const url = String(endpoint);
      if (url.includes('grant_type=password')) return response({ access_token: 'aal1', refresh_token: 'first-refresh', expires_in: 3600 });
      if (url.endsWith('/user')) return response({ factors: [{ id: 'factor', factor_type: 'totp', status: 'verified' }] });
      if (url.endsWith('/challenge')) return response({ id: 'challenge' });
      return response({ access_token: 'aal2', refresh_token: 'second-refresh', expires_in: 3600 });
    });
    const pending = await signIn('test@example.invalid', 'password').catch((e: unknown) => e);
    expect(pending).toBeInstanceOf(PendingNativeMfa); expect(store.size).toBe(0);
    await verifyNativeMfa(pending, '123456');
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/factors/factor/verify'), expect.objectContaining({ body: JSON.stringify({ challenge_id: 'challenge', code: '123456' }) }));
    expect(gate).toHaveBeenLastCalledWith('https://www.the-sfm.com', 'aal2');
    expect(JSON.parse(store.get('sfm-business-session')!).accessToken).toBe('aal2');
  });
  it('never saves an MFA response after cancellation', async () => {
    store.clear();
    const gatePath = '../../../apps/expo-go/native/sessionGate';
    const { NativeMfaRequired } = await import(gatePath);
    gate.mockRejectedValueOnce(new NativeMfaRequired('email'));
    let release!: (value: Response) => void;
    const pendingResponse = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (endpoint, options) => {
      if (String(endpoint).includes('grant_type=password')) return response({ access_token: 'aal1', refresh_token: 'refresh', expires_in: 3600 });
      const body = options?.body ? JSON.parse(String(options.body)) : {};
      if (body.action === 'start') return response({ challenge: 'signed-challenge' });
      if (body.action === 'verify') return pendingResponse;
      return response(null);
    });
    const pending = await signIn('test@example.invalid', 'password').catch((e: unknown) => e);
    await sendNativeEmailCode(pending);
    const verifying = verifyNativeMfa(pending, '123456');
    const rejection = expect(verifying).rejects.toThrow('SESSION_CHANGED');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    cancelNativeMfa(pending);
    release(response({ access_token: 'late', refresh_token: 'late-refresh', expires_in: 3600 }));
    await rejection; expect(store.size).toBe(0);
  });
  it('does not send account data requests when the server requires MFA', async () => {
    gate.mockRejectedValue(new Error('MFA_REQUIRED'));
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(loadRecords(customers)).rejects.toThrow('MFA_REQUIRED');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not persist a password-only login when the server requires MFA', async () => {
    store.clear(); gate.mockRejectedValue(new Error('MFA_REQUIRED'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ access_token: 'aal1', refresh_token: 'refresh', expires_in: 3600 }));
    await expect(signIn('test@example.invalid', 'password')).rejects.toThrow('MFA_REQUIRED');
    expect(store.has('sfm-business-session')).toBe(false);
  });
  it('uses the verified account id and bearer token for writes', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).endsWith('/auth/v1/user')) return response({ id: owner });
      if (String(url).includes('business_user_roles')) return response([{ role: 'accountant' }]);
      expect(options?.method).toBe('POST');
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer user-jwt');
      expect(new Headers(options?.headers).get('apikey')).toBe('public-test-key');
      expect(JSON.parse(String(options?.body))).toMatchObject({ name: 'Customer', user_id: owner });
      return response([{ id: recordId, name: 'Customer', user_id: owner }]);
    });
    const row = await saveRecord(customers, { name: 'Customer', user_id: 'other-user' });
    expect(row.id).toBe(recordId); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('does not fetch business records for an employee', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).endsWith('/auth/v1/user') ? response({ id: owner }) : response([{ role: 'employee' }]));
    await expect(loadRecords(customers)).rejects.toThrow('صلاحية'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not claim success when RLS returns no updated row', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).endsWith('/auth/v1/user') ? response({ id: owner }) : String(url).includes('business_user_roles') ? response([{ role: 'manager' }]) : response([]));
    await expect(saveRecord(customers, { name: 'Customer' }, { id: recordId })).rejects.toThrow('لم يتم حفظ');
  });
  it('does not upgrade a role when the role request fails', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).endsWith('/auth/v1/user') ? response({ id: owner }) : response({ error: 'offline' }, 503));
    await expect(saveRecord(customers, { name: 'Customer' })).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('keeps refreshed Finance and Business credentials in separate secure keys', async () => {
    const expired = { accessToken: 'old', refreshToken: 'refresh-old', expiresAt: 0 };
    store.set('sfm-finance-session', JSON.stringify(expired));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ access_token: 'finance-new', refresh_token: 'finance-refresh', expires_in: 3600 }));
    await refreshSession(expired, 'sfm-finance-session');
    expect(JSON.parse(store.get('sfm-finance-session')!).accessToken).toBe('finance-new');
    expect(JSON.parse(store.get('sfm-business-session')!).accessToken).toBe('user-jwt');
  });
  it('serializes concurrent token refresh and persists the replacement', async () => {
    const expired = { accessToken: 'old', refreshToken: 'refresh-old', expiresAt: 0 };
    store.set('sfm-business-session', JSON.stringify(expired));
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ access_token: 'new', refresh_token: 'refresh-new', expires_in: 3600 }));
    const [first, second] = await Promise.all([refreshSession(expired), refreshSession(expired)]);
    expect(first.accessToken).toBe('new'); expect(second).toEqual(first); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.get('sfm-business-session')!).refreshToken).toBe('refresh-new');
  });
});

describe('native session security under concurrent requests', () => {
  it('does not resurrect a session when refresh completes after sign-out', async () => {
    const expired = { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 0 };
    store.set('sfm-business-session', JSON.stringify(expired));
    let release!: (value: Response) => void;
    const pending = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).includes('grant_type=refresh_token') ? pending : response(null));
    const refresh = refreshSession(expired);
    const rejection = expect(refresh).rejects.toThrow('SESSION_CHANGED');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await signOut();
    release(response({ access_token: 'late', refresh_token: 'late-refresh', expires_in: 3600 }));
    await rejection;
    expect(store.has('sfm-business-session')).toBe(false);
  });
  it('does not overwrite a new login with an old in-flight refresh', async () => {
    const expired = { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 0 };
    store.set('sfm-business-session', JSON.stringify(expired));
    let release!: (value: Response) => void;
    const pending = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).includes('grant_type=refresh_token') ? pending : response({ access_token: 'new-account', refresh_token: 'new-refresh', expires_in: 3600 }));
    const refresh = refreshSession(expired);
    const rejection = expect(refresh).rejects.toThrow('SESSION_CHANGED');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await signIn('test@example.invalid', 'test-password');
    release(response({ access_token: 'late-old-account', refresh_token: 'late-refresh', expires_in: 3600 }));
    await rejection;
    expect(JSON.parse(store.get('sfm-business-session')!).accessToken).toBe('new-account');
  });
  it('discards a record response delivered after local sign-out', async () => {
    let release!: (value: Response) => void;
    const pending = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url).includes('/rest/') ? pending : response(null));
    const read = request('/rest/v1/business_customers');
    const rejection = expect(read).rejects.toThrow('SESSION_CHANGED');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await signOut(); release(response([{ id: recordId, name: 'Private record' }]));
    await rejection;
  });
  it('preserves refresh credentials during a temporary outage', async () => {
    const expired = { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 0 };
    store.set('sfm-business-session', JSON.stringify(expired));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await expect(activeSession()).rejects.toThrow();
    expect(JSON.parse(store.get('sfm-business-session')!).refreshToken).toBe('old-refresh');
  });
  it('clears locally offline and reports that server revocation was not confirmed', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    expect(await signOut('global')).toBe(false);
    expect(store.has('sfm-business-session')).toBe(false);
  });
  it('rejects malformed stored sessions without sending credentials', async () => {
    store.set('sfm-business-session', '{invalid');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(activeSession()).rejects.toThrow('SESSION_EXPIRED');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('never sends bearer tokens to absolute or traversing request paths', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    for (const path of ['https://example.invalid/steal', '//example.invalid', '/rest/v1/../../steal']) await expect(request(path)).rejects.toThrow('INVALID_PATH');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
