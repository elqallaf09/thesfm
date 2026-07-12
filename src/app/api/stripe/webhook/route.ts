import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  type BillingInterval,
  fetchStripeSubscription,
  findUserSubscriptionByStripeSubscriptionId,
  objectId,
  recordFromStripeSubscription,
  type SubscriptionPlan,
  upsertUserSubscription,
} from '@/lib/server/stripeSubscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = {
  id?: string;
  created?: number;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKED_EVENTS = 2_000;

const processedEvents = new Map<string, number>();
const inFlightEvents = new Map<string, Promise<void>>();

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split('=');
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some(signature => {
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const actualBuffer = Buffer.from(signature, 'hex');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
}

async function readLimitedBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_WEBHOOK_BYTES) {
        await reader.cancel('webhook body too large');
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
}

function pruneProcessedEvents(now = Date.now()) {
  for (const [eventId, expiresAt] of processedEvents) {
    if (expiresAt <= now) processedEvents.delete(eventId);
  }
  while (processedEvents.size > MAX_TRACKED_EVENTS) {
    const oldest = processedEvents.keys().next().value as string | undefined;
    if (!oldest) break;
    processedEvents.delete(oldest);
  }
}

function metadataOf(value: Record<string, unknown>) {
  return value.metadata && typeof value.metadata === 'object'
    ? value.metadata as Record<string, unknown>
    : {};
}

function normalizePlan(value: unknown): SubscriptionPlan | null {
  const plan = cleanString(value).toLowerCase();
  return plan === 'premium' || plan === 'company' ? plan : null;
}

function normalizeBillingInterval(value: unknown): BillingInterval | null {
  const interval = cleanString(value).toLowerCase();
  if (interval === 'yearly' || interval === 'year') return 'yearly';
  if (interval === 'monthly' || interval === 'month') return 'monthly';
  return null;
}

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata && typeof session.metadata === 'object'
    ? session.metadata
    : {}) as Record<string, unknown>;
  const userId = cleanString(metadata.userId) || cleanString(session.client_reference_id);
  const plan = normalizePlan(metadata.plan);
  const billingInterval = cleanString(metadata.billingInterval).toLowerCase() || 'yearly';
  const subscriptionId = objectId(session.subscription);
  if (!userId || !plan || !subscriptionId) {
    console.info('[stripe] checkout session skipped subscription sync', {
      hasUser: Boolean(userId),
      hasPlan: Boolean(plan),
      hasSubscription: Boolean(subscriptionId),
    });
    return;
  }

  const stripeSubscription = await fetchStripeSubscription(subscriptionId);
  const record = stripeSubscription
    ? recordFromStripeSubscription(stripeSubscription, {
      user_id: userId,
      plan,
      billing_interval: normalizeBillingInterval(billingInterval) || (plan === 'company' ? 'yearly' : null),
      stripe_customer_id: objectId(session.customer) || null,
      stripe_subscription_id: subscriptionId,
    })
    : {
      user_id: userId,
      stripe_customer_id: objectId(session.customer) || null,
      stripe_subscription_id: subscriptionId,
      plan,
      billing_interval: normalizeBillingInterval(billingInterval) || (plan === 'company' ? 'yearly' : null),
      status: 'active' as const,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    };

  if (!record) return;
  await upsertUserSubscription(record);
  console.info('[stripe] checkout subscription synced', {
    hasUser: true,
    hasCustomer: Boolean(record.stripe_customer_id),
    hasSubscription: Boolean(record.stripe_subscription_id),
    plan: record.plan,
    status: record.status,
  });
}

async function handleSubscriptionChanged(subscription: Record<string, unknown>, deleted = false) {
  const subscriptionId = objectId(subscription.id);
  const currentSubscription = !deleted && subscriptionId
    ? await fetchStripeSubscription(subscriptionId)
    : null;
  const authoritativeSubscription = currentSubscription ?? subscription;
  const existing = subscriptionId ? await findUserSubscriptionByStripeSubscriptionId(subscriptionId) : null;
  const metadata = metadataOf(authoritativeSubscription);
  const userId = cleanString(metadata.userId) || existing?.user_id || '';
  const plan = normalizePlan(metadata.plan) || existing?.plan || null;
  if (!userId || !plan) {
    console.info('[stripe] subscription event skipped sync', {
      hasUser: Boolean(userId),
      hasPlan: Boolean(plan),
      hasSubscription: Boolean(subscriptionId),
      deleted,
    });
    return;
  }

  const fallback = {
    user_id: userId,
    plan,
    billing_interval: normalizeBillingInterval(metadata.billingInterval) || existing?.billing_interval || null,
    stripe_customer_id: objectId(authoritativeSubscription.customer) || existing?.stripe_customer_id || null,
    stripe_subscription_id: subscriptionId || existing?.stripe_subscription_id || null,
    current_period_end: existing?.current_period_end || null,
    ...(deleted ? { status: 'canceled' as const } : {}),
  };
  const record = recordFromStripeSubscription(authoritativeSubscription, fallback);

  if (!record) return;
  if (deleted) record.status = 'canceled';
  await upsertUserSubscription(record);
  console.info('[stripe] subscription state synced', {
    hasUser: true,
    hasCustomer: Boolean(record.stripe_customer_id),
    hasSubscription: Boolean(record.stripe_subscription_id),
    plan: record.plan,
    status: record.status,
    deleted,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
  if (!secret) return json({ ok: false, code: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 });

  const rawBody = await readLimitedBody(request);
  if (rawBody === null) {
    return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  if (!verifySignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return json({ ok: false, code: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return json({ ok: false, code: 'BAD_EVENT' }, { status: 400 });
  }

  const eventId = cleanString(event.id);
  if (!eventId || !/^evt_[A-Za-z0-9_]+$/.test(eventId)) {
    return json({ ok: false, code: 'BAD_EVENT' }, { status: 400 });
  }

  try {
    pruneProcessedEvents();
    if (processedEvents.has(eventId)) return json({ ok: true, duplicate: true });

    const existingRun = inFlightEvents.get(eventId);
    if (existingRun) {
      await existingRun;
      return json({ ok: true, duplicate: true });
    }

    const run = (async () => {
      if (event.type === 'checkout.session.completed' && event.data?.object) {
        await handleCheckoutCompleted(event.data.object);
      }
      if (event.type === 'customer.subscription.updated' && event.data?.object) {
        await handleSubscriptionChanged(event.data.object);
      }
      if (event.type === 'customer.subscription.deleted' && event.data?.object) {
        await handleSubscriptionChanged(event.data.object, true);
      }
    })();
    inFlightEvents.set(eventId, run);
    try {
      await run;
      processedEvents.set(eventId, Date.now() + PROCESSED_EVENT_TTL_MS);
    } finally {
      inFlightEvents.delete(eventId);
    }
    return json({ ok: true, duplicate: false });
  } catch (error) {
    console.error('[stripe] webhook handling failed', {
      type: event.type,
      message: error instanceof Error ? error.message : 'Unknown webhook error',
    });
    return json({ ok: false, code: 'WEBHOOK_FAILED' }, { status: 500 });
  }
}
