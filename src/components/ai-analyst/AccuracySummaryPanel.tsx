'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Clock3 } from 'lucide-react';
import type { IntelligenceOutcomeCalibrationGroup } from '@/domain/intelligence/outcomes';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale, aiAnalystNumber } from './copy';
import styles from './AiAnalystWorkspace.module.css';

type ValidatedAccuracyReport = {
  methodologyVersion: string;
  minimumDirectionalSample: number;
  evaluatedCount: number;
  pendingCount: number;
  insufficientDataCount: number;
  invalidatedCount: number;
  failedCount: number;
  directional: IntelligenceOutcomeCalibrationGroup;
  byConfidenceBucket: IntelligenceOutcomeCalibrationGroup[];
  byAssetType: IntelligenceOutcomeCalibrationGroup[];
  byHorizon: IntelligenceOutcomeCalibrationGroup[];
  byRecommendation: IntelligenceOutcomeCalibrationGroup[];
};

type AccuracyAggregate = {
  report: ValidatedAccuracyReport;
  scope: 'SHARED';
  truncated: boolean;
  includedOutcomes: number;
};

type AccuracyResponse = { ok?: unknown; accuracy?: unknown };

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calibrationGroup(value: unknown): IntelligenceOutcomeCalibrationGroup | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const key = typeof row.key === 'string' ? row.key.trim() : '';
  const evaluatedCount = numberValue(row.evaluatedCount);
  const correctCount = numberValue(row.correctCount);
  const incorrectCount = numberValue(row.incorrectCount);
  const neutralCount = numberValue(row.neutralCount);
  const excludedCount = numberValue(row.excludedCount);
  const accuracy = row.accuracy === null ? null : numberValue(row.accuracy);
  const meanConfidence = row.meanConfidence === null ? null : numberValue(row.meanConfidence);
  const descriptiveCalibrationGap = row.descriptiveCalibrationGap === null ? null : numberValue(row.descriptiveCalibrationGap);
  if (!key || evaluatedCount === null || correctCount === null || incorrectCount === null || neutralCount === null || excludedCount === null || typeof row.sampleSufficient !== 'boolean' || (row.accuracy !== null && accuracy === null) || (row.meanConfidence !== null && meanConfidence === null) || (row.descriptiveCalibrationGap !== null && descriptiveCalibrationGap === null)) return null;
  return { key, evaluatedCount, correctCount, incorrectCount, neutralCount, excludedCount, accuracy, meanConfidence, descriptiveCalibrationGap, sampleSufficient: row.sampleSufficient };
}

function groupList(value: unknown) {
  return Array.isArray(value) ? value.map(calibrationGroup).filter((item): item is IntelligenceOutcomeCalibrationGroup => item !== null) : [];
}

function reportFromUnknown(value: unknown): AccuracyAggregate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const aggregate = value as Record<string, unknown>;
  const reportRaw = aggregate.report;
  if (!reportRaw || typeof reportRaw !== 'object' || Array.isArray(reportRaw)) return null;
  const report = reportRaw as Record<string, unknown>;
  const methodologyVersion = typeof report.methodologyVersion === 'string' ? report.methodologyVersion.trim() : '';
  const minimumDirectionalSample = numberValue(report.minimumDirectionalSample);
  const evaluatedCount = numberValue(report.evaluatedCount);
  const pendingCount = numberValue(report.pendingCount);
  const insufficientDataCount = numberValue(report.insufficientDataCount);
  const invalidatedCount = numberValue(report.invalidatedCount);
  const failedCount = numberValue(report.failedCount);
  const directional = calibrationGroup(report.directional);
  if (!methodologyVersion || minimumDirectionalSample === null || evaluatedCount === null || pendingCount === null || insufficientDataCount === null || invalidatedCount === null || failedCount === null || !directional || aggregate.scope !== 'SHARED' || typeof aggregate.truncated !== 'boolean' || numberValue(aggregate.includedOutcomes) === null) return null;
  return {
    report: {
      methodologyVersion,
      minimumDirectionalSample,
      evaluatedCount,
      pendingCount,
      insufficientDataCount,
      invalidatedCount,
      failedCount,
      directional,
      byConfidenceBucket: groupList(report.byConfidenceBucket),
      byAssetType: groupList(report.byAssetType),
      byHorizon: groupList(report.byHorizon),
      byRecommendation: groupList(report.byRecommendation),
    },
    scope: 'SHARED',
    truncated: aggregate.truncated,
    includedOutcomes: numberValue(aggregate.includedOutcomes)!,
  };
}

