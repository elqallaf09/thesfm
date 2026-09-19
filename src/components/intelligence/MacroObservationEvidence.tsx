'use client';

import type { FactorResult } from '@/domain/intelligence/contracts';
import { MACRO_SERIES, type MacroSeries } from '@/domain/intelligence/macroObservations';
import styles from './MacroObservationEvidence.module.css';

const COPY = {
  ar: { country: 'الاقتصاد', period: 'الفترة', previous: 'السابق', source: 'المصدر', details: 'القيم السابقة والمصادر', daily: 'يومي', monthly: 'شهري', quarterly: 'ربع سنوي', annual: 'سنوي', annualNote: 'البيانات السنوية سياق طويل الأجل وليست إصداراً شهرياً أو توقعاً.',
    SOFR: 'تكلفة التمويل المضمون SOFR', EFFR: 'الفائدة الفعلية الفيدرالية EFFR', CPI_YOY: 'تضخم أسعار المستهلكين · تغير سنوي', UNEMPLOYMENT: 'معدل البطالة · معدل موسمياً', GDP_QOQ_ANNUALIZED: 'نمو الناتج الحقيقي · تغير ربعي بمعدل سنوي', GDP_ANNUAL: 'نمو الناتج الحقيقي السنوي', CPI_ANNUAL: 'تضخم أسعار المستهلكين السنوي', UNEMPLOYMENT_ANNUAL: 'البطالة السنوية · تقدير منظمة العمل' },
  en: { country: 'Economy', period: 'Period', previous: 'Previous', source: 'Source', details: 'Previous values and sources', daily: 'Daily', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual', annualNote: 'Annual data provides long-term context, not a monthly release or forecast.',
    SOFR: 'Secured funding rate SOFR', EFFR: 'Effective federal funds rate EFFR', CPI_YOY: 'Consumer inflation · year over year', UNEMPLOYMENT: 'Unemployment · seasonally adjusted', GDP_QOQ_ANNUALIZED: 'Real GDP growth · annualized quarterly change', GDP_ANNUAL: 'Annual real GDP growth', CPI_ANNUAL: 'Annual consumer inflation', UNEMPLOYMENT_ANNUAL: 'Annual unemployment · ILO modelled estimate' },
  fr: { country: 'Économie', period: 'Période', previous: 'Précédent', source: 'Source', details: 'Valeurs précédentes et sources', daily: 'Quotidien', monthly: 'Mensuel', quarterly: 'Trimestriel', annual: 'Annuel', annualNote: 'Les données annuelles offrent un contexte à long terme, pas une publication mensuelle ni une prévision.',
    SOFR: 'Taux de financement garanti SOFR', EFFR: 'Taux effectif des fonds fédéraux EFFR', CPI_YOY: 'Inflation des prix · variation annuelle', UNEMPLOYMENT: 'Chômage · corrigé des variations saisonnières', GDP_QOQ_ANNUALIZED: 'Croissance du PIB réel · variation trimestrielle annualisée', GDP_ANNUAL: 'Croissance annuelle du PIB réel', CPI_ANNUAL: 'Inflation annuelle des prix', UNEMPLOYMENT_ANNUAL: 'Chômage annuel · estimation modélisée OIT' },
};

function sourceUrl(value: unknown) {
  try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function MacroObservationEvidence({ factor, locale }: { factor: FactorResult; locale: keyof typeof COPY }) {
  const copy = COPY[locale];
  const observations = factor.evidence.filter(item => item.labelKey.startsWith('intelligence_evidence_macro_observation_'));
  if (!observations.length) return null;
  const number = new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  const regions = new Intl.DisplayNames([locale], { type: 'region' });
  const data = observations.flatMap(item => {
    const series = item.labelKey.replace('intelligence_evidence_macro_observation_', '').toUpperCase() as MacroSeries;
    const metadata = MACRO_SERIES[series];
    if (!metadata || typeof item.value !== 'number') return [];
    const country = factor.evidence.find(row => row.labelKey === `intelligence_evidence_macro_country_${series.toLowerCase()}`)?.value;
    const region = typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? regions.of(country) : null;
    const formatPeriod = (period: string | null) => metadata.frequency === 'annual' ? period?.slice(0, 4) : metadata.frequency === 'monthly' ? period?.slice(0, 7) : period;
    const previous = factor.evidence.find(row => row.labelKey === `intelligence_evidence_macro_previous_${series.toLowerCase()}`);
    const url = sourceUrl(factor.evidence.find(row => row.id === `macro:source:${series}`)?.value);
    return [{ item, series, metadata, region, period: formatPeriod(item.observedAt), previous, previousPeriod: formatPeriod(previous?.observedAt ?? null), url }];
  });
  return <div className={styles.observations} data-testid="macro-observations">
    {data.map(({ item, series, metadata, region, period }) => <div className={styles.observation} key={item.id}>
      <span>{copy[series]}</span><strong dir="ltr">{number.format(Number(item.value))}%</strong>
      <small>{copy[metadata.frequency]}{region ? ` · ${region}` : ''} · <bdi>{period}</bdi></small>
    </div>)}
    {data.some(row => row.metadata.frequency === 'annual') ? <p>{copy.annualNote}</p> : null}
    <details><summary>{copy.details}</summary><ul className={styles.sources}>{data.map(({ item, series, previous, previousPeriod, url }) => <li key={item.id}>
      <span>{copy[series]}</span>
      {previous && typeof previous.value === 'number' ? <span>{copy.previous}: <bdi>{number.format(previous.value)}%</bdi> · <bdi>{previousPeriod}</bdi></span> : null}
      {url ? <a href={url} target="_blank" rel="noopener noreferrer">{copy.source}: {item.source}</a> : <span>{copy.source}: {item.source}</span>}
    </li>)}</ul></details>
  </div>;
}
