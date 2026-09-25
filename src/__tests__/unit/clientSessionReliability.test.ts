import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateGuestServerSession,
  resetClientSessionSyncForTests,
  syncServerAuthSession,
} from '@/lib/auth/clientSession';

const session = { access_token: 'test-access-token' } as Session;

describe('client session synchronization', () => {
  beforeEach(() => resetClientSessionSyncForTests());
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces overlapping auth initialization requests', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => {
      resolveFetch = resolve;
    }));

    const first = syncServerAuthSession(session);
    const second = syncServerAuthSession(session);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveFetch(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not initialize the same guest session twice during rapid navigation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await activateGuestServerSession();
    await activateGuestServerSession();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
      method: 'DELETE',
      headers: { 'X-SFM-Guest-Session': 'activate' },
    }));
  });

  it('returns an availability state instead of rejecting on a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(syncServerAuthSession(session)).resolves.toEqual({ ok: false, code: 'AUTH_UNAVAILABLE' });
  });
  it('clears cookies only after an older sign-in request settles', async () => {
    let finish!: (response: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockImplementation(async () => Response.json({ ok: true }));
    const oldLogin = syncServerAuthSession(session);
    const logout = syncServerAuthSession(null, { force: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    finish(Response.json({ ok: true }));
    await Promise.all([oldLogin, logout]);
    expect(fetchSpy.mock.calls.map(call => call[1]?.method)).toEqual(['POST', 'DELETE']);
  });

  it('does not reuse an old completed state while a different state is pending', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ ok: true }));
    await syncServerAuthSession(session);
    const logout = syncServerAuthSession(null);
    const login = syncServerAuthSession(session);
    await Promise.all([logout, login]);
    expect(fetchSpy.mock.calls.map(call => call[1]?.method)).toEqual(['POST', 'DELETE', 'POST']);
  });

});
