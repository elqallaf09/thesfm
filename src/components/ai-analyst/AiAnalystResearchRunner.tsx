'use client';

import { useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart3, ChevronDown, History, MessageCircle, RefreshCw } from 'lucide-react';
import { SFM_MARKET_INTELLIGENCE_ENGINE_NAME, withSfmAnalyticalSource } from '@/lib/intelligence/branding';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { IntelligencePanel, IntelligenceStatusPanel } from '@/components/intelligence/IntelligencePanel';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { AssetTypeBadge } from './AssetTypeBadge';
import { AI_ANALYST_COPY, HORIZON_LABELS, aiAnalystLocale } from './copy';
import { AiAnalystDashboard } from './AiAnalystDashboard';
import { DASHBOARD_COPY } from './analysisDashboardCopy';
import { AiAnalystRuleEngine } from './AiAnalystRuleEngine';
import { InvestmentCheckCard } from './InvestmentCheckCard';
import { RESEARCH_COPY } from './researchCopy';
import { useResearchTask } from './useResearchTask';
import styles from './AiAnalystWorkspace.module.css';
import dashboardStyles from './AiAnalystDashboard.module.css';

function DeferredLoading() {
  const { lang } = useLanguage();
  return <div className={styles.statusRail} role="status">{AI_ANALYST_COPY[aiAnalystLocale(lang)].history.accuracyLoading}</div>;
}
const IntelligenceTimelinePanel = dynamic(() => import('@/components/intelligence/IntelligenceTimelinePanel').then(module => module.IntelligenceTimelinePanel), { ssr: false, loading: DeferredLoading });
const AccuracySummaryPanel = dynamic(() => import('./AccuracySummaryPanel').then(module => module.AccuracySummaryPanel), { ssr: false, loading: DeferredLoading });

