import { STATIC_EMAIL_VISUAL_STYLES } from '@/styles/static-tokens';

export type ReminderRecipientType = 'customer' | 'subscriber';
export type ReminderEmailStatus = 'sent' | 'skipped' | 'failed';

export const CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON = 'CUSTOMER_EMAIL_MISSING_OR_INVALID';
export const SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON = 'SUBSCRIBER_EMAIL_MISSING_OR_INVALID';
export const REMINDER_EMAIL_PAYLOAD_INVALID_REASON = 'REMINDER_EMAIL_PAYLOAD_INVALID';
export const REMINDER_EMAIL_SMTP_FAILED_REASON = 'REMINDER_EMAIL_SMTP_FAILED';
export const REMINDER_EMAIL_LOG_FAILED_REASON = 'REMINDER_EMAIL_LOG_FAILED';

export const CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE =
  'لا يمكن إرسال تذكير للعميل لأن البريد الإلكتروني غير موجود أو غير صالح.';

export const MISSING_OR_INVALID_CUSTOMER_EMAIL_REASON = CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON;
export const MISSING_OR_INVALID_CUSTOMER_EMAIL_MESSAGE = CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE;

const SUBSCRIBER_EMAIL_MISSING_OR_INVALID_MESSAGE =
  'لا يمكن إرسال تنبيه للمشترك لأن البريد الإلكتروني غير موجود أو غير صالح.';

function cleanEmail(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const bracketMatch = raw.match(/<([^>]+)>/);
  const candidate = (bracketMatch?.[1] ?? raw).trim().replace(/^mailto:/i, '');
  return /^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$/.test(candidate) ? candidate : null;
}

export function maskReminderEmail(value: unknown) {
  const email = cleanEmail(value);
  if (!email) return '[redacted]';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '[redacted]';
  const maskedName = name.length <= 2 ? `${name[0] ?? ''}*` : `${name.slice(0, 2)}***`;
  return `${maskedName}@${domain}`;
}

export function validateReminderRecipientEmail(value: unknown, recipientType: ReminderRecipientType) {
  const rawEmail = String(value ?? '').trim();
  const email = cleanEmail(rawEmail);
  const emailExists = Boolean(rawEmail);
  const emailValid = Boolean(email);
  const reason = recipientType === 'customer'
    ? CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON
    : SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON;
  const message = recipientType === 'customer'
    ? CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE
    : SUBSCRIBER_EMAIL_MISSING_OR_INVALID_MESSAGE;

  if (!emailExists || !emailValid) {
    return {
      ok: false as const,
      email: null,
      rawEmail,
      emailExists,
      emailValid,
      reason,
      message,
    };
  }

  return {
    ok: true as const,
    email,
    rawEmail,
    emailExists,
    emailValid,
    reason: null,
    message: null,
  };
}

