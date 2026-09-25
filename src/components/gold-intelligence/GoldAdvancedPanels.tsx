'use client';

import { Activity, BrainCircuit, Gauge, GitBranch, ShieldAlert } from 'lucide-react';
import type { GoldScenarioSnapshot } from '@/lib/gold-intelligence/types';
import styles from './GoldAdvancedPanels.module.css';

type Locale = 'ar' | 'en' | 'fr';

const COPY = {
  regime: { ar: 'محرك النظام السوقي', en: 'Market Regime Engine', fr: 'Moteur de régime de marché' },
  causal: { ar: 'محرك العلاقات السببية', en: 'Causal Chain Engine', fr: 'Moteur causal' },
  stress: { ar: 'مصفوفة اختبارات الضغط', en: 'Stress-Test Matrix', fr: 'Matrice de stress' },
  diagnostics: { ar: 'تشخيص ومعايرة النموذج', en: 'Model Diagnostics & Calibration', fr: 'Diagnostic et calibration' },
  analogs: { ar: 'محرك الفترات التاريخية المشابهة', en: 'Historical Analog Engine', fr: 'Moteur des analogues historiques' },
  current20: { ar: 'عائد 20 جلسة الحالي', en: 'Current 20-session return', fr: 'Rendement actuel 20 séances' },
  medianForward: { ar: 'وسيط الـ20 جلسة التالية', en: 'Median next-20 return', fr: 'Médiane des 20 séances suivantes' },
  positiveShare: { ar: 'نسبة النتائج الإيجابية', en: 'Positive outcome share', fr: 'Part des résultats positifs' },
  match: { ar: 'تشابه', en: 'match', fr: 'similarité' },
  volatilityShort: { ar: 'تذبذب', en: 'vol', fr: 'vol' },
  next20: { ar: 'الـ20 جلسة التالية', en: 'next 20D', fr: '20 séances suivantes' },
  confidence: { ar: 'الثقة', en: 'Confidence', fr: 'Confiance' },
  strength: { ar: 'القوة', en: 'Strength', fr: 'Force' },
  factor: { ar: 'درجة العوامل', en: 'Factor score', fr: 'Score facteurs' },
  coverage: { ar: 'تغطية نطاق 1σ التاريخية', en: 'Historical 1σ band coverage', fr: 'Couverture historique 1σ' },
  calibration: { ar: 'درجة المعايرة', en: 'Calibration score', fr: 'Score calibration' },
  volShift: { ar: 'تغير التذبذب', en: 'Volatility shift', fr: 'Variation volatilité' },
  trend: { ar: 'قوة الاتجاه', en: 'Trend strength', fr: 'Force tendance' },
  observations: { ar: 'المشاهدات', en: 'Observations', fr: 'Observations' },
  oneMonth: { ar: 'نتيجة شهر', en: '1M result', fr: 'Résultat 1M' },
} as const;

