'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import type { OpsFeatureKey, RootCauseIssue } from '@/lib/admin/opsCenter/types';
import { SEVERITY_ICON, SEVERITY_TONE } from '@/lib/admin/opsCenter/severityPresentation';

/** Native <details>/<summary> — no extra accordion dependency, matches the plain-CSS admin convention. */
export function RootCauseAccordion({ issues, limit }: { issues: RootCauseIssue[]; limit?: number }) {
  const { t, lang } = useLanguage();
  const shown = typeof limit === 'number' ? issues.slice(0, limit) : issues;

  if (shown.length === 0) return <p className="ops-empty-note">{t('ops_center_root_cause_empty')}</p>;

  return (
    <div className="ops-root-cause-list">
      {shown.map(issue => {
        const tone = SEVERITY_TONE[issue.severity];
        const Icon = SEVERITY_ICON[issue.severity];
        const providerLabel = issue.affectedProvider ? (traderProviderDisplayName(issue.affectedProvider) ?? issue.affectedProvider) : null;
        return (
          <details key={issue.id} className={`ops-root-cause-item tone-${tone}`}>
            <summary>
              <span className="ops-root-cause-icon" aria-hidden="true"><Icon size={15} /></span>
              <span className="ops-root-cause-problem">
                {t(issue.problemKey)}
                {Object.entries(issue.problemParams).map(([key, value]) => (
                  <b key={key} dir="ltr">{String(value)}</b>
                ))}
              </span>
              <span className={`market-status-badge ${tone}`}>{t(`ops_center_severity_${issue.severity}`)}</span>
            </summary>
            <dl>
              <div>
                <dt>{t('ops_center_root_cause_col_root_cause')}</dt>
                <dd>{t(issue.rootCauseKey)} <code dir="ltr">{String(issue.rootCauseParams.reason ?? '')}</code></dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_feature')}</dt>
                <dd>{issue.affectedFeature ? t(`ops_center_feature_${issue.affectedFeature as OpsFeatureKey}`) : '—'}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_provider')}</dt>
                <dd dir="ltr">{providerLabel ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_first_occurrence')}</dt>
                <dd>{issue.firstOccurrence ? formatDateTime(issue.firstOccurrence, lang) : t('market_state_catalog_not_measured')}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_last_occurrence')}</dt>
                <dd>{issue.lastOccurrence ? formatDateTime(issue.lastOccurrence, lang) : t('market_state_catalog_not_measured')}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_suggested_fix')}</dt>
                <dd>{t(issue.suggestedFixKey)}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_retry_available')}</dt>
                <dd>{issue.retryAvailable ? t('ops_center_yes') : t('ops_center_no')}</dd>
              </div>
              <div>
                <dt>{t('ops_center_root_cause_col_expected_impact')}</dt>
                <dd>{t(issue.expectedImpactKey)}</dd>
              </div>
            </dl>
          </details>
        );
      })}
      <style jsx global>{`
        .ops-root-cause-list { display: grid; gap: 8px; }
        .ops-empty-note { margin: 0; padding: 16px; text-align: center; color: var(--sfm-muted); font-size: 13px; border: 1px dashed var(--sfm-border); border-radius: 14px; }
        .ops-root-cause-item { border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 14px); background: var(--sfm-card); overflow: hidden; }
        .ops-root-cause-item summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
        .ops-root-cause-item summary::-webkit-details-marker { display: none; }
        .ops-root-cause-icon { flex: 0 0 auto; }
        .ops-root-cause-item.tone-danger .ops-root-cause-icon { color: var(--red); }
        .ops-root-cause-item.tone-warning .ops-root-cause-icon { color: var(--amber); }
        .ops-root-cause-item.tone-info .ops-root-cause-icon { color: var(--blue); }
        .ops-root-cause-problem { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--sfm-heading); font-size: 13px; font-weight: 850; }
        .ops-root-cause-problem b { font-weight: 800; color: var(--sfm-muted-readable); background: var(--sfm-light-card); border-radius: 8px; padding: 1px 7px; font-size: 12px; }
        .ops-root-cause-item dl { margin: 0; padding: 0 14px 14px; display: grid; gap: 8px; }
        .ops-root-cause-item dl > div { display: grid; grid-template-columns: minmax(120px, 0.6fr) 1fr; gap: 8px; font-size: 12.5px; }
        .ops-root-cause-item dt { color: var(--sfm-muted); font-weight: 800; }
        .ops-root-cause-item dd { margin: 0; color: var(--sfm-body); overflow-wrap: anywhere; }
        .ops-root-cause-item code { background: var(--sfm-light-card); border-radius: 6px; padding: 1px 6px; font-size: 11.5px; }
        @media (max-width: 560px) {
          .ops-root-cause-item dl > div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
        }
      `}</style>
    </div>
  );
}
