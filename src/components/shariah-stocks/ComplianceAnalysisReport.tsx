'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clipboard,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe2,
  Info,
  Link2,
  ListChecks,
  Printer,
  RefreshCcw,
  Scale,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import type { WatchlistItem } from '@/components/market-analysis/types';
import { readLocalList, WATCHLIST_STORAGE_KEY, writeLocalList } from '@/components/market-analysis/utils';
import { useAuth } from '@/hooks/useAuth';
import { ComplianceCompanyMark } from '@/components/shariah-stocks/ComplianceCompanyMark';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/locale';
import { openCompliancePdfReport, type ExportRatio } from '@/lib/sharia-research/complianceReportExport';
import {
  classificationExplanationKey,
  classificationTone,
  classificationTranslationKey,
  financialFieldTranslationKey,
  groupReportSources,
  ratioNameTranslationKey,
  REPORT_SECTION_IDS,
  screeningCounts,
  type ReportSectionId,
  type ReportSource,
  type ReportSourceCategory,
} from '@/lib/sharia-research/reportPresentation';
import type {
  BusinessScreenResult,
  RatioResult,
  ShariaScreeningResult,
  SourceConfigurationStatus,
  SourceDocument,
  SourceType,
} from '@/lib/sharia-research/types';
import type {
  ShariaResearchTranslationKey,
  ShariaResearchTranslator,
} from '@/lib/translations/sharia-research';
import type { Lang } from '@/lib/translations';
import styles from './ShariaResearchPage.module.css';

type CheckStatus = 'pass' | 'fail' | 'review' | 'unavailable';

type RatioView = ExportRatio & {
  id: string;
  statusCode: 'pass' | 'fail' | 'unavailable';
  reportingPeriod: string | null;
  fields: string[];
  denominator: string | null;
  inputs: RatioResult['inputs'];
  sourceSection: string;
};

type ComplianceAnalysisReportProps = {
  result: ShariaScreeningResult;
  locale: Lang;
  tr: ShariaResearchTranslator;
  sourceStatus: SourceConfigurationStatus[];
  partialFailureCount: number;
  onRefresh: () => void;
  onReset: () => void;
};

const SOURCE_CATEGORY_KEYS: Record<ReportSourceCategory, ShariaResearchTranslationKey> = {
  company: 'sharia_research_source_company',
  exchange: 'sharia_research_source_exchange',
  screening: 'sharia_research_source_screening',
  standards: 'sharia_research_source_standards',
  supporting: 'sharia_research_source_supporting',
};

const SOURCE_CATEGORY_ORDER: ReportSourceCategory[] = ['company', 'exchange', 'screening', 'standards', 'supporting'];

const ACTIVITY_KEYS: Record<string, ShariaResearchTranslationKey> = {
  alcohol: 'sharia_research_activity_alcohol',
  tobacco_and_non_medical_cannabis: 'sharia_research_activity_tobacco_and_non_medical_cannabis',
  pork: 'sharia_research_activity_pork',
  conventional_financial_services: 'sharia_research_activity_conventional_financial_services',
  defense_and_weapons: 'sharia_research_activity_defense_and_weapons',
  gambling: 'sharia_research_activity_gambling',
  music: 'sharia_research_activity_music',
  hotels: 'sharia_research_activity_hotels',
  cinema_and_broadcasting: 'sharia_research_activity_cinema_and_broadcasting',
  adult_entertainment_and_online_dating: 'sharia_research_activity_adult_entertainment_and_online_dating',
};

function statusLabel(status: CheckStatus, tr: ShariaResearchTranslator) {
  if (status === 'pass') return tr('sharia_research_pass');
  if (status === 'fail') return tr('sharia_research_fail');
  if (status === 'review') return tr('sharia_research_review');
  return tr('sharia_research_unavailable_value');
}

function StatusIcon({ status, size = 16 }: { status: CheckStatus; size?: number }) {
  if (status === 'pass') return <CheckCircle2 size={size} aria-hidden="true" />;
  if (status === 'fail') return <XCircle size={size} aria-hidden="true" />;
  if (status === 'unavailable') return <CircleDashed size={size} aria-hidden="true" />;
  return <AlertTriangle size={size} aria-hidden="true" />;
}

