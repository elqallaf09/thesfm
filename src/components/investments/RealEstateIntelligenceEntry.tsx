import React from 'react';
import Link from 'next/link';
import { LandPlot } from 'lucide-react';
import { REAL_ESTATE_ANALYST_PATH } from '@/lib/investments/realEstateHandoff';
import styles from './InvestmentCenter.module.css';

export const REAL_ESTATE_ENTRY_COPY = {
  ar: {
    title: 'محلل الأراضي والعقار',
    description: 'افتح عقارك المسجل أو أدخل بيانات أرض للمراجعة. يعرض المحلل المصادر والأدلة قبل أي نطاق تقديري؛ إدخال أصل لا يعني توافر تقييم آلي لدولته.',
    action: 'فتح محلل الأراضي والعقار',
    coverage: 'ربط المصادر الفعلية قيد الإعداد؛ لا تُعرض أسعار افتراضية.',
  },
  en: {
    title: 'Land & Real Estate Analyst',
    description: 'Open a saved property or enter land details for review. Sources and evidence come before any estimated range; asset entry does not imply automatic valuation coverage.',
    action: 'Open Land & Real Estate Analyst',
    coverage: 'Live source connections are being prepared. No placeholder prices are shown.',
  },
  fr: {
    title: 'Analyste immobilier et foncier',
    description: 'Ouvrez un bien enregistré ou saisissez les détails d’un terrain. Les sources et les preuves précèdent toute estimation ; la saisie ne garantit pas une couverture de valorisation automatique.',
    action: 'Ouvrir l’analyste immobilier et foncier',
    coverage: 'Les connexions aux sources réelles sont en préparation. Aucun prix fictif n’est affiché.',
  },
} as const;

/** Lightweight entry only: no analyst engine, provider requests, or portfolio refetch. */
export function RealEstateIntelligenceEntry({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
  const copy = REAL_ESTATE_ENTRY_COPY[lang];
  return (
    <section className={styles.infoCard} aria-labelledby="investment-property-intelligence-title" data-testid="real-estate-intelligence-entry">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="investment-property-intelligence-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
      </div>
      <Link href={REAL_ESTATE_ANALYST_PATH} className={styles.primaryAction} prefetch={false}>
        <LandPlot size={18} aria-hidden="true" />
        {copy.action}
      </Link>
      <p>{copy.coverage}</p>
    </section>
  );
}
