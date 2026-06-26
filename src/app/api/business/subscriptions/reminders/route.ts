import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientBundles,
  buildReminderCandidates,
  emailReminderTemplate,
  formatMoney,
  reminderCandidateAmount,
  reminderCandidateCurrency,
  type ActivityLogRow,
  type ClientFileRow,
  type ClientNoteRow,
  type ClientRow,
  type PaymentHistoryRow,
  type PaymentRow,
  type ReminderNotificationRow,
  type SubscriptionRow,
} from '@/lib/businessSubscriptions';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  getSmtpErrorDetails,
  getSmtpMailConfigStatus,
  isSmtpMailConfigured,
  logSmtpMailError,
  sendSmtpMail,
  smtpErrorUserMessage,
} from '@/lib/server/smtpMail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

async function getScopeUserId(request: NextRequest) {
  if (isCronAuthorized(request)) return null;
  const token = bearerToken(request);
  const user = token ? await getUserFromBearerToken(token) : null;
  return user?.id ?? undefined;
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
      smtpDetails.rejected?.length ? `rejected=${smtpDetails.rejected.join(',')}` : null,
      smtpDetails.response ? `response=${smtpDetails.response.replace(/\s+/g, ' ').trim()}` : null,
    ].filter(Boolean).join(' | ');
  }
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as { code?: unknown; message?: unknown };
  return [value.code, value.message].filter(Boolean).join(': ');
}

async function loadRows<T>(db: any, table: string, userId?: string) {
  let query = db.from(table).select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function getOwnerEmail(db: any, cache: Map<string, string | null>, userId: string) {
  if (cache.has(userId)) return cache.get(userId) ?? null;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    const email = error ? null : data?.user?.email ?? null;
    cache.set(userId, email);
    return email;
  } catch {
    cache.set(userId, null);
    return null;
  }
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

export async function GET(request: NextRequest) {
  const db = createServerSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, code: 'SUBSCRIPTION_MANAGER_NOT_CONFIGURED' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const scopeUserId = await getScopeUserId(request);
  if (scopeUserId === undefined) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

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

    const bundles = buildClientBundles({
      clients,
      subscriptions,
      payments,
      history,
      notes,
      files,
      activity,
      notifications: notificationLogs,
    });
    const candidates = buildReminderCandidates(bundles, baseDate);
    const smtpStatus = getSmtpMailConfigStatus();
    const smtpConfigured = isSmtpMailConfigured();
    const ownerEmailCache = new Map<string, string | null>();
    const origin = request.nextUrl.origin;
    const results: Array<{ userId: string; dedupeKey: string; status: string; channel: string; error?: string }> = [];

    for (const candidate of candidates) {
      const amountDue = reminderCandidateAmount(candidate);
      const currency = reminderCandidateCurrency(candidate, 'KWD');
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
      const ownerEmail = await getOwnerEmail(db, ownerEmailCache, candidate.client.user_id);
      if (!ownerEmail) continue;

      const emailDedupeKey = `${candidate.dedupeKey}:email`;
      const { error: emailLogError } = await db
        .from('subscription_notifications')
        .insert({
          user_id: logPayload.user_id,
          client_id: logPayload.client_id,
          subscription_id: logPayload.subscription_id,
          payment_id: logPayload.payment_id,
          reminder_type: logPayload.reminder_type,
          scheduled_for: logPayload.scheduled_for,
          metadata: logPayload.metadata,
          channel: 'email',
          status: 'scheduled',
          sent_at: null,
          dedupe_key: emailDedupeKey,
        });

      if (emailLogError) {
        if (String(emailLogError.code) !== '23505') {
          results.push({ userId: candidate.client.user_id, dedupeKey: emailDedupeKey, status: 'failed', channel: 'email', error: cleanError(emailLogError) });
        }
        continue;
      }

      const template = emailReminderTemplate({
        clientName: candidate.client.full_name,
        phone: candidate.client.phone,
        amount: String(amountDue),
        currency,
        dueDate: candidate.dueDate,
        daysRemaining: candidate.daysRemaining,
        openClientUrl: `${origin}/business/subscriptions/${candidate.client.id}`,
      });

      try {
        await sendSmtpMail({
          to: ownerEmail,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
        await db
          .from('subscription_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('user_id', candidate.client.user_id)
          .eq('dedupe_key', emailDedupeKey);
        await db.from('activity_logs').insert({
          user_id: candidate.client.user_id,
          client_id: candidate.client.id,
          subscription_id: candidate.subscription.id,
          payment_id: candidate.payment?.id ?? null,
          event_type: 'subscription_email_sent',
          title: 'subscription_email_sent',
          description: `${candidate.client.full_name} - ${candidate.dueDate}`,
          metadata,
        });
        results.push({ userId: candidate.client.user_id, dedupeKey: emailDedupeKey, status: 'sent', channel: 'email' });
      } catch (error) {
        const errorText = cleanError(error);
        const userMessage = smtpErrorUserMessage(error);
        const smtpDetails = getSmtpErrorDetails(error);
        logSmtpMailError('[business-subscriptions] reminder email failed', error, {
          userId: candidate.client.user_id,
          clientId: candidate.client.id,
          subscriptionId: candidate.subscription.id,
          paymentId: candidate.payment?.id ?? null,
          to: ownerEmail,
          subject: template.subject,
          dedupeKey: emailDedupeKey,
        });
        await db
          .from('subscription_notifications')
          .update({ status: 'failed', metadata: { ...metadata, error: errorText, userMessage, smtp: smtpDetails } })
          .eq('user_id', candidate.client.user_id)
          .eq('dedupe_key', emailDedupeKey);
        await db.from('activity_logs').insert({
          user_id: candidate.client.user_id,
          client_id: candidate.client.id,
          subscription_id: candidate.subscription.id,
          payment_id: candidate.payment?.id ?? null,
          event_type: 'subscription_email_failed',
          title: 'subscription_email_failed',
          description: userMessage,
          metadata: { ...metadata, error: errorText, smtp: smtpDetails },
        });
        results.push({ userId: candidate.client.user_id, dedupeKey: emailDedupeKey, status: 'failed', channel: 'email', error: userMessage });
      }
    }

    const usersToLog = scopeUserId
      ? [scopeUserId]
      : Array.from(new Set(clients.map(client => client.user_id)));

    await Promise.all(usersToLog.map(userId => {
      const userCandidates = candidates.filter(candidate => candidate.client.user_id === userId);
      const userResults = results.filter(result => result.userId === userId);
      const emailFailures = userResults.filter(result => result.channel === 'email' && result.status === 'failed');
      const emailSent = userResults.filter(result => result.channel === 'email' && result.status === 'sent').length;
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
        message: emailFailures[0]?.error ?? (!smtpConfigured ? `SMTP missing: ${smtpStatus.missing.join(', ')}` : null),
        metadata: {
          scope: scopeUserId ? 'current_user' : 'all_users',
          smtpMissing: smtpStatus.missing,
        },
      });
    }));

    return NextResponse.json(
      {
        ok: true,
        scope: scopeUserId ? 'current_user' : 'all_users',
        date: baseDate,
        timezone,
        candidates: candidates.length,
        processed: results.length,
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
