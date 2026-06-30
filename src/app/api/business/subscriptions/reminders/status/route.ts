import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { getSmtpMailConfigStatus } from '@/lib/server/smtpMail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EmailNotificationRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  subscription_id: string | null;
  payment_id: string | null;
  reminder_type: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type ClientSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type LastRunRow = {
  run_type: string | null;
  status: string | null;
  finished_at: string | null;
  candidates_count: number | null;
  processed_count: number | null;
  email_sent_count: number | null;
  email_failed_count: number | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
};

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim();
  return text || null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter((item): item is string => Boolean(item));
}

function asStatus(value: unknown): 'sent' | 'skipped' | 'failed' {
  return value === 'sent' || value === 'skipped' || value === 'failed' ? value : 'failed';
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function smtpMetadata(value: unknown) {
  const smtp = asRecord(value);
  if (!Object.keys(smtp).length) return null;
  const envelope = asRecord(smtp.envelope);
  return {
    responseCode: typeof smtp.responseCode === 'number' ? smtp.responseCode : undefined,
    response: asString(smtp.response),
    command: asString(smtp.command),
    rejected: asStringArray(smtp.rejected),
    envelope: Object.keys(envelope).length ? {
      from: asString(envelope.from) ?? undefined,
      to: asStringArray(envelope.to),
    } : null,
    stack: asString(smtp.stack),
  };
}

function emailItem(row: EmailNotificationRow | null | undefined, clients: Map<string, ClientSummary>) {
  if (!row) return null;
  const metadata = asRecord(row.metadata);
  const client = row.client_id ? clients.get(row.client_id) ?? null : null;
  const recipientType = asString(metadata.recipient_type);
  const customerEmail = asString(metadata.customer_email_masked);

  return {
    id: row.id,
    at: row.sent_at || row.created_at || row.scheduled_for || '',
    recipientType: recipientType === 'customer' || recipientType === 'subscriber' ? recipientType : null,
    status: asStatus(row.status),
    reason: asString(metadata.failure_reason),
    message: asString(metadata.error),
    failureReason: asString(metadata.failure_reason),
    validationStatus: asString(metadata.validation_status),
    smtpCalled: metadata.smtp_called === true,
    reminderType: row.reminder_type || asString(metadata.reminder_type),
    dueDate: asString(metadata.due_date),
    customerId: row.client_id || asString(metadata.customer_id),
    customerExists: typeof metadata.customer_exists === 'boolean' ? metadata.customer_exists : Boolean(client),
    customerName: client?.full_name || asString(metadata.customer_name),
    customerEmail,
    subscriberId: asString(metadata.subscriber_id),
    subscriberName: asString(metadata.subscriber_name),
    subscriberEmail: asString(metadata.subscriber_email_masked),
    businessName: asString(metadata.business_name),
    amount: asString(metadata.amount_formatted),
    to: asStringArray(metadata.recipient_to),
    from: asStringArray(metadata.recipient_from),
    smtp: smtpMetadata(metadata.smtp),
  };
}

function runSummary(lastRun: LastRunRow | null) {
  const metadata = asRecord(lastRun?.metadata);
  const summary = asRecord(metadata.summary);
  if (!Object.keys(summary).length) return null;
  const byRecipient = asRecord(summary.byRecipient);
  const skipReasons = Array.isArray(summary.skipReasons)
    ? summary.skipReasons.map(asRecord)
    : [];
  return {
    checkedCount: asNumber(summary.checkedCount),
    eligibleCount: asNumber(summary.eligibleCount),
    sentCount: asNumber(summary.sentCount),
    skippedCount: asNumber(summary.skippedCount),
    notEligibleCount: asNumber(summary.notEligibleCount),
    alreadySentCount: asNumber(summary.alreadySentCount),
    failedCount: asNumber(summary.failedCount),
    byRecipient: {
      sentCustomer: asNumber(byRecipient.sentCustomer),
      sentSubscriber: asNumber(byRecipient.sentSubscriber),
      skippedCustomer: asNumber(byRecipient.skippedCustomer),
      skippedSubscriber: asNumber(byRecipient.skippedSubscriber),
      failedCustomer: asNumber(byRecipient.failedCustomer),
      failedSubscriber: asNumber(byRecipient.failedSubscriber),
    },
    skipReasons: skipReasons.map(reason => ({
      reminderId: asString(reason.reminderId),
      reminderType: asString(reason.reminderType),
      customerName: asString(reason.customerName),
      customerEmail: asString(reason.customerEmail),
      subscriberEmail: asString(reason.subscriberEmail),
      dueDate: asString(reason.dueDate),
      reasonCode: asString(reason.reasonCode),
      reasonMessage: asString(reason.reasonMessage),
      recipient: asString(reason.recipient),
    })),
  };
}

function fallbackEmailItemFromRun(lastRun: LastRunRow | null, recipientType: 'customer' | 'subscriber') {
  const summary = runSummary(lastRun);
  if (!lastRun || !summary) return null;
  const reason = summary.skipReasons.find(item => item.recipient === recipientType || item.recipient === 'both') ?? null;
  const notEligible = summary.notEligibleCount > 0 && summary.eligibleCount === 0;
  const skipped = recipientType === 'customer' ? summary.byRecipient.skippedCustomer : summary.byRecipient.skippedSubscriber;
  const failed = recipientType === 'customer' ? summary.byRecipient.failedCustomer : summary.byRecipient.failedSubscriber;

  if (!notEligible && !skipped && !failed) return null;

  return {
    id: `last-run-${recipientType}`,
    at: lastRun.finished_at || '',
    recipientType,
    status: notEligible ? 'not_eligible' : failed ? 'failed' : 'skipped',
    reason: reason?.reasonCode ?? (notEligible ? 'REMINDER_NOT_ELIGIBLE' : 'REMINDER_SKIPPED'),
    message: reason?.reasonMessage ?? null,
    failureReason: reason?.reasonCode ?? null,
    validationStatus: reason?.reasonCode ?? null,
    smtpCalled: false,
    reminderType: reason?.reminderType ?? null,
    dueDate: reason?.dueDate ?? null,
    customerId: null,
    customerExists: true,
    customerName: reason?.customerName ?? null,
    customerEmail: reason?.customerEmail ?? null,
    subscriberId: null,
    subscriberName: null,
    subscriberEmail: reason?.subscriberEmail ?? null,
    businessName: null,
    amount: null,
    to: [],
    from: [],
    smtp: null,
  };
}

async function loadRecentEmailNotifications(db: any, userId: string) {
  const { data, error } = await db
    .from('subscription_notifications')
    .select('id, user_id, client_id, subscription_id, payment_id, reminder_type, scheduled_for, sent_at, status, metadata, created_at')
    .eq('user_id', userId)
    .eq('channel', 'email')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[business-subscriptions] reminder status email query failed', {
      userId,
      message: String(error.message || error.code || error),
    });
    return [] as EmailNotificationRow[];
  }

  return (data ?? []) as EmailNotificationRow[];
}

