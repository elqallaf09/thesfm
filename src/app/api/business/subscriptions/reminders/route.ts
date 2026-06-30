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
  type PaymentHistoryRow,
  type PaymentRow,
  type ReminderCandidate,
  type ReminderNotificationRow,
  type SubscriptionRow,
} from '@/lib/businessSubscriptions';
import {
  CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
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
  customerEmailStatus?: ReminderEmailStatus;
  subscriberEmailStatus?: ReminderEmailStatus;
  customerFailureReason?: string | null;
  subscriberFailureReason?: string | null;
  error?: string;
};

type ReminderResult =
  | { userId: string; dedupeKey: string; status: string; channel: 'in_app'; error?: string }
  | RecipientSendResult;

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
const DUPLICATE_REMINDER_EMAIL_REASON = 'DUPLICATE_REMINDER_EMAIL';

function sanitizeEnvelopeForLog(envelope?: { from: string; to: string[] }) {
  if (!envelope) return undefined;
  return {
    from: maskEmailForLog(envelope.from),
    to: (envelope.to ?? []).map(maskEmailForLog),
  };
}

function mapStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item : item === null || item === undefined ? '' : String(item)))
    .map(item => item.trim())
    .filter(Boolean);
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

async function sendRecipientReminderEmail(input: {
  db: any;
  candidate: ReminderCandidate;
  context: ReminderDeliveryContext;
  recipientType: ReminderRecipientType;
  recipientEmail: string | null;
  template: { subject: string; text: string; html: string };
  fromName: string;
}) {
  const validation = validateReminderRecipientEmail(input.recipientEmail, input.recipientType);
  const dedupeKey = `${input.candidate.dedupeKey}:email:${input.recipientType}`;
  const logPayload = notificationLogPayload({
    context: input.context,
    candidate: input.candidate,
    recipientType: input.recipientType,
    dedupeKey,
  });

  if (!validation.ok) {
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'skipped',
      context: input.context,
      recipientEmail: validation.rawEmail || null,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
      failureReason: validation.reason,
      userMessage: validation.message,
      smtpCalled: false,
    });
    logReminderEmail('[business-subscriptions] reminder recipient validation failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: 'skipped',
      recipientEmail: validation.rawEmail || null,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
      failureReason: validation.reason,
      smtpCalled: false,
    });

    const { error } = await input.db
      .from('subscription_notifications')
      .insert({
        ...logPayload,
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
      failureReason: validation.reason,
      error: validation.message,
    };
  }

  const payload = validateMailPayload({
    to: validation.email,
    subject: input.template.subject,
    text: input.template.text,
    html: input.template.html,
    fromName: input.fromName,
  });

  if (!payload.ok || !payload.payload) {
    const reason = REMINDER_EMAIL_PAYLOAD_INVALID_REASON;
    const message = payload.errors[0] || INVALID_REMINDER_PAYLOAD_MESSAGE;
    const metadata = emailMetadata({
      recipientType: input.recipientType,
      status: 'failed',
      context: input.context,
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
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
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
      failureReason: reason,
      smtpCalled: false,
    });

    await input.db.from('subscription_notifications').insert({
      ...logPayload,
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
    };
  }

  const emailPayload = payload.payload;
  const scheduledMetadata = emailMetadata({
    recipientType: input.recipientType,
    status: 'scheduled',
    context: input.context,
    recipientEmail: validation.email,
    recipientEmailExists: validation.emailExists,
    recipientEmailValid: validation.emailValid,
    from: emailPayload.from,
    smtpCalled: false,
  });
  const scheduleInsertResult = await input.db
    .from('subscription_notifications')
    .insert({
      ...logPayload,
      status: 'scheduled',
      metadata: scheduledMetadata,
    });

  if (scheduleInsertResult.error) {
    const duplicate = String(scheduleInsertResult.error.code) === '23505';
    const reason = duplicate ? DUPLICATE_REMINDER_EMAIL_REASON : REMINDER_EMAIL_LOG_FAILED_REASON;
    const message = duplicate ? scheduleInsertResult.error.message : cleanError(scheduleInsertResult.error);
    logReminderEmail('[business-subscriptions] reminder email not sent because log scheduling failed', {
      context: input.context,
      recipientType: input.recipientType,
      status: duplicate ? 'skipped' : 'failed',
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
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
    };
  }

  try {
    const sendResult = await sendSmtpMail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
      fromName: input.fromName,
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
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
      from: emailPayload.from,
      smtp,
      smtpCalled: true,
    });

    await input.db
      .from('subscription_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
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
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
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
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
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
      recipientEmail: validation.email,
      recipientEmailExists: validation.emailExists,
      recipientEmailValid: validation.emailValid,
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
    };
  }
}

