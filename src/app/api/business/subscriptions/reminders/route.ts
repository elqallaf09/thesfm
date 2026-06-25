import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientBundles,
  buildReminderCandidates,
  emailReminderTemplate,
  formatMoney,
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
import { isSmtpMailConfigured, sendSmtpMail } from '@/lib/server/smtpMail';

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

function todayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
}

function cleanError(error: unknown) {
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

  const baseDate = request.nextUrl.searchParams.get('date')?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? request.nextUrl.searchParams.get('date') as string
    : todayIso();

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
    const smtpConfigured = isSmtpMailConfigured();
    const ownerEmailCache = new Map<string, string | null>();
    const origin = request.nextUrl.origin;
    const results: Array<{ dedupeKey: string; status: string; channel: string; error?: string }> = [];

    for (const candidate of candidates) {
      const metadata = {
        daysRemaining: candidate.daysRemaining,
        amountDue: candidate.payment.amount_due,
        currency: candidate.payment.currency || candidate.subscription.currency || 'KWD',
      };

      const logPayload = {
        user_id: candidate.client.user_id,
        client_id: candidate.client.id,
        subscription_id: candidate.subscription.id,
        payment_id: candidate.payment.id,
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
          results.push({ dedupeKey: candidate.dedupeKey, status: 'skipped_duplicate', channel: 'in_app' });
          continue;
        }
        results.push({ dedupeKey: candidate.dedupeKey, status: 'failed', channel: 'in_app', error: cleanError(insertError) });
        continue;
      }

      await db.from('notifications').insert({
        user_id: candidate.client.user_id,
        type: 'subscription_payment_reminder',
        title: candidate.daysRemaining < 0
          ? `${candidate.client.full_name} has an overdue payment.`
          : `${candidate.client.full_name} subscription payment is due.`,
        message: `${formatMoney(candidate.payment.amount_due, candidate.payment.currency || candidate.subscription.currency || 'KWD', 'en')} due on ${candidate.payment.due_date}.`,
        read: false,
        status: 'unread',
        severity: candidate.daysRemaining < 0 ? 'danger' : candidate.daysRemaining <= 1 ? 'warning' : 'info',
        source_module: 'business_subscriptions',
        source_id: inserted?.id ?? candidate.payment.id,
        action_url: `/business/subscriptions/${candidate.client.id}`,
        due_date: candidate.payment.due_date,
        metadata,
      });

      results.push({ dedupeKey: candidate.dedupeKey, status: 'sent', channel: 'in_app' });

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
          results.push({ dedupeKey: emailDedupeKey, status: 'failed', channel: 'email', error: cleanError(emailLogError) });
        }
        continue;
      }

      const template = emailReminderTemplate({
        clientName: candidate.client.full_name,
        phone: candidate.client.phone,
        amount: String(candidate.payment.amount_due),
        currency: candidate.payment.currency || candidate.subscription.currency || 'KWD',
        dueDate: candidate.payment.due_date,
        daysRemaining: candidate.daysRemaining,
        openClientUrl: `${origin}/business/subscriptions/${candidate.client.id}`,
      });

      try {
        await sendSmtpMail({
          to: ownerEmail,
          subject: template.subject,
          text: template.text,
          html: template.html,
          fromName: 'THE SFM',
        });
        await db
          .from('subscription_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('user_id', candidate.client.user_id)
          .eq('dedupe_key', emailDedupeKey);
        results.push({ dedupeKey: emailDedupeKey, status: 'sent', channel: 'email' });
      } catch (error) {
        await db
          .from('subscription_notifications')
          .update({ status: 'failed', metadata: { ...metadata, error: cleanError(error) } })
          .eq('user_id', candidate.client.user_id)
          .eq('dedupe_key', emailDedupeKey);
        results.push({ dedupeKey: emailDedupeKey, status: 'failed', channel: 'email' });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        scope: scopeUserId ? 'current_user' : 'all_users',
        date: baseDate,
        candidates: candidates.length,
        processed: results.length,
        smtpConfigured,
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