export function ComplianceStatusBadge({ status, tr }: { status: CheckStatus; tr: ShariaResearchTranslator }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`} data-status={status}>
      <StatusIcon status={status} />
      {statusLabel(status, tr)}
    </span>
  );
}

function localizedRatioName(ratio: RatioResult, locale: Lang, tr: ShariaResearchTranslator) {
  const translationKey = ratioNameTranslationKey(ratio.ruleId);
  if (translationKey) return tr(translationKey);
  return locale === 'ar' ? ratio.nameAr : locale === 'fr' ? ratio.nameFr : ratio.name;
}

function ratioExplanation(status: RatioView['statusCode'], tr: ShariaResearchTranslator) {
  if (status === 'pass') return tr('sharia_research_ratio_explanation_pass');
  if (status === 'fail') return tr('sharia_research_ratio_explanation_fail');
  return tr('sharia_research_ratio_explanation_unavailable');
}

function buildRatioViews(result: ShariaScreeningResult, locale: Lang, tr: ShariaResearchTranslator): RatioView[] {
  const financial = result.financialRatios.map((ratio): RatioView => {
    const rule = result.methodology.financialRatioRules.find(item => item.id === ratio.ruleId);
    return {
      id: ratio.ruleId,
      name: localizedRatioName(ratio, locale, tr),
      value: ratio.value,
      threshold: ratio.threshold,
      status: statusLabel(ratio.status, tr),
      statusCode: ratio.status,
      explanation: ratioExplanation(ratio.status, tr),
      reportingPeriod: ratio.reportingPeriod,
      fields: rule?.numeratorFields ?? ratio.inputs.slice(0, -1).map(input => input.normalizedField),
      denominator: rule?.denominatorField ?? ratio.inputs.at(-1)?.normalizedField ?? null,
      inputs: ratio.inputs,
      sourceSection: rule?.sourceSection ?? '',
    };
  });
  const exposure = result.businessScreen.prohibitedRevenueRatio;
  const incomeStatus: RatioView['statusCode'] = exposure === null
    ? 'unavailable'
    : exposure <= result.methodology.businessRules.prohibitedRevenueThreshold ? 'pass' : 'fail';
  const incomeRatio: RatioView = {
    id: 'non-permissible-income',
    name: tr('sharia_research_ratio_non_permissible_income'),
    value: exposure,
    threshold: result.methodology.businessRules.prohibitedRevenueThreshold,
    status: statusLabel(incomeStatus, tr),
    statusCode: incomeStatus,
    explanation: ratioExplanation(incomeStatus, tr),
    reportingPeriod: result.reportingPeriod,
    fields: ['prohibited_revenue', 'interest_income'],
    denominator: 'total_income',
    inputs: [],
    sourceSection: result.methodology.businessRules.sourceSection,
  };
  return financial.length > 0 ? [financial[0], incomeRatio, ...financial.slice(1)] : [incomeRatio];
}

function localizedBusinessReason(
  business: BusinessScreenResult,
  classification: ShariaScreeningResult['classification'],
  tr: ShariaResearchTranslator,
) {
  const reason = business.reasons[0] ?? '';
  if (reason.startsWith('No current substantive')) return tr('sharia_research_no_business_description');
  if (reason.startsWith('Documented prohibited')) return tr('sharia_research_ratio_explanation_fail');
  if (reason.startsWith('An official company source')) return tr('sharia_research_status_explanation_non_compliant');
  if (reason.startsWith('Questionable activity terms')) return tr('sharia_research_status_explanation_requires_review');
  if (reason.startsWith('Separate prohibited-revenue')) return tr('sharia_research_ratio_explanation_unavailable');
  if (reason.startsWith('Current official business descriptions')) return tr('sharia_research_status_explanation_compliant');
  return tr(classificationExplanationKey(classification));
}

function localizeWarning(value: string, tr: ShariaResearchTranslator) {
  if (value.startsWith('This confidence score')) return tr('sharia_research_confidence_note');
  if (value.startsWith('The latest usable financial period')) return tr('sharia_research_outdated_analysis');
  if (value.startsWith('News is displayed')) return tr('sharia_research_extracted_news');
  if (value.startsWith('Marketable-security XBRL labels')) return tr('sharia_research_limit_missing');
  return tr('sharia_research_limit_missing');
}

function sourceTypeLabel(sourceType: SourceType, tr: ShariaResearchTranslator) {
  if (sourceType === 'company_ir') return tr('sharia_research_source_company_ir');
  if (sourceType === 'annual_report' || sourceType === 'quarterly_report' || sourceType === 'fund_prospectus') return tr('sharia_research_source_annual');
  if (sourceType === 'exchange_filing') return tr('sharia_research_source_exchange_filing');
  if (sourceType === 'regulatory_filing') return tr('sharia_research_source_regulatory');
  if (sourceType === 'methodology') return tr('sharia_research_source_methodology');
  if (sourceType === 'sharia_board_document') return tr('sharia_research_source_board');
  if (sourceType === 'financial_data') return tr('sharia_research_source_financial');
  if (sourceType === 'news' || sourceType === 'rss') return tr('sharia_research_source_news');
  return tr('sharia_research_source_other');
}

function sourceInformation(sourceType: SourceType, tr: ShariaResearchTranslator) {
  if (['company_ir', 'annual_report', 'quarterly_report', 'fund_prospectus'].includes(sourceType)) return tr('sharia_research_extracted_company');
  if (sourceType === 'exchange_filing') return tr('sharia_research_extracted_listing');
  if (sourceType === 'regulatory_filing' || sourceType === 'financial_data') return tr('sharia_research_extracted_financial');
  if (sourceType === 'methodology' || sourceType === 'sharia_board_document') return tr('sharia_research_extracted_methodology');
  if (sourceType === 'news' || sourceType === 'rss') return tr('sharia_research_extracted_news');
  return tr('sharia_research_extracted_general');
}

function reliabilityLabel(document: SourceDocument, tr: ShariaResearchTranslator) {
  if (document.reliability === 'official') return tr('sharia_research_reliability_official');
  if (document.reliability === 'high') return tr('sharia_research_reliability_high');
  if (document.reliability === 'medium') return tr('sharia_research_reliability_medium');
  if (document.reliability === 'context_only') return tr('sharia_research_reliability_context');
  return tr('sharia_research_reliability_unknown');
}

function providerLabel(status: SourceConfigurationStatus, tr: ShariaResearchTranslator) {
  const labels: Record<string, ShariaResearchTranslationKey> = {
    'company-investor-relations': 'sharia_research_provider_company',
    'annual-reports': 'sharia_research_provider_reports',
    'exchange-filings': 'sharia_research_provider_exchange',
    'regulatory-filings': 'sharia_research_provider_regulator',
    'index-methodologies': 'sharia_research_provider_methodology',
    'reputable-financial-sites': 'sharia_research_provider_financial',
    'news-sources': 'sharia_research_provider_news',
    'rss-sources': 'sharia_research_provider_news',
    'manual-url-source': 'sharia_research_provider_manual',
    'playwright-fallback': 'sharia_research_provider_browser',
    'optional-web-discovery': 'sharia_research_provider_discovery',
  };
  const key = labels[status.id];
  return key ? tr(key) : tr('sharia_research_source_other');
}

function mainReason(result: ShariaScreeningResult, ratios: RatioView[], tr: ShariaResearchTranslator) {
  const failedRatio = ratios.find(ratio => ratio.statusCode === 'fail');
  if (result.businessScreen.status === 'fail') return localizedBusinessReason(result.businessScreen, result.classification, tr);
  if (failedRatio) return `${failedRatio.name}: ${failedRatio.explanation}`;
  if (result.businessScreen.status === 'review' || result.businessScreen.status === 'unavailable') {
    return localizedBusinessReason(result.businessScreen, result.classification, tr);
  }
  const missingRatio = ratios.find(ratio => ratio.statusCode === 'unavailable');
  if (missingRatio) return `${missingRatio.name}: ${missingRatio.explanation}`;
  return tr(classificationExplanationKey(result.classification));
}

function dataLimitations(result: ShariaScreeningResult, tr: ShariaResearchTranslator, partialFailureCount = 0) {
  if (result.conflicts.length > 0) return tr('sharia_research_limit_conflict');
  if (result.classification === 'insufficient_current_data') {
    const stale = result.warnings.some(warning => warning.startsWith('The latest usable financial period'));
    return stale ? tr('sharia_research_outdated_analysis') : tr('sharia_research_limit_missing');
  }
  if (result.unavailableChecks.length > 0 || result.businessScreen.status === 'unavailable' || result.businessScreen.status === 'review') {
    return tr('sharia_research_limit_missing');
  }
  if (partialFailureCount > 0) return tr('sharia_research_partial_failure_body');
  return tr('sharia_research_no_limitations');
}

function referenceNumbers(value: string) {
  return value.match(/\d+(?:\.\d+)*(?:[–-]\d+)?/g)?.join(' · ') || '—';
}

function nextStep(result: ShariaScreeningResult, tr: ShariaResearchTranslator) {
  if (result.classification === 'compliant') return tr('sharia_research_next_compliant');
  if (result.classification === 'non_compliant') return tr('sharia_research_next_non_compliant');
  if (result.classification === 'insufficient_current_data') return tr('sharia_research_next_insufficient');
  return tr('sharia_research_next_review');
}

export function ComplianceAccordion({
  id,
  title,
  icon,
  open,
  onToggle,
  badge,
  summary,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  summary?: string;
  children: React.ReactNode;
}) {
  const contentId = `${id}-content`;
  return (
    <section className={`${styles.accordion} ${open ? styles.accordionOpen : ''}`} data-accordion={id}>
      <button type="button" className={styles.accordionTrigger} aria-expanded={open} aria-controls={contentId} onClick={onToggle}>
        <span className={styles.accordionIcon}>{icon}</span>
        <span className={styles.accordionLabel}><strong>{title}</strong>{summary ? <small>{summary}</small> : null}</span>
        {badge ? <span className={styles.accordionBadge}>{badge}</span> : null}
        <ChevronDown className={styles.accordionChevron} size={18} aria-hidden="true" />
      </button>
      <div id={contentId} className={styles.accordionContent} hidden={!open}>{children}</div>
    </section>
  );
}

export function ComplianceSummaryCard({
  result,
  locale,
  tr,
}: {
  result: ShariaScreeningResult;
  locale: Lang;
  tr: ShariaResearchTranslator;
}) {
  const tone = classificationTone(result.classification);
  const companyName = locale === 'ar' && result.security.nameAr ? result.security.nameAr : result.security.name;
  const cacheLabel = result.cacheState === 'outdated'
    ? tr('sharia_research_outdated_analysis')
    : result.cacheState === 'recently_cached' ? tr('sharia_research_cached_analysis') : tr('sharia_research_live_analysis');
  return (
    <section className={`${styles.summaryHero} ${styles[`tone_${tone}`]}`} aria-labelledby="compliance-result-heading">
      <div className={styles.summaryIdentity}>
        <ComplianceCompanyMark symbol={result.security.ticker} name={result.security.name} logoUrl={result.security.logoUrl} exchange={result.security.exchange} size="lg" />
        <div>
          <span className={styles.eyebrow}>{tr('sharia_research_result_title')}</span>
          <h2 id="compliance-result-heading"><StatusIcon status={tone} size={27} />{tr(classificationTranslationKey(result.classification))}</h2>
          <h3 dir="auto">{companyName}</h3>
          <div className={styles.companyMeta}>
            <b dir="ltr">{result.security.ticker}</b>
            <span>{result.security.exchange}</span>
            {result.security.country ? <span>{result.security.country}</span> : null}
          </div>
        </div>
      </div>
      <div className={styles.scorePanels}>
        <div className={styles.confidencePanel}>
          <div><span>{tr('sharia_research_confidence')}</span><strong>{formatPercent(result.confidence / 100, locale, { maximumFractionDigits: 0 })}</strong></div>
          <div className={styles.confidenceTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.confidence} aria-label={tr('sharia_research_confidence')}><span style={{ width: `${result.confidence}%` }} /></div>
          <small>{tr('sharia_research_confidence_note')}</small>
        </div>
        <div className={styles.confidencePanel}>
          <div><span>{tr('sharia_research_classification_confidence')}</span><strong>{formatPercent(result.classificationConfidence / 100, locale, { maximumFractionDigits: 0 })}</strong></div>
          <div className={styles.confidenceTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.classificationConfidence} aria-label={tr('sharia_research_classification_confidence')}><span style={{ width: `${result.classificationConfidence}%` }} /></div>
          <small>{tr('sharia_research_classification_confidence_note')}</small>
        </div>
      </div>
      <p className={styles.resultExplanation}>{tr(classificationExplanationKey(result.classification))}</p>
      <dl className={styles.verificationGrid}>
        <div><dt>{tr('sharia_research_verified')}</dt><dd>{formatDateTime(result.security.lastVerifiedAt || result.retrievedAt, locale) || tr('sharia_research_unavailable_value')}</dd></div>
        <div><dt>{tr('sharia_research_last_report')}</dt><dd>{formatDate(result.lastFinancialReportDate, locale) || tr('sharia_research_unavailable_value')}</dd></div>
        <div><dt>{tr('sharia_research_methodology')}</dt><dd>{locale === 'ar' ? result.methodology.nameAr : locale === 'fr' ? result.methodology.nameFr : result.methodology.name}</dd></div>
        <div><dt>{tr('sharia_research_last_analysis')}</dt><dd>{cacheLabel}</dd></div>
      </dl>
      <div className={styles.heroDisclaimer}><Info size={17} /><div><strong>{tr('sharia_research_disclaimer_title')}</strong><p>{tr('sharia_research_disclaimer')}</p></div></div>
    </section>
  );
}

export function ComplianceRatioCard({ ratio, locale, tr }: { ratio: RatioView; locale: Lang; tr: ShariaResearchTranslator }) {
  const progress = ratio.value === null ? 0 : Math.min(100, Math.max(0, (ratio.value / Math.max(ratio.threshold, 0.0001)) * 100));
  return (
    <article className={styles.ratioCard} data-ratio-status={ratio.statusCode}>
      <div className={styles.ratioHeader}><h3>{ratio.name}</h3><ComplianceStatusBadge status={ratio.statusCode} tr={tr} /></div>
      <div className={styles.ratioValues}>
        <div><span>{tr('sharia_research_actual_value')}</span><strong dir="ltr">{ratio.value === null ? '—' : formatPercent(ratio.value, locale, { maximumFractionDigits: 2 })}</strong></div>
        <div><span>{tr('sharia_research_allowed_threshold')}</span><strong dir="ltr">≤ {formatPercent(ratio.threshold, locale, { maximumFractionDigits: 2 })}</strong></div>
      </div>
      <div className={styles.ratioTrack} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <p>{ratio.explanation}</p>
      {ratio.reportingPeriod ? <small>{tr('sharia_research_reporting_period')}: <b dir="ltr">{formatDate(ratio.reportingPeriod, locale)}</b></small> : null}
    </article>
  );
}

function ComplianceEvidenceCard({ title, excerpt, source }: { title: string; excerpt: string; source: string }) {
  return (
    <article className={styles.evidenceCard}>
      <div><ShieldCheck size={17} /><strong>{title}</strong></div>
      <blockquote dir="auto">{excerpt}</blockquote>
      <small dir="auto">{source}</small>
    </article>
  );
}

function sourceExcerpts(source: ReportSource, evidenceByDocument: Map<string, string[]>) {
  return Array.from(new Set([
    ...source.documentIds.flatMap(documentId => evidenceByDocument.get(documentId) ?? []),
    ...source.evidenceSnippets,
  ].filter(Boolean)));
}

function ComplianceSourceItem({ source, excerpts, locale, tr }: { source: ReportSource; excerpts: string[]; locale: Lang; tr: ShariaResearchTranslator }) {
  const document = source.document;
  return (
    <article className={styles.sourceCard}>
      <div className={styles.sourceCardTop}>
        <div><span>{sourceTypeLabel(document.sourceType, tr)}</span><h4 dir="auto">{document.publisher || document.sourceTitle}</h4></div>
        <span className={styles.reliabilityBadge} data-reliability={document.reliability}><ShieldCheck size={14} />{reliabilityLabel(document, tr)}</span>
      </div>
      {document.publisher !== document.sourceTitle ? <p className={styles.sourceTitle} dir="auto">{document.sourceTitle}</p> : null}
      <dl className={styles.sourceMeta}>
        <div><dt>{tr('sharia_research_publication_date')}</dt><dd>{formatDate(document.publicationDate || document.filingDate || document.retrievalDate, locale) || tr('sharia_research_unavailable_value')}</dd></div>
        <div><dt>{tr('sharia_research_extracted_information')}</dt><dd>{sourceInformation(document.sourceType, tr)}</dd></div>
      </dl>
      {excerpts[0] ? <blockquote className={styles.sourceExcerpt} dir="auto">{excerpts[0]}</blockquote> : null}
      <a className={styles.externalSourceLink} href={document.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${tr('sharia_research_open_source')}: ${document.publisher || document.sourceTitle}`}>
        <ExternalLink size={16} />{tr('sharia_research_open_source')}
      </a>
    </article>
  );
}

