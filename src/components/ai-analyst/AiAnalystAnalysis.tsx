'use client';

import { BarChart3 } from 'lucide-react';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import type { InvestmentAnalysisContext } from '@/lib/investments/center';
import { useLanguage } from '@/hooks/useLanguage';
import { aiAnalystLocale } from './copy';
import { AiAnalystResearchRunner } from './AiAnalystResearchRunner';
import styles from './AiAnalystWorkspace.module.css';

type AiAnalystAnalysisProps = {
  symbol: string;
  assetType: IntelligenceAssetType;
  horizon: IntelligenceHorizon;
  autoRun: boolean;
  investmentContext?: InvestmentAnalysisContext | null;
};

function PrivateInvestmentAnalysis({ symbol, context }: Pick<AiAnalystAnalysisProps, 'symbol'> & { context: InvestmentAnalysisContext }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = {
    ar: {
      title: 'تحليل الأصل الخاص غير متاح بعد',
      body: 'تم الاحتفاظ بسياق الاستثمار، لكن هذا الأصل لا يحمل معرف سوق عام موثقاً. لا يتم إنشاء توصية أو ثقة أو سعر بديل.',
      context: 'سياق الاستثمار',
    },
    en: {
      title: 'Private-asset analysis is not available yet',
      body: 'The investment context was preserved, but this asset has no verified public-market identifier. No recommendation, confidence, or replacement price is generated.',
      context: 'Investment context',
    },
    fr: {
      title: 'L’analyse d’un actif privé n’est pas encore disponible',
      body: 'Le contexte de l’investissement est conservé, mais cet actif ne possède pas d’identifiant de marché public vérifié. Aucune recommandation, confiance ou valeur de remplacement n’est générée.',
      context: 'Contexte de l’investissement',
    },
  }[locale];

  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="private-investment-analysis-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{symbol}</p>
            <h2 id="private-investment-analysis-title">{copy.title}</h2>
            <p>{copy.body}</p>
          </div>
          <span className={styles.metricPill}>{context.investmentAssetType ?? 'PRIVATE'}</span>
        </header>
        <div className={styles.statusRail}>
          <BarChart3 size={16} aria-hidden="true" />
          {copy.context}: {context.market ?? '—'} · {context.currency ?? '—'}
        </div>
      </section>
    </div>
  );
}

export function AiAnalystAnalysis(props: AiAnalystAnalysisProps) {
  if (props.investmentContext?.privateAsset) {
    return <PrivateInvestmentAnalysis symbol={props.symbol} context={props.investmentContext} />;
  }
  return <AiAnalystResearchRunner symbol={props.symbol} assetType={props.assetType} horizon={props.horizon} />;
}
