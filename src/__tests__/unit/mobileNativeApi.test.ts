import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resourceFor } from '../../../apps/expo-go/native/catalog';

const store = vi.hoisted(() => new Map<string, string>());
vi.mock('../../../apps/expo-go/node_modules/expo-constants', () => ({ default: { expoConfig: { extra: { sfmProduct: 'business', supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'public-test-key' } } } }));
vi.mock('../../../apps/expo-go/node_modules/expo-secure-store', () => ({ getItemAsync: async (key: string) => store.get(key) || null, setItemAsync: async (key: string, value: string) => { store.set(key, value); } }));
// Keep the native dependency graph out of the website TypeScript program.
// Vitest still loads and mocks the actual module at runtime.
const nativeApiPath = '../../../apps/expo-go/native/api';
const { loadRecords, refreshSession, saveRecord } = await import(nativeApiPath);

const owner = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';
const customers = resourceFor('/customers', 'business')!;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  store.clear();
  store.set('sfm-business-session', JSON.stringify({ accessToken: 'user-jwt', refreshToken: 'refresh-token', expiresAt: Date.now() + 3600000 }));
  vi.restoreAllMocks();
});
describe('native data access', () => {
  it('uses the verified account id and bearer token for writes', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).endsWith('/auth/v1/user')) return response({ id: owner });
      if (String(url).includes('business_user_roles')) return response([{ role: 'accountant' }]);
      expect(options?.method).toBe('POST');
      expect(options?.headers).toMatchObject({ apikey: 'public-test-key', Authorization: 'Bearer user-jwt' });
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
