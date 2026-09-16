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

type StripeRecurringPrice = {
  id?: string;
  active?: boolean;
  currency?: string;
  unit_amount?: number | null;
  lookup_key?: string | null;
  recurring?: {
    interval?: string;
    interval_count?: number;
    usage_type?: string;
  } | null;
};

type PriceConfig = {
  envKey: 'STRIPE_PRICE_PREMIUM_MONTHLY' | 'STRIPE_PRICE_PREMIUM_YEARLY' | 'STRIPE_PRICE_COMPANY_YEARLY';
  lookupKey: 'sfm_premium_monthly' | 'sfm_premium_yearly' | 'sfm_company_yearly';
  unitAmount: 500 | 5000;
  recurringInterval: 'month' | 'year';
};

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_CHECKOUT_URL = `${STRIPE_API_BASE}/checkout/sessions`;

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

function priceConfig(plan: CheckoutPlan, interval: BillingInterval): PriceConfig {
  if (plan === 'company') {
    return {
      envKey: 'STRIPE_PRICE_COMPANY_YEARLY',
      lookupKey: 'sfm_company_yearly',
      unitAmount: 5000,
      recurringInterval: 'year',
    };
  }
  if (interval === 'yearly') {
    return {
      envKey: 'STRIPE_PRICE_PREMIUM_YEARLY',
      lookupKey: 'sfm_premium_yearly',
      unitAmount: 5000,
      recurringInterval: 'year',
    };
  }
  return {
    envKey: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    lookupKey: 'sfm_premium_monthly',
    unitAmount: 500,
    recurringInterval: 'month',
  };
}

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || '';
}

function configuredPriceId(config: PriceConfig) {
  return process.env[config.envKey]?.trim() || '';
}

function priceMatchesConfig(price: StripeRecurringPrice | null | undefined, config: PriceConfig) {
  return Boolean(
    price?.id?.startsWith('price_')
    && price.active === true
    && price.currency?.toLowerCase() === 'usd'
    && price.unit_amount === config.unitAmount
    && price.recurring?.interval === config.recurringInterval
    && (price.recurring.interval_count ?? 1) === 1
    && (price.recurring.usage_type ?? 'licensed') === 'licensed',
  );
}

async function stripeGet<T>(secretKey: string, path: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const response = await fetch(`${STRIPE_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: await response.json() as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function resolveVerifiedPriceId(secretKey: string, config: PriceConfig) {
  const envPriceId = configuredPriceId(config);
  if (envPriceId) {
    if (!envPriceId.startsWith('price_')) return null;
    const retrieved = await stripeGet<StripeRecurringPrice>(secretKey, `/prices/${encodeURIComponent(envPriceId)}`);
    if (!retrieved.ok || !priceMatchesConfig(retrieved.data, config)) {
      console.error('[stripe] configured price failed verification', {
        priceKey: config.envKey,
        status: retrieved.ok ? 200 : retrieved.status,
      });
      return null;
    }
    return retrieved.data.id || null;
  }

  const query = new URLSearchParams({
    active: 'true',
    type: 'recurring',
    limit: '10',
  });
  query.append('lookup_keys[]', config.lookupKey);
  const listed = await stripeGet<{ data?: StripeRecurringPrice[] }>(secretKey, `/prices?${query.toString()}`);
  if (!listed.ok) {
    console.error('[stripe] lookup-key price resolution failed', {
      lookupKey: config.lookupKey,
      status: listed.status,
    });
    return null;
  }

  const matches = (listed.data.data || []).filter(price =>
    price.lookup_key === config.lookupKey && priceMatchesConfig(price, config),
  );
  if (matches.length !== 1) {
    console.error('[stripe] lookup-key price verification failed', {
      lookupKey: config.lookupKey,
      matchCount: matches.length,
    });
    return null;
  }
  return matches[0]?.id || null;
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
  if (!secretKey) {
    return json({ ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Payment is currently unavailable.' }, { status: 503 });
  }

  const config = priceConfig(plan, billingInterval);
  const expectedPriceId = await resolveVerifiedPriceId(secretKey, config);
  const requestedPriceId = cleanString(payload.priceId);
  const requestedPriceKey = cleanString(payload.priceKey);

  console.info('[stripe] checkout configuration', {
    secretConfigured: true,
    publishableConfigured: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    envPriceConfigured: Boolean(configuredPriceId(config)),
    priceResolved: Boolean(expectedPriceId),
    priceKey: config.envKey,
    lookupKey: config.lookupKey,
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL),
  });

  if (!expectedPriceId) {
    return json({ ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Payment is currently unavailable.' }, { status: 503 });
  }
  if (requestedPriceId && requestedPriceId !== expectedPriceId) {
    return json({ ok: false, code: 'INVALID_PRICE', message: 'Invalid Stripe price.' }, { status: 400 });
  }
  if (requestedPriceKey && requestedPriceKey !== config.envKey && requestedPriceKey !== config.lookupKey) {
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
