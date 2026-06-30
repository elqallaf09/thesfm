import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/business/subscriptions/reminders/route';
import {
  CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
  CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
  SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
  validateReminderRecipientEmail,
} from '@/lib/subscriptionReminderEmails';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { sendSmtpMail, validateMailPayload } from '@/lib/server/smtpMail';
import type { ClientRow, SubscriptionRow } from '@/lib/businessSubscriptions';

vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: vi.fn(),
  getUserFromBearerToken: vi.fn(),
}));

vi.mock('@/lib/server/smtpMail', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/smtpMail')>('@/lib/server/smtpMail');
  return {
    ...actual,
    getSmtpMailConfigStatus: vi.fn(() => ({ configured: true, missing: [] })),
    isSmtpMailConfigured: vi.fn(() => true),
    sendSmtpMail: vi.fn(),
  };
});

const userId = 'user-a';
const clientId = '260a317c-4ec8-4e04-b07f-604ea041404b';

type TableName =
  | 'clients'
  | 'subscriptions'
  | 'payments'
  | 'payment_history'
  | 'client_notes'
  | 'client_files'
  | 'activity_logs'
  | 'subscription_notifications'
  | 'notifications'
  | 'subscription_reminder_runs'
  | 'profiles'
  | 'company_listings';

type FakeRows = Record<TableName, Array<Record<string, any>>>;

class FakeQuery {
  private action: 'select' | 'insert' | 'update' = 'select';
  private filters: Array<{ column: string; value: unknown }> = [];
  private inFilters: Array<{ column: string; values: unknown[] }> = [];
  private payload: any;
  private selectColumns = '';
  private singleRow = false;

  constructor(
    private table: TableName,
    private rows: FakeRows,
    private inserts: FakeRows,
    private updates: Record<TableName, Array<Record<string, any>>>,
  ) {}

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.inFilters.push({ column, values });
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }

  private resolve() {
    if (this.action === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      this.inserts[this.table].push(...items);
      if (this.singleRow || this.selectColumns.includes('id')) {
        return { data: { id: `${this.table}-${this.inserts[this.table].length}` }, error: null };
      }
      return { data: null, error: null };
    }

    if (this.action === 'update') {
      this.updates[this.table].push({ payload: this.payload, filters: this.filters });
      return { data: null, error: null };
    }

    const filtered = this.rows[this.table].filter(row =>
      this.filters.every(filter => row[filter.column] === filter.value) &&
      this.inFilters.every(filter => filter.values.includes(row[filter.column]))
    );
    return this.singleRow
      ? { data: filtered[0] ?? null, error: null }
      : { data: filtered, error: null };
  }
}

function createClient(email: string | null): ClientRow {
  return {
    id: clientId,
    user_id: userId,
    full_name: 'Customer A',
    phone: '+96550000000',
    whatsapp: null,
    email,
    address: null,
    notes: null,
    color_tag: null,
    avatar_url: null,
    profile_photo_url: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };
}

function createSubscription(): SubscriptionRow {
  return {
    id: 'subscription-a',
    user_id: userId,
    client_id: clientId,
    amount: 12,
    currency: 'KWD',
    subscription_type: 'monthly',
    custom_interval_days: null,
    start_date: '2026-06-01',
    next_payment_date: '2026-06-26',
    automatic_renewal: true,
    status: 'active',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };
}

function createFakeDb(options: {
  customerEmail?: string | null;
  subscriberEmail?: string | null;
  includeCustomer?: boolean;
  existingNotifications?: Array<Record<string, any>>;
} = {}) {
  const includeCustomer = options.includeCustomer ?? true;
  const rows: FakeRows = {
    clients: includeCustomer ? [createClient(options.customerEmail === undefined ? 'customer@example.com' : options.customerEmail)] : [],
    subscriptions: includeCustomer ? [createSubscription()] : [],
    payments: [],
    payment_history: [],
    client_notes: [],
    client_files: [],
    activity_logs: [],
    subscription_notifications: options.existingNotifications ?? [],
    notifications: [],
    subscription_reminder_runs: [],
    profiles: [{
      id: userId,
      display_name: 'Owner A',
      email: options.subscriberEmail === undefined ? 'owner@example.com' : options.subscriberEmail,
      profession: null,
      profession_other: null,
    }],
    company_listings: [{
      user_id: userId,
      company_name: 'SFM Training',
      status: 'approved',
      created_at: '2026-06-01T00:00:00.000Z',
    }],
  };
  const inserts = Object.fromEntries(
    Object.keys(rows).map(key => [key, []]),
  ) as unknown as FakeRows;
  const updates = Object.fromEntries(
    Object.keys(rows).map(key => [key, []]),
  ) as unknown as Record<TableName, Array<Record<string, any>>>;

  return {
    db: {
      from(table: TableName) {
        return new FakeQuery(table, rows, inserts, updates);
      },
    },
    inserts,
    updates,
  };
}

