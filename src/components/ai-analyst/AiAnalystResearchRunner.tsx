'use client';

import { useMemo, useState } from 'react';
import { SFM_MARKET_INTELLIGENCE_ENGINE_NAME, withSfmAnalyticalSource } from '@/lib/intelligence/branding';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart3, ChevronDown, History, MessageCircle, RefreshCw } from 'lucide-react';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { IntelligencePanel, IntelligenceStatusPanel } from '@/components/intelligence/IntelligencePanel';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { AssetTypeBadge } from './AssetTypeBadge';
import { AI_ANALYST_COPY, HORIZON_LABELS, aiAnalystLocale, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';
import { AiAnalystRuleEngine } from './AiAnalystRuleEngine';
import { InvestmentCheckCard } from './InvestmentCheckCard';
import { RESEARCH_COPY } from './researchCopy';
import { useResearchTask } from './useResearchTask';

const SOURCE_COPY = {
  ar: {
    eyebrow: 'المصدر التحليلي',
    body: 'THE SFM ينتج القراءة والثقة والمخاطر والأوزان وقواعد القرار. مزود السوق يبقى مصدر بيانات خام موثقاً بشكل مستقل.',
    dataProvider: 'مزود بيانات السوق',
    attempts: 'محاولات بيانات السوق',
    unavailable: 'غير متاح',
  },
  en: {
    eyebrow: 'Analytical source',
    body: 'THE SFM produces the reading, confidence, risk, weighting, and decision policy. The market provider remains separately identified as an upstream data source.',
    dataProvider: 'Market-data provider',
    attempts: 'Market-data attempts',
    unavailable: 'Unavailable',
  },
  fr: {
    eyebrow: 'Source analytique',
    body: 'THE SFM produit la lecture, la confiance, le risque, la pondération et la politique de décision. Le fournisseur de marché reste identifié séparément comme source de données en amont.',
    dataProvider: 'Fournisseur de données de marché',
    attempts: 'Tentatives de données de marché',
    unavailable: 'Indisponible',
  },
} as const;

function DeferredLoading({ surface }: { surface: 'chart' | 'timeline' | 'history' }) {
  const { lang } = useLanguage();
  const copy = AI_ANALYST_COPY[aiAnalystLocale(lang)];
  return (
    <div className={styles.statusRail} role="status">
      {surface === 'chart' ? copy.analysis.chartClosed : surface === 'timeline' ? copy.analysis.timelineClosed : copy.history.accuracyLoading}
    </div>
  );
}

const VerifiedPriceChart = dynamic(() => import('./VerifiedPriceChart').then(module => module.VerifiedPriceChart), {
  ssr: false,
  loading: () => <DeferredLoading surface="chart" />,
});

const IntelligenceTimelinePanel = dynamic(
  () => import('@/components/intelligence/IntelligenceTimelinePanel').then(module => module.IntelligenceTimelinePanel),
  { ssr: false, loading: () => <DeferredLoading surface="timeline" /> },
);

const AccuracySummaryPanel = dynamic(
  () => import('./AccuracySummaryPanel').then(module => module.AccuracySummaryPanel),
  { ssr: false, loading: () => <DeferredLoading surface="history" /> },
);

export function AiAnalystResearchRunner({ symbol, assetType, horizon }: {
  symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon;
}) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const researchCopy = RESEARCH_COPY[locale];
  const sourceCopy = SOURCE_COPY[locale];
  const { user, isGuest, result, loading, errorCode, retryAfterSeconds, taskState, requestAnalysis } = useResearchTask({ symbol, assetType, horizon, locale });
  const presentedResult = useMemo(() => result ? withSfmAnalyticalSource(result) : null, [result]);
  const [chartOpen, setChartOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [accuracyOpen, setAccuracyOpen] = useState(false);

  const historyHref = useMemo(() => {
    const params = new URLSearchParams({ symbol, assetType, horizon, view: 'timeline' });
    return `/ai-analyst/history?${params.toString()}`;
  }, [assetType, horizon, symbol]);
  const assistantHref = useMemo(() => {
    const params = new URLSearchParams({ symbol, assetType });
    return `/ai-analyst/assistant?${params.toString()}`;
  }, [assetType, symbol]);
  const signInHref = useMemo(() => loginHrefForCurrentLocation(`/ai-analyst/analyze/${encodeURIComponent(symbol)}`), [symbol]);
  const retryMessage = retryAfterSeconds && errorCode
    ? `${copy.analysis.retryAvailable} ${retryAfterSeconds}s`
    : null;

  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-analysis-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{symbol}</p>
            <h2 id="ai-analyst-analysis-title">{researchCopy.research}</h2>
            <p>{copy.analysis.sections}</p>
            <AssetTypeBadge asset={result?.asset} loading={loading} errorCode={errorCode} />
          </div>
          <span className={styles.metricPill}>{HORIZON_LABELS[locale][horizon]}</span>
        </header>
        <div className={styles.statusRail}><BarChart3 size={16} aria-hidden="true" />{copy.analysis.disclaimer}</div>
        <div className={styles.cardHeader}>
          <button className={styles.primaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(false)}>
            <RefreshCw size={16} aria-hidden="true" />{researchCopy.run}
          </button>
          {user && !isGuest ? (
            <button className={styles.secondaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(true)}>
              <RefreshCw size={16} aria-hidden="true" />{copy.analysis.refresh}
            </button>
          ) : (
            // loginHrefForCurrentLocation() returns a fixed fallback during
            // SSR and the exact current URL (incl. query) once mounted
            // client-side -- the same intentional SSR/client difference the
            // root layout already suppresses for dir/lang.
            <Link className={styles.secondaryAction} href={signInHref} suppressHydrationWarning>{copy.analysis.signInRefresh}</Link>
          )}
          <Link className={styles.linkAction} href={assistantHref}><MessageCircle size={16} aria-hidden="true" />{copy.chat.askAboutAsset}</Link>
        </div>
        <p className={styles.mutedText} role="status" data-testid="ai-agent-task-status">{researchCopy[taskState]}</p>
        {result ? <p className={styles.mutedText}>{copy.analysis.lastRefresh}: <span dir="ltr">{aiAnalystTimestamp(locale, result.generatedAt)}</span></p> : null}
        {retryMessage ? <p className={styles.statusRail} role="status">{retryMessage}</p> : null}
      </section>

      <div className={styles.spanFull}>
        <IntelligenceStatusPanel
          result={result}
          loading={loading}
          errorCode={errorCode}
          emptyMessage={copy.analysis.noLatest}
          onRetry={() => void requestAnalysis(false)}
        />
      </div>

      {result ? <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="sfm-intelligence-source-title" data-testid="sfm-intelligence-source">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{sourceCopy.eyebrow}</p>
            <h2 id="sfm-intelligence-source-title" className={styles.panelTitle}>{SFM_MARKET_INTELLIGENCE_ENGINE_NAME}</h2>
            <p>{sourceCopy.body}</p>
          </div>
          <span className={styles.metricPill} dir="ltr">v{result.engineVersion}</span>
        </header>
        <div className={styles.statusRail}>
          <span>{sourceCopy.dataProvider}: <b dir="ltr">{result.providerProvenance.selectedProvider ?? sourceCopy.unavailable}</b></span>
          <span>·</span>
          <span>{sourceCopy.attempts}: <b dir="ltr">{result.providerProvenance.attempts.length}</b></span>
        </div>
      </section> : null}

      {result ? <InvestmentCheckCard symbol={symbol} assetType={assetType} horizon={horizon} providedResult={result} onResearchRefresh={() => void requestAnalysis(true)} /> : null}
      <AiAnalystRuleEngine result={result} />
      {result ? <div className={styles.spanFull} data-testid="ai-analyst-canonical-result">
        <IntelligencePanel result={presentedResult} loading={false} errorCode={null} onRetry={() => void requestAnalysis(false)} showStatus={false} />
      </div> : null}

      {result ? <section className={`${styles.card} ${styles.spanSeven}`} aria-labelledby="ai-analyst-chart-title">
        <div className={styles.disclosure}>
          <div className={styles.disclosureHeader}>
            <div>
              <h2 id="ai-analyst-chart-title" className={styles.panelTitle}>{copy.analysis.chart}</h2>
              <p className={styles.mutedText}>{chartOpen ? copy.analysis.chartOpen : copy.analysis.chartClosed}</p>
            </div>
            <button className={styles.disclosureButton} type="button" aria-expanded={chartOpen} onClick={() => setChartOpen(value => !value)}>
              <ChevronDown size={16} aria-hidden="true" />{chartOpen ? copy.actions.learnMore : copy.analysis.chartOpen}
            </button>
          </div>
          {chartOpen ? <VerifiedPriceChart result={result} /> : null}
        </div>
      </section> : null}

      {result ? <section className={`${styles.card} ${styles.spanFive}`} aria-labelledby="ai-analyst-analysis-history-title">
        <div className={styles.disclosure}>
          <div className={styles.disclosureHeader}>
            <div>
              <h2 id="ai-analyst-analysis-history-title" className={styles.panelTitle}>{copy.analysis.history}</h2>
              <p className={styles.mutedText}>{copy.analysis.historyBody}</p>
            </div>
            <button className={styles.disclosureButton} type="button" aria-expanded={accuracyOpen} onClick={() => setAccuracyOpen(value => !value)}>
              <ChevronDown size={16} aria-hidden="true" />{copy.actions.learnMore}
            </button>
          </div>
          {accuracyOpen ? <AccuracySummaryPanel compact /> : null}
          <Link className={styles.linkAction} href={historyHref}><History size={16} aria-hidden="true" />{copy.analysis.openHistory}</Link>
        </div>
      </section> : null}

      {result ? <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-timeline-title">
        <div className={styles.disclosure}>
          <div className={styles.disclosureHeader}>
            <div>
              <h2 id="ai-analyst-timeline-title" className={styles.panelTitle}>{copy.analysis.timeline}</h2>
              <p className={styles.mutedText}>{timelineOpen ? copy.analysis.timelineOpen : copy.analysis.timelineClosed}</p>
            </div>
            <button className={styles.disclosureButton} type="button" aria-expanded={timelineOpen} onClick={() => setTimelineOpen(value => !value)}>
              <ChevronDown size={16} aria-hidden="true" />{copy.analysis.timelineOpen}
            </button>
          </div>
          {timelineOpen ? <IntelligenceTimelinePanel asset={result.asset} horizon={result.horizon} activeAnalysisId={result.analysisId} /> : null}
        </div>
      </section> : null}
    </div>
  );
}
