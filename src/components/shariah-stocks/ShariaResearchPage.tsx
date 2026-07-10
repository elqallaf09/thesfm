'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  FileCheck2,
  FileSearch,
  Link2,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { ComplianceAnalysisReport } from '@/components/shariah-stocks/ComplianceAnalysisReport';
import { ComplianceCompanyMark } from '@/components/shariah-stocks/ComplianceCompanyMark';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime, formatPercent, getDirectionByLocale, normalizeLocale } from '@/lib/locale';
import { MARKET_EXCHANGE_OPTIONS } from '@/lib/market/marketExchangeOptions';
import {
  fetchResearchJson,
  ResearchApiError,
  researchApiErrorFromCode,
  type ResearchFailureCategory,
} from '@/lib/sharia-research/clientApi';
import { stepTranslationKey } from '@/lib/sharia-research/reportPresentation';
import type {
  ResearchProgressStep,
  SecurityCandidate,
  ShariaMethodology,
  ShariaScreeningResult,
  SourceConfigurationStatus,
} from '@/lib/sharia-research/types';
import {
  createShariaResearchTranslator,
  type ShariaResearchTranslator,
} from '@/lib/translations/sharia-research';
import type { Lang } from '@/lib/translations';
import styles from './ShariaResearchPage.module.css';

type ViewState = 'idle' | 'identifying' | 'selection' | 'researching' | 'result' | 'error';
type HistoryItem = { id: string; result_id: string | null; original_query: string; outcome: string; created_at: string };
type ResearchErrorView = { code: string; status: number; category: ResearchFailureCategory; message: string };

type PublicJob = {
  id: string;
  status: string;
  progress: number;
  currentStep: ResearchProgressStep;
  candidates: SecurityCandidate[];
  partialErrors: Array<{ code: string; message: string; url?: string }>;
  resultId: string | null;
  error: { code: string; message: string } | null;
  expiresAt: string;
};

type ResearchApiPayload = {
  ok?: boolean;
  success?: boolean;
  error?: { code?: string; message?: string };
  methodologies?: ShariaMethodology[];
  sources?: SourceConfigurationStatus[];
  items?: HistoryItem[];
  result?: ShariaScreeningResult;
  resultId?: string;
  job?: PublicJob;
  jobId?: string;
  status?: string;
  progress?: number;
  currentStep?: ResearchProgressStep;
  candidates?: SecurityCandidate[];
};

type ShariaResearchPageProps = {
  embedded?: boolean;
  initialQuery?: string;
  initialResultId?: string;
  onResultIdChange?: (resultId: string) => void;
};

const STEP_ORDER: ResearchProgressStep[] = [
  'identifying_security',
  'searching_official_sources',
  'retrieving_filings',
  'extracting_financial_data',
  'checking_business_activities',
  'calculating_ratios',
  'resolving_conflicts',
  'preparing_result',
];

function localizedResearchError(error: unknown, tr: ShariaResearchTranslator): ResearchErrorView {
  const apiError = error instanceof ResearchApiError ? error : researchApiErrorFromCode('RESEARCH_CLIENT_ERROR');
  const code = apiError.code.toUpperCase();
  let message = tr('sharia_research_error_analysis');
  if (apiError.category === 'authentication') message = tr('sharia_research_error_auth');
  else if (code.includes('NOT_FOUND') || code.includes('IDENTITY')) message = tr('sharia_research_error_not_found');
  else if (code.includes('TIMEOUT') || code.includes('EXPIRED')) message = tr('sharia_research_error_timeout');
  else if (apiError.category === 'source_retrieval') message = tr('sharia_research_error_sources');
  else if (apiError.category === 'extraction') message = tr('sharia_research_error_extraction');
  else if (apiError.category === 'routing') message = tr('sharia_research_error_connection');
  return { code: apiError.code, status: apiError.status, category: apiError.category, message };
}

function methodologyName(methodology: ShariaMethodology, locale: Lang) {
  return locale === 'ar' ? methodology.nameAr : locale === 'fr' ? methodology.nameFr : methodology.name;
}

