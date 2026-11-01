import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  user: 'c52a014b-e3fc-4e4c-9279-418377c2267e', role: 'manager', mfa: 'none',
  rows: [] as Array<Record<string, unknown>>, calls: [] as Array<{ table: string; op: string; filters: Array<[string, unknown]>; values?: Record<string, unknown>; columns?: string }>,
}));
vi.mock('@/lib/server/authSession', () => ({
  bearerToken: (request: Request) => request.headers.get('authorization')?.replace(/^Bearer /, '') ?? null,
  inspectSessionSecurity: vi.fn(async () => ({ status: 'ok', userId: state.user, email: 'qa@example.test', mfaRequirement: state.mfa })),
}));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({
  from(table: string) {
    const call = { table, op: 'select', filters: [] as Array<[string, unknown]>, values: undefined as Record<string, unknown> | undefined, columns: undefined as string | undefined };
    state.calls.push(call);
    const query = {
      select: (columns?: string) => { call.columns = columns; return query; }, order: () => query, limit: () => query, or: () => query,
      eq: (field: string, value: unknown) => { call.filters.push([field, value]); return query; },
      insert: (values: Record<string, unknown>) => { call.op = 'insert'; call.values = values; return query; },
      upsert: (values: Record<string, unknown>) => { call.op = 'upsert'; call.values = values; return query; },
      update: (values: Record<string, unknown>) => { call.op = 'update'; call.values = values; return query; },
      delete: () => { call.op = 'delete'; return query; },
      maybeSingle: async () => {
        if (table === 'business_user_roles') return { data: { role: state.role }, error: null };
        if (['insert', 'upsert'].includes(call.op)) return { data: { id: '969e672f-e56c-456a-8e42-cf13e8f9d8a7', ...call.values }, error: null };
        return { data: state.rows.find(row => call.filters.every(([field, value]) => row[field] === value)) ?? null, error: null };
      },
      then: (resolve: (value: unknown) => void) => Promise.resolve({ data: state.rows.filter(row => call.filters.every(([field, value]) => row[field] === value)), error: null }).then(resolve),
    };
    return query;
  },
})) }));
import { handleMobileRecords } from '@/lib/server/mobileRecords';
import { createClient } from '@supabase/supabase-js';
const recordId = '969e672f-e56c-456a-8e42-cf13e8f9d8a7';
function request(method = 'GET', body?: unknown, token = true, search = '') { return new Request(`https://sfm.example/api/mobile/finance/records/expenses${search}`, { method, headers: token ? { Authorization: 'Bearer qa-token' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) }); }
beforeEach(() => { state.calls = []; state.rows = []; state.mfa = 'none'; state.role = 'manager'; process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-only'; });
describe('mobile record API authorization and mutations', () => {
  it('rejects unauthenticated and MFA-incomplete requests before opening a data client', async () => {
    expect((await handleMobileRecords(request('GET', undefined, false), 'finance', 'expenses')).status).toBe(401);
    state.mfa = 'totp'; expect((await handleMobileRecords(request(), 'finance', 'expenses')).status).toBe(403);
    expect(state.calls).toHaveLength(0);
  });
  it('filters reads by the verified owner and uses their token with no administrative credentials', async () => {
    state.rows = [{ id: recordId, user_id: state.user, name: 'Own expense' }, { id: 'other', user_id: 'another-user', name: 'Private' }];
    const response = await handleMobileRecords(request(), 'finance', 'expenses');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect((await response.json()).records).toHaveLength(1);
    expect(createClient).toHaveBeenLastCalledWith('https://auth.example', 'public-only', expect.objectContaining({ global: { headers: { Authorization: 'Bearer qa-token' } } }));
    expect(state.calls[0].filters).toContainEqual(['user_id', state.user]);
  });
  it('returns receipt metadata only as output fields and never accepts it as a record mutation', async () => {
    await handleMobileRecords(request(), 'finance', 'expenses');
    expect(state.calls[0].columns).toContain('receipt_image_url,receipt_file_name');
    expect((await handleMobileRecords(request('POST', { name: 'Expense', amount: 1, currency: 'KWD', receipt_image_url: 'https://attacker.invalid' }), 'finance', 'expenses')).status).toBe(400);
  });
  it('rejects owner reassignment, computed prices, unknown resources, and invalid cursors', async () => {
    const body = { name: 'Expense', amount: 1, currency: 'KWD', user_id: 'another-user' };
    expect((await handleMobileRecords(request('POST', body), 'finance', 'expenses')).status).toBe(400);
    expect((await handleMobileRecords(request('PATCH', { id: recordId, native_market_value: 9 }), 'investor', 'holdings')).status).toBe(400);
    expect((await handleMobileRecords(request(), 'business', 'watchlist')).status).toBe(404);
    expect((await handleMobileRecords(request('GET', undefined, true, '?cursor=invalid'), 'finance', 'expenses')).status).toBe(400);
    expect(state.calls.every(call => call.op === 'select')).toBe(true);
  });
  it('binds inserts to the verified owner and makes watchlist saves idempotent', async () => {
    const response = await handleMobileRecords(request('POST', { symbol: 'NBK.KW', name: 'NBK', asset_type: 'stock', currency: 'KWD' }), 'investor', 'watchlist');
    expect(response.status).toBe(201); expect(state.calls[0].op).toBe('upsert'); expect(state.calls[0].values?.user_id).toBe(state.user);
  });
  it('makes another user’s IDs indistinguishable from absent IDs for update and delete', async () => {
    state.rows = [{ id: recordId, user_id: 'another-user', amount: 9 }];
    for (const method of ['PATCH', 'DELETE']) {
      const response = await handleMobileRecords(request(method, { id: recordId, ...(method === 'PATCH' ? { amount: 3 } : {}) }), 'finance', 'expenses');
      expect(response.status).toBe(404); const last = state.calls.at(-1)!; expect(last.filters).toContainEqual(['user_id', state.user]); expect(last.filters).toContainEqual(['id', recordId]);
    }
  });
  it('enforces business role permissions on the server for employees and accountants', async () => {
    state.role = 'employee'; expect((await handleMobileRecords(request(), 'business', 'invoices')).status).toBe(403);
    state.role = 'accountant'; expect((await handleMobileRecords(request('DELETE', { id: recordId }), 'business', 'invoices')).status).toBe(403);
    expect((await handleMobileRecords(request('PATCH', { id: recordId, salary: 100 }), 'business', 'employees')).status).toBe(403);
    expect(state.calls.every(call => call.op === 'select')).toBe(true);
  });
});
