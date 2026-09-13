import { describe, expect, it } from 'vitest';
import { buildFinancialTwinSnapshot, forecastFinancialTwin } from '@/domain/economic-intelligence';
import {
  economicDashboardWarningCodes,
  economicForecastEnd,
  economicGoalCounts,
} from '@/lib/dashboard/economicIntelligenceSummary';

describe('finance dashboard economic intelligence', () => {
  it('flags deficit, thin liquidity, high debt service, and behind goals', () => {
    const snapshot = buildFinancialTwinSnapshot({
      income: [{ amount: 1000, currency: 'KWD' }],
      expenses: [{ amount: 850, currency: 'KWD' }],
      debts: [{ remaining_amount: 5000, monthly_payment: 400, currency: 'KWD', status: 'active' }],
      savings: [{ current_amount: 500, currency: 'KWD' }],
      investments: [{ current_value: 0, currency: 'KWD' }],
    }, 'KWD');

    expect(economicDashboardWarningCodes(snapshot, ['behind'])).toEqual(expect.arrayContaining([
      'monthly_deficit',
      'liquidity_runway_below_three_months',
      'debt_service_above_35_percent',
      'goal_behind',
    ]));
  });

  it('tracks goal trajectory counts', () => {
    expect(economicGoalCounts(['on_track', 'behind', 'completed', 'on_track', 'insufficient'])).toEqual({
      onTrack: 2,
      behind: 1,
      completed: 1,
      insufficient: 1,
    });
  });

  it('returns the month-12 endpoint for all three scenarios', () => {
    const snapshot = buildFinancialTwinSnapshot({
      income: [{ amount: 2000, currency: 'KWD' }],
      expenses: [{ amount: 900, currency: 'KWD' }],
      debts: [{ remaining_amount: 3000, monthly_payment: 150, currency: 'KWD', status: 'active' }],
      savings: [{ current_amount: 8000, currency: 'KWD' }],
      investments: [{ current_value: 5000, currency: 'KWD' }],
    }, 'KWD');
    const ends = economicForecastEnd(forecastFinancialTwin(snapshot, 12));
    expect(ends.map((item) => item.id)).toEqual(['stress', 'base', 'optimistic']);
    expect(ends.every((item) => Number.isFinite(item.netWorth))).toBe(true);
  });
});
