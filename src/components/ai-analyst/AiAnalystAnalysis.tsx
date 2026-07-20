'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart3, ChevronDown, History, RefreshCw } from 'lucide-react';
import type { AnalysisResult, IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { IntelligencePanel, IntelligenceStatusPanel } from '@/components/intelligence/IntelligencePanel';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { AI_ANALYST_COPY, HORIZON_LABELS, aiAnalystLocale, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';

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

type IntelligenceResponse = { ok?: boolean; result?: AnalysisResult; error?: { code?: unknown } };

function errorCodeFrom(payload: IntelligenceResponse) {
  return typeof payload.error?.code === 'string' ? payload.error.code : 'INTERNAL_ERROR';
}

export function AiAnalystAnalysis({
  symbol,
  assetType,
  horizon,
  autoRun: _autoRun,
}: {
  symbol: string;
  assetType: IntelligenceAssetType;
  horizon: IntelligenceHorizon;
  autoRun: boolean;
}) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const { user, isGuest } = useAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [accuracyOpen, setAccuracyOpen] = useState(false);

  const requestAnalysis = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && (!user || isGuest)) {
      setErrorCode('UNAUTHENTICATED');
      return;
    }
    setLoading(true);
    setErrorCode(null);
    setRetryAfterSeconds(null);
    try {
      const response = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          asset: { symbol, assetType },
          horizon,
          locale,
          requestedModules: [],
          source: 'SMART_MARKET_ANALYSIS',
          forceRefresh: forceRefresh && Boolean(user && !isGuest),
        }),
      });
      const payload = await response.json().catch(() => ({})) as IntelligenceResponse;
      if (!response.ok || payload.ok !== true || !payload.result) {
        setErrorCode(errorCodeFrom(payload));
        const retryAfter = Number(response.headers.get('retry-after'));
        setRetryAfterSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
        return;
      }
      setResult(payload.result);
    } catch {
      setErrorCode('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }, [assetType, horizon, isGuest, locale, symbol, user]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadLatest() {
      setLoading(true);
      setErrorCode(null);
      setRetryAfterSeconds(null);
      const params = new URLSearchParams({ symbol, assetType, horizon, locale });
      try {
        const response = await fetch(`/api/intelligence/latest?${params.toString()}`, {
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({})) as IntelligenceResponse;
        if (!active) return;
        if (response.ok && payload.ok === true && payload.result) {
          setResult(payload.result);
          return;
        }
        if (response.status === 404) {
          await requestAnalysis(false);
          return;
        }
        setErrorCode(errorCodeFrom(payload));
        const retryAfter = Number(response.headers.get('retry-after'));
        setRetryAfterSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setErrorCode('NETWORK_ERROR');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLatest();
    return () => { active = false; controller.abort(); };
  }, [assetType, horizon, locale, requestAnalysis, symbol]);

  const historyHref = useMemo(() => {
    const params = new URLSearchParams({ symbol, assetType, horizon, view: 'timeline' });
    return `/ai-analyst/history?${params.toString()}`;
  }, [assetType, horizon, symbol]);
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
            <h2 id="ai-analyst-analysis-title">{copy.analysis.title}</h2>
            <p>{copy.analysis.sections}</p>
          </div>
          <span className={styles.metricPill}>{HORIZON_LABELS[locale][horizon]}</span>
        </header>
        <div className={styles.statusRail}><BarChart3 size={16} aria-hidden="true" />{copy.analysis.disclaimer}</div>
        <div className={styles.cardHeader}>
          <button className={styles.primaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(false)}>
            <RefreshCw size={16} aria-hidden="true" />{result ? copy.analysis.normalRefresh : copy.analysis.run}
          </button>
          {user && !isGuest ? (
            <button className={styles.secondaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(true)}>
              <RefreshCw size={16} aria-hidden="true" />{copy.analysis.refresh}
            </button>
          ) : <Link className={styles.secondaryAction} href={signInHref}>{copy.analysis.signInRefresh}</Link>}
        </div>
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

      {result ? <div className={styles.spanFull} data-testid="ai-analyst-canonical-result">
        <IntelligencePanel result={result} loading={false} errorCode={null} onRetry={() => void requestAnalysis(false)} showStatus={false} />
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