function pct(value: number | null) {
  return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`;
}

function signed(value: number | null, digits = 2) {
  return value === null || !Number.isFinite(value) ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

export function GoldAdvancedPanels({ snapshot, locale }: { snapshot: GoldScenarioSnapshot; locale: Locale }) {
  const advanced = snapshot.advanced;
  if (!advanced) return null;
  const t = (key: keyof typeof COPY) => COPY[key][locale];

  return (
    <div className={styles.grid}>
      <section className={styles.panel}>
        <header><div><BrainCircuit size={18} /><h2>{t('regime')}</h2></div><b>{advanced.regime.confidence}%</b></header>
        <div className={styles.regime}>
          <strong>{locale === 'ar' ? advanced.regime.labelAr : advanced.regime.label}</strong>
          <span>{t('factor')}: <b dir="ltr">{signed(advanced.regime.score, 3)}</b></span>
        </div>
        <ul>
          {(locale === 'ar' ? advanced.regime.reasonsAr : advanced.regime.reasons).map(reason => <li key={reason}>{reason}</li>)}
        </ul>
      </section>

      <section className={styles.panel}>
        <header><div><Gauge size={18} /><h2>{t('diagnostics')}</h2></div><b>{advanced.diagnostics.status}</b></header>
        <div className={styles.metricGrid}>
          <Metric label={t('coverage')} value={pct(advanced.diagnostics.volatilityBandCoverage)} />
          <Metric label={t('calibration')} value={advanced.diagnostics.calibrationScore === null ? '—' : `${advanced.diagnostics.calibrationScore}/100`} />
          <Metric label={t('volShift')} value={pct(advanced.diagnostics.volatilityShift)} />
          <Metric label={t('trend')} value={advanced.diagnostics.trendStrength === null ? '—' : advanced.diagnostics.trendStrength.toFixed(2) + 'σ'} />
          <Metric label={t('observations')} value={String(advanced.diagnostics.observations)} />
        </div>
        <p>{locale === 'ar' ? advanced.diagnostics.noteAr : advanced.diagnostics.note}</p>
      </section>

      <section className={[styles.panel, styles.wide].join(' ')}>
        <header><div><GitBranch size={18} /><h2>{t('causal')}</h2></div><b>{advanced.causalChains.length}</b></header>
        <div className={styles.chains}>
          {advanced.causalChains.map(chain => (
            <article key={chain.id}>
              <div className={styles.chainHead}>
                <strong>{locale === 'ar' ? chain.labelAr : chain.label}</strong>
                <span data-direction={chain.direction}>{t('strength')} {chain.strength}% · {t('confidence')} {chain.confidence}%</span>
              </div>
              <div className={styles.nodes}>
                {chain.nodes.map((node, index) => (
                  <span key={node.id}>
                    {index > 0 ? <i aria-hidden="true">→</i> : null}
                    <b>{locale === 'ar' ? node.labelAr : node.label}</b>
                  </span>
                ))}
              </div>
              <small>{locale === 'ar' ? chain.caveatAr : chain.caveat}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={[styles.panel, styles.wide].join(' ')}>
        <header><div><Activity size={18} /><h2>{t('analogs')}</h2></div><b>{advanced.historicalAnalogs.status}</b></header>
        <div className={styles.analogSummary}>
          <Metric label={t('current20')} value={pct(advanced.historicalAnalogs.current20Return)} />
          <Metric label={t('medianForward')} value={pct(advanced.historicalAnalogs.medianForward20Return)} />
          <Metric label={t('positiveShare')} value={pct(advanced.historicalAnalogs.positiveForwardShare)} />
        </div>
        <div className={styles.analogs}>
          {advanced.historicalAnalogs.analogs.map((item, index) => (
            <article key={`${item.anchorIndex}-${index}`}>
              <strong>#{index + 1}</strong>
              <span>{item.similarity}% {t('match')}</span>
              <span>20D {signed(item.prior20Return)}%</span>
              <span>{t('volatilityShort')} {item.prior20Volatility.toFixed(1)}%</span>
              <b dir="ltr">{t('next20')} {signed(item.forward20Return)}%</b>
            </article>
          ))}
        </div>
        <p>{locale === 'ar' ? advanced.historicalAnalogs.noteAr : advanced.historicalAnalogs.note}</p>
      </section>

      <section className={[styles.panel, styles.wide].join(' ')}>
        <header><div><ShieldAlert size={18} /><h2>{t('stress')}</h2></div><b>{advanced.stressTests.length}</b></header>
        <div className={styles.stress}>
          {advanced.stressTests.map(test => {
            const bull = test.result.forecast.scenarios.find(item => item.id === 'bull');
            const bear = test.result.forecast.scenarios.find(item => item.id === 'bear');
            return (
              <article key={test.id}>
                <div><Activity size={16} /><strong>{locale === 'ar' ? test.labelAr : test.label}</strong></div>
                <p>{locale === 'ar' ? test.descriptionAr : test.description}</p>
                <dl>
                  <div><dt>{t('factor')}</dt><dd dir="ltr">{signed(test.result.simulatedFactorScore, 3)}</dd></div>
                  <div><dt>Bull</dt><dd>{bull?.probability ?? 0}%</dd></div>
                  <div><dt>Bear</dt><dd>{bear?.probability ?? 0}%</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><span>{label}</span><strong dir="ltr">{value}</strong></div>;
}
