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
  validateMailPayload,
  maskEmailForLog,
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

const NO_CUSTOMER_DATA_MESSAGE = 'لا توجد بيانات عملاء لإرسال التذكيرات.';
const INVALID_REMINDER_PAYLOAD_MESSAGE = 'تعذر إرسال البريد. تحقق من بيانات العميل أو البريد المستلم.';

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

function buildReminderFailureMetadata(input: {
  reminderType: string;
  customerId: string;
  to: string[];
  from?: string;
  userMessage?: string;
  payloadValidationErrors?: string[];
  smtp?: Record<string, unknown>;
}) {
  const meta: Record<string, unknown> = {
    reminder_type: input.reminderType,
    customer_id: input.customerId,
    recipient_to: input.to.map(maskEmailForLog),
    recipient_from: input.from ? [maskEmailForLog(input.from)] : [],
  };

  if (input.userMessage) meta.error = input.userMessage;
  if (input.payloadValidationErrors?.length) meta.payloadValidationErrors = input.payloadValidationErrors;
  if (input.smtp) meta.smtp = input.smtp;

  return meta;
}

async function loadRows<T>(db: any, table: string, userId?: string) {
  let query = db.from(table).select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
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
    const origin = request.nextUrl.origin;
    const results: Array<{ userId: string; dedupeKey: string; status: string; channel: string; error?: string }> = [];
    const usersToLog = scopeUserId
      ? [scopeUserId]
      : Array.from(new Set(clients.map(client => client.user_id)));

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
      const recipientEmail = (candidate.client.email ?? '').trim();
      const template = emailReminderTemplate({
        clientName: candidate.client.full_name,
        phone: candidate.client.phone,
        amount: String(amountDue),
        currency,
        dueDate: candidate.dueDate,
        daysRemaining: candidate.daysRemaining,
        openClientUrl: `${origin}/business/subscriptions/${candidate.client.id}`,
      });
      const payload = validateMailPayload({
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
        replyTo: recipientEmail,
      });
      const emailDedupeKey = `${candidate.dedupeKey}:email`;
      const emailLogPayload = {
        user_id: logPayload.user_id,
        client_id: logPayload.client_id,
        subscription_id: logPayload.subscription_id,
        payment_id: logPayload.payment_id,
        reminder_type: logPayload.reminder_type,
        scheduled_for: logPayload.scheduled_for,
        metadata: logPayload.metadata,
        channel: 'email' as const,
        sent_at: null,
        dedupe_key: emailDedupeKey,
      };

      if (!payload.ok || !payload.payload) {
        const statusMessage = INVALID_REMINDER_PAYLOAD_MESSAGE;
        const validationMetadata = buildReminderFailureMetadata({
          reminderType: candidate.reminderType,
          customerId: candidate.client.id,
          to: payload.payload?.to ?? mapStringArray([recipientEmail]),
          from: payload.payload?.from,
          userMessage: statusMessage,
          payloadValidationErrors: payload.errors,
        });
        const firstValidationError = payload.errors?.[0];
        logSmtpMailError('[business-subscriptions] reminder payload validation failed', new Error(firstValidationError ?? INVALID_REMINDER_PAYLOAD_MESSAGE), {
          userId: candidate.client.user_id,
          clientId: candidate.client.id,
          reminderType: candidate.reminderType,
          candidateUserId: candidate.client.user_id,
          to: mapStringArray([recipientEmail]).map(maskEmailForLog).join(',') || null,
          from: payload.payload?.from ? maskEmailForLog(payload.payload.from) : null,
          reason: firstValidationError ?? null,
        });
        const { error: validationInsertError } = await db
          .from('subscription_notifications')
          .insert({
            ...emailLogPayload,
            status: 'failed',
            metadata: { ...validationMetadata },
          });

        if (!validationInsertError) {
          results.push({
            userId: candidate.client.user_id,
            dedupeKey: emailDedupeKey,
            status: 'failed',
            channel: 'email',
            error: statusMessage,
          });
        } else {
          if (String(validationInsertError.code) === '23505') {
            results.push({
              userId: candidate.client.user_id,
              dedupeKey: emailDedupeKey,
              status: 'skipped_duplicate',
              channel: 'email',
              error: validationInsertError.message,
            });
          } else {
            results.push({
              userId: candidate.client.user_id,
              dedupeKey: emailDedupeKey,
              status: 'failed',
              channel: 'email',
              error: cleanError(validationInsertError),
            });
          }
          logSmtpMailError('[business-subscriptions] reminder validation email log failed', validationInsertError, {
            userId: candidate.client.user_id,
            clientId: candidate.client.id,
            candidateUserId: candidate.client.user_id,
          });
        }
        continue;
      }

      const emailPayload = payload.payload;
      const scheduleInsertResult = await db
        .from('subscription_notifications')
        .insert({
          ...emailLogPayload,
          status: 'scheduled',
        });

      if (scheduleInsertResult.error) {
        if (String(scheduleInsertResult.error.code) === '23505') {
          results.push({
            userId: candidate.client.user_id,
            dedupeKey: emailDedupeKey,
            status: 'skipped_duplicate',
            channel: 'email',
            error: scheduleInsertResult.error.message,
          });
          continue;
        }
        const failMetadata = buildReminderFailureMetadata({
          reminderType: candidate.reminderType,
          customerId: candidate.client.id,
          to: emailPayload.to,
          from: emailPayload.from,
          userMessage: INVALID_REMINDER_PAYLOAD_MESSAGE,
        });
        await db.from('subscription_notifications').insert({
          ...emailLogPayload,
          status: 'failed',
          metadata: { ...failMetadata, error: cleanError(scheduleInsertResult.error) },
        });
        results.push({
          userId: candidate.client.user_id,
          dedupeKey: emailDedupeKey,
          status: 'failed',
          channel: 'email',
          error: cleanError(scheduleInsertResult.error),
        });
        continue;
      }

      try {
        const sendResult = await sendSmtpMail({
          to: emailPayload.to,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
          from: emailPayload.from,
          replyTo: emailPayload.replyTo,
        });
        await db
          .from('subscription_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              reminder_type: candidate.reminderType,
              customer_id: candidate.client.id,
              recipient_to: mapStringArray(emailPayload.to).map(maskEmailForLog),
              recipient_from: emailPayload.from ? [maskEmailForLog(emailPayload.from)] : [],
              emailResult: {
                accepted: sendResult.accepted,
                rejected: sendResult.rejected,
                responseCode: sendResult.responseCode,
                response: sendResult.response,
              },
            },
          })
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
        const recipientTo = mapStringArray(emailPayload.to);
        const smtpMetadata = {
          responseCode: smtpDetails.responseCode,
          response: smtpDetails.response,
          command: smtpDetails.command,
          rejected: smtpDetails.rejected,
          envelope: sanitizeEnvelopeForLog(smtpDetails.envelope),
          stack: smtpDetails.stack,
        };
        logSmtpMailError('[business-subscriptions] reminder email failed', error, {
          userId: candidate.client.user_id,
          clientId: candidate.client.id,
          subscriptionId: candidate.subscription.id,
          paymentId: candidate.payment?.id ?? null,
          to: mapStringArray(emailPayload.to).map(maskEmailForLog).join(',') || null,
          subject: template.subject,
          dedupeKey: emailDedupeKey,
        });
        const failureMetadata = buildReminderFailureMetadata({
          reminderType: candidate.reminderType,
          customerId: candidate.client.id,
          to: recipientTo,
          from: emailPayload.from,
          userMessage,
          smtp: smtpMetadata,
        });
        await db
          .from('subscription_notifications')
          .update({
            status: 'failed',
            metadata: { ...failureMetadata, smtpError: errorText },
          })
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
          metadata: failureMetadata,
        });
        results.push({ userId: candidate.client.user_id, dedupeKey: emailDedupeKey, status: 'failed', channel: 'email', error: userMessage });
      }
    }

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
