import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/business/subscriptions/reminders/route';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { sendSmtpMail } from '@/lib/server/smtpMail';
import {
  CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
  CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
} from '@/lib/subscriptionReminderEmails';
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
  clientEmail?: string | null;
  includeCustomer?: boolean;
} = {}) {
  const includeCustomer = options.includeCustomer ?? true;
  const clientEmail = options.clientEmail === undefined ? 'customer@example.com' : options.clientEmail;
  const rows: FakeRows = {
    clients: includeCustomer ? [createClient(clientEmail)] : [],
    subscriptions: [createSubscription()],
    payments: [],
    payment_history: [],
    client_notes: [],
    client_files: [],
    activity_logs: [],
    subscription_notifications: [],
    notifications: [],
    subscription_reminder_runs: [],
    profiles: [],
    company_listings: [],
  };
  const inserts = Object.fromEntries(Object.keys(rows).map(key => [key, []])) as unknown as FakeRows;
  const updates = Object.fromEntries(Object.keys(rows).map(key => [key, []])) as unknown as Record<TableName, Array<Record<string, any>>>;

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

async function runReminderCheck(options: Parameters<typeof createFakeDb>[0] = {}) {
  const fake = createFakeDb(options);
  const clientEmail = options.clientEmail === undefined ? 'customer@example.com' : options.clientEmail;
  vi.mocked(createServerSupabaseAdmin).mockReturnValue(fake.db as any);
  vi.mocked(getUserFromBearerToken).mockResolvedValue({ id: userId, email: null } as any);
  vi.mocked(sendSmtpMail).mockResolvedValue({
    accepted: clientEmail ? [clientEmail] : [],
    rejected: [],
    envelope: { from: 'support@the-sfm.com', to: clientEmail ? [clientEmail] : [] },
    response: '250 OK',
    responseCode: 250,
  });

  const response = await GET(new NextRequest('https://the-sfm.com/api/business/subscriptions/reminders?date=2026-06-25', {
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

describe('subscription reminder route email workflow', () => {
  it('sends a customer reminder when the customer email is valid', async () => {
    const { body } = await runReminderCheck({ clientEmail: 'customer@example.com' });

    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['customer@example.com'],
      fromName: 'THE SFM Subscription Reminders',
    }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', recipientType: 'customer', status: 'sent' }),
    ]));
  });

  it('does not call SMTP when the customer email is missing', async () => {
    const { fake, body } = await runReminderCheck({ clientEmail: null });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        recipientType: 'customer',
        status: 'skipped',
        error: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
      }),
    ]));

    const failedEmail = fake.inserts.subscription_notifications.find(item =>
      item.channel === 'email' &&
      item.status === 'skipped' &&
      item.metadata?.recipient_type === 'customer'
    );
    expect(failedEmail?.metadata).toMatchObject({
      failure_reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      validation_status: 'missing_or_invalid_customer_email',
      customer_exists: true,
      customer_email_exists: false,
      recipient_email_valid: false,
      smtp_called: false,
    });
  });

  it('does not call SMTP when the customer email is invalid', async () => {
    const { fake, body } = await runReminderCheck({ clientEmail: 'not-an-email' });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        recipientType: 'customer',
        status: 'skipped',
        error: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
      }),
    ]));

    const failedEmail = fake.inserts.subscription_notifications.find(item =>
      item.channel === 'email' &&
      item.status === 'skipped' &&
      item.metadata?.recipient_type === 'customer'
    );
    expect(failedEmail?.metadata).toMatchObject({
      failure_reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      validation_status: 'missing_or_invalid_customer_email',
      customer_exists: true,
      customer_email_exists: true,
      recipient_email_valid: false,
      smtp_called: false,
    });
  });

  it('does not call SMTP when the linked customer row is missing', async () => {
    const { fake, body } = await runReminderCheck({ includeCustomer: false });

    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        recipientType: 'customer',
        status: 'skipped',
        error: CUSTOMER_EMAIL_MISSING_OR_INVALID_MESSAGE,
      }),
    ]));

    const failedEmail = fake.inserts.subscription_notifications.find(item =>
      item.channel === 'email' &&
      item.status === 'skipped' &&
      item.metadata?.recipient_type === 'customer'
    );
    expect(failedEmail?.client_id).toBe(clientId);
    expect(failedEmail?.metadata).toMatchObject({
      customer_id: clientId,
      customer_name: `Missing customer ${clientId}`,
      customer_exists: false,
      failure_reason: CUSTOMER_EMAIL_MISSING_OR_INVALID_REASON,
      validation_status: 'missing_or_invalid_customer_email',
      customer_email_exists: false,
      recipient_email_valid: false,
      smtp_called: false,
    });
  });
});
