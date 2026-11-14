'use client';

import type { PortfolioRiskSnapshot } from '@/lib/portfolio-risk/series';
import { HISTORICAL_RISK_METHODOLOGY } from '@/lib/portfolio-risk/core';
import { RISK_HISTORY_COPY } from './portfolioRiskHistoryCopy';
import styles from './PortfolioRisk.module.css';

type Props = {
  snapshot: PortfolioRiskSnapshot | null;
  loading?: boolean;
  error?: string | null;
  locale?: 'ar' | 'en' | 'fr';
};

/** Presentation checks are not authorization or evidence verification. */
function displayable(snapshot: PortfolioRiskSnapshot) {
  const { metrics, concentration, dataQuality } = snapshot;
  const fraction = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return snapshot.methodologyVersion === HISTORICAL_RISK_METHODOLOGY && dataQuality?.status === 'complete' &&
    metrics && concentration && Number.isSafeInteger(metrics.observations) && metrics.observations >= 60 &&
    dataQuality.observations === metrics.observations && Number.isFinite(metrics.volatilityAnnualized) && metrics.volatilityAnnualized >= 0 &&
    fraction(metrics.historicalVar95) && fraction(metrics.historicalCvar95) && metrics.historicalCvar95 + 1e-12 >= metrics.historicalVar95 &&
    fraction(metrics.maximumDrawdown) && fraction(concentration.hhi) && concentration.hhi > 0 &&
    fraction(concentration.largestWeight) && concentration.largestWeight > 0 && /^[A-Z]{3}$/.test(snapshot.currency) &&
    date(snapshot.periodStart) && date(snapshot.periodEnd) && snapshot.periodStart < snapshot.periodEnd;
}

export function PortfolioRiskPanel({ snapshot, loading = false, error, locale = 'ar' }: Props) {
  const t = RISK_HISTORY_COPY[locale];
  const pct = (value: number) => new Intl.NumberFormat(locale, { style: 'percent', numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  const ready = snapshot !== null && displayable(snapshot);
  return (
    <section dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={t.title} aria-busy={loading} className={styles.panel}>
      <h2>{t.title}</h2>
      {loading ? <p role="status">{t.loading}</p> : !ready ? <p role="status" className={styles.notice}>{error || t.unavailable}</p> : <>
        <dl className={styles.metrics}>
          {[
            [t.volatility, pct(snapshot.metrics.volatilityAnnualized)],
            [t.var, pct(snapshot.metrics.historicalVar95)],
            [t.cvar, pct(snapshot.metrics.historicalCvar95)],
            [t.drawdown, pct(snapshot.metrics.maximumDrawdown)],
            [t.concentration, pct(snapshot.concentration.largestWeight)],
            [t.observations, String(snapshot.metrics.observations)],
          ].map(([label, value]) => <div key={label} className={styles.metric}>
            <dt>{label}</dt><dd><bdi>{value}</bdi></dd>
          </div>)}
        </dl>
        <p className={styles.detail}>{t.window}: <bdi>{snapshot.periodStart} – {snapshot.periodEnd}</bdi> · <bdi>{snapshot.currency}</bdi> · <bdi>{snapshot.methodologyVersion}</bdi></p>
        <p className={styles.notice}>{t.caveat}</p>
      </>}
    </section>
  );
}
