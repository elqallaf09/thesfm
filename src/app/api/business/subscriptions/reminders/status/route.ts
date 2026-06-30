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
  const customerEmail = client?.email || asString(metadata.customer_email_masked);

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
    .select('run_type, status, finished_at, candidates_count, processed_count, email_sent_count, email_failed_count, message')
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

  return data ?? null;
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

  return NextResponse.json(
    {
      ok: true,
      smtp,
      emailRemindersActive: smtp.configured,
      lastRun,
      lastEmailSentAt: sentRow?.sent_at || sentRow?.created_at || null,
      lastCustomerEmail: emailItem(customerRow, clients),
      lastSubscriberEmail: emailItem(subscriberRow, clients),
      lastEmailFailure: emailItem(failureRow, clients),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
