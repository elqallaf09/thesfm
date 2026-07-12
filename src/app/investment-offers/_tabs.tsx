'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Gauge,
  MinusCircle,
  ShieldAlert,
} from 'lucide-react';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import type { ReadinessCategory, ReadinessReport, ReadinessStatus } from '@/lib/investor/readiness';
import {
  extractFinancials,
  formatDate,
  formatDateTime,
  formatMoney,
  numberValue,
  recordValue,
  rowArray,
  textOf,
  type Lang,
  type Row,
} from './_data';
import type { InvestorCopy } from './_text';
import styles from './investor.module.css';

export type InvestorTabContext = {
  text: InvestorCopy;
  lang: Lang;
  userId: string;
  project: Row | null;
  feasibility: Row | null;
  financialModel: Row | null;
  funding: Row | null;
  pitchDeck: Row | null;
  documents: Row[];
  risks: Row[];
  links: Row[];
  events: Row[];
  questions: Row[];
  diligenceStored: Row[];
  report: ReadinessReport;
  reload: () => void;
  goToTab: (tab: string) => void;
};

/* ── Shared pieces ───────────────────────────────────────────────────── */

export function statusLabel(status: ReadinessStatus, text: InvestorCopy): string {
  const labels: Record<ReadinessStatus, string> = {
    complete: text.statusComplete,
    partial: text.statusPartial,
    missing: text.statusMissing,
    blocked: text.statusBlocked,
    needs_review: text.statusNeedsReview,
  };
  return labels[status];
}

const STATUS_ICONS: Record<ReadinessStatus, ReactNode> = {
  complete: <CheckCircle2 size={14} aria-hidden="true" />,
  partial: <CircleDashed size={14} aria-hidden="true" />,
  missing: <MinusCircle size={14} aria-hidden="true" />,
  blocked: <ShieldAlert size={14} aria-hidden="true" />,
  needs_review: <Clock3 size={14} aria-hidden="true" />,
};

export function StatusBadge({ status, text }: { status: ReadinessStatus; text: InvestorCopy }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
      {STATUS_ICONS[status]}
      {statusLabel(status, text)}
    </span>
  );
}

export function categoryLabel(id: ReadinessCategory['id'], text: InvestorCopy): string {
  const labels: Record<ReadinessCategory['id'], string> = {
    profile: text.categoryProfile,
    business_model: text.categoryBusinessModel,
    market: text.categoryMarket,
    financials: text.categoryFinancials,
    pitch_deck: text.categoryPitchDeck,
    documents: text.categoryDocuments,
    risks: text.categoryRisks,
    funding_request: text.categoryFundingRequest,
    investor_contact: text.categoryInvestorContact,
  };
  return labels[id];
}

