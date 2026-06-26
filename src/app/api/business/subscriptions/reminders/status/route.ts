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
        ? {
          at: lastFailedEmailResult.data.created_at,
          reason: safeMetadataError(lastFailedEmailResult.data.metadata) || 'Email reminder failed',
        }
        : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
