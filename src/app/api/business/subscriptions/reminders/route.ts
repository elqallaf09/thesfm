import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientBundles,
  buildReminderCandidates,
  formatMoney,
  reminderCandidateAmount,
  reminderCandidateCurrency,
  type ActivityLogRow,
  type ClientBundle,
  type ClientFileRow,
  type ClientNoteRow,
  type ClientRow,
  normalizeSubscriptionStatus,
  type PaymentHistoryRow,
  type PaymentRow,
  type ReminderCandidate,
  type ReminderNotificationRow,
  type SubscriptionRow,
} from '@/lib/businessSubscriptions';
import {
  CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
  REMINDER_EMAIL_LOG_FAILED_REASON,
  REMINDER_EMAIL_PAYLOAD_INVALID_REASON,
  REMINDER_EMAIL_SMTP_FAILED_REASON,
  SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
  customerReminderEmailTemplate,
  maskReminderEmail,
  subscriberReminderEmailTemplate,
  validateReminderRecipientEmail,
  type ReminderEmailStatus,
  type ReminderRecipientType,
} from '@/lib/subscriptionReminderEmails';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  getSmtpErrorDetails,
  getSmtpMailConfigStatus,
  isSmtpMailConfigured,
  maskEmailForLog,
  sendSmtpMail,
  smtpErrorUserMessage,
  validateMailPayload,
} from '@/lib/server/smtpMail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScopeUser = {
  id: string;
  email?: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  profession: string | null;
  profession_other: string | null;
};

type CompanyListingRow = {
  user_id: string;
  company_name: string | null;
  status: string | null;
  created_at: string | null;
};

type SubscriberContext = {
  id: string;
  name: string;
  email: string | null;
  businessName: string | null;
};

type ReminderDeliveryContext = {
  reminderId: string;
  reminderType: string;
  customerId: string;
  customerExists: boolean;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subscriptionId: string;
  paymentId: string | null;
  amountDue: number;
  amountFormatted: string;
  currency: string;
  dueDate: string;
  subscriber: SubscriberContext;
};

type RecipientSendResult = {
  userId: string;
  dedupeKey: string;
  status: ReminderEmailStatus;
  channel: 'email';
  recipientType: ReminderRecipientType;
  failureReason?: string | null;
  customerEmailStatus?: ReminderEmailStatus;
  subscriberEmailStatus?: ReminderEmailStatus;
  lastCustomerEmailSentAt?: string | null;
  lastSubscriberEmailSentAt?: string | null;
  customerFailureReason?: string | null;
  subscriberFailureReason?: string | null;
  error?: string;
};

type ReminderSendResult =
  | {
      userId: string;
      dedupeKey: string;
      channel: 'email';
      recipientType: ReminderRecipientType;
      status: 'sent';
      failureReason: null;
      sentAt: string | null;
    }
  | {
      userId: string;
      dedupeKey: string;
      channel: 'email';
      recipientType: ReminderRecipientType;
      status: 'skipped' | 'failed';
      failureReason: string;
      error?: string;
      sentAt: string | null;
    };

type ReminderResult =
  | { userId: string; dedupeKey: string; status: string; channel: 'in_app'; error?: string }
  | RecipientSendResult;

type ReminderRunSummary = {
  checkedCount: number;
  eligibleCount: number;
  sentCount: number;
  skippedCount: number;
  notEligibleCount: number;
  alreadySentCount: number;
  failedCount: number;
  skipReasons: Array<{
    reminderId: string;
    reminderType: string;
    customerName: string | null;
    customerEmail: string | null;
    subscriberEmail: string | null;
    dueDate: string;
    reasonCode: string;
    reasonMessage: string;
    recipient: 'customer' | 'subscriber' | 'both';
  }>;
};

type ReminderRunSummaryRecipientCounts = {
  sentCustomer: number;
  sentSubscriber: number;
  skippedCustomer: number;
  skippedSubscriber: number;
  failedCustomer: number;
  failedSubscriber: number;
};

type ReminderRunMetadataSummary = ReminderRunSummary & {
  byRecipient: ReminderRunSummaryRecipientCounts;
};

type ReminderRunContextSummary = ReminderRunMetadataSummary & {
  reminderId?: string;
};

