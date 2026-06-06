import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export type SubscriptionPlan = 'premium' | 'company';
export type BillingInterval = 'monthly' | 'yearly';
export type AppSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'inactive';

export type UserSubscriptionRecord = {
  id?: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  billing_interval: BillingInterval | null;
  status: AppSubscriptionStatus;
  current_period_end: string | null;
  updated_at?: string | null;
};

type StripeObject = Record<string, unknown>;

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const MANAGEABLE_STATUSES: AppSubscriptionStatus[] = ['active', 'past_due', 'incomplete'];

export function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function objectId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return cleanString((value as { id?: unknown }).id);
  return '';
}

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || '';
}

function metadataOf(value: StripeObject | null | undefined) {
  return value?.metadata && typeof value.metadata === 'object'
    ? value.metadata as Record<string, unknown>
    : {};
}

function normalizePlan(value: unknown): SubscriptionPlan | null {
  const normalized = cleanString(value).toLowerCase();
  return normalized === 'premium' || normalized === 'company' ? normalized : null;
}

function normalizeBillingInterval(value: unknown): BillingInterval | null {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'monthly' || normalized === 'month') return 'monthly';
  if (normalized === 'yearly' || normalized === 'year') return 'yearly';
  return null;
}

export function normalizeStripeStatus(value: unknown): AppSubscriptionStatus {
  const status = cleanString(value).toLowerCase();
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete';
  if (status === 'canceled' || status === 'unpaid') return 'canceled';
  return 'inactive';
}

