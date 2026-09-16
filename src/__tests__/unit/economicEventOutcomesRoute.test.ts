import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createAdmin: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({
  getCurrentUserFromRequest: mocks.getUser,
  createServerSupabaseAdmin: mocks.createAdmin,
}));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rateLimit }));

import { POST } from '@/app/api/economic-intelligence/event-outcomes/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';
const SNAPSHOT = { version: 'test-only', capturedAt: '2026-09-01T00:00:00Z' };

function request(body: unknown = { notificationId: EVENT_ID, action: 'opened' }) {
  return new NextRequest('https://www.the-sfm.com/api/economic-intelligence/event-outcomes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function query(data: unknown, error: unknown = null) {
  const q = {
    select: vi.fn(), eq: vi.fn(), update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.update.mockReturnValue(q);
  return q;
}

function database() {
  const row = {
    id: EVENT_ID, user_id: USER_ID, source_module: 'economic_intelligence',
    source_id: null, event_key: 'priority:unit-test',
    metadata: { evidence_snapshot: SNAPSHOT, keep: 'historical' },
    opened_at: null, actioned_at: null, resolved_at: null,
  };
  const lookup = query(row);
  const update = query({ id: EVENT_ID, source_id: null, event_key: row.event_key, opened_at: '2026-09-14T00:00:00Z' });
  const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(update);
  mocks.createAdmin.mockReturnValue({ from });
  return { from, lookup, update };
}

async function expectPrivateError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  await expect(response.json()).resolves.toEqual({ ok: false, error: { code } });
}

describe('economic outcome API production boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: USER_ID });
    mocks.rateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.createAdmin.mockReturnValue(null);
  });

  it('denies unauthenticated requests without opening the admin client', async () => {
    mocks.getUser.mockResolvedValue(null);
    await expectPrivateError(await POST(request()), 401, 'UNAUTHENTICATED');
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it('fails closed when session verification throws', async () => {
    mocks.getUser.mockRejectedValue(new Error('private auth diagnostic'));
    await expectPrivateError(await POST(request()), 401, 'UNAUTHENTICATED');
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it('returns a private 429 with the existing retry delay before touching storage', async () => {
    mocks.rateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 17 });
    const response = await POST(request());
    expect(response.headers.get('retry-after')).toBe('17');
    await expectPrivateError(response, 429, 'APPLICATION_RATE_LIMITED');
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    { notificationId: [EVENT_ID], action: 'opened' },
    { notificationId: 'invalid', action: 'opened' },
    { notificationId: EVENT_ID, action: 'delete' },
  ])('rejects invalid request shape without database access: %j', async body => {
    await expectPrivateError(await POST(request(body)), 400, 'INVALID_REQUEST');
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it('handles malformed JSON without exposing parser details', async () => {
    const req = new NextRequest('https://www.the-sfm.com/api/economic-intelligence/event-outcomes', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken',
    });
    await expectPrivateError(await POST(req), 400, 'INVALID_REQUEST');
  });

  it('reports missing server configuration without disclosing secrets', async () => {
    await expectPrivateError(await POST(request()), 503, 'SERVICE_NOT_CONFIGURED');
  });

  it('scopes lookup to the session owner and never trusts a body userId', async () => {
    const { lookup, update } = database();
    lookup.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expectPrivateError(await POST(request({ notificationId: EVENT_ID, action: 'opened', userId: OTHER_USER_ID })), 404, 'EVENT_NOT_FOUND');
    expect(lookup.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(lookup.eq).toHaveBeenCalledWith('source_module', 'economic_intelligence');
    expect(lookup.eq).not.toHaveBeenCalledWith('user_id', OTHER_USER_ID);
    expect(update.update).not.toHaveBeenCalled();
  });

  it('sanitizes database lookup errors', async () => {
    const { lookup } = database();
    lookup.maybeSingle.mockResolvedValue({ data: null, error: { message: 'private row diagnostic' } });
    await expectPrivateError(await POST(request()), 502, 'OUTCOME_LOAD_FAILED');
  });

  it('catches a rejected database request instead of leaking an unhandled exception', async () => {
    const { lookup } = database();
    lookup.maybeSingle.mockRejectedValue(new Error('private transport diagnostic'));
    await expectPrivateError(await POST(request()), 502, 'OUTCOME_UNAVAILABLE');
  });

  it('preserves evidence snapshots and applies owner/module filters to the update', async () => {
    const { lookup, update } = database();
    const response = await POST(request({ notificationId: EVENT_ID, action: 'opened', userId: OTHER_USER_ID }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(lookup.eq).toHaveBeenCalledWith('id', EVENT_ID);
    expect(update.eq).toHaveBeenCalledWith('id', EVENT_ID);
    expect(update.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(update.eq).toHaveBeenCalledWith('source_module', 'economic_intelligence');
    expect(update.eq).not.toHaveBeenCalledWith('user_id', OTHER_USER_ID);
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ evidence_snapshot: SNAPSHOT, keep: 'historical', causal_claim: false }),
    }));
  });

  it('returns a private error when the update is rejected', async () => {
    const { update } = database();
    update.single.mockResolvedValue({ data: null, error: { message: 'private update diagnostic' } });
    await expectPrivateError(await POST(request()), 502, 'OUTCOME_UPDATE_FAILED');
  });

  it('catches transport exceptions during update without exposing the payload', async () => {
    const { update } = database();
    update.single.mockRejectedValue(new Error('private write transport diagnostic'));
    await expectPrivateError(await POST(request()), 502, 'OUTCOME_UNAVAILABLE');
  });
});
