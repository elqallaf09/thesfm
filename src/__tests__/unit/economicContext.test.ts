import { describe, expect, it } from 'vitest';
import { buildEconomicContextFromIndicators } from '@/domain/economic-intelligence/economicContext';

describe('economic context engine', () => {
  it('derives directional macro signals without inventing missing values', () => {
    const context = buildEconomicContextFromIndicators('United States', [
      { id: 'inflation', value: 3.2, previous: 3.0, unit: '%', date: '2026-09-01', source: 'CPI', provider: 'fred' },
      { id: 'policyRate', value: 4.5, previous: 4.75, unit: '%', date: '2026-09-01', source: 'Fed Funds', provider: 'fred' },
      { id: 'gdp', value: 2.1, previous: 1.8, unit: '%', date: '2026-08-01', source: 'GDP', provider: 'fred' },
      { id: 'unemployment', value: 4.0, previous: 4.1, unit: '%', date: '2026-09-01', source: 'Unemployment', provider: 'fred' },
    ]);

    expect(context.status).toBe('partial');
    expect(context.signals.inflation).toBe('rising');
    expect(context.signals.policyRate).toBe('falling');
    expect(context.signals.policyRegime).toBe('easing');
    expect(context.signals.growth).toBe('rising');
    expect(context.signals.labor).toBe('improving');
    expect(context.missing).toContain('yieldCurve');
    expect(context.freshestDataAt).toBe('2026-09-01');
  });

  it('returns unknown directions when previous readings are unavailable', () => {
    const context = buildEconomicContextFromIndicators('Kuwait', [
      { id: 'inflation', value: 2.5, previous: null, unit: '%', date: '2026-08-01', source: 'Inflation', provider: 'tradingeconomics' },
    ]);

    expect(context.signals.inflation).toBe('unknown');
    expect(context.signals.policyRegime).toBe('unknown');
    expect(context.status).toBe('partial');
  });

  it('returns an empty context when providers yield no usable indicators', () => {
    const context = buildEconomicContextFromIndicators('Kuwait', []);
    expect(context.status).toBe('empty');
    expect(context.freshestDataAt).toBeNull();
    expect(context.missing).toHaveLength(5);
  });
});
