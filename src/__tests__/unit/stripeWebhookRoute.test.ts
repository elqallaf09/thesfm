import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/stripeSubscriptions', () => ({
  fetchStripeSubscription: vi.fn(async () => null),
  findUserSubscriptionByStripeSubscriptionId: vi.fn(async () => null),
  objectId: (value: unknown) => typeof value === 'string' ? value : null,
  recordFromStripeSubscription: vi.fn(() => null),
  upsertUserSubscription: vi.fn(async () => undefined),
}));

const secret = 'whsec_test_secret';

function signature(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function request(body: string, signatureHeader: string, extraHeaders?: Record<string, string>) {
  return new NextRequest('https://www.the-sfm.com/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signatureHeader,
      ...extraHeaders,
    },
  });
}

describe('Stripe webhook route safety', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('rejects an oversized declared payload before reading it', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(request('{}', signature('{}'), { 'content-length': '1048577' }));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
  });

  it('rejects a correctly signed but stale request', async () => {
    const body = JSON.stringify({ id: 'evt_stale', type: 'ignored' });
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(request(body, signature(body, Math.floor(Date.now() / 1000) - 301)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'INVALID_SIGNATURE' });
  });

  it('requires a valid Stripe event id', async () => {
    const body = JSON.stringify({ type: 'ignored' });
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(request(body, signature(body)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'BAD_EVENT' });
  });

  it('coalesces a replayed event in the current server instance', async () => {
    const body = JSON.stringify({ id: `evt_test_${Date.now()}`, type: 'ignored' });
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const first = await POST(request(body, signature(body)));
    const replay = await POST(request(body, signature(body)));
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ ok: true, duplicate: false });
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({ ok: true, duplicate: true });
  });
});
