import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { getSmtpMailConfigStatus } from '@/lib/server/smtpMail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeMetadataError(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const metadata = value as { error?: unknown };
  return typeof metadata.error === 'string' ? metadata.error : null;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item.trim() : item === null || item === undefined ? '' : String(item).trim()))
    .filter(Boolean);
}

function parseFailureMetadata(value: unknown) {
  const metadata = asRecord(value);
  if (!metadata) return null;
  const smtp = asRecord(metadata.smtp);
  return {
    reminderType: asString(metadata.reminder_type),
    customerId: asString(metadata.customer_id),
    to: asStringArray(metadata.recipient_to),
    from: asStringArray(metadata.recipient_from),
    error: asString(metadata.error) ?? 'Email reminder failed',
    smtp: smtp
      ? {
        responseCode: typeof smtp.responseCode === 'number' ? smtp.responseCode : typeof smtp.responseCode === 'string' ? Number(smtp.responseCode) : undefined,
        response: asString(smtp.response),
        command: asString(smtp.command),
        rejected: asStringArray(smtp.rejected),
        envelope: asRecord(smtp.envelope) as { from?: string; to?: string[]; },
        stack: asString(smtp.stack),
      }
      : undefined,
  };
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
  const [lastRunResult, lastEmailResult, lastFailedEmailResult] = await Promise.all([
    db
      .from('subscription_reminder_runs')
      .select('id, run_type, status, base_date, timezone, started_at, finished_at, candidates_count, processed_count, email_sent_count, email_failed_count, smtp_configured, message, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('subscription_notifications')
      .select('id, sent_at, created_at, reminder_type, status')
      .eq('user_id', user.id)
      .eq('channel', 'email')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('subscription_notifications')
      .select('id, created_at, reminder_type, status, metadata')
      .eq('user_id', user.id)
      .eq('channel', 'email')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [lastRunResult.error, lastEmailResult.error, lastFailedEmailResult.error].find(Boolean);
  if (firstError) {
    return NextResponse.json(
      { ok: false, code: 'SUBSCRIPTION_REMINDER_STATUS_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      smtp,
      emailRemindersActive: smtp.configured,
      lastRun: lastRunResult.data ?? null,
      lastEmailSentAt: lastEmailResult.data?.sent_at ?? null,
      lastEmailFailure: lastFailedEmailResult.data
        ? (() => {
          const metadata = parseFailureMetadata(lastFailedEmailResult.data.metadata);
          return {
            at: lastFailedEmailResult.data.created_at,
            reason: metadata?.error ?? safeMetadataError(lastFailedEmailResult.data.metadata) ?? 'Email reminder failed',
            reminderType: metadata?.reminderType ?? null,
            customerId: metadata?.customerId ?? null,
            to: metadata?.to ?? [],
            from: metadata?.from ?? [],
            smtp: metadata?.smtp,
          };
        })()
        : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