export function checkLabel(checkId: string, text: InvestorCopy): string {
  const value = (text as unknown as Record<string, string>)[`check_${checkId}`];
  return value ?? checkId;
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className={styles.progressTrack}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className={styles.progressFill} style={{ inlineSize: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

/** Category → tab holding its fix-it action. */
const CATEGORY_TAB: Record<ReadinessCategory['id'], string> = {
  profile: 'overview',
  business_model: 'financials',
  market: 'financials',
  financials: 'financials',
  pitch_deck: 'pitch-deck',
  documents: 'documents',
  risks: 'risks',
  funding_request: 'financials',
  investor_contact: 'sharing',
};

/* ── Overview tab ────────────────────────────────────────────────────── */

export function OverviewTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, project, funding, report, events } = ctx;
  const summary = textOf(project, ['notes', 'description', 'summary'], '');
  const nextCategory = report.categories.find(category => category.missingCheckIds.length > 0) ?? null;
  const financials = extractFinancials(ctx.financialModel, funding);
  const latestEvent = events[0] ?? null;

  return (
    <div className={styles.stack}>
      <div className={styles.overviewGrid}>
        <AppCard className={styles.scoreCard}>
          <div className={styles.scoreHeading}>
            <Gauge size={18} aria-hidden="true" />
            <h3>{text.overviewReadiness}</h3>
          </div>
          <p className={styles.scoreValue}>
            <strong>{report.score}</strong>
            <span>{text.overviewScoreOf}</span>
          </p>
          <ProgressBar percent={report.score} label={text.overviewReadiness} />
          <div className={styles.scoreMeta}>
            <StatusBadge status={report.status} text={text} />
            <span>{text.overviewMissingItems}: {report.missingRequiredCount}</span>
            {report.blockerCheckIds.length > 0
              ? <span className={styles.blockerNote}><AlertTriangle size={13} aria-hidden="true" /> {text.overviewBlockers}: {report.blockerCheckIds.length}</span>
              : null}
          </div>
          <button type="button" className={styles.linkAction} onClick={() => ctx.goToTab('readiness')}>
            {text.readinessBreakdown} <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </AppCard>

        <AppCard className={styles.valueCard}>
          <h3>{text.overviewValueProposition}</h3>
          {summary
            ? <p className={styles.valueText}>{summary}</p>
            : <p className={styles.mutedText}>{text.overviewNoValueProposition}</p>}
          <dl className={styles.metaList}>
            <div>
              <dt>{text.overviewProjectStage}</dt>
              <dd>{textOf(project, ['status', 'stage', 'timeline'], text.notRecorded)}</dd>
            </div>
            <div>
              <dt>{text.overviewLastUpdated}</dt>
              <dd>{formatDate(project?.updated_at ?? project?.created_at, lang) || text.notRecorded}</dd>
            </div>
          </dl>
        </AppCard>
      </div>

      <div className={styles.overviewStats}>
        <AppCard className={styles.statTile}>
          <small>{text.overviewFundingTarget}</small>
          <strong>{formatMoney(funding?.funding_needed, funding?.currency, lang, text.sourceUnavailable)}</strong>
        </AppCard>
        <AppCard className={styles.statTile}>
          <small>{text.overviewFundingType}</small>
          <strong>{textOf(funding, ['funding_type'], text.notRecorded)}</strong>
        </AppCard>
        {financials.metrics
          .filter(metric => metric.id === 'planned_revenue' || metric.id === 'planned_net')
          .map(metric => (
            <AppCard key={metric.id} className={styles.statTile}>
              <small>{metric.id === 'planned_revenue' ? text.metricPlannedRevenue : text.metricPlannedNet}</small>
              <strong>
                {metric.value === null
                  ? text.sourceUnavailable
                  : formatMoney(metric.value, metric.currency, lang, text.sourceUnavailable)}
              </strong>
              <span className={styles.sourceTag}>{metric.value === null ? text.sourceUnavailable : text.sourceUserEntered}</span>
            </AppCard>
          ))}
      </div>

      <div className={styles.overviewGrid}>
        <AppCard>
          <h3>{text.overviewNextAction}</h3>
          {nextCategory ? (
            <div className={styles.nextAction}>
              <p>
                <strong>{categoryLabel(nextCategory.id, text)}:</strong>{' '}
                {checkLabel(nextCategory.nextCheckId ?? '', text)}
              </p>
              <button type="button" className={styles.primaryAction} onClick={() => ctx.goToTab(CATEGORY_TAB[nextCategory.id])}>
                {text.readinessComplete}
              </button>
            </div>
          ) : (
            <div className={styles.nextAction}>
              <p>{text.overviewAllReady}</p>
              <button type="button" className={styles.primaryAction} onClick={() => ctx.goToTab('sharing')}>
                {text.sharingTitle}
              </button>
            </div>
          )}
        </AppCard>

        <AppCard>
          <h3>{text.overviewLatestActivity}</h3>
          {latestEvent ? (
            <p className={styles.valueText}>
              {eventLabel(String(latestEvent.event_type ?? ''), text)}
              <span className={styles.mutedText}> — {formatDateTime(latestEvent.created_at, lang)}</span>
            </p>
          ) : (
            <p className={styles.mutedText}>{text.overviewNoActivity}</p>
          )}
        </AppCard>
      </div>
    </div>
  );
}

export function eventLabel(eventType: string, text: InvestorCopy): string {
  const labels: Record<string, string> = {
    offer_opened: text.activityEventOfferOpened,
    pitch_deck_viewed: text.activityEventDeckViewed,
    document_downloaded: text.activityEventDocumentDownloaded,
    question_submitted: text.activityEventQuestionSubmitted,
    access_denied: text.activityEventAccessDenied,
    link_revoked: text.activityEventLinkRevoked,
  };
  return labels[eventType] ?? eventType;
}

/* ── Readiness tab ───────────────────────────────────────────────────── */

export function ReadinessTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, report } = ctx;

  return (
    <div className={styles.stack}>
      <AppCard className={styles.readinessHeader}>
        <div>
          <h3>{text.readinessTitle}</h3>
          <p className={styles.mutedText}>{text.readinessSubtitle}</p>
        </div>
        <div className={styles.readinessScoreBox}>
          <strong>{report.score}</strong>
          <span>{text.overviewScoreOf}</span>
          <StatusBadge status={report.status} text={text} />
        </div>
      </AppCard>

      {report.blockerCheckIds.length > 0 ? (
        <AppCard className={styles.blockerCard}>
          <h4><AlertTriangle size={16} aria-hidden="true" /> {text.readinessBlockers}</h4>
          <ul>
            {report.blockerCheckIds.map(id => <li key={id}>{checkLabel(id, text)}</li>)}
          </ul>
        </AppCard>
      ) : null}

      <div className={styles.categoryGrid}>
        {report.categories.map(category => (
          <AppCard key={category.id} className={styles.categoryCard}>
            <header className={styles.categoryHead}>
              <h4>{categoryLabel(category.id, text)}</h4>
              <StatusBadge status={category.status} text={text} />
            </header>
            <div className={styles.categoryProgressRow}>
              <ProgressBar percent={category.percent} label={categoryLabel(category.id, text)} />
              <span className={styles.percentText}>{category.percent}%</span>
            </div>
            <ul className={styles.checkList}>
              {category.checks.map(item => (
                <li key={item.id} className={item.done ? styles.checkDone : styles.checkMissing}>
                  {item.done
                    ? <CheckCircle2 size={14} aria-hidden="true" />
                    : <MinusCircle size={14} aria-hidden="true" />}
                  <span>{checkLabel(item.id, text)}</span>
                  {!item.required ? <em className={styles.optionalTag}>{text.readinessOptional}</em> : null}
                </li>
              ))}
            </ul>
            <footer className={styles.categoryFoot}>
              <span className={styles.mutedText}>
                {text.readinessWeight}: {category.weight} · {text.overviewLastUpdated}: {formatDate(category.lastUpdated, lang) || text.notRecorded}
              </span>
              {category.nextCheckId ? (
                <button type="button" className={styles.linkAction} onClick={() => ctx.goToTab(CATEGORY_TAB[category.id])}>
                  {text.readinessNextAction}: {checkLabel(category.nextCheckId, text)}
                </button>
              ) : null}
            </footer>
          </AppCard>
        ))}
      </div>

      <details className={styles.formulaDetails}>
        <summary>{text.readinessFormulaTitle}</summary>
        <p>{text.readinessFormulaBody}</p>
        <p className={styles.mutedText}>{text.overviewComputedAt}: {formatDateTime(report.computedAt, lang)}</p>
      </details>
    </div>
  );
}

