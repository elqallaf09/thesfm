import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), deleteUser: vi.fn(), from: vi.fn(), eq: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, key: string) => key === 'service-test'
 ? { from: mocks.from, auth: { admin: { deleteUser: mocks.deleteUser } } }
 : { auth: { getUser: mocks.getUser } } }));
import { POST } from '@/app/api/account/delete/route';

describe('explicit account erasure with month locks', () => {
 beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','anon-test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','service-test');
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.from.mockImplementation(() => ({ delete: () => ({ eq: mocks.eq }) }));
  mocks.deleteUser.mockResolvedValue({ error: null });
  vi.spyOn(console,'error').mockImplementation(() => {});
 });
 afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
 it('clears the requesting owner’s locks before deleting ledger rows', async () => {
  const response = await POST(new Request('https://test/api/account/delete',{ method: 'POST', headers: { Authorization: 'Bearer session-test' } }));
  expect(response.status).toBe(200);
  expect(mocks.from.mock.calls.slice(0,4).map(call=>call[0])).toEqual(['finance_month_closes','finance_month_events','monthly_income_sources','expense_items']);
  expect(mocks.eq.mock.calls.every(call=>call[1]==='owner')).toBe(true);
  expect(mocks.deleteUser).toHaveBeenCalledWith('owner');
 });
 it('does not erase anything for an unauthenticated caller', async () => {
  const response = await POST(new Request('https://test/api/account/delete',{method:'POST'}));
  expect(response.status).toBe(401); expect(mocks.from).not.toHaveBeenCalled();
 });
 it('stops before ledger erasure if lock removal fails', async () => {
  mocks.eq.mockResolvedValueOnce({ error: { code:'42501',message:'permission denied' } });
  const response = await POST(new Request('https://test/api/account/delete',{method:'POST',headers:{Authorization:'Bearer session-test'}}));
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(mocks.from).toHaveBeenCalledTimes(1); expect(mocks.deleteUser).not.toHaveBeenCalled();
 });
});
