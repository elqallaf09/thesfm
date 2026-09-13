import { describe, expect, it } from 'vitest';
import { assessFinancialDecision } from '@/domain/economic-intelligence/decisionEngine';
import {
  buildFinancialTwinSnapshot,
  forecastFinancialTwin,
} from '@/domain/economic-intelligence/digitalTwin';

describe('economic intelligence foundation', () => {
  it('builds a financial twin from real finance-domain row shapes', () => {
    const snapshot = buildFinancialTwinSnapshot({
      income: [{ amount: 2000, currency: 'KWD' }],
      expenses: [{ amount: 800, currency: 'KWD' }],
      debts: [{ monthly_payment: 250, remaining_amount: 5000, currency: 'KWD', status: 'active' }],
      savings: [{ current_amount: 3000, currency: 'KWD' }],
      investments: [],
    }, 'KWD', new Date('2026-09-14T00:00:00.000Z'));

    expect(snapshot.monthlyIncome).toBe(2000);
    expect(snapshot.monthlyExpenses).toBe(800);
    expect(snapshot.monthlyDebtPayments).toBe(250);
    expect(snapshot.monthlySurplus).toBe(950);
    expect(snapshot.debtBalance).toBe(5000);
    expect(snapshot.savingsBalance).toBe(3000);
    expect(snapshot.netWorth).toBe(-2000);
    expect(snapshot.debtServiceRatio).toBeCloseTo(0.125);
    expect(snapshot.dataQuality.completeness).toBe(1);
  });

  it('projects stress, base and optimistic scenarios without inventing source records', () => {
    const snapshot = buildFinancialTwinSnapshot({
      income: [{ amount: 1500, currency: 'KWD' }],
      expenses: [{ amount: 700, currency: 'KWD' }],
      debts: [],
      savings: [{ amount: 2000, currency: 'KWD' }],
      investments: [],
    }, 'KWD');

    const forecast = forecastFinancialTwin(snapshot, 12);
    expect(forecast.horizonMonths).toBe(12);
    expect(forecast.scenarios.base.points).toHaveLength(12);
    expect(forecast.scenarios.stress.points[11].liquidBalance)
      .toBeLessThan(forecast.scenarios.base.points[11].liquidBalance);
    expect(forecast.scenarios.optimistic.points[11].liquidBalance)
      .toBeGreaterThan(forecast.scenarios.base.points[11].liquidBalance);
  });

  it('flags decisions that create a monthly deficit', () => {
    const snapshot = buildFinancialTwinSnapshot({
      income: [{ amount: 1000, currency: 'KWD' }],
      expenses: [{ amount: 700, currency: 'KWD' }],
      debts: [],
      savings: [{ amount: 1500, currency: 'KWD' }],
      investments: [],
    }, 'KWD');

    const assessment = assessFinancialDecision(snapshot, {
      kind: 'buy_car',
      upfrontCost: 500,
      monthlyCost: 400,
    });

    expect(assessment.monthlySurplusAfterDecision).toBe(-100);
    expect(assessment.affordability).toBe('weak');
    expect(assessment.warnings).toContain('decision_creates_monthly_deficit');
  });
});
