import { describe, expect, it } from 'vitest';
import {
  assessPersonalEconomicImpact,
  buildEconomicContextFromIndicators,
  buildFinancialTwinSnapshot,
} from '@/domain/economic-intelligence';

describe('personal economic impact', () => {
  it('raises budget and debt attention when macro pressure meets a constrained twin', () => {
    const twin = buildFinancialTwinSnapshot({
      income: [{ amount: 1000, currency: 'KWD' }],
      expenses: [{ amount: 780, currency: 'KWD' }],
      debts: [{ remaining_amount: 9000, monthly_payment: 180, currency: 'KWD', status: 'active' }],
      savings: [{ current_amount: 1000, currency: 'KWD' }],
      investments: [{ current_value: 2500, currency: 'KWD' }],
    }, 'KWD');
    const context = buildEconomicContextFromIndicators('Kuwait', [
      { id: 'inflation', value: 3.1, previous: 2.8, unit: '%', date: '2026-08-01', source: 'Inflation', provider: 'tradingeconomics' },
      { id: 'policyRate', value: 4.5, previous: 4.25, unit: '%', date: '2026-09-01', source: 'Policy Rate', provider: 'tradingeconomics' },
      { id: 'gdp', value: 1.2, previous: 1.4, unit: '%', date: '2026-06-01', source: 'GDP', provider: 'tradingeconomics' },
      { id: 'unemployment', value: 2.2, previous: 2.1, unit: '%', date: '2026-06-01', source: 'Unemployment', provider: 'tradingeconomics' },
      { id: 'yieldCurve', value: 0.2, previous: 0.3, unit: '%', date: '2026-09-01', source: 'Yield Curve', provider: 'tradingeconomics' },
    ]);

    const impacts = assessPersonalEconomicImpact(twin, context);
    expect(impacts.map((item) => item.code)).toEqual(expect.arrayContaining([
      'inflation_budget_attention',
      'tightening_debt_attention',
      'weakening_growth_investment_attention',
      'weakening_labor_income_resilience',
    ]));
    expect(impacts.find((item) => item.code === 'inflation_budget_attention')?.severity).toBe('high');
  });

  it('marks macro context as incomplete instead of fabricating missing indicators', () => {
    const twin = buildFinancialTwinSnapshot({
      income: [{ amount: 1200, currency: 'KWD' }],
      expenses: [{ amount: 500, currency: 'KWD' }],
      debts: [], savings: [], investments: [],
    }, 'KWD');
    const context = buildEconomicContextFromIndicators('Kuwait', []);
    const impacts = assessPersonalEconomicImpact(twin, context);
    const incomplete = impacts.find((item) => item.code === 'macro_context_incomplete');
    expect(incomplete).toBeTruthy();
    expect(incomplete?.evidence).toContain('missing:inflation');
  });
});
