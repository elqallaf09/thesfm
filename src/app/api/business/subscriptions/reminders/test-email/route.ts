import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  getSmtpErrorDetails,
  getSmtpMailConfigStatus,
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
      smtpDetails.response ? `response=${smtpDetails.response.replace(/\s+/g, ' ').trim()}` : null,
    ].filter(Boolean).join(' | ');
  }
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as { code?: unknown; message?: unknown };
  return [value.code, value.message].filter(Boolean).join(': ');
}

async function logTestRun(db: any, input: {
  userId: string;
  status: 'completed' | 'failed';
  timezone: string;
  smtpConfigured: boolean;
  message?: string | null;
}) {
  await db.from('subscription_reminder_runs').insert({
    user_id: input.userId,
    run_type: 'test_email',
    status: input.status,
    base_date: todayIso(input.timezone),
    timezone: input.timezone,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    candidates_count: 0,
    processed_count: 0,
    email_sent_count: input.status === 'completed' ? 1 : 0,
    email_failed_count: input.status === 'failed' ? 1 : 0,
    smtp_configured: input.smtpConfigured,
    message: input.message ?? null,
    metadata: { source: 'send_test_email' },
  });
}

export async function POST(request: NextRequest) {
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

  const timezone = safeTimezone(request.headers.get('x-client-timezone'));
  const smtp = getSmtpMailConfigStatus();
  if (!smtp.configured) {
    await logTestRun(db, {
      userId: user.id,
      status: 'failed',
      timezone,
      smtpConfigured: false,
      message: `SMTP missing: ${smtp.missing.join(', ')}`,
    });
    return NextResponse.json(
      { ok: false, code: 'SMTP_MISSING', missing: smtp.missing },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  if (!user.email) {
    await logTestRun(db, {
      userId: user.id,
      status: 'failed',
      timezone,
      smtpConfigured: true,
      message: 'Authenticated user has no email address',
    });
    return NextResponse.json(
      { ok: false, code: 'USER_EMAIL_MISSING' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    await sendSmtpMail({
      to: user.email,
      subject: 'THE SFM subscription reminder test',
      text: 'This is a test email from the Clients & Subscriptions reminder system.',
      html: `
        <div style="font-family:Inter,Tajawal,Arial,sans-serif;background:#eef6ff;padding:24px;color:#0b172a">
          <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dbeafe;border-radius:20px;padding:24px">
            <strong style="color:#0b3558">THE SFM</strong>
            <h1 style="margin:10px 0 8px;font-size:22px">Subscription reminder test</h1>
            <p style="margin:0;color:#475569">SMTP is configured and the reminder email channel can send messages.</p>
          </div>
        </div>
      `,
    });
    await logTestRun(db, {
      userId: user.id,
      status: 'completed',
      timezone,
      smtpConfigured: true,
    });
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const technicalMessage = cleanError(error);
    const userMessage = smtpErrorUserMessage(error);
    logSmtpMailError('[business-subscriptions] SMTP test email failed', error, {
      userId: user.id,
      to: user.email,
      subject: 'THE SFM subscription reminder test',
    });
    await logTestRun(db, {
      userId: user.id,
      status: 'failed',
      timezone,
      smtpConfigured: true,
      message: technicalMessage,
    });
    return NextResponse.json(
      { ok: false, code: 'SMTP_TEST_FAILED', message: userMessage },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