function unixToIso(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

function configuredPriceIds() {
  return [
    { priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY?.trim() || '', plan: 'premium' as const, billingInterval: 'monthly' as const },
    { priceId: process.env.STRIPE_PRICE_PREMIUM_YEARLY?.trim() || '', plan: 'premium' as const, billingInterval: 'yearly' as const },
    { priceId: process.env.STRIPE_PRICE_COMPANY_YEARLY?.trim() || '', plan: 'company' as const, billingInterval: 'yearly' as const },
    { priceId: process.env.STRIPE_PRICE_ID?.trim() || '', plan: 'premium' as const, billingInterval: 'monthly' as const },
  ].filter(item => item.priceId.startsWith('price_'));
}

function priceInfoFromPriceId(priceId: string) {
  return configuredPriceIds().find(item => item.priceId === priceId) ?? null;
}

function extractSubscriptionPriceId(subscription: StripeObject) {
  const items = subscription.items && typeof subscription.items === 'object'
    ? subscription.items as { data?: unknown }
    : null;
  const firstItem = Array.isArray(items?.data) ? items.data[0] as StripeObject | undefined : undefined;
  const price = firstItem?.price && typeof firstItem.price === 'object'
    ? firstItem.price as StripeObject
    : null;
  return objectId(price) || cleanString(price?.id);
}

function extractSubscriptionBillingInterval(subscription: StripeObject) {
  const items = subscription.items && typeof subscription.items === 'object'
    ? subscription.items as { data?: unknown }
    : null;
  const firstItem = Array.isArray(items?.data) ? items.data[0] as StripeObject | undefined : undefined;
  const price = firstItem?.price && typeof firstItem.price === 'object'
    ? firstItem.price as StripeObject
    : null;
  const recurring = price?.recurring && typeof price.recurring === 'object'
    ? price.recurring as StripeObject
    : null;
  return normalizeBillingInterval(recurring?.interval);
}

export function recordFromStripeSubscription(
  subscription: StripeObject,
  fallback: Partial<UserSubscriptionRecord> & { user_id?: string } = {},
) {
  const metadata = metadataOf(subscription);
  const priceId = extractSubscriptionPriceId(subscription);
  const priceInfo = priceInfoFromPriceId(priceId);
  const plan = normalizePlan(metadata.plan) || fallback.plan || priceInfo?.plan || null;
  const billingInterval =
    normalizeBillingInterval(metadata.billingInterval) ||
    fallback.billing_interval ||
    priceInfo?.billingInterval ||
    extractSubscriptionBillingInterval(subscription);
  const userId = cleanString(metadata.userId) || fallback.user_id || '';

  if (!userId || !plan) return null;

  return {
    user_id: userId,
    stripe_customer_id: objectId(subscription.customer) || fallback.stripe_customer_id || null,
    stripe_subscription_id: objectId(subscription.id) || fallback.stripe_subscription_id || null,
    plan,
    billing_interval: billingInterval || null,
    status: fallback.status || normalizeStripeStatus(subscription.status),
    current_period_end: unixToIso(subscription.current_period_end) || fallback.current_period_end || null,
    updated_at: new Date().toISOString(),
  } satisfies UserSubscriptionRecord;
}

async function stripeGet(path: string) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, status: 503, data: null as StripeObject | null, message: 'Missing STRIPE_SECRET_KEY' };
  }

  const response = await fetch(`${STRIPE_API_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null) as StripeObject | null;
  return {
    ok: response.ok,
    status: response.status,
    data,
    message: cleanString((data?.error as { message?: unknown } | undefined)?.message) || response.statusText,
  };
}

export async function fetchStripeSubscription(subscriptionId: string) {
  if (!subscriptionId) return null;
  const result = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!result.ok) {
    console.error('[stripe] subscription fetch failed', {
      status: result.status,
      hasSecretKey: Boolean(stripeSecretKey()),
      message: result.message,
    });
    return null;
  }
  return result.data;
}

export async function findStripeManageableSubscriptionByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const customersResult = await stripeGet(`customers?email=${encodeURIComponent(normalizedEmail)}&limit=5`);
  if (!customersResult.ok) {
    console.error('[stripe] customer lookup failed', {
      status: customersResult.status,
      hasSecretKey: Boolean(stripeSecretKey()),
      message: customersResult.message,
    });
    return null;
  }

  const customers = Array.isArray(customersResult.data?.data) ? customersResult.data.data as StripeObject[] : [];
  for (const customer of customers) {
    const customerId = objectId(customer.id);
    if (!customerId) continue;
    const subscriptionsResult = await stripeGet(`subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`);
    if (!subscriptionsResult.ok) {
      console.error('[stripe] subscription lookup failed', {
        status: subscriptionsResult.status,
        hasSecretKey: Boolean(stripeSecretKey()),
        message: subscriptionsResult.message,
      });
      continue;
    }

    const subscriptions = Array.isArray(subscriptionsResult.data?.data)
      ? subscriptionsResult.data.data as StripeObject[]
      : [];
    const candidate = subscriptions
      .filter(subscription => MANAGEABLE_STATUSES.includes(normalizeStripeStatus(subscription.status)))
      .sort((left, right) => Number(right.current_period_end || 0) - Number(left.current_period_end || 0))[0];
    if (candidate) return candidate;
  }

  return null;
}

export async function findManageableUserSubscription(userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin client is not configured');

  const { data, error } = await admin
    .from('user_subscriptions')
    .select('id,user_id,stripe_customer_id,stripe_subscription_id,plan,billing_interval,status,current_period_end,updated_at')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .in('status', MANAGEABLE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data[0] ? data[0] as UserSubscriptionRecord : null;
}

export async function findUserSubscriptionByStripeSubscriptionId(subscriptionId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin || !subscriptionId) return null;

  const { data, error } = await admin
    .from('user_subscriptions')
    .select('id,user_id,stripe_customer_id,stripe_subscription_id,plan,billing_interval,status,current_period_end,updated_at')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data as UserSubscriptionRecord | null;
}

export async function upsertUserSubscription(record: UserSubscriptionRecord) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin client is not configured');

  const { data, error } = await admin
    .from('user_subscriptions')
    .upsert(record, { onConflict: 'user_id,plan' })
    .select('id,user_id,stripe_customer_id,stripe_subscription_id,plan,billing_interval,status,current_period_end,updated_at')
    .maybeSingle();

  if (error) throw error;
  return data as UserSubscriptionRecord | null;
}
