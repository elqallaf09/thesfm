import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioRiskPanel } from '@/components/investments/PortfolioRiskPanel';
import type { PortfolioRiskSnapshot } from '@/lib/portfolio-risk/series';

const snapshot: PortfolioRiskSnapshot = {
  methodologyVersion: 'risk-v2', periodStart: '2025-01-01', periodEnd: '2025-05-01', currency: 'KWD',
  metrics: { observations: 80, volatilityAnnualized: 0.2, historicalVar95: 0.03, historicalCvar95: 0.05, maximumDrawdown: 0.12 },
  concentration: { hhi: 0.58, largestWeight: 0.7 }, dataQuality: { status: 'complete', observations: 80 },
};

describe('historical risk presentation', () => {
  it.each(['ar', 'en', 'fr'] as const)('renders %s using Latin digits and historical limitations', locale => {
    const html = renderToStaticMarkup(<PortfolioRiskPanel snapshot={snapshot} locale={locale} />);
    expect(html).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
    expect(html).toContain('<dl');
    expect(html).toContain('risk-v2');
    expect(html).toContain('2025-01-01');
    expect(html).not.toMatch(/[٠-٩۰-۹]/);
    expect(html).toContain('VaR');
  });
  it('does not display metrics while loading or when no history is available', () => {
    expect(renderToStaticMarkup(<PortfolioRiskPanel snapshot={snapshot} loading />)).not.toContain('<dl');
    expect(renderToStaticMarkup(<PortfolioRiskPanel snapshot={null} />)).not.toContain('<dl');
  });
  it.each([NaN, Infinity, -0.1])('rejects invalid volatility %s', value => {
    const html = renderToStaticMarkup(<PortfolioRiskPanel snapshot={{ ...snapshot, metrics: { ...snapshot.metrics, volatilityAnnualized: value } }} />);
    expect(html).not.toContain('<dl');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
  it('rejects inconsistent tail losses and observation counts', () => {
    const inconsistent = { ...snapshot, metrics: { ...snapshot.metrics, historicalCvar95: 0.01 } };
    expect(renderToStaticMarkup(<PortfolioRiskPanel snapshot={inconsistent} />)).not.toContain('<dl');
    expect(renderToStaticMarkup(<PortfolioRiskPanel snapshot={{ ...snapshot, dataQuality: { status: 'complete', observations: 12 } }} />)).not.toContain('<dl');
  });
});