async function loadClientSummaries(db: any, userId: string, rows: EmailNotificationRow[]): Promise<Map<string, ClientSummary>> {
  const clientIds = Array.from(new Set(rows.map(row => row.client_id).filter((id): id is string => Boolean(id))));
  if (!clientIds.length) return new Map<string, ClientSummary>();

  const { data, error } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('user_id', userId)
    .in('id', clientIds);

  if (error) {
    console.warn('[business-subscriptions] reminder status client query failed', {
      userId,
      clientCount: clientIds.length,
      message: String(error.message || error.code || error),
    });
    return new Map<string, ClientSummary>();
  }

  return new Map<string, ClientSummary>(
    ((data ?? []) as ClientSummary[]).map(client => [client.id, client]),
  );
}

async function loadLastRun(db: any, userId: string) {
  const { data, error } = await db
    .from('subscription_reminder_runs')
    .select('run_type, status, finished_at, candidates_count, processed_count, email_sent_count, email_failed_count, message, metadata')
    .eq('user_id', userId)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[business-subscriptions] reminder status run query failed', {
      userId,
      message: String(error.message || error.code || error),
    });
    return null;
  }

  return data ? data as LastRunRow : null;
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  const user = token ? await getUserFromBearerToken(token) : null;

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const db = createServerSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, code: 'SUBSCRIPTION_MANAGER_NOT_CONFIGURED' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const smtp = getSmtpMailConfigStatus();
  const [lastRun, emailRows] = await Promise.all([
    loadLastRun(db, user.id),
    loadRecentEmailNotifications(db, user.id),
  ]);
  const clients = await loadClientSummaries(db, user.id, emailRows);
  const customerRow = emailRows.find(row => asRecord(row.metadata).recipient_type === 'customer') ?? null;
  const subscriberRow = emailRows.find(row => asRecord(row.metadata).recipient_type === 'subscriber') ?? null;
  const sentRow = emailRows.find(row => row.status === 'sent') ?? null;
  const failureRow = emailRows.find(row => row.status === 'failed' || row.status === 'skipped') ?? null;
  const summary = runSummary(lastRun);
  const lastCustomerEmail = emailItem(customerRow, clients) ?? fallbackEmailItemFromRun(lastRun, 'customer');
  const lastSubscriberEmail = emailItem(subscriberRow, clients) ?? fallbackEmailItemFromRun(lastRun, 'subscriber');

  return NextResponse.json(
    {
      ok: true,
      smtp,
      emailRemindersActive: smtp.configured,
      lastRun: lastRun ? { ...lastRun, summary } : null,
      lastEmailSentAt: sentRow?.sent_at || sentRow?.created_at || null,
      lastCustomerEmail,
      lastSubscriberEmail,
      lastEmailFailure: emailItem(failureRow, clients),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
