import { describe, expect, it } from 'vitest';

import { buildMobileFinanceSummary } from '@/lib/mobile/financeSummary';

describe('mobile finance summary', () => {
  it('uses the same current-month and tracked-position rules as the finance dashboard', () => {
    const summary = buildMobileFinanceSummary({
      profile: { default_currency: 'KWD' },
      income: [{ amount: 1_000, currency: 'KWD', received_date: '2026-10-03', status: 'paid' }],
      expenses: [{ amount: 350, currency: 'KWD', expense_date: '2026-10-04', status: 'paid' }],
      savings: [{ current_amount: 500, currency: 'KWD' }],
      investments: [],
      debts: [{ remaining_amount: 100, currency: 'KWD', status: 'active' }],
      now: new Date('2026-10-06T12:00:00.000Z'),
    });

    expect(summary).toMatchObject({
      currency: 'KWD',
      monthlyIncome: 1_000,
      monthlyExpenses: 350,
      monthlyNet: 650,
      trackedPosition: 400,
      activeDebtCount: 1,
    });
  });

  it('does not invent a total when a required monetary value is incomplete', () => {
    const summary = buildMobileFinanceSummary({
      profile: { default_currency: 'KWD' },
      income: [],
      expenses: [],
      savings: [{ current_amount: 'not-a-number', currency: 'KWD' }],
      investments: [],
      debts: [],
      now: new Date('2026-10-06T12:00:00.000Z'),
    });

    expect(summary.trackedPosition).toBeNull();
    expect(summary.monthlyIncome).toBeNull();
    expect(summary.monthlyExpenses).toBeNull();
  });
});
