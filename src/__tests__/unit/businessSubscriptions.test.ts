import { describe, expect, it } from 'vitest';
import {
  buildReminderCandidates,
  calculateDashboardMetrics,
  calculateNextPaymentDate,
  monthlyEquivalent,
  type ClientBundle,
  type ClientRow,
  type PaymentRow,
  type SubscriptionRow,
} from '@/lib/businessSubscriptions';

const client: ClientRow = {
  id: 'client-a',
  user_id: 'user-a',
  full_name: 'Client A',
  phone: '+96550000000',
  whatsapp: null,
  email: null,
  address: null,
  notes: null,
  color_tag: null,
  avatar_url: null,
  profile_photo_url: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

function subscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 'subscription-a',
    user_id: 'user-a',
    client_id: client.id,
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
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'payment-a',
    user_id: 'user-a',
    client_id: client.id,
    subscription_id: 'subscription-a',
    amount_due: 12,
    amount_paid: 0,
    currency: 'KWD',
    due_date: '2026-06-25',
    paid_at: null,
    status: 'pending',
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function bundle(overrides: Partial<ClientBundle> = {}): ClientBundle {
  return {
    client,
    subscription: subscription(),
    payments: [],
    history: [],
    notes: [],
    files: [],
    activity: [],
    notifications: [],
    ...overrides,
  };
}

describe('business subscription management rules', () => {
  it('calculates next due dates by subscription type', () => {
    expect(calculateNextPaymentDate('2026-06-25', 'weekly')).toBe('2026-07-02');
    expect(calculateNextPaymentDate('2026-06-25', 'monthly')).toBe('2026-07-25');
    expect(calculateNextPaymentDate('2026-06-25', 'quarterly')).toBe('2026-09-25');
    expect(calculateNextPaymentDate('2026-06-25', 'semi_annual')).toBe('2026-12-25');
    expect(calculateNextPaymentDate('2026-06-25', 'yearly')).toBe('2027-06-25');
    expect(calculateNextPaymentDate('2026-06-25', 'custom', 10)).toBe('2026-07-05');
  });

  it('normalizes recurring revenue without counting cancelled subscriptions as active revenue', () => {
    const active = bundle({
      subscription: subscription({ id: 'active-subscription', amount: 12, status: 'active', subscription_type: 'monthly' }),
      payments: [
        payment({ id: 'due-today', amount_due: 12, due_date: '2026-06-25', status: 'pending' }),
        payment({ id: 'paid-this-month', amount_due: 12, amount_paid: 12, due_date: '2026-06-10', paid_at: '2026-06-10T10:00:00.000Z', status: 'paid' }),
        payment({ id: 'partial-overdue', amount_due: 5, amount_paid: 2, due_date: '2026-06-20', status: 'partial' }),
      ],
    });
    const cancelled = bundle({
      client: { ...client, id: 'client-cancelled' },
      subscription: subscription({ id: 'cancelled-subscription', client_id: 'client-cancelled', amount: 120, status: 'cancelled', subscription_type: 'yearly' }),
      payments: [],
    });

    const metrics = calculateDashboardMetrics([active, cancelled], '2026-06-25');

    expect(metrics.totalClients).toBe(2);
    expect(metrics.activeSubscriptions).toBe(1);
    expect(metrics.monthlyRevenue).toBe(12);
    expect(metrics.dueToday).toBe(1);
    expect(metrics.overduePayments).toBe(1);
    expect(metrics.collectedRevenue).toBe(12);
    expect(metrics.outstandingRevenue).toBe(15);
  });

  it('keeps monthly equivalent calculations explicit for supported billing cycles', () => {
    expect(monthlyEquivalent(subscription({ amount: 52, subscription_type: 'weekly' }))).toBeCloseTo(225.3333, 4);
    expect(monthlyEquivalent(subscription({ amount: 90, subscription_type: 'quarterly' }))).toBe(30);
    expect(monthlyEquivalent(subscription({ amount: 600, subscription_type: 'semi_annual' }))).toBe(100);
    expect(monthlyEquivalent(subscription({ amount: 1200, subscription_type: 'yearly' }))).toBe(100);
  });

  it('generates due and overdue reminder candidates without inventing paid reminders', () => {
    const candidates = buildReminderCandidates([
      bundle({
        payments: [
          payment({ id: 'tomorrow', due_date: '2026-06-26', status: 'pending' }),
          payment({ id: 'overdue-six-days', due_date: '2026-06-19', status: 'pending' }),
          payment({ id: 'paid', due_date: '2026-06-25', status: 'paid', amount_paid: 12, paid_at: '2026-06-25T10:00:00.000Z' }),
        ],
      }),
    ], '2026-06-25');

    expect(candidates.map(candidate => candidate.reminderType)).toEqual(['reminder_1_day', 'reminder_overdue_3_days']);
    expect(candidates.map(candidate => candidate.dedupeKey)).toEqual([
      'tomorrow:reminder_1_day:2026-06-25',
      'overdue-six-days:reminder_overdue_3_days:2026-06-25',
    ]);
  });

  it('uses subscription next payment date when an open payment row is missing', () => {
    const candidates = buildReminderCandidates([
      bundle({
        subscription: subscription({
          id: 'subscription-next-date',
          next_payment_date: '2026-06-26',
        }),
        payments: [],
      }),
    ], '2026-06-25');

    expect(candidates).toHaveLength(1);
    expect(candidates[0].payment).toBeNull();
    expect(candidates[0].dueDate).toBe('2026-06-26');
    expect(candidates[0].reminderType).toBe('reminder_1_day');
    expect(candidates[0].dedupeKey).toBe('subscription:subscription-next-date:reminder_1_day:2026-06-25');
  });

  it('does not create a subscription fallback reminder when that due date was already paid', () => {
    const candidates = buildReminderCandidates([
      bundle({
        subscription: subscription({
          id: 'subscription-paid-date',
          next_payment_date: '2026-06-26',
        }),
        payments: [
          payment({
            id: 'paid-next-date',
            subscription_id: 'subscription-paid-date',
            due_date: '2026-06-26',
            status: 'paid',
            amount_paid: 12,
            paid_at: '2026-06-25T10:00:00.000Z',
          }),
        ],
      }),
    ], '2026-06-25');

    expect(candidates).toEqual([]);
  });
});
