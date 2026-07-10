'use client';

import { CompanyLogo } from '@/components/asset/CompanyLogo';
import styles from './ShariaResearchPage.module.css';

export function ComplianceCompanyMark({
  symbol,
  name,
  logoUrl,
  exchange,
  size = 'md',
}: {
  symbol: string;
  name: string;
  logoUrl?: string | null;
  exchange?: string | null;
  size?: 'md' | 'lg';
}) {
  if (logoUrl) {
    return <CompanyLogo symbol={symbol} name={name} logoUrl={logoUrl} exchange={exchange ?? undefined} size={size} />;
  }
  return <span className={`${styles.symbolLogo} ${size === 'lg' ? styles.symbolLogoLarge : ''}`} aria-hidden="true" dir="ltr">{symbol.slice(0, 5)}</span>;
}
