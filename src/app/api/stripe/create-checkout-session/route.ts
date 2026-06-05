import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

type CheckoutPlan = 'premium' | 'company';
type BillingInterval = 'monthly' | 'yearly';

type CheckoutRequest = {
  plan?: unknown;
  billingInterval?: unknown;
  priceId?: unknown;
  priceKey?: unknown;
};

const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';

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

function normalizePlan(value: unknown): CheckoutPlan | null {
  const normalized = cleanString(value).toLowerCase();
  return normalized === 'premium' || normalized === 'company' ? normalized : null;
}

function normalizeInterval(value: unknown): BillingInterval {
  return cleanString(value).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
}

function allowedPriceId(plan: CheckoutPlan, interval: BillingInterval) {
  if (plan === 'company') return process.env.STRIPE_PRICE_COMPANY_YEARLY?.trim() || '';
  return interval === 'yearly'
    ? process.env.STRIPE_PRICE_PREMIUM_YEARLY?.trim() || ''
    : process.env.STRIPE_PRICE_PREMIUM_MONTHLY?.trim() || '';
}

function allowedPriceKey(plan: CheckoutPlan, interval: BillingInterval) {
  if (plan === 'company') return 'STRIPE_PRICE_COMPANY_YEARLY';
  return interval === 'yearly' ? 'STRIPE_PRICE_PREMIUM_YEARLY' : 'STRIPE_PRICE_PREMIUM_MONTHLY';
}

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || '';
}

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || request.nextUrl.origin;
}

function companyListingOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || 'https://www.the-sfm.com';
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export async function POST(request: NextRequest) {
  let payload: CheckoutRequest;
  try {
    payload = await request.json() as CheckoutRequest;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST', message: 'Invalid checkout request.' }, { status: 400 });
  }

  const plan = normalizePlan(payload.plan);
  const billingInterval = normalizeInterval(payload.billingInterval);
  if (!plan) {
    return json({ ok: false, code: 'INVALID_PLAN', message: 'Invalid subscription plan.' }, { status: 400 });
  }
  if (plan === 'company' && billingInterval !== 'yearly') {
    return json({ ok: false, code: 'INVALID_INTERVAL', message: 'Company plan is yearly only.' }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ ok: false, code: 'AUTH_REQUIRED', message: 'Sign in before subscribing.' }, { status: 401 });
  }

  const secretKey = stripeSecretKey();
  const expectedPriceId = allowedPriceId(plan, billingInterval);
  const requestedPriceId = cleanString(payload.priceId);
  const requestedPriceKey = cleanString(payload.priceKey);
  if (!secretKey || !expectedPriceId || !expectedPriceId.startsWith('price_')) {
    return json({ ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Payment is currently unavailable.' }, { status: 503 });
  }
  if (requestedPriceId && requestedPriceId !== expectedPriceId) {
    return json({ ok: false, code: 'INVALID_PRICE', message: 'Invalid Stripe price.' }, { status: 400 });
  }
  if (requestedPriceKey && requestedPriceKey !== allowedPriceKey(plan, billingInterval)) {
    return json({ ok: false, code: 'INVALID_PRICE_KEY', message: 'Invalid Stripe price key.' }, { status: 400 });
  }

  const origin = siteOrigin(request).replace(/\/$/, '');
  const companyOrigin = companyListingOrigin().replace(/\/$/, '');
  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: plan === 'company'
      ? `${companyOrigin}/company-listing/success?session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/dashboard?checkout=success`,
    cancel_url: plan === 'company'
      ? `${companyOrigin}/company-listing/cancel`
      : `${origin}/#pricing`,
    client_reference_id: user.id,
    'line_items[0][price]': expectedPriceId,
    'line_items[0][quantity]': '1',
    'metadata[userId]': user.id,
    'metadata[plan]': plan,
    'metadata[billingInterval]': billingInterval,
    'subscription_data[metadata][userId]': user.id,
    'subscription_data[metadata][plan]': plan,
    'subscription_data[metadata][billingInterval]': billingInterval,
  });
  if (user.email) params.set('customer_email', user.email);

  try {
    const stripeResponse = await fetch(STRIPE_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = await stripeResponse.json().catch(() => null) as { url?: string; error?: { message?: string } } | null;
    if (!stripeResponse.ok || !data?.url) {
      console.error('[stripe] checkout session failed', {
        status: stripeResponse.status,
        plan,
        billingInterval,
        message: data?.error?.message ?? 'No checkout URL returned',
      });
      return json({ ok: false, code: 'CHECKOUT_FAILED', message: 'Could not open checkout.' }, { status: 502 });
    }
    return json({ ok: true, url: data.url });
  } catch (error) {
    console.error('[stripe] checkout session error', {
      plan,
      billingInterval,
      message: error instanceof Error ? error.message : 'Unknown Stripe error',
    });
    return json({ ok: false, code: 'CHECKOUT_FAILED', message: 'Could not open checkout.' }, { status: 502 });
  }
}
