import { describe, expect, it } from 'vitest';
import {
  activeDebtRows,
  classifyDashboardError,
  debtBreakdown,
  groupCurrencyAmounts,
  investmentBreakdown,
  primaryInvestmentTotal,
  summarizeGoal,
} from '@/lib/dashboard/executiveOverview';

describe('dashboard executive overview data integrity', () => {
  it('keeps incompatible currencies in separate totals', () => {
    expect(groupCurrencyAmounts([
      { amount: 10, currency: 'KWD' },
      { amount: 20, currency: 'KWD' },
      { amount: 100, currency: 'USD' },
    ])).toEqual([
      { currency: 'KWD', amount: 30, records: 2 },
      { currency: 'USD', amount: 100, records: 1 },
    ]);
  });

  it('uses verified converted investment values but never guesses an FX conversion', () => {
    const investments = [
      { amount: 100, currency: 'KWD', current_market_value: 110 },
      { native_market_value: 1000, native_currency: 'USD', user_currency: 'KWD', converted_market_value: 305, fx_rate_to_user_currency: 0.305 },
      { native_market_value: 500, native_currency: 'EUR', user_currency: 'KWD', converted_market_value: 170 },
    ];
    expect(primaryInvestmentTotal(investments, 'KWD')).toBe(415);
    expect(investmentBreakdown(investments, 'KWD')).toEqual([
      { currency: 'EUR', amount: 500, records: 1 },
      { currency: 'KWD', amount: 415, records: 2 },
    ]);
  });

  it('distinguishes a canonical goal at real zero from a missing current amount', () => {
    const zero = summarizeGoal({ id: 'one', goal: 'Reserve', amount: 1000, current_amount: 0, created_at: '2026-01-01', duration: '12', duration_unit: 'months' }, 'KWD', new Date('2026-02-01'));
    const missing = summarizeGoal({ id: 'two', goal: 'Home', amount: 5000, current_amount: null }, 'KWD', new Date('2026-02-01'));
    expect(zero).toMatchObject({ title: 'Reserve', currentAmount: 0, targetAmount: 1000, progressRatio: 0, currency: 'KWD' });
    expect(missing).toMatchObject({ title: 'Home', currentAmount: null, targetAmount: 5000, progressRatio: null, status: 'insufficient' });
  });

  it('does not invent a currency when neither the goal nor profile configures one', () => {
    const goal = summarizeGoal({ id: 'three', goal: 'Future plan', amount: 500, current_amount: 25 }, null);
    expect(goal).toMatchObject({ title: 'Future plan', currency: null, currentAmount: 25, targetAmount: 500 });
  });

  it('excludes closed debts and classifies user-safe source states', () => {
    const rows = [
      { remaining_amount: 500, currency: 'KWD', status: 'active' },
      { remaining_amount: 250, currency: 'KWD', status: 'paid' },
    ];
    expect(activeDebtRows(rows)).toHaveLength(1);
    expect(debtBreakdown(rows)).toEqual([{ currency: 'KWD', amount: 500, records: 1 }]);
    expect(classifyDashboardError({ code: '42501', message: 'permission denied' })).toBe('permission');
    expect(classifyDashboardError(new TypeError('Failed to fetch'))).toBe('network');
    expect(classifyDashboardError({ code: 'XX000', message: 'internal' })).toBe('unavailable');
  });
});
