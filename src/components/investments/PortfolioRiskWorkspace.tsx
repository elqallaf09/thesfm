'use client';

import Link from 'next/link';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import { PortfolioRiskLive } from './PortfolioRiskLive';
import { RISK_COPY } from './portfolioRiskCopy';
import styles from './PortfolioRisk.module.css';

export function PortfolioRiskEntry() {
  const { lang, dir } = useLanguage();
  const copy = RISK_COPY[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'];
  return <nav dir={dir} className={`sfm-dashboard-page-content ${styles.entry}`} aria-label={copy.title}>
    <Link className={styles.button} href="/investments/risk" prefetch={false}>{copy.title}</Link>
  </nav>;
}

export function PortfolioRiskWorkspace() {
  const { lang, dir } = useLanguage();
  const locale = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  const copy = RISK_COPY[locale];
  return <DashboardPageShell dir={dir} ariaLabel={copy.title}>
    <div className={styles.workspace}>
      <Link className={styles.link} href="/investments" prefetch={false}>{copy.back}</Link>
      <h1>{copy.title}</h1>
      <PortfolioRiskLive locale={locale} />
    </div>
  </DashboardPageShell>;
}
