'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Share2, ShieldCheck } from 'lucide-react';
import type { AnalysisResult, IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './AiAnalystWorkspace.module.css';

const COPY = {
  ar: { eyebrow: 'SFM AI Investment Check', title: 'فحص الاستثمار الذكي', score: 'SFM Score', confidence: 'الثقة', risk: 'المخاطر', evidence: 'الأدلة', updated: 'آخر تحديث', share: 'شارك النتيجة', verified: 'مبني فقط على البيانات المتاحة والموثقة', loading: 'جاري تجهيز فحص الاستثمار…', unavailable: 'غير متاح' },
  en: { eyebrow: 'SFM AI Investment Check', title: 'AI Investment Check', score: 'SFM Score', confidence: 'Confidence', risk: 'Risk', evidence: 'Evidence', updated: 'Updated', share: 'Share result', verified: 'Built only from available verified data', loading: 'Preparing investment check…', unavailable: 'Unavailable' },
  fr: { eyebrow: 'SFM AI Investment Check', title: 'Vérification IA', score: 'SFM Score', confidence: 'Confiance', risk: 'Risque', evidence: 'Preuves', updated: 'Mis à jour', share: 'Partager', verified: 'Fondé uniquement sur les données vérifiées disponibles', loading: 'Préparation de la vérification…', unavailable: 'Indisponible' },
} as const;

function scoreFrom(result: AnalysisResult) {
  if (!result.confidenceCalculation.minimumEvidenceMet) return null;
  const raw = result.recommendationDecision.compositeScore;
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round((raw + 100) / 2))) : null;
}

type Props = { symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon };

export function InvestmentCheckCard({ symbol, assetType, horizon }: Props) {
  const { lang } = useLanguage();
  const locale = lang === 'ar' || lang === 'fr' ? lang : 'en';
  const copy = COPY[locale];
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ symbol, assetType, horizon, locale });
    fetch(`/api/intelligence/latest?${params}`, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (payload?.ok === true && payload.result) setResult(payload.result as AnalysisResult); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [assetType, horizon, locale, symbol]);

  if (!result) return <div className={styles.statusRail} role="status"><ShieldCheck size={16} aria-hidden="true" />{copy.loading}</div>;
  const score = scoreFrom(result);
  const date = (result.dataAsOf ?? result.generatedAt).split('T')[0];

  async function share() {
    const url = window.location.href;
    const text = `${result.asset.canonicalSymbol} — ${copy.score}: ${score ?? copy.unavailable}${score !== null ? '/100' : ''} · ${copy.confidence}: ${Math.round(result.confidence)}% · THE SFM`;
    if (navigator.share) return void await navigator.share({ title: `${result.asset.canonicalSymbol} — THE SFM`, text, url }).catch(() => undefined);
    await navigator.clipboard?.writeText(`${text}\n${url}`);
  }

  return (
    <section className={styles.card} aria-labelledby="sfm-investment-check-title" data-testid="sfm-investment-check">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}><ShieldCheck size={15} aria-hidden="true" />{copy.eyebrow}</p>
          <h2 id="sfm-investment-check-title">{copy.title} · {result.asset.canonicalSymbol}</h2>
          <p><CheckCircle2 size={14} aria-hidden="true" /> {copy.verified}</p>
        </div>
        <button className={styles.secondaryAction} type="button" onClick={() => void share()}><Share2 size={16} aria-hidden="true" />{copy.share}</button>
      </header>
      <div className={styles.statusRail}>
        <strong>{copy.score}: {score ?? '—'}{score !== null ? '/100' : ''}</strong>
        <span> · {copy.confidence}: {Math.round(result.confidence)}%</span>
        <span> · {copy.risk}: {result.risk}</span>
        <span> · {copy.evidence}: {result.evidence.length}</span>
        <span> · {copy.updated}: <span dir="ltr">{date}</span></span>
      </div>
    </section>
  );
}