export function ComplianceSourcesList({ result, locale, tr }: { result: ShariaScreeningResult; locale: Lang; tr: ShariaResearchTranslator }) {
  const groups = useMemo(() => groupReportSources([...result.documents, ...result.relatedNews]), [result]);
  const evidenceByDocument = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const evidence of result.evidence) {
      const excerpts = grouped.get(evidence.documentId) ?? [];
      excerpts.push(evidence.excerpt);
      grouped.set(evidence.documentId, excerpts);
    }
    return grouped;
  }, [result.evidence]);
  return (
    <div className={styles.sourceGroups}>
      {SOURCE_CATEGORY_ORDER.map(category => {
        const sources = groups[category];
        if (sources.length === 0) return null;
        return (
          <section key={category} className={styles.sourceGroup}>
            <div className={styles.sourceGroupHeading}><h3>{tr(SOURCE_CATEGORY_KEYS[category])}</h3><span>{tr('sharia_research_sources_count', { count: sources.length })}</span></div>
            <div className={styles.sourceList}>{sources.map(source => <ComplianceSourceItem key={source.key} source={source} excerpts={sourceExcerpts(source, evidenceByDocument)} locale={locale} tr={tr} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function buildReportLink(resultId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'research');
  url.searchParams.set('result', resultId);
  return url.toString();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('clipboard_copy_failed');
  return true;
}

export function ComplianceReportActions({
  result,
  locale,
  tr,
  ratios,
  sources,
  conclusion,
  limitations,
  onRefresh,
  onReset,
}: {
  result: ShariaScreeningResult;
  locale: Lang;
  tr: ShariaResearchTranslator;
  ratios: RatioView[];
  sources: ReportSource[];
  conclusion: string;
  limitations: string;
  onRefresh: () => void;
  onReset: () => void;
}) {
  const { user, isGuest } = useAuth();
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await copyText(buildReportLink(result.id));
      setNotice(tr('sharia_research_link_copied'));
    } catch {
      setNotice(tr('sharia_research_share_unavailable'));
    }
  }, [result.id, tr]);

  const share = useCallback(async () => {
    const url = buildReportLink(result.id);
    const text = `${result.security.name} (${result.security.ticker}) — ${tr(classificationTranslationKey(result.classification))}`;
    if (!navigator.share) {
      setNotice(tr('sharia_research_share_unavailable'));
      return;
    }
    try {
      await navigator.share({ title: tr('sharia_research_report_title'), text, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setNotice(tr('sharia_research_share_unavailable'));
    }
  }, [result, tr]);

  const saveWatchlist = useCallback(async () => {
    const item: WatchlistItem = {
      symbol: result.security.ticker,
      providerSymbol: result.security.providerSymbol || result.security.ticker,
      assetType: 'stock',
      name: result.security.name,
      currency: result.security.currency ?? null,
      exchange: result.security.exchange ?? null,
      country: result.security.country ?? null,
      createdAt: new Date().toISOString(),
    };
    try {
      if (!user || isGuest) {
        const previous = readLocalList<WatchlistItem>(WATCHLIST_STORAGE_KEY);
        writeLocalList(WATCHLIST_STORAGE_KEY, [item, ...previous.filter(entry => !(entry.symbol === item.symbol && entry.assetType === item.assetType))].slice(0, 20));
      } else {
        const { error } = await supabase.from('market_watchlist').upsert({
          user_id: user.id,
          symbol: item.symbol,
          provider_symbol: item.providerSymbol,
          asset_type: item.assetType,
          name: item.name,
          currency: item.currency,
          exchange: item.exchange,
          country: item.country,
        }, { onConflict: 'user_id,symbol,asset_type' });
        if (error) throw error;
      }
      setSaved(true);
      setNotice(tr('sharia_research_saved_watchlist'));
    } catch {
      setNotice(tr('sharia_research_watchlist_error'));
    }
  }, [isGuest, result.security, tr, user]);

  const downloadPdf = () => {
    const opened = openCompliancePdfReport({ result, locale, tr, ratios, sources, conclusion, limitations });
    setNotice(opened ? tr('sharia_research_pdf_help') : tr('sharia_research_popup_blocked'));
  };

  return (
    <section className={styles.reportActions} aria-label={tr('sharia_research_report_title')}>
      <div className={styles.primaryActions}>
        <button type="button" onClick={downloadPdf} title={tr('sharia_research_pdf_help')}><Download size={17} />{tr('sharia_research_download_pdf')}</button>
        <button type="button" onClick={() => window.print()}><Printer size={17} />{tr('sharia_research_print')}</button>
        <button type="button" onClick={share}><Share2 size={17} />{tr('sharia_research_share')}</button>
        <button type="button" onClick={copyLink}><Copy size={17} />{tr('sharia_research_copy_link')}</button>
        <button type="button" onClick={saveWatchlist} disabled={saved}><Star size={17} />{saved ? tr('sharia_research_saved_watchlist') : tr('sharia_research_save_watchlist')}</button>
      </div>
      <div className={styles.secondaryActions}>
        <button type="button" onClick={onRefresh}><RefreshCcw size={16} />{tr('sharia_research_refresh_action')}</button>
        <button type="button" onClick={onReset}>{tr('sharia_research_new_search')}</button>
      </div>
      {notice ? <p className={styles.actionNotice} role="status">{notice}</p> : null}
    </section>
  );
}

export function ComplianceAnalysisReport({ result, locale, tr, sourceStatus, partialFailureCount, onRefresh, onReset }: ComplianceAnalysisReportProps) {
  const [openSections, setOpenSections] = useState<Set<ReportSectionId>>(() => new Set(['quick', 'ratios']));
  const ratios = useMemo(() => buildRatioViews(result, locale, tr), [locale, result, tr]);
  const counts = useMemo(() => screeningCounts(result), [result]);
  const groupedSources = useMemo(() => groupReportSources([...result.documents, ...result.relatedNews]), [result]);
  const flatSources = useMemo(() => SOURCE_CATEGORY_ORDER.flatMap(category => groupedSources[category]), [groupedSources]);
  const conclusion = tr(classificationExplanationKey(result.classification));
  const limitations = dataLimitations(result, tr, partialFailureCount);
  const primaryReason = mainReason(result, ratios, tr);
  const warning = result.conflicts.length > 0
    ? tr('sharia_research_limit_conflict')
    : result.unavailableChecks.length > 0
      ? tr('sharia_research_limit_missing')
      : result.classification === 'insufficient_current_data'
        ? result.warnings.map(item => localizeWarning(item, tr))[0] || tr('sharia_research_limit_missing')
        : partialFailureCount > 0 ? tr('sharia_research_partial_failure_body') : '';
  const businessStatus = result.businessScreen.status;
  const primaryActivity = result.security.industry || result.security.sector || tr('sharia_research_unavailable_value');
  const suspectedActivities = result.businessScreen.detectedActivities.map(activity => ACTIVITY_KEYS[activity.category] ? tr(ACTIVITY_KEYS[activity.category]) : tr('sharia_research_source_other'));

  const setSection = (section: ReportSectionId, open: boolean) => {
    setOpenSections(previous => {
      const next = new Set(previous);
      if (open) next.add(section); else next.delete(section);
      return next;
    });
  };
  const expandAll = () => setOpenSections(new Set(REPORT_SECTION_IDS));
  const collapseAll = () => setOpenSections(new Set());
  const showFullDetails = () => {
    expandAll();
    window.requestAnimationFrame(() => document.getElementById('compliance-full-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const calculationName = (field: string) => {
    const key = financialFieldTranslationKey(field);
    return key ? tr(key) : tr('sharia_research_unavailable_value');
  };
  const mainReasons = [
    localizedBusinessReason(result.businessScreen, result.classification, tr),
    ...ratios.filter(ratio => ratio.statusCode !== 'pass').map(ratio => `${ratio.name}: ${ratio.explanation}`),
  ].filter((reason, index, all) => all.indexOf(reason) === index).slice(0, 3);

  return (
    <div className={styles.report} data-compliance-report="true">
      <ComplianceSummaryCard result={result} locale={locale} tr={tr} />
      <div className={styles.quickSection}>
        <ComplianceAccordion id="quick-decision" title={tr('sharia_research_quick_title')} icon={<ListChecks size={19} />} open={openSections.has('quick')} onToggle={() => setSection('quick', !openSections.has('quick'))}>
          <div className={styles.quickDecision}>
            <div className={styles.mainReason}><span>{tr('sharia_research_main_reason')}</span><strong>{primaryReason}</strong></div>
            <div className={styles.decisionCounts}>
              <div data-count-status="pass"><CheckCircle2 size={17} /><span>{tr('sharia_research_passed')}</span><strong>{formatNumber(counts.passed, locale)}</strong></div>
              <div data-count-status="fail"><XCircle size={17} /><span>{tr('sharia_research_failed')}</span><strong>{formatNumber(counts.failed, locale)}</strong></div>
              <div data-count-status="unavailable"><CircleDashed size={17} /><span>{tr('sharia_research_unavailable')}</span><strong>{formatNumber(counts.unavailable, locale)}</strong></div>
            </div>
            {warning ? <p className={styles.mainWarning}><AlertTriangle size={17} /><span><b>{tr('sharia_research_main_warning')}:</b> {warning}</span></p> : null}
            <button type="button" className={styles.viewDetailsButton} onClick={showFullDetails}>{tr('sharia_research_view_details')}<ChevronDown size={17} /></button>
          </div>
        </ComplianceAccordion>
      </div>
      <ComplianceReportActions
        result={result}
        locale={locale}
        tr={tr}
        ratios={ratios}
        sources={flatSources}
        conclusion={conclusion}
        limitations={limitations}
        onRefresh={onRefresh}
        onReset={onReset}
      />

      <div className={styles.accordionControls} aria-label={tr('sharia_research_view_details')}>
        <button type="button" onClick={expandAll}><Check size={16} />{tr('sharia_research_expand_all')}</button>
        <button type="button" onClick={collapseAll}><ChevronDown size={16} />{tr('sharia_research_collapse_all')}</button>
      </div>

      <div id="compliance-full-details" className={styles.reportSections}>
        <ComplianceAccordion id="financial-ratios" title={tr('sharia_research_ratios_title')} icon={<FileCheck2 size={19} />} open={openSections.has('ratios')} onToggle={() => setSection('ratios', !openSections.has('ratios'))} badge={<span>{formatNumber(ratios.length, locale)}</span>}>
          <div className={styles.ratioGrid}>{ratios.map(ratio => <ComplianceRatioCard key={ratio.id} ratio={ratio} locale={locale} tr={tr} />)}</div>
        </ComplianceAccordion>

        <ComplianceAccordion id="business-activity" title={tr('sharia_research_business_title')} icon={<Building2 size={19} />} open={openSections.has('business')} onToggle={() => setSection('business', !openSections.has('business'))} badge={<ComplianceStatusBadge status={businessStatus} tr={tr} />} summary={primaryActivity}>
          <div className={styles.businessGrid}>
            <dl className={styles.businessFacts}>
              <div><dt>{tr('sharia_research_primary_activity')}</dt><dd dir="auto">{primaryActivity}</dd></div>
              <div><dt>{tr('sharia_research_activity_permissible')}</dt><dd><ComplianceStatusBadge status={businessStatus} tr={tr} /></dd></div>
              <div><dt>{tr('sharia_research_revenue_exposure')}</dt><dd dir="ltr">{result.businessScreen.prohibitedRevenueRatio === null ? '—' : formatPercent(result.businessScreen.prohibitedRevenueRatio, locale, { maximumFractionDigits: 2 })}</dd></div>
              <div><dt>{tr('sharia_research_suspected_activities')}</dt><dd>{suspectedActivities.length ? suspectedActivities.join(' · ') : tr('sharia_research_no_suspected_activities')}</dd></div>
            </dl>
            <div className={styles.businessExplanation}><strong>{tr('sharia_research_business_explanation')}</strong><p>{localizedBusinessReason(result.businessScreen, result.classification, tr)}</p></div>
          </div>
          {result.businessScreen.detectedActivities.some(activity => activity.evidence.length > 0) ? (
            <section className={styles.businessEvidence}><h3>{tr('sharia_research_detailed_evidence')}</h3><div>{result.businessScreen.detectedActivities.flatMap(activity => activity.evidence.slice(0, 2).map(evidence => <ComplianceEvidenceCard key={evidence.id} title={ACTIVITY_KEYS[activity.category] ? tr(ACTIVITY_KEYS[activity.category]) : tr('sharia_research_suspected_activities')} excerpt={evidence.excerpt} source={evidence.publisher || evidence.sourceTitle} />))}</div></section>
          ) : null}
        </ComplianceAccordion>

        <ComplianceAccordion id="screening-calculations" title={tr('sharia_research_calculations_title')} icon={<Clipboard size={19} />} open={openSections.has('calculations')} onToggle={() => setSection('calculations', !openSections.has('calculations'))}>
          <div className={styles.calculationList}>{ratios.map(ratio => (
            <article key={ratio.id} className={styles.calculationCard}>
              <div><h3>{ratio.name}</h3><ComplianceStatusBadge status={ratio.statusCode} tr={tr} /></div>
              <dl>
                <div><dt>{tr('sharia_research_calculation_method')}</dt><dd>{ratio.fields.map(calculationName).join(' + ')} ÷ {ratio.denominator ? calculationName(ratio.denominator) : tr('sharia_research_unavailable_value')}</dd></div>
                <div><dt>{tr('sharia_research_calculation_inputs')}</dt><dd>{ratio.inputs.length ? ratio.inputs.map(input => `${calculationName(input.normalizedField)}: ${formatNumber(input.value, locale, { maximumFractionDigits: 2 })} ${input.currency}`).join(' · ') : tr('sharia_research_unavailable_value')}</dd></div>
                <div><dt>{tr('sharia_research_allowed_threshold')}</dt><dd dir="ltr">≤ {formatPercent(ratio.threshold, locale, { maximumFractionDigits: 2 })}</dd></div>
                <div><dt>{tr('sharia_research_methodology_reference')}</dt><dd dir="ltr">{referenceNumbers(ratio.sourceSection)}</dd></div>
              </dl>
            </article>
          ))}</div>
        </ComplianceAccordion>

        <ComplianceAccordion id="source-evidence" title={tr('sharia_research_sources_title')} icon={<Link2 size={19} />} open={openSections.has('sources')} onToggle={() => setSection('sources', !openSections.has('sources'))} badge={<span>{tr('sharia_research_sources_count', { count: flatSources.length })}</span>}>
          <ComplianceSourcesList result={result} locale={locale} tr={tr} />
        </ComplianceAccordion>

        <ComplianceAccordion id="methodology" title={tr('sharia_research_methodology_title')} icon={<BookOpenCheck size={19} />} open={openSections.has('methodology')} onToggle={() => setSection('methodology', !openSections.has('methodology'))} summary={locale === 'ar' ? result.methodology.nameAr : locale === 'fr' ? result.methodology.nameFr : result.methodology.name}>
          <div className={styles.methodologyCard}>
            <dl>
              <div><dt>{tr('sharia_research_methodology')}</dt><dd>{locale === 'ar' ? result.methodology.nameAr : locale === 'fr' ? result.methodology.nameFr : result.methodology.name}</dd></div>
              <div><dt>{tr('sharia_research_methodology_version')}</dt><dd dir="ltr">{result.methodology.version}</dd></div>
              <div><dt>{tr('sharia_research_methodology_freshness')}</dt><dd>{tr('sharia_research_months', { count: result.methodology.freshnessMonths })}</dd></div>
            </dl>
            <p>{tr('sharia_research_methodology_denominator')}</p>
            <p>{tr('sharia_research_methodology_purification')}</p>
            <a href={result.methodology.sourceDocument.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /><span>{result.methodology.sourceDocument.publisher} · {result.methodology.sourceDocument.title}</span></a>
          </div>
        </ComplianceAccordion>

        <ComplianceAccordion id="references" title={tr('sharia_research_references_title')} icon={<Scale size={19} />} open={openSections.has('references')} onToggle={() => setSection('references', !openSections.has('references'))}>
          <div className={styles.referenceCard}><p>{tr('sharia_research_references_body')}</p><p>{tr('sharia_research_disclaimer')}</p></div>
        </ComplianceAccordion>

        {sourceStatus.length > 0 ? <ComplianceAccordion id="provider-details" title={tr('sharia_research_provider_status')} icon={<Database size={19} />} open={openSections.has('providers')} onToggle={() => setSection('providers', !openSections.has('providers'))}>
          <div className={styles.providerGrid}>{sourceStatus.map(status => <div key={status.id} className={styles.providerRow}>{status.enabled ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}<span>{providerLabel(status, tr)}</span><b>{status.enabled ? tr('sharia_research_provider_enabled') : tr('sharia_research_provider_disabled')}</b>{!status.enabled ? <small>{tr('sharia_research_provider_setup')}</small> : null}</div>)}</div>
        </ComplianceAccordion> : null}

        {(result.warnings.length > 0 || result.unavailableChecks.length > 0 || result.conflicts.length > 0 || partialFailureCount > 0) ? <ComplianceAccordion id="quality-notes" title={tr('sharia_research_quality_title')} icon={<ShieldAlert size={19} />} open={openSections.has('quality')} onToggle={() => setSection('quality', !openSections.has('quality'))}>
          <ul className={styles.qualityList}>
            {partialFailureCount > 0 ? <li>{tr('sharia_research_partial_failures')} ({formatNumber(partialFailureCount, locale)}). {tr('sharia_research_partial_failure_body')}</li> : null}
            {result.conflicts.length > 0 ? <li>{tr('sharia_research_limit_conflict')}</li> : null}
            {result.unavailableChecks.length > 0 ? <li>{tr('sharia_research_limit_missing')}</li> : null}
            {result.warnings.map((item, index) => <li key={`${index}-${item.slice(0, 20)}`}>{localizeWarning(item, tr)}</li>)}
          </ul>
        </ComplianceAccordion> : null}
      </div>

      <section className={`${styles.finalVerdict} ${styles[`tone_${classificationTone(result.classification)}`]}`}>
        <div className={styles.finalVerdictHeader}><div><span>{tr('sharia_research_final_title')}</span><h2><StatusIcon status={classificationTone(result.classification)} size={23} />{tr(classificationTranslationKey(result.classification))}</h2></div><strong>{formatPercent(result.confidence / 100, locale, { maximumFractionDigits: 0 })}</strong></div>
        <div className={styles.finalVerdictGrid}>
          <div><span>{tr('sharia_research_conclusion')}</span><p>{conclusion}</p></div>
          <div><span>{tr('sharia_research_classification_confidence')}</span><p>{formatPercent(result.classificationConfidence / 100, locale, { maximumFractionDigits: 0 })}</p></div>
          <div><span>{tr('sharia_research_reasons')}</span><ul>{mainReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
          <div><span>{tr('sharia_research_limitations')}</span><p>{limitations}</p></div>
          <div><span>{tr('sharia_research_next_step')}</span><p>{nextStep(result, tr)}</p></div>
        </div>
        <div className={styles.finalDisclaimer}><ShieldAlert size={17} /><p>{tr('sharia_research_disclaimer')}</p></div>
      </section>
    </div>
  );
}