async function runReminderCheck(options: Parameters<typeof createFakeDb>[0] & {
  date?: string;
  reminderId?: string;
  force?: boolean;
} = {}) {
  const { date = '2026-06-25', reminderId, force, ...dbOptions } = options;
  const fake = createFakeDb(dbOptions);
  vi.mocked(createServerSupabaseAdmin).mockReturnValue(fake.db as any);
  vi.mocked(getUserFromBearerToken).mockResolvedValue({
    id: userId,
    email: dbOptions.subscriberEmail === undefined ? 'owner@example.com' : dbOptions.subscriberEmail,
  } as any);
  vi.mocked(sendSmtpMail).mockImplementation(async input => {
    const to = Array.isArray(input.to) ? input.to : [input.to];
    return {
      accepted: to,
      rejected: [],
      envelope: { from: input.from ?? 'support@the-sfm.com', to },
      response: '250 OK',
      responseCode: 250,
    };
  });

  const params = new URLSearchParams({ date });
  if (reminderId) params.set('reminderId', reminderId);
  if (force) params.set('force', '1');
  const response = await GET(new NextRequest(`https://the-sfm.com/api/business/subscriptions/reminders?${params.toString()}`, {
    headers: { authorization: 'Bearer token' },
  }));

  return { fake, body: await response.json() };
}

beforeEach(() => {
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'support@the-sfm.com';
  process.env.SMTP_PASS = 'test-password';
  process.env.SMTP_FROM = 'THE SFM <support@the-sfm.com>';
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
});

