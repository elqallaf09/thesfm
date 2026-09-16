import { describe, expect, it } from 'vitest';
import { buildFinancialTwinSnapshot } from '@/domain/economic-intelligence/digitalTwin';
import { applyDecisionChange, simulateFinancialDecision } from '@/domain/economic-intelligence/decisionSimulation';

describe('decision simulation', () => {
  const snapshot = buildFinancialTwinSnapshot({
    income: [{ amount: 2000, currency: 'KWD' }],
    expenses: [{ amount: 900, currency: 'KWD' }],
    debts: [{ remaining_amount: 10000, monthly_payment: 250, currency: 'KWD', status: 'active' }],
    savings: [{ current_amount: 8000, currency: 'KWD' }],
    investments: [{ current_value: 5000, currency: 'KWD' }],
  }, 'KWD');

  it('applies only explicit changes to the financial twin', () => {
    const changed = applyDecisionChange(snapshot, {
      kind: 'buy_car',
      upfrontCashOutflow: 3000,
      monthlyDebtPaymentChange: 220,
      debtBalanceChange: 9000,
      monthlyExpenseChange: 40,
    });

    expect(changed.liquidBalance).toBe(snapshot.liquidBalance - 3000);
    expect(changed.monthlyDebtPayments).toBe(snapshot.monthlyDebtPayments + 220);
    expect(changed.debtBalance).toBe(snapshot.debtBalance + 9000);
    expect(changed.monthlyExpenses).toBe(snapshot.monthlyExpenses + 40);
  });

  it('compares baseline and after-decision paths at 3, 6 and 12 months', () => {
    const result = simulateFinancialDecision(snapshot, {
      kind: 'buy_car',
      upfrontCashOutflow: 3000,
      monthlyDebtPaymentChange: 220,
      debtBalanceChange: 9000,
      monthlyExpenseChange: 40,
    });

    expect(result.horizons.month3.base).not.toBeNull();
    expect(result.horizons.month6.base).not.toBeNull();
    expect(result.horizons.month12.base).not.toBeNull();
    expect(result.horizons.month12.base?.liquidBalance).toBeLessThan(0);
    expect(result.scenarios.stress.delta).toHaveLength(12);
    expect(result.scenarios.base.delta).toHaveLength(12);
    expect(result.scenarios.optimistic.delta).toHaveLength(12);
  });

  it('does not invent financing when no financing change is provided', () => {
    const changed = applyDecisionChange(snapshot, {
      kind: 'buy_home',
      upfrontCashOutflow: 2000,
    });

    expect(changed.monthlyDebtPayments).toBe(snapshot.monthlyDebtPayments);
    expect(changed.debtBalance).toBe(snapshot.debtBalance);
  });
});
