'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { RealEstateLandAnalyst } from '@/components/invest/RealEstateLandAnalyst';
import '@/components/invest/RealEstateLandAnalyst.css';
import { useLanguage } from '@/hooks/useLanguage';

export default function RealEstateLandAnalystPage() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  return <div dir={dir} className="invest-shell">
    <DashboardPageShell ariaLabel={L('محلل الأراضي والعقار','Land & Real Estate Analyst','Analyste immobilier et foncier')} className="invest-main" contentClassName="invest-content">
      <header className="invest-topbar">
        <div>
          <span>{L('ذكاء الاستثمارات','Investment Intelligence','Intelligence d’investissement')}</span>
          <h1>{L('محلل الأراضي والعقار','Land & Real Estate Analyst','Analyste immobilier et foncier')}</h1>
        </div>
        <button type="button" className="invest-secondary-btn" onClick={() => router.push('/invest')}>
          <ArrowLeft size={16}/>{L('مركز الاستثمارات','Investments Center','Centre d’investissements')}
        </button>
      </header>
      <RealEstateLandAnalyst />
    </DashboardPageShell>
  </div>;
}