describe('subscription reminder email workflow', () => {
  it('sends reminder emails to both customer and subscriber when both addresses are valid', async () => {
    const { body } = await runReminderCheck({
      customerEmail: 'customer@example.com',
      subscriberEmail: 'owner@example.com',
    });

    expect(sendSmtpMail).toHaveBeenCalledTimes(2);
    expect(sendSmtpMail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: ['customer@example.com'],
      fromName: 'THE SFM Subscription Reminders',
    }));
    expect(sendSmtpMail).toHaveBeenNthCalledWith(2, expect.objectContaining({
      to: ['owner@example.com'],
      fromName: 'THE SFM Subscription Alerts',
    }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', recipientType: 'customer', customerEmailStatus: 'sent' }),
      expect.objectContaining({ channel: 'email', recipientType: 'subscriber', subscriberEmailStatus: 'sent' }),
    ]));
    expect(body.summary).toMatchObject({
      checkedCount: 1,
      eligibleCount: 1,
      sentCount: 2,
      skippedCount: 0,
      failedCount: 0,
    });
  });

  it('skips a missing customer email and still sends the subscriber warning email', async () => {
    const { fake, body } = await runReminderCheck({
      customerEmail: null,
      subscriberEmail: 'owner@example.com',
    });

    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['owner@example.com'] }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        recipientType: 'customer',
        status: 'skipped',
        customerFailureReason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
        error: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
      }),
      expect.objectContaining({ channel: 'email', recipientType: 'subscriber', status: 'sent' }),
    ]));

    const skippedEmail = fake.inserts.subscription_notifications.find(item => item.channel === 'email' && item.status === 'skipped');
    expect(skippedEmail?.metadata).toMatchObject({
      recipient_type: 'customer',
      failure_reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      customer_email_exists: false,
      recipient_email_valid: false,
      smtp_called: false,
    });
  });

  it('sends the customer reminder when the subscriber email is missing', async () => {
    const { body } = await runReminderCheck({
      customerEmail: 'customer@example.com',
      subscriberEmail: null,
    });

    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['customer@example.com'] }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', recipientType: 'customer', status: 'sent' }),
      expect.objectContaining({
        channel: 'email',
        recipientType: 'subscriber',
        status: 'skipped',
        subscriberFailureReason: SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
      }),
    ]));
  });

  it('does not call SMTP for an invalid customer email', async () => {
    const { fake, body } = await runReminderCheck({
      customerEmail: 'not-an-email',
      subscriberEmail: 'owner@example.com',
    });

    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['owner@example.com'] }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        recipientType: 'customer',
        status: 'skipped',
        customerFailureReason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      }),
    ]));

    const skippedEmail = fake.inserts.subscription_notifications.find(item => item.channel === 'email' && item.status === 'skipped');
    expect(skippedEmail?.metadata).toMatchObject({
      recipient_type: 'customer',
      failure_reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      customer_email_exists: true,
      recipient_email_valid: false,
      smtp_called: false,
    });
  });

  it('does not call SMTP for an invalid subscriber email', async () => {
    const { body } = await runReminderCheck({
      customerEmail: 'customer@example.com',
      subscriberEmail: 'owner@bad',
    });

    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['customer@example.com'] }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', recipientType: 'customer', status: 'sent' }),
      expect.objectContaining({
        channel: 'email',
        recipientType: 'subscriber',
        status: 'skipped',
        subscriberFailureReason: SUBSCRIBER_EMAIL_MISSING_OR_INVALID_REASON,
      }),
    ]));
  });

  it('does not call SMTP when there are no customers', async () => {
    const { body } = await runReminderCheck({ includeCustomer: false });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      candidates: 0,
      processed: 0,
    });
  });

  it('skips both reminder emails when this reminder was already sent', async () => {
    const reminderId = 'subscription:subscription-a:reminder_1_day:2026-06-25';
    const existingNotifications = [
      {
        id: 'email-customer',
        user_id: userId,
        client_id: clientId,
        subscription_id: 'subscription-a',
        payment_id: null,
        channel: 'email',
        reminder_type: 'reminder_1_day',
        scheduled_for: '2026-06-25T00:00:00.000Z',
        sent_at: '2026-06-25T00:01:00.000Z',
        status: 'sent',
        dedupe_key: `${reminderId}:email:customer`,
        metadata: { recipient_type: 'customer' },
        created_at: '2026-06-25T00:00:00.000Z',
      },
      {
        id: 'email-subscriber',
        user_id: userId,
        client_id: clientId,
        subscription_id: 'subscription-a',
        payment_id: null,
        channel: 'email',
        reminder_type: 'reminder_1_day',
        scheduled_for: '2026-06-25T00:00:00.000Z',
        sent_at: '2026-06-25T00:02:00.000Z',
        status: 'sent',
        dedupe_key: `${reminderId}:email:subscriber`,
        metadata: { recipient_type: 'subscriber' },
        created_at: '2026-06-25T00:00:00.000Z',
      },
    ];

    const { body } = await runReminderCheck({
      customerEmail: 'customer@example.com',
      subscriberEmail: 'owner@example.com',
      existingNotifications,
    });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body.summary).toMatchObject({
      alreadySentCount: 2,
      skippedCount: 2,
      sentCount: 0,
    });
    expect(body.summary.skipReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ reasonCode: 'REMINDER_ALREADY_SENT', recipient: 'customer' }),
      expect.objectContaining({ reasonCode: 'REMINDER_ALREADY_SENT', recipient: 'subscriber' }),
    ]));
  });

  it('reports a not eligible reason when the due date is outside the reminder window', async () => {
    const { body } = await runReminderCheck({
      customerEmail: 'customer@example.com',
      subscriberEmail: 'owner@example.com',
      date: '2026-06-20',
    });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      candidates: 0,
    });
    expect(body.summary).toMatchObject({
      checkedCount: 1,
      eligibleCount: 0,
      notEligibleCount: 1,
      skippedCount: 1,
    });
    expect(body.summary.skipReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ reasonCode: 'REMINDER_NOT_ELIGIBLE' }),
    ]));
  });

  it('treats a deleted or missing customer email as an app-level validation failure', () => {
    const result = validateReminderRecipientEmail(null, 'customer');

    expect(result).toMatchObject({
      ok: false,
      reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      message: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
      emailExists: false,
      emailValid: false,
    });
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
