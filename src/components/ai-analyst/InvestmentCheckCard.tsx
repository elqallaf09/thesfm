'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FolderPlus, Share2, ShieldCheck } from 'lucide-react';
import type { AnalysisResult, IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './AiAnalystWorkspace.module.css';

const COPY = {
  ar: { eyebrow: 'SFM AI Investment Check', title: 'فحص الاستثمار الذكي', score: 'SFM Score', confidence: 'الثقة', risk: 'المخاطر', evidence: 'الأدلة', updated: 'آخر تحديث', share: 'شارك النتيجة', portfolio: 'أضف إلى استثماراتي', verified: 'مبني فقط على البيانات المتاحة والموثقة', loading: 'جاري تجهيز فحص الاستثمار…', unavailable: 'غير متاح' },
  en: { eyebrow: 'SFM AI Investment Check', title: 'AI Investment Check', score: 'SFM Score', confidence: 'Confidence', risk: 'Risk', evidence: 'Evidence', updated: 'Updated', share: 'Share result', portfolio: 'Add to my investments', verified: 'Built only from available verified data', loading: 'Preparing investment check…', unavailable: 'Unavailable' },
  fr: { eyebrow: 'SFM AI Investment Check', title: 'Vérification IA', score: 'SFM Score', confidence: 'Confiance', risk: 'Risque', evidence: 'Preuves', updated: 'Mis à jour', share: 'Partager', portfolio: 'Ajouter à mes investissements', verified: 'Fondé uniquement sur les données vérifiées disponibles', loading: 'Préparation de la vérification…', unavailable: 'Indisponible' },
} as const;

function scoreFrom(result: AnalysisResult) {
  if (!result.confidenceCalculation.minimumEvidenceMet) return null;
  const raw = result.recommendationDecision.compositeScore;
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round((raw + 100) / 2))) : null;
}

type Props = { symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon; providedResult?: AnalysisResult | null };

export function InvestmentCheckCard({ symbol, assetType, horizon, providedResult }: Props) {
  const { lang } = useLanguage();
  const locale = lang === 'ar' || lang === 'fr' ? lang : 'en';
  const copy = COPY[locale];
  const [loadedResult, setResult] = useState<AnalysisResult | null>(null);

  const result = providedResult === undefined ? loadedResult : providedResult;

  useEffect(() => {
    if (providedResult !== undefined) return;
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ symbol, assetType, horizon, locale });
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function loadLatest(attempt: number) {
      try {
        const response = await fetch(`/api/intelligence/latest?${params.toString()}`, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal });
        const payload = response.ok ? await response.json().catch(() => null) : null;
        if (!active) return;
        if (payload?.ok === true && payload.result) {
          setResult(payload.result as AnalysisResult);
          return;
        }
        if (attempt < 3) timers.push(setTimeout(() => void loadLatest(attempt + 1), attempt === 1 ? 1400 : 2600));
      } catch {
        if (active && attempt < 3) timers.push(setTimeout(() => void loadLatest(attempt + 1), 2200));
      }
    }

    void loadLatest(1);
    return () => { active = false; controller.abort(); timers.forEach(clearTimeout); };
  }, [assetType, horizon, locale, symbol, providedResult]);

  if (!result) return <div className={`${styles.statusRail} ${styles.spanFull}`} role="status"><ShieldCheck size={16} aria-hidden="true" />{copy.loading}</div>;
  const score = scoreFrom(result);
  const date = (result.dataAsOf ?? result.generatedAt).split('T')[0];

  async function share() {
    if (!result) return;
    const url = window.location.href;
    const text = `${result.asset.canonicalSymbol} — ${copy.score}: ${score ?? copy.unavailable}${score !== null ? '/100' : ''} · ${copy.confidence}: ${Math.round(result.confidence)}% · THE SFM`;
    if (navigator.share) {
      await navigator.share({ title: `${result.asset.canonicalSymbol} — THE SFM`, text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(`${text}\n${url}`);
  }

  return (
    <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="sfm-investment-check-title" data-testid="sfm-investment-check">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}><ShieldCheck size={15} aria-hidden="true" />{copy.eyebrow}</p>
          <h2 id="sfm-investment-check-title">{copy.title} · {result.asset.canonicalSymbol}</h2>
          <p><CheckCircle2 size={14} aria-hidden="true" /> {copy.verified}</p>
        </div>
        <div className={styles.cardHeader}>
          <button className={styles.secondaryAction} type="button" onClick={() => void share()}><Share2 size={16} aria-hidden="true" />{copy.share}</button>
          <Link className={styles.primaryAction} href="/investments"><FolderPlus size={16} aria-hidden="true" />{copy.portfolio}</Link>
        </div>
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