type ExistingEmailLog = {
  id?: string | null;
  status?: string | null;
  sent_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

const VALID_REMINDER_TYPES = new Set([
  'reminder_7_days',
  'reminder_3_days',
  'reminder_1_day',
  'reminder_due_today',
  'reminder_overdue_3_days',
]);

function contextReplyTo(context: ReminderDeliveryContext) {
  const candidates = [
    context.subscriber.email,
    process.env.CONTACT_TO_EMAIL,
    process.env.SMTP_USER,
    process.env.SMTP_FROM,
    context.customerEmail,
  ];
  for (const candidate of candidates) {
    const validation = validateReminderRecipientEmail(candidate, 'subscriber');
    if (validation.ok) return validation.email;
  }
  return null;
}

function evaluateReminderEligibility(input: {
  candidate: ReminderCandidate;
  amountDue: number;
  context: ReminderDeliveryContext;
}) {
  const dueDate = input.context.dueDate;
  const reminderTypeFromWindow = dueDate ? buildReminderTypeFromDaysRemaining(input.candidate.daysRemaining) : null;

  if (!input.candidate.subscription) {
    return {
      eligible: false,
      reasonCode: INVALID_SUBSCRIPTION_STATUS_REASON,
      reasonMessage: reasonMessageForCode(INVALID_SUBSCRIPTION_STATUS_REASON),
    };
  }

  if (input.candidate.subscription && normalizeSubscriptionStatus(input.candidate.subscription.status) !== 'active') {
    return {
      eligible: false,
      reasonCode: INVALID_SUBSCRIPTION_STATUS_REASON,
      reasonMessage: reasonMessageForCode(INVALID_SUBSCRIPTION_STATUS_REASON),
    };
  }

  if (!isIsoDate(input.context.dueDate)) {
    return {
      eligible: false,
      reasonCode: INVALID_REMINDER_DUE_REASON,
      reasonMessage: reasonMessageForCode(INVALID_REMINDER_DUE_REASON),
    };
  }

  if (!VALID_REMINDER_TYPES.has(input.candidate.reminderType)) {
    return {
      eligible: false,
      reasonCode: INVALID_REMINDER_TYPE_REASON,
      reasonMessage: reasonMessageForCode(INVALID_REMINDER_TYPE_REASON),
    };
  }

  if (!Number.isFinite(input.amountDue) || input.amountDue <= 0) {
    return {
      eligible: false,
      reasonCode: INVALID_REMINDER_AMOUNT_REASON,
      reasonMessage: reasonMessageForCode(INVALID_REMINDER_AMOUNT_REASON),
    };
  }

  if (!input.context.reminderType) {
    return {
      eligible: false,
      reasonCode: INVALID_REMINDER_TYPE_REASON,
      reasonMessage: reasonMessageForCode(INVALID_REMINDER_TYPE_REASON),
    };
  }

  if (!reminderTypeFromWindow || reminderTypeFromWindow !== input.context.reminderType) {
    return {
      eligible: false,
      reasonCode: REMINDER_NOT_ELIGIBLE_REASON,
      reasonMessage: reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
    };
  }

  return { eligible: true, reasonCode: null, reasonMessage: null };
}

function initializeReminderSummary(reminderId?: string): ReminderRunContextSummary {
  return {
    reminderId,
    checkedCount: 0,
    eligibleCount: 0,
    sentCount: 0,
    skippedCount: 0,
    notEligibleCount: 0,
    alreadySentCount: 0,
    failedCount: 0,
    byRecipient: {
      sentCustomer: 0,
      sentSubscriber: 0,
      skippedCustomer: 0,
      skippedSubscriber: 0,
      failedCustomer: 0,
      failedSubscriber: 0,
    },
    skipReasons: [],
  };
}

function addReminderSkipReason(summary: ReminderRunContextSummary, input: {
  candidate: ReminderCandidate;
  context: ReminderDeliveryContext;
  reasonCode: string;
  reasonMessage: string;
  recipient: 'customer' | 'subscriber' | 'both';
}) {
  summary.skipReasons.push({
    reminderId: input.candidate.dedupeKey,
    reminderType: input.context.reminderType,
    customerName: input.context.customerName || null,
    customerEmail: input.context.customerEmail ? maskReminderEmail(input.context.customerEmail) : null,
    subscriberEmail: input.context.subscriber.email ? maskReminderEmail(input.context.subscriber.email) : null,
    dueDate: input.context.dueDate,
    reasonCode: input.reasonCode,
    reasonMessage: input.reasonMessage,
    recipient: input.recipient,
  });
}

function applyRecipientOutcome(summary: ReminderRunContextSummary, input: {
  recipientType: ReminderRecipientType;
  status: ReminderEmailStatus;
  reasonCode?: string | null;
}) {
  if (input.recipientType === 'customer') {
    if (input.status === 'sent') summary.byRecipient.sentCustomer += 1;
    else if (input.status === 'skipped') summary.byRecipient.skippedCustomer += 1;
    else summary.byRecipient.failedCustomer += 1;
    if (input.status === 'sent') summary.sentCount += 1;
    else if (input.status === 'skipped') summary.skippedCount += 1;
  } else {
    if (input.status === 'sent') summary.byRecipient.sentSubscriber += 1;
    else if (input.status === 'skipped') summary.byRecipient.skippedSubscriber += 1;
    else summary.byRecipient.failedSubscriber += 1;
    if (input.status === 'sent') summary.sentCount += 1;
    else if (input.status === 'skipped') summary.skippedCount += 1;
  }

  if (input.status === 'failed') summary.failedCount += 1;
  if (input.reasonCode === REMINDER_ALREADY_SENT_REASON) summary.alreadySentCount += 1;
}

function runSummaryMessage(summary: ReminderRunContextSummary) {
  return [
    `checked=${summary.checkedCount}`,
    `eligible=${summary.eligibleCount}`,
    `sent=${summary.sentCount}`,
    `skipped=${summary.skippedCount}`,
    `failed=${summary.failedCount}`,
    `notEligible=${summary.notEligibleCount}`,
  ].join(' | ');
}

function runToken() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = bearerToken(request);
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim();
  return token === secret || headerSecret === secret || querySecret === secret;
}

async function getScopeUser(request: NextRequest): Promise<ScopeUser | null | undefined> {
  if (isCronAuthorized(request)) return null;
  const token = bearerToken(request);
  const user = token ? await getUserFromBearerToken(token) : null;
  if (!user?.id) return undefined;
  return { id: user.id, email: user.email ?? null };
}

function safeTimezone(value: string | null | undefined) {
  const timezone = value?.trim() || 'Asia/Kuwait';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return 'Asia/Kuwait';
  }
}

function parseBooleanInput(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function todayIso(timezone = 'Asia/Kuwait') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value || '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function cleanError(error: unknown) {
  const smtpDetails = getSmtpErrorDetails(error);
  if (smtpDetails.responseCode || smtpDetails.response || smtpDetails.command) {
    return [
      smtpDetails.responseCode ? `responseCode=${smtpDetails.responseCode}` : null,
      smtpDetails.command ? `command=${smtpDetails.command}` : null,
      smtpDetails.rejected?.length ? `rejected=${smtpDetails.rejected.map(maskEmailForLog).join(',')}` : null,
      smtpDetails.response ? `response=${smtpDetails.response.replace(/\s+/g, ' ').trim()}` : null,
    ].filter(Boolean).join(' | ');
  }
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as { code?: unknown; message?: unknown };
  return [value.code, value.message].filter(Boolean).join(': ');
}

const NO_CUSTOMER_DATA_MESSAGE = 'لا توجد بيانات عملاء لإرسال التذكيرات.';
const INVALID_REMINDER_PAYLOAD_MESSAGE = 'تعذر إرسال البريد. تحقق من بيانات العميل أو البريد المستلم.';
const BOTH_RECIPIENT_EMAILS_INVALID_MESSAGE =
  'لا يمكن إرسال تذكيرات البريد لأن بريد العميل وبريد المشترك غير موجودين أو غير صالحين.';

const REMINDER_ALREADY_SENT_REASON = 'REMINDER_ALREADY_SENT';
const REMINDER_NOT_ELIGIBLE_REASON = 'REMINDER_NOT_ELIGIBLE';
const INVALID_SUBSCRIPTION_STATUS_REASON = 'SUBSCRIPTION_NOT_ACTIVE';
const INVALID_REMINDER_DUE_REASON = 'REMINDER_DUE_DATE_INVALID';
const INVALID_REMINDER_AMOUNT_REASON = 'REMINDER_AMOUNT_INVALID';
const INVALID_REMINDER_TYPE_REASON = 'REMINDER_TYPE_INVALID';
const SUBSCRIPTION_REMINDER_NOT_FOUND_MESSAGE = 'لم يتم العثور على تذكير مؤهل لهذا العميل حالياً.';

function sanitizeEnvelopeForLog(envelope?: { from: string; to: string[] }) {
  if (!envelope) return undefined;
  return {
    from: maskEmailForLog(envelope.from),
    to: (envelope.to ?? []).map(maskEmailForLog),
  };
}

function buildReminderTypeFromDaysRemaining(daysRemaining: number) {
  if (daysRemaining === 7) return 'reminder_7_days';
  if (daysRemaining === 3) return 'reminder_3_days';
  if (daysRemaining === 1) return 'reminder_1_day';
  if (daysRemaining === 0) return 'reminder_due_today';
  if (daysRemaining < 0 && Math.abs(daysRemaining) % 3 === 0) return 'reminder_overdue_3_days';
  return null;
}

function isIsoDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) return false;
  const parsed = new Date(`${String(value).trim()}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime());
}

function reasonMessageForCode(code: string) {
  if (code === REMINDER_ALREADY_SENT_REASON) return 'تم إرسال هذا التذكير سابقاً لهذه الفترة.';
  if (code === REMINDER_NOT_ELIGIBLE_REASON) return 'غير مؤهل حالياً لأن تاريخ الاستحقاق خارج نافذة التذكير.';
  if (code === INVALID_SUBSCRIPTION_STATUS_REASON) return 'الاشتراك غير نشط حالياً.';
  if (code === INVALID_REMINDER_DUE_REASON) return 'تاريخ الاستحقاق غير صالح.';
  if (code === INVALID_REMINDER_AMOUNT_REASON) return 'مبلغ التذكير غير موجود أو غير صالح.';
  if (code === INVALID_REMINDER_TYPE_REASON) return 'نوع التذكير غير صالح.';
  return 'تم تخطي التذكير.';
}

function safeText(value: unknown, fallback = 'غير متاح') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function validationStatusForFailure(reason: string | null | undefined, fallback: ReminderEmailStatus | 'scheduled') {
  if (reason === CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON) return 'missing_or_invalid_customer_email';
  if (reason === SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON) return 'missing_or_invalid_subscriber_email';
  return reason ?? fallback;
}

function emailMetadata(input: {
  recipientType: ReminderRecipientType;
  status: ReminderEmailStatus | 'scheduled';
  context: ReminderDeliveryContext;
  recipientEmail?: string | null;
  recipientEmailExists: boolean;
  recipientEmailValid: boolean;
  from?: string | null;
  failureReason?: string | null;
  userMessage?: string | null;
  payloadValidationErrors?: string[];
  smtp?: Record<string, unknown>;
  smtpCalled: boolean;
}) {
  const context = input.context;
  const recipientTo = input.recipientEmail ? [maskEmailForLog(input.recipientEmail)] : [];
  const meta: Record<string, unknown> = {
    recipient_type: input.recipientType,
    email_status: input.status,
    reminder_id: context.reminderId,
    reminder_type: context.reminderType,
    customer_id: context.customerId,
    customer_exists: context.customerExists,
    customer_name: context.customerName,
    customer_email_exists: input.recipientType === 'customer'
      ? input.recipientEmailExists
      : Boolean(context.customerEmail),
    customer_email_valid: input.recipientType === 'customer'
      ? input.recipientEmailValid
      : Boolean(context.customerEmail),
    customer_email_masked: context.customerEmail ? maskReminderEmail(context.customerEmail) : null,
    customer_phone_exists: Boolean(context.customerPhone),
    subscription_id: context.subscriptionId,
    payment_id: context.paymentId,
    amount_due: context.amountDue,
    amount_formatted: context.amountFormatted,
    currency: context.currency,
    due_date: context.dueDate,
    subscriber_id: context.subscriber.id,
    subscriber_name: context.subscriber.name,
    subscriber_email_exists: input.recipientType === 'subscriber'
      ? input.recipientEmailExists
      : Boolean(context.subscriber.email),
    subscriber_email_valid: input.recipientType === 'subscriber'
      ? input.recipientEmailValid
      : Boolean(context.subscriber.email),
    subscriber_email_masked: context.subscriber.email ? maskReminderEmail(context.subscriber.email) : null,
    business_name: context.subscriber.businessName,
    recipient_to: recipientTo,
    recipient_from: input.from ? [maskEmailForLog(input.from)] : [],
    recipient_email_exists: input.recipientEmailExists,
    recipient_email_valid: input.recipientEmailValid,
    validation_status: validationStatusForFailure(input.failureReason, input.status),
    smtp_called: input.smtpCalled,
  };

  if (input.failureReason) meta.failure_reason = input.failureReason;
  if (input.userMessage) meta.error = input.userMessage;
  if (input.payloadValidationErrors?.length) meta.payload_validation_errors = input.payloadValidationErrors;
  if (input.smtp) meta.smtp = input.smtp;

  return meta;
}

function logReminderEmail(scope: string, input: {
  context: ReminderDeliveryContext;
  recipientType: ReminderRecipientType;
  status: ReminderEmailStatus | 'scheduled';
  recipientEmail?: string | null;
  recipientEmailExists: boolean;
  recipientEmailValid: boolean;
  failureReason?: string | null;
  smtpCalled: boolean;
  smtp?: Record<string, unknown>;
}) {
  const payload: Record<string, unknown> = {
    reminderId: input.context.reminderId,
    customerId: input.context.customerId,
    customerExists: input.context.customerExists,
    subscriberId: input.context.subscriber.id,
    recipientType: input.recipientType,
    customerEmailExists: Boolean(input.context.customerEmail),
    subscriberEmailExists: Boolean(input.context.subscriber.email),
    recipientEmail: input.recipientEmail ? maskEmailForLog(input.recipientEmail) : null,
    result: input.status,
    failureReason: input.failureReason ?? null,
    smtpCalled: input.smtpCalled,
  };
  if (input.smtpCalled && input.smtp) payload.smtp = input.smtp;
  if (input.status === 'sent' || input.status === 'scheduled') {
    console.info(scope, payload);
  } else {
    console.warn(scope, payload);
  }
}

async function loadRows<T>(db: any, table: string, userId?: string) {
  let query = db.from(table).select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function loadProfiles(db: any, userIds: string[], scopeUser: ScopeUser | null) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const profiles = new Map<string, ProfileRow>();
  if (uniqueIds.length) {
    try {
      const { data, error } = await db
        .from('profiles')
        .select('id, display_name, email, profession, profession_other')
        .in('id', uniqueIds);
      if (error) {
        console.warn('[business-subscriptions] reminder profile context failed', {
          userCount: uniqueIds.length,
          message: cleanError(error),
        });
      } else {
        for (const row of data ?? []) {
          profiles.set(String(row.id), row as ProfileRow);
        }
      }
    } catch (error) {
      console.warn('[business-subscriptions] reminder profile context failed', {
        userCount: uniqueIds.length,
        message: cleanError(error),
      });
    }
  }

  if (scopeUser?.id && !profiles.get(scopeUser.id)?.email && scopeUser.email) {
    profiles.set(scopeUser.id, {
      id: scopeUser.id,
      display_name: profiles.get(scopeUser.id)?.display_name ?? null,
      email: scopeUser.email,
      profession: profiles.get(scopeUser.id)?.profession ?? null,
      profession_other: profiles.get(scopeUser.id)?.profession_other ?? null,
    });
  }

  return profiles;
}

async function loadCompanyNames(db: any, userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const companyNames = new Map<string, string>();
  if (!uniqueIds.length) return companyNames;

  try {
    const { data, error } = await db
      .from('company_listings')
      .select('user_id, company_name, status, created_at')
      .in('user_id', uniqueIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[business-subscriptions] reminder company context failed', {
        userCount: uniqueIds.length,
        message: cleanError(error),
      });
      return companyNames;
    }

    for (const row of (data ?? []) as CompanyListingRow[]) {
      const userId = String(row.user_id ?? '');
      const companyName = String(row.company_name ?? '').trim();
      if (!userId || !companyName || companyNames.has(userId)) continue;
      companyNames.set(userId, companyName);
    }
  } catch (error) {
    console.warn('[business-subscriptions] reminder company context failed', {
      userCount: uniqueIds.length,
      message: cleanError(error),
    });
  }

  return companyNames;
}

function subscriberContextFor(
  userId: string,
  profiles: Map<string, ProfileRow>,
  companyNames: Map<string, string>,
): SubscriberContext {
  const profile = profiles.get(userId);
  const businessName = companyNames.get(userId) ?? null;
  const name = safeText(profile?.display_name || businessName || profile?.email, 'THE SFM');
  return {
    id: userId,
    name,
    email: profile?.email ?? null,
    businessName,
  };
}

function missingCustomerForSubscription(subscription: SubscriptionRow): ClientRow {
  return {
    id: subscription.client_id,
    user_id: subscription.user_id,
    full_name: `Missing customer ${subscription.client_id}`,
    phone: '',
    whatsapp: null,
    email: null,
    address: null,
    notes: null,
    color_tag: null,
    avatar_url: null,
    profile_photo_url: null,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  };
}

function buildOrphanSubscriptionBundles(input: {
  clients: ClientRow[];
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  history: PaymentHistoryRow[];
  notes: ClientNoteRow[];
  files: ClientFileRow[];
  activity: ActivityLogRow[];
  notifications: ReminderNotificationRow[];
}): ClientBundle[] {
  const clientKeys = new Set(input.clients.map(client => `${client.user_id}:${client.id}`));

  return input.subscriptions
    .filter(subscription => !clientKeys.has(`${subscription.user_id}:${subscription.client_id}`))
    .map(subscription => {
      const client = missingCustomerForSubscription(subscription);
      return {
        client,
        subscription,
        payments: input.payments.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id &&
          item.subscription_id === subscription.id
        ).sort((a, b) => String(b.due_date).localeCompare(String(a.due_date))),
        history: input.history.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id &&
          item.subscription_id === subscription.id
        ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
        notes: input.notes.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id
        ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
        files: input.files.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id
        ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
        activity: input.activity.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id &&
          item.subscription_id === subscription.id
        ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
        notifications: input.notifications.filter(item =>
          item.user_id === subscription.user_id &&
          item.client_id === subscription.client_id &&
          item.subscription_id === subscription.id
        ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      };
    });
}

async function insertRunLog(db: any, input: {
  userId: string;
  runType: 'manual' | 'scheduled' | 'page_load';
  status: 'completed' | 'failed' | 'partial' | 'skipped';
  baseDate: string;
  timezone: string;
  startedAt: string;
  candidatesCount: number;
  processedCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  smtpConfigured: boolean;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.from('subscription_reminder_runs').insert({
    user_id: input.userId,
    run_type: input.runType,
    status: input.status,
    base_date: input.baseDate,
    timezone: input.timezone,
    started_at: input.startedAt,
    finished_at: new Date().toISOString(),
    candidates_count: input.candidatesCount,
    processed_count: input.processedCount,
    email_sent_count: input.emailSentCount,
    email_failed_count: input.emailFailedCount,
    smtp_configured: input.smtpConfigured,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
  });
}

function notificationLogPayload(input: {
  context: ReminderDeliveryContext;
  candidate: ReminderCandidate;
  recipientType: ReminderRecipientType;
  dedupeKey: string;
}) {
  return {
    user_id: input.candidate.client.user_id,
    client_id: input.context.customerId,
    subscription_id: input.context.subscriptionId,
    payment_id: input.context.paymentId,
    reminder_type: input.context.reminderType,
    scheduled_for: new Date().toISOString(),
    channel: 'email' as const,
    sent_at: null,
    dedupe_key: input.dedupeKey,
  };
}

async function findExistingEmailLog(db: any, userId: string, dedupeKey: string): Promise<ExistingEmailLog | null> {
  const { data, error } = await db
    .from('subscription_notifications')
    .select('id, status, sent_at, metadata')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (error) {
    console.warn('[business-subscriptions] reminder email history lookup failed', {
      userId,
      dedupeKey,
      message: cleanError(error),
    });
    return null;
  }

  return data ? data as ExistingEmailLog : null;
}

async function persistRecipientEmailLog(input: {
  db: any;
  logPayload: Record<string, unknown>;
  existingLog: ExistingEmailLog | null;
  status: ReminderEmailStatus | 'scheduled';
  metadata: Record<string, unknown>;
  sentAt?: string | null;
}) {
  const payload = {
    ...input.logPayload,
    status: input.status,
    sent_at: input.sentAt ?? null,
    metadata: input.metadata,
  };

  if (input.existingLog?.id) {
    return input.db
      .from('subscription_notifications')
      .update({
        status: input.status,
        sent_at: input.sentAt ?? null,
        metadata: input.metadata,
      })
      .eq('id', input.existingLog.id);
  }

  return input.db.from('subscription_notifications').insert(payload);
}

async function sendRecipientReminderEmail(input: {
  db: any;
  candidate: ReminderCandidate;
  context: ReminderDeliveryContext;
  recipientType: ReminderRecipientType;
  recipientEmail: string | null;
  template: { subject: string; text: string; html: string };
  fromName: string;
  force?: boolean;
  runToken?: string;
}) {
  const recipientValidation = validateReminderRecipientEmail(input.recipientEmail, input.recipientType);
  const subject = String(input.template?.subject ?? '').trim();
  const text = String(input.template?.text ?? '').trim();
  const html = String(input.template?.html ?? '').trim();
  const baseDedupeKey = `${input.candidate.dedupeKey}:email:${input.recipientType}`;
  const dedupeKey = input.force ? `${baseDedupeKey}:manual:${input.runToken ?? runToken()}` : baseDedupeKey;
  const logPayload = notificationLogPayload({
    context: input.context,
    candidate: input.candidate,
    recipientType: input.recipientType,
    dedupeKey,
  });
  const existingLog = input.force
    ? null
    : await findExistingEmailLog(input.db, input.candidate.client.user_id, dedupeKey);

  if (existingLog?.status === 'sent') {
    const message = reasonMessageForCode(REMINDER_ALREADY_SENT_REASON);
    logReminderEmail('[business-subscriptions] reminder email skipped because it was already sent', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'skipped',
      recipientEmail: recipientValidation.rawEmail || null,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: REMINDER_ALREADY_SENT_REASON,
      smtpCalled: false,
    });
    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'skipped' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: REMINDER_ALREADY_SENT_REASON,
      error: message,
      sentAt: existingLog.sent_at ?? null,
    };
  }

  if (!recipientValidation.ok) {
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'skipped',
      context: input.context,
      recipientEmail: recipientValidation.rawEmail || null,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: recipientValidation.reason,
      userMessage: recipientValidation.message,
      smtpCalled: false,
    });
    logReminderEmail('[business-subscriptions] reminder recipient validation failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'skipped',
      recipientEmail: recipientValidation.rawEmail || null,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: recipientValidation.reason,
      smtpCalled: false,
    });

    const { error } = await persistRecipientEmailLog({
      db: input.db,
      logPayload,
      existingLog,
      status: 'skipped',
      metadata,
    });

    if (error && String(error.code) !== '23505') {
      console.warn('[business-subscriptions] reminder validation email log failed', {
        reminderId: input.context.reminderId,
        customerId: input.context.customerId,
        subscriberId: input.context.subscriber.id,
        recipientType: input.recipientType,
        failureReason: REMINDER_EMAIL_LOG_FAILED_REASON,
        message: cleanError(error),
      });
    }

    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'skipped' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: recipientValidation.reason,
      error: recipientValidation.message,
      sentAt: null,
    };
  }

  if (!subject || !text || !html) {
    const message = INVALID_REMINDER_PAYLOAD_MESSAGE;
    const reason = REMINDER_EMAIL_PAYLOAD_INVALID_REASON;
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'failed',
      context: input.context,
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: reason,
      userMessage: message,
      payloadValidationErrors: [message],
      smtpCalled: false,
    });
    logReminderEmail('[business-subscriptions] reminder email payload validation failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'failed',
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: reason,
      smtpCalled: false,
    });

    await persistRecipientEmailLog({
      db: input.db,
      logPayload,
      existingLog,
      status: 'failed',
      metadata,
    });

    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'failed' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: reason,
      error: message,
      sentAt: null,
    };
  }

  const payload = validateMailPayload({
    to: recipientValidation.email,
    subject,
    text,
    html,
    fromName: input.fromName,
    replyTo: contextReplyTo(input.context),
  });

  if (!payload.ok || !payload.payload) {
    const reason = payload.errors.length ? REMINDER_EMAIL_PAYLOAD_INVALID_REASON : REMINDER_EMAIL_LOG_FAILED_REASON;
    const message = payload.errors.length ? payload.errors[0] : INVALID_REMINDER_PAYLOAD_MESSAGE;
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: reason === REMINDER_EMAIL_PAYLOAD_INVALID_REASON ? 'failed' : 'failed',
      context: input.context,
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      from: payload.payload?.from,
      failureReason: reason,
      userMessage: message,
      payloadValidationErrors: payload.errors,
      smtpCalled: false,
    });
    logReminderEmail('[business-subscriptions] reminder payload validation failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'failed',
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: reason,
      smtpCalled: false,
    });

    await persistRecipientEmailLog({
      db: input.db,
      logPayload,
      existingLog,
      status: 'failed',
      metadata,
    });

    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'failed' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: reason,
      error: message,
      sentAt: null,
    };
  }

  const emailPayload = payload.payload;
  const scheduledMetadata = emailMetadata({
    recipientType: input.recipientType,
    status: 'scheduled',
    context: input.context,
    recipientEmail: recipientValidation.email,
    recipientEmailExists: recipientValidation.emailExists,
    recipientEmailValid: recipientValidation.emailValid,
    from: emailPayload.from,
    smtpCalled: false,
  });
  const scheduleInsertResult = await persistRecipientEmailLog({
    db: input.db,
    logPayload,
    existingLog,
    status: 'scheduled',
    metadata: scheduledMetadata,
  });

  if (scheduleInsertResult.error) {
    const duplicate = String(scheduleInsertResult.error.code) === '23505';
    const reason = duplicate ? REMINDER_ALREADY_SENT_REASON : REMINDER_EMAIL_LOG_FAILED_REASON;
    const message = duplicate ? reasonMessageForCode(REMINDER_ALREADY_SENT_REASON) : cleanError(scheduleInsertResult.error);
    logReminderEmail('[business-subscriptions] reminder email not sent because log scheduling failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: duplicate ? 'skipped' : 'failed',
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: reason,
      smtpCalled: false,
    });
    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: duplicate ? 'skipped' as const : 'failed' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: reason,
      error: message,
      sentAt: null,
    };
  }

  try {
    const sendResult = await sendSmtpMail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
      from: emailPayload.from,
      fromName: input.fromName,
      replyTo: emailPayload.replyTo ?? contextReplyTo(input.context),
    });
    const smtp = {
      accepted: sendResult.accepted.map(maskEmailForLog),
      rejected: sendResult.rejected.map(maskEmailForLog),
      responseCode: sendResult.responseCode,
      response: sendResult.response,
      envelope: sanitizeEnvelopeForLog(sendResult.envelope),
    };
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'sent',
      context: input.context,
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      from: emailPayload.from,
      smtp,
      smtpCalled: true,
    });

    const sentAt = new Date().toISOString();
    await input.db
      .from('subscription_notifications')
      .update({
        status: 'sent',
        sent_at: sentAt,
        metadata,
      })
      .eq('user_id', input.candidate.client.user_id)
      .eq('dedupe_key', dedupeKey);

    await input.db.from('activity_logs').insert({
      user_id: input.candidate.client.user_id,
      client_id: input.context.customerId,
      subscription_id: input.context.subscriptionId,
      payment_id: input.context.paymentId,
      event_type: `subscription_${input.recipientType}_email_sent`,
      title: `subscription_${input.recipientType}_email_sent`,
      description: `${input.context.customerName} - ${input.context.dueDate}`,
      metadata,
    });

    logReminderEmail('[business-subscriptions] reminder email sent', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'sent',
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      smtpCalled: true,
      smtp,
    });

    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'sent' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: null,
      sentAt,
    };
  } catch (error) {
    const userMessage = smtpErrorUserMessage(error);
    const smtpDetails = getSmtpErrorDetails(error);
    const smtp = {
      responseCode: smtpDetails.responseCode,
      response: smtpDetails.response,
      command: smtpDetails.command,
      rejected: smtpDetails.rejected?.map(maskEmailForLog),
      envelope: sanitizeEnvelopeForLog(smtpDetails.envelope),
      stack: smtpDetails.stack,
    };
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'failed',
      context: input.context,
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      from: emailPayload.from,
      failureReason: REMINDER_EMAIL_SMTP_FAILED_REASON,
      userMessage,
      smtp,
      smtpCalled: true,
    });

    logReminderEmail('[business-subscriptions] reminder email failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'failed',
      recipientEmail: recipientValidation.email,
      recipientEmailExists: recipientValidation.emailExists,
      recipientEmailValid: recipientValidation.emailValid,
      failureReason: REMINDER_EMAIL_SMTP_FAILED_REASON,
      smtpCalled: true,
      smtp,
    });

    await input.db
      .from('subscription_notifications')
      .update({
        status: 'failed',
        metadata: { ...metadata, smtp_error: cleanError(error) },
      })
      .eq('user_id', input.candidate.client.user_id)
      .eq('dedupe_key', dedupeKey);

    await input.db.from('activity_logs').insert({
      user_id: input.candidate.client.user_id,
      client_id: input.context.customerId,
      subscription_id: input.context.subscriptionId,
      payment_id: input.context.paymentId,
      event_type: `subscription_${input.recipientType}_email_failed`,
      title: `subscription_${input.recipientType}_email_failed`,
      description: userMessage,
      metadata,
    });

    return {
      userId: input.candidate.client.user_id,
      dedupeKey,
      status: 'failed' as const,
      channel: 'email' as const,
      recipientType: input.recipientType,
      failureReason: REMINDER_EMAIL_SMTP_FAILED_REASON,
      error: userMessage,
      sentAt: null,
    };
  }
}

function emailResultForRecipient(result: Awaited<ReturnType<typeof sendRecipientReminderEmail>>) {
  if (result.recipientType === 'customer') {
    return {
      ...result,
      customerEmailStatus: result.status,
      lastCustomerEmailSentAt: result.sentAt ?? null,
      customerFailureReason: result.failureReason,
    };
  }
  return {
    ...result,
    subscriberEmailStatus: result.status,
    lastSubscriberEmailSentAt: result.sentAt ?? null,
    subscriberFailureReason: result.failureReason,
  };
}

export async function GET(request: NextRequest) {
  const db = createServerSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, code: 'SUBSCRIPTION_MANAGER_NOT_CONFIGURED' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const scopeUser = await getScopeUser(request);
  if (scopeUser === undefined) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  const scopeUserId = scopeUser?.id ?? null;

  const timezone = safeTimezone(request.nextUrl.searchParams.get('timezone') || request.headers.get('x-client-timezone'));
  const runType = isCronAuthorized(request)
    ? 'scheduled'
    : request.nextUrl.searchParams.get('source') === 'page_load'
      ? 'page_load'
      : 'manual';
  const requestedReminderId = request.nextUrl.searchParams.get('reminderId')?.trim() || null;
  const forceEmailSend = parseBooleanInput(request.nextUrl.searchParams.get('force'));
  const currentRunToken = runToken();
  const startedAt = new Date().toISOString();
  const baseDate = request.nextUrl.searchParams.get('date')?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? request.nextUrl.searchParams.get('date') as string
    : todayIso(timezone);

  try {
    const [clients, subscriptions, payments, history, notes, files, activity, notificationLogs] = await Promise.all([
      loadRows<ClientRow>(db, 'clients', scopeUserId || undefined),
      loadRows<SubscriptionRow>(db, 'subscriptions', scopeUserId || undefined),
      loadRows<PaymentRow>(db, 'payments', scopeUserId || undefined),
      loadRows<PaymentHistoryRow>(db, 'payment_history', scopeUserId || undefined),
      loadRows<ClientNoteRow>(db, 'client_notes', scopeUserId || undefined),
      loadRows<ClientFileRow>(db, 'client_files', scopeUserId || undefined),
      loadRows<ActivityLogRow>(db, 'activity_logs', scopeUserId || undefined),
      loadRows<ReminderNotificationRow>(db, 'subscription_notifications', scopeUserId || undefined),
    ]);

    const bundleInput = {
      clients,
      subscriptions,
      payments,
      history,
      notes,
      files,
      activity,
      notifications: notificationLogs,
    };
    const bundles = [
      ...buildClientBundles(bundleInput),
      ...buildOrphanSubscriptionBundles(bundleInput),
    ];
    const allCandidates = buildReminderCandidates(bundles, baseDate);
    const candidates = requestedReminderId
      ? allCandidates.filter(candidate => candidate.dedupeKey === requestedReminderId)
      : allCandidates;
    const smtpStatus = getSmtpMailConfigStatus();
    const smtpConfigured = isSmtpMailConfigured();
    const results: ReminderResult[] = [];
    const runSummary = initializeReminderSummary(requestedReminderId ?? undefined);
    const summariesByUser = new Map<string, ReminderRunContextSummary>();
    const getUserSummary = (userId: string) => {
      const existing = summariesByUser.get(userId);
      if (existing) return existing;
      const next = initializeReminderSummary(requestedReminderId ?? undefined);
      summariesByUser.set(userId, next);
      return next;
    };
    const usersToLog = scopeUserId
      ? [scopeUserId]
      : Array.from(new Set([
        ...clients.map(client => client.user_id),
        ...subscriptions.map(subscription => subscription.user_id),
      ]));

    if (requestedReminderId && !candidates.length) {
      const message = SUBSCRIPTION_REMINDER_NOT_FOUND_MESSAGE;
      runSummary.checkedCount = 1;
      runSummary.notEligibleCount = 1;
      runSummary.skippedCount = 1;
      runSummary.skipReasons.push({
        reminderId: requestedReminderId,
        reminderType: 'unknown',
        customerName: null,
        customerEmail: null,
        subscriberEmail: null,
        dueDate: baseDate,
        reasonCode: REMINDER_NOT_ELIGIBLE_REASON,
        reasonMessage: reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
        recipient: 'both',
      });

      if (runType !== 'page_load') {
        await Promise.all(usersToLog.map(userId => insertRunLog(db, {
          userId,
          runType,
          status: 'skipped',
          baseDate,
          timezone,
          startedAt,
          candidatesCount: 0,
          processedCount: 0,
          emailSentCount: 0,
          emailFailedCount: 0,
          smtpConfigured,
          message,
          metadata: {
            scope: scopeUserId ? 'current_user' : 'all_users',
            requestedReminderId,
            smtpMissing: smtpStatus.missing,
            summary: runSummary,
          },
        })));
      }

      return NextResponse.json(
        {
          ok: true,
          scope: scopeUserId ? 'current_user' : 'all_users',
          date: baseDate,
          timezone,
          candidates: 0,
          processed: 0,
          checked: runSummary.checkedCount,
          eligible: runSummary.eligibleCount,
          sent: runSummary.sentCount,
          skipped: runSummary.skippedCount,
          failed: runSummary.failedCount,
          notEligible: runSummary.notEligibleCount,
          message,
          smtpConfigured,
          smtpMissing: smtpStatus.missing,
          summary: runSummary,
          results: [],
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    if (!candidates.length) {
      const message = NO_CUSTOMER_DATA_MESSAGE;
      const subscriptionsChecked = subscriptions.length;
      runSummary.checkedCount = subscriptionsChecked;
      runSummary.notEligibleCount = subscriptionsChecked;
      runSummary.skippedCount = subscriptionsChecked;
      runSummary.skipReasons = subscriptions.slice(0, 25).map(subscription => {
        const client = clients.find(item => item.id === subscription.client_id && item.user_id === subscription.user_id) ?? null;
        return {
          reminderId: `subscription:${subscription.id}`,
          reminderType: 'subscription_reminder',
          customerName: client?.full_name ?? `Missing customer ${subscription.client_id}`,
          customerEmail: client?.email ? maskReminderEmail(client.email) : null,
          subscriberEmail: null,
          dueDate: subscription.next_payment_date,
          reasonCode: REMINDER_NOT_ELIGIBLE_REASON,
          reasonMessage: reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
          recipient: 'both' as const,
        };
      });
      if (runType !== 'page_load') {
        await Promise.all(usersToLog.map(userId => insertRunLog(db, {
          userId,
          runType,
          status: 'completed',
          baseDate,
          timezone,
          startedAt,
          candidatesCount: 0,
          processedCount: 0,
          emailSentCount: 0,
          emailFailedCount: 0,
          smtpConfigured,
          message,
          metadata: {
            scope: scopeUserId ? 'current_user' : 'all_users',
            smtpMissing: smtpStatus.missing,
            summary: runSummary,
          },
        })));
      }

      return NextResponse.json(
        {
          ok: true,
          scope: scopeUserId ? 'current_user' : 'all_users',
          date: baseDate,
          timezone,
          candidates: 0,
          processed: 0,
          checked: runSummary.checkedCount,
          eligible: 0,
          sent: 0,
          skipped: runSummary.skippedCount,
          failed: 0,
          notEligible: runSummary.notEligibleCount,
          message,
          smtpConfigured,
          smtpMissing: smtpStatus.missing,
          summary: runSummary,
          results: [],
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const candidateUserIds = Array.from(new Set(candidates.map(candidate => candidate.client.user_id)));
    const [profiles, companyNames] = await Promise.all([
      loadProfiles(db, candidateUserIds, scopeUser),
      loadCompanyNames(db, candidateUserIds),
    ]);

    for (const candidate of candidates) {
      runSummary.checkedCount += 1;
      const userSummary = getUserSummary(candidate.client.user_id);
      userSummary.checkedCount += 1;

      const amountDue = Number(reminderCandidateAmount(candidate) ?? 0);
      const currency = reminderCandidateCurrency(candidate, 'KWD');
      const amountFormatted = formatMoney(amountDue, currency, 'ar');
      const linkedCustomer = clients.find(client =>
        client.id === candidate.subscription.client_id &&
        client.user_id === candidate.subscription.user_id
      ) ?? null;
      const customer = linkedCustomer ?? candidate.client;
      const subscriber = subscriberContextFor(candidate.client.user_id, profiles, companyNames);
      const context: ReminderDeliveryContext = {
        reminderId: candidate.dedupeKey,
        reminderType: candidate.reminderType,
        customerId: customer.id,
        customerExists: Boolean(linkedCustomer),
        customerName: customer.full_name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        subscriptionId: candidate.subscription.id,
        paymentId: candidate.payment?.id ?? null,
        amountDue,
        amountFormatted,
        currency,
        dueDate: candidate.dueDate,
        subscriber,
      };
      const eligibility = evaluateReminderEligibility({ candidate, amountDue, context });

      console.info('[business-subscriptions] reminder eligibility evaluated', {
        reminderId: context.reminderId,
        customerId: context.customerId,
        subscriberId: context.subscriber.id,
        dueDate: context.dueDate,
        reminderType: context.reminderType,
        eligible: eligibility.eligible,
        reasonCode: eligibility.reasonCode,
        customerEmail: context.customerEmail ? maskEmailForLog(context.customerEmail) : null,
        subscriberEmail: context.subscriber.email ? maskEmailForLog(context.subscriber.email) : null,
      });

      if (!eligibility.eligible) {
        runSummary.notEligibleCount += 1;
        runSummary.skippedCount += 1;
        userSummary.notEligibleCount += 1;
        userSummary.skippedCount += 1;
        addReminderSkipReason(runSummary, {
          candidate,
          context,
          reasonCode: eligibility.reasonCode ?? REMINDER_NOT_ELIGIBLE_REASON,
          reasonMessage: eligibility.reasonMessage ?? reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
          recipient: 'both',
        });
        addReminderSkipReason(userSummary, {
          candidate,
          context,
          reasonCode: eligibility.reasonCode ?? REMINDER_NOT_ELIGIBLE_REASON,
          reasonMessage: eligibility.reasonMessage ?? reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
          recipient: 'both',
        });
        results.push({
          userId: candidate.client.user_id,
          dedupeKey: candidate.dedupeKey,
          status: 'not_eligible',
          channel: 'in_app',
          error: eligibility.reasonMessage ?? reasonMessageForCode(REMINDER_NOT_ELIGIBLE_REASON),
        });
        continue;
      }

      runSummary.eligibleCount += 1;
      userSummary.eligibleCount += 1;
      const metadata = {
        daysRemaining: candidate.daysRemaining,
        amountDue,
        currency,
        dueDate: candidate.dueDate,
        source: candidate.payment ? 'payment' : 'subscription_next_payment_date',
      };

      let insertedNotificationId: string | null = null;
      if (runType !== 'page_load') {
        const logPayload = {
          user_id: candidate.client.user_id,
          client_id: candidate.client.id,
          subscription_id: candidate.subscription.id,
          payment_id: candidate.payment?.id ?? null,
          channel: 'in_app',
          reminder_type: candidate.reminderType,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: 'sent',
          dedupe_key: candidate.dedupeKey,
          metadata,
        };

        const { data: inserted, error: insertError } = await db
          .from('subscription_notifications')
          .insert(logPayload)
          .select('id')
          .maybeSingle();

        if (insertError) {
          if (String(insertError.code) === '23505') {
            results.push({ userId: candidate.client.user_id, dedupeKey: candidate.dedupeKey, status: 'skipped_duplicate', channel: 'in_app' });
          } else {
            results.push({ userId: candidate.client.user_id, dedupeKey: candidate.dedupeKey, status: 'failed', channel: 'in_app', error: cleanError(insertError) });
          }
        } else {
          insertedNotificationId = inserted?.id ?? null;
          await db.from('notifications').insert({
            user_id: candidate.client.user_id,
            type: 'subscription_payment_reminder',
            title: candidate.daysRemaining < 0
              ? `${candidate.client.full_name} has an overdue payment.`
              : `${candidate.client.full_name} subscription payment is due.`,
            message: `${formatMoney(amountDue, currency, 'en')} due on ${candidate.dueDate}.`,
            read: false,
            status: 'unread',
            severity: candidate.daysRemaining < 0 ? 'danger' : candidate.daysRemaining <= 1 ? 'warning' : 'info',
            source_module: 'business_subscriptions',
            source_id: insertedNotificationId ?? candidate.payment?.id ?? candidate.subscription.id,
            action_url: `/business/subscriptions/${candidate.client.id}`,
            due_date: candidate.dueDate,
            metadata,
          });
          results.push({ userId: candidate.client.user_id, dedupeKey: candidate.dedupeKey, status: 'sent', channel: 'in_app' });
        }
      }

      if (!smtpConfigured || runType === 'page_load') {
        if (!smtpConfigured) {
          const reasonMessage = `SMTP missing: ${smtpStatus.missing.join(', ')}`;
          for (const recipient of ['customer', 'subscriber'] as const) {
            addReminderSkipReason(runSummary, {
              candidate,
              context,
              reasonCode: REMINDER_EMAIL_LOG_FAILED_REASON,
              reasonMessage,
              recipient,
            });
            addReminderSkipReason(userSummary, {
              candidate,
              context,
              reasonCode: REMINDER_EMAIL_LOG_FAILED_REASON,
              reasonMessage,
              recipient,
            });
            applyRecipientOutcome(runSummary, { recipientType: recipient, status: 'skipped', reasonCode: REMINDER_EMAIL_LOG_FAILED_REASON });
            applyRecipientOutcome(userSummary, { recipientType: recipient, status: 'skipped', reasonCode: REMINDER_EMAIL_LOG_FAILED_REASON });
          }
        }
        continue;
      }

      const customerTemplate = customerReminderEmailTemplate({
        customerName: context.customerName,
        amount: context.amountFormatted,
        dueDate: context.dueDate,
        reminderType: context.reminderType,
        subscriberName: context.subscriber.name,
        businessName: context.subscriber.businessName,
      });
      const customerSend = await sendRecipientReminderEmail({
        db,
        candidate,
        context,
        recipientType: 'customer',
        recipientEmail: context.customerEmail,
        template: customerTemplate,
        fromName: 'THE SFM Subscription Reminders',
        force: forceEmailSend,
        runToken: currentRunToken,
      });
      const customerResult = emailResultForRecipient(customerSend);
      results.push(customerResult);
      const customerSendStatus: ReminderEmailStatus = customerSend.status;
      const customerFailureReason = (customerSend as RecipientSendResult).failureReason ?? null;
      const customerError = (customerSend as RecipientSendResult).error ?? null;
      applyRecipientOutcome(runSummary, {
        recipientType: 'customer',
        status: customerSendStatus,
        reasonCode: customerFailureReason,
      });
      applyRecipientOutcome(userSummary, {
        recipientType: 'customer',
        status: customerSendStatus,
        reasonCode: customerFailureReason,
      });
      if (customerSendStatus !== 'sent') {
        addReminderSkipReason(runSummary, {
          candidate,
          context,
          reasonCode: customerFailureReason ?? 'CUSTOMER_EMAIL_NOT_SENT',
          reasonMessage: customerError ?? reasonMessageForCode(customerFailureReason ?? ''),
          recipient: 'customer',
        });
        addReminderSkipReason(userSummary, {
          candidate,
          context,
          reasonCode: customerFailureReason ?? 'CUSTOMER_EMAIL_NOT_SENT',
          reasonMessage: customerError ?? reasonMessageForCode(customerFailureReason ?? ''),
          recipient: 'customer',
        });
      }

      const subscriberTemplate = subscriberReminderEmailTemplate({
        customerName: context.customerName,
        customerEmail: context.customerEmail,
        customerPhone: context.customerPhone,
        amount: context.amountFormatted,
        dueDate: context.dueDate,
        reminderType: context.reminderType,
        customerEmailStatus: customerSend.status,
        customerFailureReason: customerSend.failureReason,
      });
      const subscriberSend = await sendRecipientReminderEmail({
        db,
        candidate,
        context,
        recipientType: 'subscriber',
        recipientEmail: context.subscriber.email,
        template: subscriberTemplate,
        fromName: 'THE SFM Subscription Alerts',
        force: forceEmailSend,
        runToken: currentRunToken,
      });
      const subscriberResult = emailResultForRecipient(subscriberSend);
      results.push(subscriberResult);
      const subscriberSendStatus: ReminderEmailStatus = subscriberSend.status;
      const subscriberFailureReason = (subscriberSend as RecipientSendResult).failureReason ?? null;
      const subscriberError = (subscriberSend as RecipientSendResult).error ?? null;
      applyRecipientOutcome(runSummary, {
        recipientType: 'subscriber',
        status: subscriberSendStatus,
        reasonCode: subscriberFailureReason,
      });
      applyRecipientOutcome(userSummary, {
        recipientType: 'subscriber',
        status: subscriberSendStatus,
        reasonCode: subscriberFailureReason,
      });
      if (subscriberSendStatus !== 'sent') {
        addReminderSkipReason(runSummary, {
          candidate,
          context,
          reasonCode: subscriberFailureReason ?? 'SUBSCRIBER_EMAIL_NOT_SENT',
          reasonMessage: subscriberError ?? reasonMessageForCode(subscriberFailureReason ?? ''),
          recipient: 'subscriber',
        });
        addReminderSkipReason(userSummary, {
          candidate,
          context,
          reasonCode: subscriberFailureReason ?? 'SUBSCRIBER_EMAIL_NOT_SENT',
          reasonMessage: subscriberError ?? reasonMessageForCode(subscriberFailureReason ?? ''),
          recipient: 'subscriber',
        });
      }
    }

    if (runType !== 'page_load') {
      await Promise.all(usersToLog.map(userId => {
        const userCandidates = candidates.filter(candidate => candidate.client.user_id === userId);
        const userResults = results.filter(result => result.userId === userId);
        const userSummary = summariesByUser.get(userId) ?? initializeReminderSummary(requestedReminderId ?? undefined);
        const firstCustomerFailure = userResults.find((result): result is RecipientSendResult =>
          result.channel === 'email' &&
          result.recipientType === 'customer' &&
          result.status !== 'sent'
        );
        const firstSubscriberFailure = userResults.find((result): result is RecipientSendResult =>
          result.channel === 'email' &&
          result.recipientType === 'subscriber' &&
          result.status !== 'sent'
        );
        const bothInvalid = firstCustomerFailure?.customerFailureReason === CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON &&
          firstSubscriberFailure?.subscriberFailureReason === SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON;
        const status = userSummary.failedCount
          ? (userSummary.sentCount ? 'partial' : 'failed')
          : userSummary.notEligibleCount && !userSummary.eligibleCount
            ? 'skipped'
            : 'completed';
        return insertRunLog(db, {
          userId,
          runType,
          status,
          baseDate,
          timezone,
          startedAt,
          candidatesCount: userCandidates.length,
          processedCount: userResults.length,
          emailSentCount: userSummary.sentCount,
          emailFailedCount: userSummary.failedCount,
          smtpConfigured,
          message: bothInvalid
            ? BOTH_RECIPIENT_EMAILS_INVALID_MESSAGE
            : firstCustomerFailure?.error ?? firstSubscriberFailure?.error ?? (!smtpConfigured ? `SMTP missing: ${smtpStatus.missing.join(', ')}` : runSummaryMessage(userSummary)),
          metadata: {
            scope: scopeUserId ? 'current_user' : 'all_users',
            requestedReminderId,
            forceEmailSend,
            smtpMissing: smtpStatus.missing,
            customerEmailFailures: userSummary.byRecipient.failedCustomer,
            subscriberEmailFailures: userSummary.byRecipient.failedSubscriber,
            summary: userSummary,
          },
        });
      }));
    }

    const emailResults = results.filter((result): result is RecipientSendResult => result.channel === 'email');
    const firstCustomerValidation = emailResults.find(result =>
      result.recipientType === 'customer' &&
      result.customerFailureReason === CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON
    );
    const responseMessage = firstCustomerValidation?.error ?? undefined;

    return NextResponse.json(
      {
        ok: true,
        scope: scopeUserId ? 'current_user' : 'all_users',
          date: baseDate,
          timezone,
          candidates: candidates.length,
          processed: results.length,
          checked: runSummary.checkedCount,
          eligible: runSummary.eligibleCount,
          sent: runSummary.sentCount,
          skipped: runSummary.skippedCount,
          failed: runSummary.failedCount,
          notEligible: runSummary.notEligibleCount,
          alreadySent: runSummary.alreadySentCount,
          message: responseMessage ?? runSummaryMessage(runSummary),
          smtpConfigured,
          smtpMissing: smtpStatus.missing,
          summary: runSummary,
          results,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, code: 'SUBSCRIPTION_REMINDER_FAILED', message: cleanError(error) },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}

export const POST = GET;