export function ShariaResearchPage({
  embedded = false,
  initialQuery = '',
  initialResultId = '',
  onResultIdChange,
}: ShariaResearchPageProps) {
  const { lang } = useLanguage();
  const locale = normalizeLocale(lang);
  const tr = useMemo(() => createShariaResearchTranslator(locale), [locale]);
  const direction = getDirectionByLocale(locale);
  const [query, setQuery] = useState(initialQuery);
  const [market, setMarket] = useState('all');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [view, setView] = useState<ViewState>('idle');
  const [job, setJob] = useState<PublicJob | null>(null);
  const [candidates, setCandidates] = useState<SecurityCandidate[]>([]);
  const [result, setResult] = useState<ShariaScreeningResult | null>(null);
  const [error, setError] = useState<ResearchErrorView | null>(null);
  const [methodologies, setMethodologies] = useState<ShariaMethodology[]>([]);
  const [methodologyId, setMethodologyId] = useState('msci-islamic-index-series-assets');
  const [sourceStatus, setSourceStatus] = useState<SourceConfigurationStatus[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [partialFailureCount, setPartialFailureCount] = useState(0);
  const initialResultLoaded = useRef('');
  const pollingJobId = job?.id ?? null;
  const pollingJobStatus = job?.status ?? null;
  const busy = view === 'identifying' || view === 'researching';

  useEffect(() => {
    if (view === 'idle' && initialQuery.trim()) setQuery(initialQuery.trim());
  }, [initialQuery, view]);

  useEffect(() => {
    let cancelled = false;
    void fetchResearchJson<ResearchApiPayload>('/api/sharia-research/methodologies')
      .then(payload => {
        if (cancelled) return;
        setMethodologies(payload.methodologies ?? []);
        setSourceStatus(payload.sources ?? []);
      })
      .catch(() => undefined);
    void fetchResearchJson<ResearchApiPayload>('/api/sharia-research/history')
      .then(payload => { if (!cancelled) setHistory(payload.items ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const showResult = useCallback((nextResult: ShariaScreeningResult) => {
    initialResultLoaded.current = nextResult.id;
    setResult(nextResult);
    setView('result');
    setJob(null);
    setError(null);
    onResultIdChange?.(nextResult.id);
  }, [onResultIdChange]);

  const loadResult = useCallback(async (resultId: string) => {
    const payload = await fetchResearchJson<ResearchApiPayload>(`/api/sharia-research/results/${encodeURIComponent(resultId)}`);
    if (!payload.result) throw researchApiErrorFromCode('RESULT_PAYLOAD_MISSING');
    showResult(payload.result);
  }, [showResult]);

  useEffect(() => {
    if (!initialResultId || initialResultLoaded.current === initialResultId) return;
    initialResultLoaded.current = initialResultId;
    let cancelled = false;
    setView('identifying');
    void loadResult(initialResultId).catch(loadError => {
      if (cancelled) return;
      setError(localizedResearchError(loadError, tr));
      setView('error');
    });
    return () => { cancelled = true; };
  }, [initialResultId, loadResult, tr]);

  useEffect(() => {
    if (!pollingJobId || !pollingJobStatus || !['queued', 'running'].includes(pollingJobStatus)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const payload = await fetchResearchJson<ResearchApiPayload>(`/api/sharia-research/jobs/${encodeURIComponent(pollingJobId)}`);
        if (!payload.job) throw researchApiErrorFromCode('JOB_STATUS_PAYLOAD_MISSING');
        if (cancelled) return;
        setJob(payload.job);
        if (payload.job.status === 'completed' && payload.job.resultId) {
          setPartialFailureCount(payload.job.partialErrors.length);
          await loadResult(payload.job.resultId);
          return;
        }
        if (['failed', 'cancelled', 'expired'].includes(payload.job.status)) {
          setError(localizedResearchError(
            researchApiErrorFromCode(payload.job.error?.code || `JOB_${payload.job.status.toUpperCase()}`, 0),
            tr,
          ));
          setView('error');
          return;
        }
        timer = setTimeout(poll, 1_800);
      } catch (pollError) {
        if (cancelled) return;
        setError(localizedResearchError(pollError, tr));
        timer = setTimeout(poll, 3_500);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [loadResult, pollingJobId, pollingJobStatus, tr]);

  const startSearch = useCallback(async (searchQuery: string, selectedCanonicalId?: string, forceRefresh = false) => {
    setError(null);
    setResult(null);
    setPartialFailureCount(0);
    onResultIdChange?.('');
    setView('identifying');
    const payload = await fetchResearchJson<ResearchApiPayload>('/api/sharia-research/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        ...(market === 'all' ? {} : { market }),
        methodologyId,
        selectedCanonicalId,
        forceRefresh,
      }),
    });
    if (payload.status === 'awaiting_selection') {
      setCandidates(payload.candidates ?? []);
      setView('selection');
      return;
    }
    if (payload.status === 'completed' && payload.result) {
      showResult(payload.result);
      return;
    }
    if (payload.status && ['failed', 'cancelled', 'expired'].includes(payload.status)) {
      throw researchApiErrorFromCode(`JOB_${payload.status.toUpperCase()}`, 409);
    }
    if (!payload.jobId || !payload.status) throw researchApiErrorFromCode('RESEARCH_JOB_PAYLOAD_MISSING');
    setJob({
      id: payload.jobId,
      status: payload.status,
      progress: payload.progress ?? 5,
      currentStep: payload.currentStep ?? 'identifying_security',
      candidates: [],
      partialErrors: [],
      resultId: null,
      error: null,
      expiresAt: '',
    });
    setView('researching');
  }, [market, methodologyId, onResultIdChange, showResult]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const value = query.trim();
    if (!value) return;
    setSubmittedQuery(value);
    try {
      await startSearch(value);
    } catch (searchError) {
      setError(localizedResearchError(searchError, tr));
      setView('error');
    }
  };

  const selectSecurity = async (candidate: SecurityCandidate) => {
    try {
      await startSearch(submittedQuery, candidate.canonicalId);
    } catch (selectionError) {
      setError(localizedResearchError(selectionError, tr));
      setView('error');
    }
  };

  const cancelJob = async () => {
    if (!job) return;
    await fetch(`/api/sharia-research/jobs/${encodeURIComponent(job.id)}`, { method: 'DELETE' }).catch(() => undefined);
    setView(result ? 'result' : 'idle');
    setJob(null);
  };

  const refreshResult = async () => {
    if (!result || busy) return;
    setView('researching');
    setError(null);
    try {
      const payload = await fetchResearchJson<ResearchApiPayload>(`/api/sharia-research/results/${encodeURIComponent(result.id)}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (payload.status === 'completed' && payload.resultId) {
        await loadResult(payload.resultId);
        return;
      }
      if (payload.status && ['failed', 'cancelled', 'expired'].includes(payload.status)) {
        throw researchApiErrorFromCode(`JOB_${payload.status.toUpperCase()}`, 409);
      }
      if (!payload.jobId || !payload.status) throw researchApiErrorFromCode('REFRESH_PAYLOAD_MISSING');
      setJob({ id: payload.jobId, status: payload.status, progress: 5, currentStep: 'identifying_security', candidates: [], partialErrors: [], resultId: null, error: null, expiresAt: '' });
    } catch (refreshError) {
      setError(localizedResearchError(refreshError, tr));
      setView('error');
    }
  };

  const reset = () => {
    setView('idle');
    setJob(null);
    setResult(null);
    setCandidates([]);
    setError(null);
    setQuery('');
    setSubmittedQuery('');
    setPartialFailureCount(0);
    onResultIdChange?.('');
  };

  const retry = async () => {
    if (!submittedQuery) { reset(); return; }
    try {
      await startSearch(submittedQuery, undefined, true);
    } catch (retryError) {
      setError(localizedResearchError(retryError, tr));
      setView('error');
    }
  };

  const selectedMethodology = methodologies.find(item => item.id === methodologyId);
  const availableSources = sourceStatus.filter(status => status.enabled).length;

  return (
    <section
      id={embedded ? undefined : 'main-content'}
      className={`${styles.page} ${embedded ? styles.embedded : ''}`}
      dir={direction}
      data-testid="sharia-deep-research-tool"
    >
      <section className={styles.stickySearch} aria-label={tr('sharia_research_search_label')}>
        <form onSubmit={submit} className={styles.searchForm}>
          <label className={styles.searchField}>
            <span>{tr('sharia_research_search_label')}</span>
            <div className={styles.searchControl}>
              <Search size={19} aria-hidden="true" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr('sharia_research_search_placeholder')} dir="auto" maxLength={160} autoComplete="off" disabled={busy} />
            </div>
          </label>
          <label className={styles.marketField}>
            <span>{tr('sharia_research_market')}</span>
            <select value={market} onChange={event => setMarket(event.target.value)} disabled={busy}>
              <option value="all">{tr('sharia_research_all_markets')}</option>
              {MARKET_EXCHANGE_OPTIONS.map(option => <option key={option.id} value={option.id}>{locale === 'ar' ? option.labelAr : option.labelEn}</option>)}
            </select>
          </label>
          <button type="submit" className={styles.searchButton} disabled={!query.trim() || busy}>
            {busy && !result ? <Loader2 className={styles.spin} size={18} /> : <FileSearch size={18} />}
            {tr('sharia_research_search_action')}
          </button>
          <button type="button" className={styles.refreshButton} onClick={refreshResult} disabled={!result || busy} aria-label={tr('sharia_research_refresh_action')}>
            <RefreshCcw className={view === 'researching' ? styles.spin : ''} size={18} />
            <span>{tr('sharia_research_refresh_action')}</span>
          </button>
          <div className={styles.lastAnalysis}>
            <Clock3 size={15} />
            <span>{tr('sharia_research_last_analysis')}</span>
            <strong>{result ? formatDateTime(result.retrievedAt, locale) : '—'}</strong>
          </div>
        </form>
        <details className={styles.searchOptions}>
          <summary><BookOpenCheck size={16} /><span>{tr('sharia_research_methodology_options')}</span><ChevronDown size={15} /></summary>
          <div className={styles.optionsContent}>
            <label>
              <span>{tr('sharia_research_methodology')}</span>
              <select value={methodologyId} onChange={event => setMethodologyId(event.target.value)} disabled={busy}>
                {(methodologies.length ? methodologies : [{ id: methodologyId, name: tr('sharia_research_default_methodology'), nameAr: tr('sharia_research_default_methodology'), nameFr: tr('sharia_research_default_methodology'), version: '2025-07' } as ShariaMethodology]).map(methodology => (
                  <option value={methodology.id} key={methodology.id}>{methodologyName(methodology, locale)} · {methodology.version}</option>
                ))}
              </select>
            </label>
            <div className={styles.sourceAvailability}><ShieldCheck size={16} /><span>{tr('sharia_research_provider_status')}</span><strong>{availableSources}/{sourceStatus.length || '—'}</strong></div>
            {selectedMethodology ? <a href={selectedMethodology.sourceDocument.url} target="_blank" rel="noreferrer">{selectedMethodology.sourceDocument.publisher}</a> : null}
          </div>
        </details>
      </section>

      {view === 'result' && result ? (
        <ComplianceAnalysisReport result={result} locale={locale} tr={tr} sourceStatus={sourceStatus} partialFailureCount={partialFailureCount} onRefresh={refreshResult} onReset={reset} />
      ) : (
        <div className={styles.stateRegion} aria-live="polite">
          {view === 'idle' ? <ComplianceEmptyState history={history} locale={locale} tr={tr} onHistory={setQuery} /> : null}
          {view === 'identifying' ? <ComplianceLoadingState progress={8} step="identifying_security" locale={locale} tr={tr} /> : null}
          {view === 'selection' ? <SelectionState candidates={candidates} locale={locale} tr={tr} onSelect={selectSecurity} /> : null}
          {view === 'researching' && job ? <ProgressState job={job} locale={locale} tr={tr} onCancel={cancelJob} /> : null}
          {view === 'error' && error ? <ComplianceErrorState error={error} tr={tr} onRetry={retry} onReset={reset} /> : null}
        </div>
      )}
    </section>
  );
}

function ComplianceEmptyState({
  history,
  locale,
  tr,
  onHistory,
}: {
  history: HistoryItem[];
  locale: Lang;
  tr: ShariaResearchTranslator;
  onHistory: (query: string) => void;
}) {
  return (
    <>
      <section className={styles.introCard}>
        <div className={styles.introIcon}><ShieldCheck size={25} /></div>
        <div><span className={styles.eyebrow}>{tr('sharia_research_intro_eyebrow')}</span><h1>{tr('sharia_research_intro_title')}</h1><p>{tr('sharia_research_intro_body')}</p></div>
        <div className={styles.introFeatures}>
          <span><Building2 size={17} />{tr('sharia_research_empty_business')}</span>
          <span><FileCheck2 size={17} />{tr('sharia_research_empty_ratios')}</span>
          <span><Link2 size={17} />{tr('sharia_research_empty_sources')}</span>
        </div>
        <p className={styles.introDisclaimer}>{tr('sharia_research_scope')}</p>
      </section>
      {history.length > 0 ? (
        <details className={styles.historyPanel}>
          <summary><Clock3 size={17} /><span>{tr('sharia_research_history')}</span><ChevronDown size={16} /></summary>
          <div>{history.slice(0, 6).map(item => <button type="button" key={item.id} onClick={() => onHistory(item.original_query)}><span dir="auto">{item.original_query}</span><small>{formatDateTime(item.created_at, locale)}</small><b>{tr('sharia_research_search_again')}</b></button>)}</div>
        </details>
      ) : null}
    </>
  );
}

function ComplianceLoadingState({ progress, step, locale, tr }: { progress: number; step: ResearchProgressStep; locale: Lang; tr: ShariaResearchTranslator }) {
  return (
    <section className={styles.loadingState} role="status">
      <div className={styles.loadingHeader}><Loader2 className={styles.spin} size={24} /><div><h2>{tr('sharia_research_progress_title')}</h2><p>{tr('sharia_research_progress_detail')}</p></div><strong>{formatPercent(progress / 100, locale, { maximumFractionDigits: 0 })}</strong></div>
      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      <p className={styles.currentStep}>{tr(stepTranslationKey(step))}</p>
      <div className={styles.skeletonGrid} aria-hidden="true"><span /><span /><span /></div>
    </section>
  );
}

function SelectionState({
  candidates,
  locale,
  tr,
  onSelect,
}: {
  candidates: SecurityCandidate[];
  locale: Lang;
  tr: ShariaResearchTranslator;
  onSelect: (candidate: SecurityCandidate) => void;
}) {
  return (
    <section className={styles.selectionPanel}>
      <div className={styles.stateHeading}><AlertTriangle size={22} /><div><h2>{tr('sharia_research_selection_title')}</h2><p>{tr('sharia_research_selection_body')}</p></div></div>
      <div className={styles.candidateGrid}>{candidates.map(candidate => (
        <article key={candidate.canonicalId} className={styles.candidateCard}>
          <ComplianceCompanyMark symbol={candidate.ticker} name={candidate.name} logoUrl={candidate.logoUrl} exchange={candidate.exchange} size="md" />
          <div><h3 dir="auto">{locale === 'ar' && candidate.nameAr ? candidate.nameAr : candidate.name}</h3><p dir="ltr">{candidate.ticker} · {candidate.exchange}</p>{candidate.country ? <small>{candidate.country}</small> : null}</div>
          <button type="button" onClick={() => onSelect(candidate)}>{tr('sharia_research_choose_security')}</button>
        </article>
      ))}</div>
    </section>
  );
}

function ProgressState({ job, locale, tr, onCancel }: { job: PublicJob; locale: Lang; tr: ShariaResearchTranslator; onCancel: () => void }) {
  const currentIndex = STEP_ORDER.indexOf(job.currentStep);
  return (
    <section className={styles.loadingState}>
      <div className={styles.loadingHeader}>
        <Loader2 className={styles.spin} size={24} />
        <div><h2>{tr('sharia_research_progress_title')}</h2><p>{tr('sharia_research_progress_detail')}</p></div>
        <strong>{formatPercent(job.progress / 100, locale, { maximumFractionDigits: 0 })}</strong>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress} aria-label={tr('sharia_research_progress_title')}><span style={{ width: `${job.progress}%` }} /></div>
      <div className={styles.progressActions}><p className={styles.currentStep}>{tr(stepTranslationKey(job.currentStep))}</p><button type="button" onClick={onCancel}><Square size={14} />{tr('sharia_research_cancel')}</button></div>
      <ol className={styles.steps}>{STEP_ORDER.map((step, index) => <li key={step} data-state={index < currentIndex ? 'complete' : step === job.currentStep ? 'active' : 'pending'}>{index < currentIndex ? <Check size={14} /> : step === job.currentStep ? <Loader2 className={styles.spin} size={14} /> : <CircleDashed size={14} />}<span>{tr(stepTranslationKey(step))}</span></li>)}</ol>
      {job.partialErrors.length > 0 ? <details className={styles.partialFailures}><summary>{tr('sharia_research_partial_failures')} ({job.partialErrors.length})</summary><p>{tr('sharia_research_partial_failure_body')}</p></details> : null}
    </section>
  );
}

function ComplianceErrorState({
  error,
  tr,
  onRetry,
  onReset,
}: {
  error: ResearchErrorView;
  tr: ShariaResearchTranslator;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <section className={styles.errorState} data-error-category={error.category}>
      <AlertCircle size={31} />
      <h2>{tr('sharia_research_error_title')}</h2>
      <p>{error.message}</p>
      <div><button type="button" onClick={onRetry}><RefreshCcw size={16} />{tr('sharia_research_error_retry')}</button><button type="button" onClick={onReset}>{tr('sharia_research_new_search')}</button></div>
    </section>
  );
}
