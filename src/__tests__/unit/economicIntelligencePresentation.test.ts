import { describe, expect, it } from 'vitest';
import { buildEconomicDecisionContext } from '@/lib/decisions/economicIntelligenceBridge';
import {
  ECONOMIC_ANALYSIS_VERSION,
  presentEconomicDecision,
  versionedEconomicAnalysis,
} from '@/lib/decisions/economicIntelligencePresentation';

const source = {
  income: [{ amount: 2000, currency: 'KWD' }],
  expenses: [{ amount: 900, currency: 'KWD' }],
  debts: [{ remaining_amount: 8000, monthly_payment: 250, currency: 'KWD', status: 'active' }],
  savings: [{ current_amount: 6000, currency: 'KWD' }],
  investments: [{ current_value: 4000, currency: 'KWD' }],
};

describe('economic intelligence presentation', () => {
  it('returns localized reasons and 12 month scenarios', () => {
    const context = buildEconomicDecisionContext(
      { decisionType: 'purchase', amount: 1000, recurringCost: 100 },
      source,
      'KWD',
    );
    expect(context).not.toBeNull();
    const presentation = presentEconomicDecision(context!, 'purchase', 'ar');
    expect(presentation.analysisVersion).toBe(ECONOMIC_ANALYSIS_VERSION);
    expect(presentation.confidencePercent).toBe(100);
    expect(presentation.scenarios).toHaveLength(3);
    expect(presentation.scenarios.every((scenario) => scenario.month12)).toBe(true);
    expect(presentation.reasons.every((reason) => !reason.label.includes('_'))).toBe(true);
  });

  it('localizes missing financial sources and lowers confidence', () => {
    const context = buildEconomicDecisionContext(
      { decisionType: 'purchase', amount: 100 },
      { income: source.income, expenses: source.expenses },
      'KWD',
    );
    expect(context).not.toBeNull();
    const presentation = presentEconomicDecision(context!, 'purchase', 'en');
    expect(presentation.confidencePercent).toBe(40);
    expect(presentation.missingData.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Debt data', 'Savings data', 'Investment data']),
    );
  });

  it('creates a versioned immutable-shaped analysis payload', () => {
    const context = buildEconomicDecisionContext(
      { decisionType: 'project', amount: 3000, expectedMonthlyCost: 200 },
      source,
      'KWD',
    );
    expect(context).not.toBeNull();
    const payload = versionedEconomicAnalysis(context!, 'project');
    expect(payload.version).toBe('7.1.0');
    expect(payload.snapshot.currency).toBe('KWD');
    expect(payload.forecast.horizonMonths).toBe(12);
    expect(payload.assessment.kind).toBe('start_business');
  });
});