/* ── Financials tab ──────────────────────────────────────────────────── */

function sourceLabel(source: string, text: InvestorCopy): string {
  const labels: Record<string, string> = {
    user: text.sourceUserEntered,
    forecast: text.sourceForecast,
    actual: text.sourceActual,
    ai: text.sourceAiAssisted,
    unavailable: text.sourceUnavailable,
  };
  return labels[source] ?? source;
}

export function FinancialsTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, financialModel, funding, project } = ctx;
  const financials = extractFinancials(financialModel, funding);
  const modelHref = project ? `/projects/${project.id}?tab=financial` : '/projects';

  if (!financialModel && !funding) {
    return (
      <EmptyState
        title={text.financialsEmpty}
        description={text.financialsEmptyBody}
        actions={<Link className={styles.primaryAction} href={modelHref}>{text.financialsOpenModel}</Link>}
      />
    );
  }

  const metricLabels: Record<string, string> = {
    planned_revenue: text.metricPlannedRevenue,
    planned_costs: text.metricPlannedCosts,
    planned_net: text.metricPlannedNet,
    funding_target: text.financialsFundingTarget,
  };

  const useOfFunds = Object.entries(recordValue(funding?.use_of_funds))
    .map(([key, value]) => {
      const entry = recordValue(value);
      return {
        key,
        amount: numberValue(Object.keys(entry).length ? entry.amount : value),
        percent: numberValue(entry.percent),
      };
    })
    .filter(entry => entry.amount !== null || entry.percent !== null);

  const fundLabels: Record<string, string> = {
    product: text.fundsProduct,
    marketing: text.fundsMarketing,
    operations: text.fundsOperations,
    hiring: text.fundsHiring,
    licensesLegal: text.fundsLicensesLegal,
    emergencyReserve: text.fundsEmergencyReserve,
    other: text.fundsOther,
  };

  return (
    <div className={styles.stack}>
      <AppCard>
        <h3>{text.financialsTitle}</h3>
        <p className={styles.mutedText}>{text.financialsSubtitle}</p>
        <div className={styles.metricGrid}>
          {financials.metrics.map(metric => (
            <div key={metric.id} className={styles.metricTile}>
              <small>{metricLabels[metric.id] ?? metric.id}</small>
              <strong>
                {metric.value === null
                  ? text.sourceUnavailable
                  : formatMoney(metric.value, metric.currency, lang, text.sourceUnavailable)}
              </strong>
              <span className={styles.sourceTag}>{sourceLabel(metric.source, text)}</span>
              {metric.updatedAt ? (
                <span className={styles.mutedText}>{text.financialsLastUpdate}: {formatDate(metric.updatedAt, lang)}</span>
              ) : null}
            </div>
          ))}
        </div>
      </AppCard>

      {financials.revenueStreams.length > 0 || financials.costItems.length > 0 ? (
        <div className={styles.twoCol}>
          {financials.revenueStreams.length > 0 ? (
            <AppCard>
              <h4>{text.financialsRevenueStreams} <span className={styles.sourceTag}>{text.sourceUserEntered}</span></h4>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>{text.documentsName}</th><th className={styles.numCell}>{text.financialsAmount}</th></tr>
                  </thead>
                  <tbody>
                    {financials.revenueStreams.map((row, index) => (
                      <tr key={index}>
                        <td>{textOf(row, ['name', 'label', 'title'], `#${index + 1}`)}</td>
                        <td className={styles.numCell} dir="ltr">
                          {formatMoney(row.monthly_amount ?? row.amount ?? row.value, financials.currency, lang, text.sourceUnavailable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCard>
          ) : null}
          {financials.costItems.length > 0 ? (
            <AppCard>
              <h4>{text.financialsCostItems} <span className={styles.sourceTag}>{text.sourceUserEntered}</span></h4>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>{text.documentsName}</th><th className={styles.numCell}>{text.financialsAmount}</th></tr>
                  </thead>
                  <tbody>
                    {financials.costItems.map((row, index) => (
                      <tr key={index}>
                        <td>{textOf(row, ['name', 'label', 'title'], `#${index + 1}`)}</td>
                        <td className={styles.numCell} dir="ltr">
                          {formatMoney(row.monthly_amount ?? row.amount ?? row.value, financials.currency, lang, text.sourceUnavailable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCard>
          ) : null}
        </div>
      ) : null}

      {financials.forecast.length > 0 ? (
        <AppCard>
          <h4>{text.financialsForecast} <span className={styles.sourceTag}>{text.sourceForecast}</span></h4>
          <p className={styles.mutedText}>{text.financialsForecastPeriods}: {financials.forecast.length}</p>
        </AppCard>
      ) : null}

      {useOfFunds.length > 0 ? (
        <AppCard>
          <h4>{text.financialsUseOfFunds} <span className={styles.sourceTag}>{text.sourceUserEntered}</span></h4>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{text.financialsAllocation}</th>
                  <th className={styles.numCell}>{text.financialsAmount}</th>
                  <th className={styles.numCell}>%</th>
                </tr>
              </thead>
              <tbody>
                {useOfFunds.map(entry => (
                  <tr key={entry.key}>
                    <td>{fundLabels[entry.key] ?? entry.key}</td>
                    <td className={styles.numCell} dir="ltr">
                      {entry.amount === null ? '—' : formatMoney(entry.amount, financials.currency, lang, '—')}
                    </td>
                    <td className={styles.numCell} dir="ltr">{entry.percent === null ? '—' : `${Math.round(entry.percent)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>
      ) : null}

      {Object.keys(financials.assumptions).length > 0 ? (
        <details className={styles.formulaDetails}>
          <summary>{text.financialsAssumptions} <span className={styles.sourceTag}>{text.sourceUserEntered}</span></summary>
          <dl className={styles.metaList}>
            {Object.entries(financials.assumptions).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd dir="auto">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      <p className={styles.footNote}>
        {rowArray(financialModel?.revenue_streams).length === 0 && rowArray(financialModel?.cost_items).length === 0
          ? text.financialsEmptyBody
          : null}
        {' '}
        <Link className={styles.linkAction} href={modelHref}>{text.financialsOpenModel} <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </p>
    </div>
  );
}