function emailResultForRecipient(result: Awaited<ReturnType<typeof sendRecipientReminderEmail>>) {
  if (result.recipientType === 'customer') {
    return {
      ...result,
      customerEmailStatus: result.status,
      customerFailureReason: result.failureReason,
    };
  }
  return {
    ...result,
    subscriberEmailStatus: result.status,
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
    const candidates = buildReminderCandidates(bundles, baseDate);
    const smtpStatus = getSmtpMailConfigStatus();
    const smtpConfigured = isSmtpMailConfigured();
    const results: ReminderResult[] = [];
    const usersToLog = scopeUserId
      ? [scopeUserId]
      : Array.from(new Set([
        ...clients.map(client => client.user_id),
        ...subscriptions.map(subscription => subscription.user_id),
      ]));

    if (!candidates.length) {
      const message = NO_CUSTOMER_DATA_MESSAGE;
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
        },
      })));

      return NextResponse.json(
        {
          ok: true,
          scope: scopeUserId ? 'current_user' : 'all_users',
          date: baseDate,
          timezone,
          candidates: 0,
          processed: 0,
          message,
          smtpConfigured,
          smtpMissing: smtpStatus.missing,
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
      const amountDue = Number(reminderCandidateAmount(candidate) ?? 0);
      const currency = reminderCandidateCurrency(candidate, 'KWD');
      const amountFormatted = formatMoney(amountDue, currency, 'ar');
      const metadata = {
        daysRemaining: candidate.daysRemaining,
        amountDue,
        currency,
        dueDate: candidate.dueDate,
        source: candidate.payment ? 'payment' : 'subscription_next_payment_date',
      };

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
          continue;
        }
        results.push({ userId: candidate.client.user_id, dedupeKey: candidate.dedupeKey, status: 'failed', channel: 'in_app', error: cleanError(insertError) });
        continue;
      }

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
        source_id: inserted?.id ?? candidate.payment?.id ?? candidate.subscription.id,
        action_url: `/business/subscriptions/${candidate.client.id}`,
        due_date: candidate.dueDate,
        metadata,
      });

      results.push({ userId: candidate.client.user_id, dedupeKey: candidate.dedupeKey, status: 'sent', channel: 'in_app' });

      if (!smtpConfigured) continue;

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
      });
      const customerResult = emailResultForRecipient(customerSend);
      results.push(customerResult);

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
      });
      const subscriberResult = emailResultForRecipient(subscriberSend);
      results.push(subscriberResult);
    }

    await Promise.all(usersToLog.map(userId => {
      const userCandidates = candidates.filter(candidate => candidate.client.user_id === userId);
      const userResults = results.filter(result => result.userId === userId);
      const emailResults = userResults.filter((result): result is RecipientSendResult => result.channel === 'email');
      const emailSent = emailResults.filter(result => result.status === 'sent').length;
      const emailFailures = emailResults.filter(result => result.status === 'failed' || result.status === 'skipped');
      const firstCustomerFailure = emailFailures.find(result => result.recipientType === 'customer');
      const firstSubscriberFailure = emailFailures.find(result => result.recipientType === 'subscriber');
      const bothInvalid = firstCustomerFailure?.customerFailureReason === CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON &&
        firstSubscriberFailure?.subscriberFailureReason === SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON;
      const status = emailFailures.length ? (emailSent ? 'partial' : 'failed') : 'completed';
      return insertRunLog(db, {
        userId,
        runType,
        status,
        baseDate,
        timezone,
        startedAt,
        candidatesCount: userCandidates.length,
        processedCount: userResults.length,
        emailSentCount: emailSent,
        emailFailedCount: emailFailures.length,
        smtpConfigured,
        message: bothInvalid
          ? BOTH_RECIPIENT_EMAILS_INVALID_MESSAGE
          : firstCustomerFailure?.error ?? firstSubscriberFailure?.error ?? (!smtpConfigured ? `SMTP missing: ${smtpStatus.missing.join(', ')}` : null),
        metadata: {
          scope: scopeUserId ? 'current_user' : 'all_users',
          smtpMissing: smtpStatus.missing,
          customerEmailFailures: emailFailures.filter(result => result.recipientType === 'customer').length,
          subscriberEmailFailures: emailFailures.filter(result => result.recipientType === 'subscriber').length,
        },
      });
    }));

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
        message: responseMessage,
        smtpConfigured,
        smtpMissing: smtpStatus.missing,
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
