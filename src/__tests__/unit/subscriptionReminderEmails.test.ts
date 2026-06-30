import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
  CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
  SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
  customerReminderEmailTemplate,
  maskReminderEmail,
  subscriberReminderEmailTemplate,
  validateReminderRecipientEmail,
} from '@/lib/subscriptionReminderEmails';
import { validateMailPayload } from '@/lib/server/smtpMail';

const REQUIRED_CUSTOMER_EMAIL_REASON = 'CUSTOMER_EMAIL_MISSING_OR_INVALID';
const REQUIRED_CUSTOMER_EMAIL_MESSAGE = 'لا يمكن إرسال تذكير للعميل لأن البريد الإلكتروني غير موجود أو غير صالح.';

beforeEach(() => {
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'support@the-sfm.com';
  process.env.SMTP_PASS = 'test-password';
  process.env.SMTP_FROM = 'THE SFM <support@the-sfm.com>';
});

afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
});

describe('subscription reminder email helpers', () => {
  it('uses the required customer email validation contract', () => {
    expect(CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON).toBe(REQUIRED_CUSTOMER_EMAIL_REASON);
    expect(CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE).toBe(REQUIRED_CUSTOMER_EMAIL_MESSAGE);
  });

  it('validates customer and subscriber recipient emails before SMTP is called', () => {
    expect(validateReminderRecipientEmail('client@example.com', 'customer')).toMatchObject({
      ok: true,
      email: 'client@example.com',
      emailExists: true,
      emailValid: true,
    });
    expect(validateReminderRecipientEmail('owner@example.com', 'subscriber')).toMatchObject({
      ok: true,
      email: 'owner@example.com',
      emailExists: true,
      emailValid: true,
    });
  });

  it('returns the customer app-level validation message when the customer email is missing or invalid', () => {
    expect(validateReminderRecipientEmail('', 'customer')).toMatchObject({
      ok: false,
      reason: REQUIRED_CUSTOMER_EMAIL_REASON,
      message: REQUIRED_CUSTOMER_EMAIL_MESSAGE,
      emailExists: false,
      emailValid: false,
    });
    expect(validateReminderRecipientEmail('not-an-email', 'customer')).toMatchObject({
      ok: false,
      reason: REQUIRED_CUSTOMER_EMAIL_REASON,
      emailExists: true,
      emailValid: false,
    });
  });

  it('returns a separate subscriber validation reason when the subscriber email is missing or invalid', () => {
    expect(validateReminderRecipientEmail(null, 'subscriber')).toMatchObject({
      ok: false,
      reason: SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
      emailExists: false,
      emailValid: false,
    });
    expect(validateReminderRecipientEmail('owner@bad', 'subscriber')).toMatchObject({
      ok: false,
      reason: SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
      emailExists: true,
      emailValid: false,
    });
  });

  it('builds a customer-facing Arabic reminder template', () => {
    const template = customerReminderEmailTemplate({
      customerName: 'Ali Customer',
      amount: '25.000 KWD',
      dueDate: '2026-07-01',
      reminderType: 'reminder_1_day',
      subscriberName: 'Coach Sara',
      businessName: 'SFM Training',
    });

    expect(template.subject).toBe('تذكير بموعد دفع الاشتراك');
    expect(template.text).toContain('Ali Customer');
    expect(template.text).toContain('25.000 KWD');
    expect(template.text).toContain('SFM Training');
    expect(template.text).toContain('هذا تذكير آلي');
  });

  it('builds a subscriber notification template with customer send status and failure reason', () => {
    const template = subscriberReminderEmailTemplate({
      customerName: 'Ali Customer',
      customerEmail: 'missing',
      customerPhone: '+96550000000',
      amount: '25.000 KWD',
      dueDate: '2026-07-01',
      reminderType: 'reminder_1_day',
      customerEmailStatus: 'skipped',
      customerFailureReason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
    });

    expect(template.subject).toBe('تنبيه: يوجد اشتراك مستحق لعميل');
    expect(template.text).toContain('Ali Customer');
    expect(template.text).toContain('تم التخطي');
    expect(template.text).toContain(CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON);
  });

  it('masks reminder emails for logs and status cards', () => {
    expect(maskReminderEmail('client@example.com')).toBe('cl***@example.com');
    expect(maskReminderEmail('bad-address')).toBe('[redacted]');
  });

  it('keeps the company submission email payload valid', () => {
    const payload = validateMailPayload({
      to: 'support@the-sfm.com',
      subject: 'Company listing review request',
      text: 'A company listing is ready for review.',
      html: '<p>A company listing is ready for review.</p>',
      replyTo: 'submitter@example.com',
      fromName: 'THE SFM Companies',
    });

    expect(payload.ok).toBe(true);
    expect(payload.payload).toMatchObject({
      to: ['support@the-sfm.com'],
      from: 'support@the-sfm.com',
      replyTo: 'submitter@example.com',
    });
  });
});