function AccuracyGroupList({ title, groups }: { title: string; groups: IntelligenceOutcomeCalibrationGroup[] }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  return (
    <section className={styles.disclosure}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {groups.length === 0 ? <p className={styles.statusRail}>{copy.history.insufficientSample}</p> : (
        <ul className={styles.groupList}>
          {groups.map(group => (
            <li className={styles.groupItem} key={group.key}>
              <span className={styles.groupIdentity}>
                <strong dir="ltr">{group.key}</strong>
                <small>{aiAnalystNumber(locale, group.evaluatedCount)}</small>
              </span>
              <span className={styles.groupMetrics}>
                {group.sampleSufficient && group.accuracy !== null
                  ? <span className={styles.metricPill} dir="ltr">{aiAnalystNumber(locale, group.accuracy)}%</span>
                  : <span className={styles.statusPill} data-tone="degraded">{copy.history.insufficientSample}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AccuracySummaryPanel({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [aggregate, setAggregate] = useState<AccuracyAggregate | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetch(`/api/intelligence/accuracy?locale=${encodeURIComponent(locale)}`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => ({ response, payload: await response.json().catch(() => ({})) as AccuracyResponse }))
      .then(({ response, payload }) => {
        if (!active) return;
        const parsed = response.ok && payload.ok === true ? reportFromUnknown(payload.accuracy) : null;
        if (!parsed) {
          setState('unavailable');
          return;
        }
        setAggregate(parsed);
        setState('ready');
      })
      .catch(error => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setState('unavailable');
      });
    return () => { active = false; controller.abort(); };
  }, [locale]);

  const report = aggregate?.report ?? null;
  const accuracy = report?.directional.sampleSufficient ? report.directional.accuracy : null;
  return (
    <section className={`${styles.card} ${className}`} aria-labelledby="ai-analyst-accuracy-title" data-testid="ai-analyst-accuracy-summary">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.history.descriptiveOnly}</p>
          <h2 id="ai-analyst-accuracy-title">{copy.history.accuracyTitle}</h2>
          <p>{copy.history.accuracyBody}</p>
        </div>
        <BarChart3 aria-hidden="true" className={styles.placeholderIcon} />
      </header>
      {state === 'loading' ? <p className={styles.statusRail} role="status"><Clock3 size={16} aria-hidden="true" />{copy.history.accuracyLoading}</p> : null}
      {state === 'unavailable' ? <p className={styles.errorText} role="status"><AlertTriangle size={16} aria-hidden="true" />{copy.history.accuracyUnavailable}</p> : null}
      {state === 'ready' && report ? (
        <>
          <div className={styles.accuracyMetrics}>
            <div className={styles.accuracyMetric}><span>{copy.history.evaluated}</span><strong className={styles.numeric} dir="ltr">{aiAnalystNumber(locale, report.evaluatedCount)}</strong></div>
            <div className={styles.accuracyMetric}><span>{copy.history.pending}</span><strong className={styles.numeric} dir="ltr">{aiAnalystNumber(locale, report.pendingCount)}</strong></div>
            <div className={styles.accuracyMetric}><span>{copy.history.insufficientData}</span><strong className={styles.numeric} dir="ltr">{aiAnalystNumber(locale, report.insufficientDataCount)}</strong></div>
            <div className={styles.accuracyMetric}>
              <span>{copy.history.directionalAccuracy}</span>
              <strong className={styles.numeric} dir="ltr">{accuracy === null ? '—' : `${aiAnalystNumber(locale, accuracy)}%`}</strong>
              <small>{accuracy === null ? copy.history.insufficientSample : `${copy.history.minimumSample}: ${aiAnalystNumber(locale, report.minimumDirectionalSample)}`}</small>
            </div>
          </div>
          {compact ? null : (
            <div className={styles.disclosureBody}>
              <p className={styles.statusRail}>{copy.history.marketUnavailable}</p>
              <div className={styles.twoColumn}>
                <AccuracyGroupList title={copy.history.byConfidence} groups={report.byConfidenceBucket} />
                <AccuracyGroupList title={copy.history.byAsset} groups={report.byAssetType} />
                <AccuracyGroupList title={copy.history.byHorizon} groups={report.byHorizon} />
                <AccuracyGroupList title={copy.history.byRecommendation} groups={report.byRecommendation} />
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
