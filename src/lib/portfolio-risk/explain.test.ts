import { describe, expect, it } from 'vitest';
import { explainPortfolioRisk } from './explain';
import type { PortfolioRiskSnapshot } from './series';
describe('grounded risk explanation', () => {
  it('uses verified metrics and includes historical limitations', () => {
    const snapshot: PortfolioRiskSnapshot = {
      methodologyVersion: 'risk-v2', periodStart: '2025-01-01', periodEnd: '2025-05-01', currency: 'KWD',
      metrics: { observations: 80, volatilityAnnualized: 0.2, historicalVar95: 0.03, historicalCvar95: 0.05, maximumDrawdown: 0.12 },
      concentration: { hhi: 0.58, largestWeight: 0.7 },
      dataQuality: { status: 'complete', observations: 80 },
    };
    const result = explainPortfolioRisk(snapshot, 'ar');
    expect(result.observations.join(' ')).toContain('70.0%');
    expect(result.observations.join(' ')).toContain('3.0%');
    expect(result.limitations[0]).toContain('80');
    expect(result.methodologyVersion).toBe('risk-v2');
  });
});
