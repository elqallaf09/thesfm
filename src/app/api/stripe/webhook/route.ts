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
  type?: string;
  data?: { object?: Record<string, unknown> };
};

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

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  return signatures.some(signature => {
    const actualBuffer = Buffer.from(signature);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
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
  const existing = subscriptionId ? await findUserSubscriptionByStripeSubscriptionId(subscriptionId) : null;
  const metadata = metadataOf(subscription);
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
    stripe_customer_id: objectId(subscription.customer) || existing?.stripe_customer_id || null,
    stripe_subscription_id: subscriptionId || existing?.stripe_subscription_id || null,
    current_period_end: existing?.current_period_end || null,
    ...(deleted ? { status: 'canceled' as const } : {}),
  };
  const record = recordFromStripeSubscription(subscription, fallback);

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

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return json({ ok: false, code: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return json({ ok: false, code: 'BAD_EVENT' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' && event.data?.object) {
      await handleCheckoutCompleted(event.data.object);
    }
    if (event.type === 'customer.subscription.updated' && event.data?.object) {
      await handleSubscriptionChanged(event.data.object);
    }
    if (event.type === 'customer.subscription.deleted' && event.data?.object) {
      await handleSubscriptionChanged(event.data.object, true);
    }
    return json({ ok: true });
  } catch (error) {
    console.error('[stripe] webhook handling failed', {
      type: event.type,
      message: error instanceof Error ? error.message : 'Unknown webhook error',
    });
    return json({ ok: false, code: 'WEBHOOK_FAILED' }, { status: 500 });
  }
}