export function AiAnalystResearchRunner({ symbol, assetType, horizon }: { symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const researchCopy = RESEARCH_COPY[locale];
  const sourceCopy = DASHBOARD_COPY[locale];
  const { user, isGuest, result, loading, errorCode, retryAfterSeconds, taskState, requestAnalysis } = useResearchTask({ symbol, assetType, horizon, locale });
  const presentedResult = useMemo(() => result ? withSfmAnalyticalSource(result) : null, [result]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [accuracyOpen, setAccuracyOpen] = useState(false);
  const evidenceRef = useRef<HTMLDetailsElement>(null);
  const sourceTitleId = useId();
  const historyHref = useMemo(() => `/ai-analyst/history?${new URLSearchParams({ symbol, assetType, horizon, view: 'timeline' })}`, [assetType, horizon, symbol]);
  const assistantHref = useMemo(() => `/ai-analyst/assistant?${new URLSearchParams({ symbol, assetType })}`, [assetType, symbol]);
  const signInHref = useMemo(() => loginHrefForCurrentLocation(`/ai-analyst/analyze/${encodeURIComponent(symbol)}`), [symbol]);

  function openEvidence() {
    setEvidenceOpen(true);
    requestAnimationFrame(() => {
      evidenceRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      evidenceRef.current?.querySelector('summary')?.focus({ preventScroll: true });
    });
  }

  const actions = <>
    <button className={styles.primaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(false)}><RefreshCw size={16} aria-hidden="true" />{researchCopy.run}</button>
    {user && !isGuest ? <button className={styles.secondaryAction} type="button" disabled={loading} onClick={() => void requestAnalysis(true)}><RefreshCw size={16} aria-hidden="true" />{copy.analysis.refresh}</button> : <Link className={styles.secondaryAction} href={signInHref} suppressHydrationWarning>{copy.analysis.signInRefresh}</Link>}
  </>;

  return <div className={dashboardStyles.runner}>
    {!result ? <section className={styles.card} aria-labelledby="ai-analyst-analysis-title">
      <header className={styles.cardHeader}><div><h2 id="ai-analyst-analysis-title">{researchCopy.research}</h2><AssetTypeBadge asset={undefined} loading={loading} errorCode={errorCode} /></div><span className={styles.metricPill}>{HORIZON_LABELS[locale][horizon]}</span></header>
      <div className={styles.statusRail}><BarChart3 size={16} aria-hidden="true" />{copy.analysis.disclaimer}</div>
      <div className={dashboardStyles.actions}>{actions}<Link className={styles.linkAction} href={assistantHref}><MessageCircle size={16} aria-hidden="true" />{copy.chat.askAboutAsset}</Link></div>
    </section> : null}
    <p className={dashboardStyles.taskStatus} role="status" data-testid="ai-agent-task-status">{result && taskState === 'idle' ? '' : researchCopy[taskState]}</p>
    {retryAfterSeconds && errorCode ? <p className={styles.statusRail} role="status">{copy.analysis.retryAvailable} {retryAfterSeconds}s</p> : null}
    <IntelligenceStatusPanel compact result={result} loading={loading} errorCode={errorCode} emptyMessage={copy.analysis.noLatest} onRetry={() => void requestAnalysis(false)} />
    {!result ? <AiAnalystRuleEngine /> : null}
    {result ? <>
      <div data-testid="ai-analyst-canonical-result"><AiAnalystDashboard key={result.analysisId} result={result} actions={actions} onOpenEvidence={openEvidence} /></div>
      <details data-testid="analyst-evidence-detail" ref={evidenceRef} className={`${styles.card} ${dashboardStyles.detailsPanel}`} open={evidenceOpen} onToggle={event => setEvidenceOpen(event.currentTarget.open)}>
        <summary className={dashboardStyles.detailSummary}>{sourceCopy.evidence}<ChevronDown size={18} aria-hidden="true" /></summary>
        {evidenceOpen ? <IntelligencePanel result={presentedResult} loading={false} errorCode={null} onRetry={() => void requestAnalysis(false)} showStatus={false} /> : null}
      </details>
      <InvestmentCheckCard compact symbol={symbol} assetType={assetType} horizon={horizon} providedResult={result} onResearchRefresh={() => void requestAnalysis(true)} />
      <div className={dashboardStyles.secondaryGrid}>
        <section className={styles.card} aria-labelledby="ai-analyst-analysis-history-title">
          <div className={styles.disclosureHeader}><h2 id="ai-analyst-analysis-history-title" className={styles.panelTitle}>{copy.analysis.history}</h2><button className={styles.disclosureButton} type="button" aria-expanded={accuracyOpen} onClick={() => setAccuracyOpen(value => !value)}><ChevronDown size={16} aria-hidden="true" />{copy.actions.learnMore}</button></div>
          {accuracyOpen ? <AccuracySummaryPanel compact /> : null}
          <Link className={styles.linkAction} href={historyHref}><History size={16} aria-hidden="true" />{copy.analysis.openHistory}</Link>
        </section>
        <section className={styles.card} aria-labelledby="ai-analyst-timeline-title">
          <div className={styles.disclosureHeader}><h2 id="ai-analyst-timeline-title" className={styles.panelTitle}>{copy.analysis.timeline}</h2><button className={styles.disclosureButton} type="button" aria-expanded={timelineOpen} onClick={() => setTimelineOpen(value => !value)}><ChevronDown size={16} aria-hidden="true" />{copy.analysis.timelineOpen}</button></div>
          {timelineOpen ? <IntelligenceTimelinePanel asset={result.asset} horizon={result.horizon} activeAnalysisId={result.analysisId} /> : null}
        </section>
      </div>
      <details className={`${styles.card} ${dashboardStyles.detailsPanel}`} aria-labelledby={sourceTitleId} data-testid="sfm-intelligence-source">
        <summary id={sourceTitleId} className={dashboardStyles.detailSummary}>{sourceCopy.engine} · {researchCopy.rules}<ChevronDown size={18} aria-hidden="true" /></summary>
        <header className={styles.cardHeader}><div><h2 className={styles.panelTitle}>{SFM_MARKET_INTELLIGENCE_ENGINE_NAME}</h2><p>{sourceCopy.engineNote}</p></div><span className={styles.metricPill} dir="ltr">v{result.engineVersion}</span></header>
        <div className={styles.statusRail}>{sourceCopy.provider}: <b dir="ltr">{result.providerProvenance.selectedProvider ?? sourceCopy.unavailable}</b></div>
        <AiAnalystRuleEngine result={result} />
      </details>
    </> : null}
  </div>;
}