export function validateReminderCustomerEmail(customer: { email?: unknown } | null | undefined) {
  const customerExists = Boolean(customer);
  const validation = validateReminderRecipientEmail(customer?.email, 'customer');

  if (!validation.ok) {
    return {
      ok: false as const,
      email: null,
      rawEmail: validation.rawEmail,
      customerExists,
      customerEmailExists: validation.emailExists,
      customerEmailValid: validation.emailValid,
      reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      message: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
    };
  }

  return {
    ok: true as const,
    email: validation.email,
    rawEmail: validation.rawEmail,
    customerExists,
    customerEmailExists: validation.emailExists,
    customerEmailValid: validation.emailValid,
    reason: null,
    message: null,
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayValue(value: unknown, fallback = 'غير متاح') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function statusLabel(status: ReminderEmailStatus) {
  if (status === 'sent') return 'تم الإرسال';
  if (status === 'skipped') return 'تم التخطي';
  return 'فشل الإرسال';
}

function emailShell(title: string, intro: string, rows: Array<[string, unknown]>, footer: string) {
  return `
    <div dir="rtl" style="${STATIC_EMAIL_VISUAL_STYLES.canvas}">
      <div style="${STATIC_EMAIL_VISUAL_STYLES.panel};max-width:640px;margin:0 auto">
        <p style="${STATIC_EMAIL_VISUAL_STYLES.brand};margin:0 0 8px">THE SFM</p>
        <h1 style="margin:0 0 14px;font-size:24px">${escapeHtml(title)}</h1>
        <p style="margin:0 0 20px;line-height:1.8">${escapeHtml(intro)}</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 18px">
          ${rows.map(([label, value]) => `
            <tr>
              <td style="${STATIC_EMAIL_VISUAL_STYLES.dividerLabel};padding:9px">${escapeHtml(label)}</td>
              <td style="${STATIC_EMAIL_VISUAL_STYLES.dividerValue};padding:9px;font-weight:700;text-align:left;direction:ltr">${escapeHtml(displayValue(value))}</td>
            </tr>
          `).join('')}
        </table>
        <p style="${STATIC_EMAIL_VISUAL_STYLES.supportingText};margin:0;line-height:1.8">${escapeHtml(footer)}</p>
      </div>
    </div>
  `;
}

export function customerReminderEmailTemplate(input: {
  customerName: string;
  amount: string;
  dueDate: string;
  reminderType: string;
  subscriberName: string;
  businessName?: string | null;
}) {
  const senderName = displayValue(input.businessName || input.subscriberName, 'THE SFM');
  const subject = 'تذكير بموعد دفع الاشتراك';
  const text = [
    'تذكير آلي بموعد دفع الاشتراك.',
    `اسم العميل: ${displayValue(input.customerName)}`,
    `مبلغ الاشتراك: ${displayValue(input.amount)}`,
    `تاريخ الاستحقاق: ${displayValue(input.dueDate)}`,
    `نوع التذكير: ${displayValue(input.reminderType)}`,
    `اسم الشركة/المدرب/المشترك: ${senderName}`,
    'ملاحظة: هذا تذكير آلي من نظام THE SFM.',
  ].join('\n');
  const html = emailShell(
    subject,
    'هذا تذكير آلي بموعد دفع الاشتراك.',
    [
      ['اسم العميل', input.customerName],
      ['مبلغ الاشتراك', input.amount],
      ['تاريخ الاستحقاق', input.dueDate],
      ['نوع التذكير', input.reminderType],
      ['اسم الشركة/المدرب/المشترك', senderName],
    ],
    'ملاحظة: هذا تذكير آلي من نظام THE SFM.',
  );
  return { subject, text, html };
}

export function subscriberReminderEmailTemplate(input: {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amount: string;
  dueDate: string;
  reminderType: string;
  customerEmailStatus: ReminderEmailStatus;
  customerFailureReason?: string | null;
}) {
  const subject = 'تنبيه: يوجد اشتراك مستحق لعميل';
  const customerStatus = statusLabel(input.customerEmailStatus);
  const customerFailure = input.customerFailureReason ? displayValue(input.customerFailureReason) : 'لا يوجد';
  const text = [
    'يوجد اشتراك مستحق لعميل في نظام THE SFM.',
    `اسم العميل: ${displayValue(input.customerName)}`,
    `بريد العميل: ${displayValue(input.customerEmail)}`,
    `رقم الهاتف: ${displayValue(input.customerPhone)}`,
    `مبلغ الاشتراك: ${displayValue(input.amount)}`,
    `تاريخ الاستحقاق: ${displayValue(input.dueDate)}`,
    `نوع التذكير: ${displayValue(input.reminderType)}`,
    `حالة إرسال تذكير العميل: ${customerStatus}`,
    `سبب الفشل: ${customerFailure}`,
  ].join('\n');
  const html = emailShell(
    subject,
    'يوجد اشتراك مستحق لعميل. هذه نسخة تنبيه لصاحب الحساب.',
    [
      ['اسم العميل', input.customerName],
      ['بريد العميل', input.customerEmail],
      ['رقم الهاتف', input.customerPhone],
      ['مبلغ الاشتراك', input.amount],
      ['تاريخ الاستحقاق', input.dueDate],
      ['نوع التذكير', input.reminderType],
      ['حالة إرسال تذكير العميل', customerStatus],
      ['سبب الفشل', customerFailure],
    ],
    'تم إرسال هذا التنبيه آلياً من نظام THE SFM.',
  );
  return { subject, text, html };
}
