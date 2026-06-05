import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

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

function objectId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return cleanString((value as { id?: unknown }).id);
  return '';
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

async function activateCompanySubscription(session: Record<string, unknown>) {
  const metadata = (session.metadata && typeof session.metadata === 'object'
    ? session.metadata
    : {}) as Record<string, unknown>;
  const userId = cleanString(metadata.userId) || cleanString(session.client_reference_id);
  const plan = cleanString(metadata.plan).toLowerCase();
  const billingInterval = cleanString(metadata.billingInterval).toLowerCase() || 'yearly';
  if (plan !== 'company' || !userId) return;

  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin client is not configured');

  const record = {
    user_id: userId,
    stripe_customer_id: objectId(session.customer) || null,
    stripe_subscription_id: objectId(session.subscription) || null,
    plan: 'company',
    billing_interval: billingInterval === 'monthly' ? 'monthly' : 'yearly',
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await admin
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('plan', 'company')
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await admin
      .from('user_subscriptions')
      .update(record)
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await admin
    .from('user_subscriptions')
    .insert(record);
  if (error) throw error;
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
      await activateCompanySubscription(event.data.object);
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
