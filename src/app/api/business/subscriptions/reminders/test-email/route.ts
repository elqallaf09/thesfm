import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  getSmtpErrorDetails,
  getSmtpMailConfigStatus,
  logSmtpMailError,
  maskEmailForLog,
  sendSmtpMail,
  smtpErrorUserMessage,
  validateMailPayload,
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
  metadata?: Record<string, unknown>;
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
    metadata: {
      source: 'send_test_email',
      ...(input.metadata ?? {}),
    },
  });
}

const INVALID_TEST_RECIPIENT_MESSAGE = 'تعذر إرسال البريد. تحقق من بيانات العميل أو البريد المستلم.';
const TEST_EMAIL_SUCCESS_MESSAGE = 'تم إرسال بريد الاختبار بنجاح.';

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

  const contactEmail = String(process.env.CONTACT_TO_EMAIL || '').trim();
  const smtpUserEmail = String(process.env.SMTP_USER || '').trim();
  const adminEmail = String(user.email || '').trim();
  const recipient = contactEmail || smtpUserEmail || adminEmail;

  if (!recipient) {
    const message = INVALID_TEST_RECIPIENT_MESSAGE;
    await logTestRun(db, {
      userId: user.id,
      status: 'failed',
      timezone,
      smtpConfigured: true,
      message,
    });
    return NextResponse.json(
      { ok: false, code: 'SMTP_TEST_RECIPIENT_MISSING', message },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const testPayload = {
    to: recipient,
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
    replyTo: recipient,
  };

  try {
    const validation = validateMailPayload(testPayload);
    if (!validation.ok || !validation.payload) {
      const message = validation.errors[0] || INVALID_TEST_RECIPIENT_MESSAGE;
      logSmtpMailError('[business-subscriptions] reminder test email payload invalid', new Error(message), {
        userId: user.id,
        subject: testPayload.subject,
        to: maskEmailForLog(recipient),
        from: validation.payload?.from ? maskEmailForLog(validation.payload.from) : null,
        validationErrors: validation.errors,
      });
      await logTestRun(db, {
        userId: user.id,
        status: 'failed',
        timezone,
        smtpConfigured: true,
        message,
        metadata: {
          reason: 'payload_validation',
          validationErrors: validation.errors,
          payloadValidation: true,
        },
      });
      return NextResponse.json(
        { ok: false, code: 'SMTP_TEST_INVALID_PAYLOAD', message },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    await sendSmtpMail({
      to: validation.payload.to,
      subject: validation.payload.subject,
      text: validation.payload.text,
      html: validation.payload.html,
      from: validation.payload.from,
      replyTo: validation.payload.replyTo ?? recipient,
    });

    await logTestRun(db, {
      userId: user.id,
      status: 'completed',
      timezone,
      smtpConfigured: true,
    });

    return NextResponse.json(
      { ok: true, message: TEST_EMAIL_SUCCESS_MESSAGE },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const technicalMessage = cleanError(error);
    const userMessage = smtpErrorUserMessage(error);
    logSmtpMailError('[business-subscriptions] SMTP test email failed', error, {
      userId: user.id,
      to: recipient,
      subject: testPayload.subject,
    });
    await logTestRun(db, {
      userId: user.id,
      status: 'failed',
      timezone,
      smtpConfigured: true,
      message: technicalMessage,
      metadata: {
        reason: 'smtp_send_failed',
      },
    });
    return NextResponse.json(
      { ok: false, code: 'SMTP_TEST_FAILED', message: userMessage },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
