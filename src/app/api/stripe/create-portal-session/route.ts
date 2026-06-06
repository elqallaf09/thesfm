import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  findManageableUserSubscription,
  findStripeManageableSubscriptionByEmail,
  objectId,
  recordFromStripeSubscription,
  stripeSecretKey,
  upsertUserSubscription,
} from '@/lib/server/stripeSubscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_PORTAL_URL = 'https://api.stripe.com/v1/billing_portal/sessions';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || request.nextUrl.origin;
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ ok: false, code: 'AUTH_REQUIRED', message: 'سجّل الدخول لإدارة الاشتراك.' }, { status: 401 });
  }

  const secretKey = stripeSecretKey();
  console.info('[stripe] portal configuration', {
    secretConfigured: Boolean(secretKey),
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL),
  });

  if (!secretKey) {
    return json({ ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'الدفع غير متاح حالياً.' }, { status: 503 });
  }

  let subscription = await findManageableUserSubscription(user.id).catch(error => {
    console.error('[stripe] portal subscription lookup failed', {
      message: error instanceof Error ? error.message : 'Unknown database error',
    });
    return null;
  });

  let customerId = subscription?.stripe_customer_id || '';
  if (!customerId && user.email) {
    const stripeSubscription = await findStripeManageableSubscriptionByEmail(user.email);
    customerId = stripeSubscription ? objectId(stripeSubscription.customer) : '';
    const inferredRecord = stripeSubscription
      ? recordFromStripeSubscription(stripeSubscription, { user_id: user.id })
      : null;
    if (inferredRecord) {
      subscription = await upsertUserSubscription(inferredRecord).catch(error => {
        console.error('[stripe] portal subscription backfill failed', {
          message: error instanceof Error ? error.message : 'Unknown database error',
        });
        return subscription;
      });
      customerId = subscription?.stripe_customer_id || customerId;
    }
  }

  console.info('[stripe] portal subscription state', {
    hasUser: true,
    hasSubscription: Boolean(subscription),
    hasCustomer: Boolean(customerId),
    status: subscription?.status ?? null,
    plan: subscription?.plan ?? null,
  });

  if (!customerId) {
    return json({
      ok: false,
      code: 'NO_ACTIVE_SUBSCRIPTION',
      message: 'لا يوجد اشتراك نشط لهذا الحساب حتى الآن.',
    }, { status: 404 });
  }

  const origin = siteOrigin(request).replace(/\/$/, '');
  const params = new URLSearchParams({
    customer: customerId,
    return_url: `${origin}/profile`,
  });

  try {
    const stripeResponse = await fetch(STRIPE_PORTAL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = await stripeResponse.json().catch(() => null) as { url?: string; error?: { message?: string; code?: string } } | null;
    if (!stripeResponse.ok || !data?.url) {
      console.error('[stripe] billing portal session failed', {
        status: stripeResponse.status,
        errorCode: data?.error?.code ?? null,
        message: data?.error?.message ?? 'No portal URL returned',
      });
      return json({ ok: false, code: 'PORTAL_FAILED', message: 'تعذر فتح إدارة الاشتراك. حاول مرة أخرى.' }, { status: 502 });
    }

    return json({ ok: true, url: data.url });
  } catch (error) {
    console.error('[stripe] billing portal session error', {
      message: error instanceof Error ? error.message : 'Unknown Stripe error',
    });
    return json({ ok: false, code: 'PORTAL_FAILED', message: 'تعذر فتح إدارة الاشتراك. حاول مرة أخرى.' }, { status: 502 });
  }
}
