'use client';

import { CheckCircle2, Share2, ShieldCheck } from 'lucide-react';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './AiAnalystWorkspace.module.css';

const COPY = {
  ar: { eyebrow: 'SFM AI Investment Check', title: 'فحص الاستثمار الذكي', score: 'SFM Score', confidence: 'الثقة', risk: 'المخاطر', evidence: 'الأدلة', updated: 'آخر تحديث', share: 'شارك النتيجة', copied: 'تم نسخ رابط التحليل', verified: 'النتيجة مبنية فقط على البيانات المتاحة والموثقة', unavailable: 'غير متاح' },
  en: { eyebrow: 'SFM AI Investment Check', title: 'AI Investment Check', score: 'SFM Score', confidence: 'Confidence', risk: 'Risk', evidence: 'Evidence', updated: 'Updated', share: 'Share result', copied: 'Analysis link copied', verified: 'Result uses available verified data only', unavailable: 'Unavailable' },
  fr: { eyebrow: 'SFM AI Investment Check', title: 'Vérification IA', score: 'SFM Score', confidence: 'Confiance', risk: 'Risque', evidence: 'Preuves', updated: 'Mis à jour', share: 'Partager', copied: 'Lien copié', verified: 'Résultat fondé uniquement sur les données vérifiées disponibles', unavailable: 'Indisponible' },
} as const;

function scoreFrom(result: AnalysisResult) {
  if (!result.confidenceCalculation.minimumEvidenceMet) return null;
  const raw = result.recommendationDecision.compositeScore;
  if (!Number.isFinite(raw)) return null;
  // Composite scores are directional (-100..100). Display as a neutral 0..100
  // product score without inventing a new market signal.
  return Math.max(0, Math.min(100, Math.round((raw + 100) / 2)));
}

export function InvestmentCheckCard({ result }: { result: AnalysisResult }) {
  const { lang } = useLanguage();
  const locale = lang === 'ar' || lang === 'fr' ? lang : 'en';
  const copy = COPY[locale];
  const score = scoreFrom(result);
  const [date] = result.dataAsOf ? result.dataAsOf.split('T') : [result.generatedAt.split('T')[0]];

  async function share() {
    const url = window.location.href;
    const text = `${result.asset.canonicalSymbol} — ${copy.score}: ${score ?? copy.unavailable}/100 · ${copy.confidence}: ${Math.round(result.confidence)}% · THE SFM`;
    if (navigator.share) {
      await navigator.share({ title: `${result.asset.canonicalSymbol} — THE SFM`, text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  return (
    <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="sfm-investment-check-title" data-testid="sfm-investment-check">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}><ShieldCheck size={15} aria-hidden="true" />{copy.eyebrow}</p>
          <h2 id="sfm-investment-check-title">{copy.title} · {result.asset.canonicalSymbol}</h2>
          <p><CheckCircle2 size={14} aria-hidden="true" /> {copy.verified}</p>
        </div>
        <button className={styles.secondaryAction} type="button" onClick={() => void share()}><Share2 size={16} aria-hidden="true" />{copy.share}</button>
      </header>
      <div className={styles.investmentCheckMetrics}>
        <div className={styles.investmentCheckScore}><span>{copy.score}</span><strong>{score ?? '—'}{score !== null ? '/100' : ''}</strong></div>
        <div><span>{copy.confidence}</span><strong>{Math.round(result.confidence)}%</strong></div>
        <div><span>{copy.risk}</span><strong>{result.risk}</strong></div>
        <div><span>{copy.evidence}</span><strong>{result.evidence.length}</strong></div>
        <div><span>{copy.updated}</span><strong dir="ltr">{date}</strong></div>
      </div>
    </section>
  );
}
