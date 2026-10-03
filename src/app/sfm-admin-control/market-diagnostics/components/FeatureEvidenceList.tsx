'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import type { OpsHealthEvidence } from '@/lib/admin/opsCenter/types';
import { FEATURE_HEALTH_TONE } from '@/lib/admin/opsCenter/severityPresentation';
import { diagnosticCapabilityKey } from './diagnosticLabels';

function EvidenceItem({ evidence }: { evidence: OpsHealthEvidence }) {
  const { t, lang } = useLanguage();
  const capabilityKey = evidence.capability ? diagnosticCapabilityKey(evidence.capability) : null;
  const source = evidence.source.startsWith('ops_center_') ? t(evidence.source) : evidence.source;
  const reason = evidence.reasonKey ? t(evidence.reasonKey) : null;
  const recordedReason = evidence.reason?.startsWith('ops_center_') ? t(evidence.reason) : evidence.reason;
  const showMissingReason = !reason && !recordedReason && evidence.status !== 'healthy';

  return (
    <li className="ops-feature-evidence-item">
      <div className="ops-feature-evidence-heading">
        {capabilityKey ? <strong>{t(capabilityKey)}</strong> : <strong>{source}</strong>}
        {evidence.status ? <span className={`market-status-badge ${FEATURE_HEALTH_TONE[evidence.status]}`}>{t(`ops_center_feature_health_${evidence.status}`)}</span> : null}
      </div>
      <dl>
        <div><dt>{t('ops_center_evidence_source')}</dt><dd><bdi dir="auto">{source}</bdi>{evidence.provider ? <> · <bdi dir="auto">{traderProviderDisplayName(evidence.provider) ?? evidence.provider}</bdi></> : null}</dd></div>
        <div><dt>{t('ops_center_scope_label')}</dt><dd>{t(`ops_center_evidence_scope_${evidence.scope}`)}</dd></div>
        {reason || recordedReason || showMissingReason ? (
          <div><dt>{t('ops_center_evidence_reason')}</dt><dd>{reason}{recordedReason && recordedReason !== reason ? <> <bdi dir="auto">{recordedReason}</bdi></> : null}{showMissingReason ? t('ops_center_evidence_reason_unknown') : null}</dd></div>
        ) : null}
        <div><dt>{t('ops_center_evidence_checked_at')}</dt><dd>{evidence.checkedAt ? <time dateTime={evidence.checkedAt}>{formatDateTime(evidence.checkedAt, lang)}</time> : t('market_state_catalog_not_measured')}</dd></div>
        <div><dt>{t('ops_center_evidence_last_success')}</dt><dd>{evidence.lastSuccessAt ? <time dateTime={evidence.lastSuccessAt}>{formatDateTime(evidence.lastSuccessAt, lang)}</time> : t('ops_center_evidence_no_success')}</dd></div>
        {typeof evidence.latencyMs === 'number' ? <div><dt>{t('ops_center_evidence_latency')}</dt><dd><bdi dir="ltr">{evidence.latencyMs} ms</bdi></dd></div> : null}
      </dl>
    </li>
  );
}

export function FeatureEvidenceList({ evidence, limit = 3 }: { evidence: OpsHealthEvidence[]; limit?: number }) {
  const { t } = useLanguage();
  // Put affected measurements first; keep every observation available in the expandable list.
  const ordered = evidence.map((entry, index) => ({ entry, index })).sort((a, b) => {
    const rank = (item: OpsHealthEvidence) => item.status === 'failed' ? 0 : item.status === 'partial' ? 1 : item.status === 'unmeasured' || item.status === 'uninstrumented' ? 2 : 3;
    return rank(a.entry) - rank(b.entry) || a.index - b.index;
  });
  const shown = ordered.slice(0, limit);
  const remaining = ordered.slice(limit);
  const renderItems = (items: typeof ordered) => items.map(({ entry, index }) => <EvidenceItem key={`${entry.source}-${entry.capability ?? ''}-${entry.provider ?? ''}-${index}`} evidence={entry} />);

  return (
    <div className="ops-feature-evidence">
      <ul>{renderItems(shown)}</ul>
      {remaining.length > 0 ? (
        <details className="ops-feature-evidence-more">
          <summary>{t('ops_center_evidence_more')} <bdi dir="ltr">({remaining.length})</bdi></summary>
          <ul>{renderItems(remaining)}</ul>
        </details>
      ) : null}
      <style jsx global>{`
        .ops-feature-evidence { min-width: 0; display: grid; gap: 8px; }
        .ops-feature-evidence ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .ops-feature-evidence-item { min-width: 0; border-block-start: 1px solid var(--border); padding-block-start: 9px; }
        .ops-feature-evidence-heading { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 6px; }
        .ops-feature-evidence-heading strong { color: var(--foreground); font-size: 12px; font-weight: 600; }
        .ops-feature-evidence-item dl { margin: 7px 0 0; display: grid; gap: 5px; }
        .ops-feature-evidence-item dl > div { display: grid; grid-template-columns: minmax(80px, .4fr) minmax(0, 1fr); gap: 8px; font-size: 11.5px; line-height: 1.6; }
        .ops-feature-evidence-item dt { color: var(--foreground-muted); }
        .ops-feature-evidence-item dd { margin: 0; color: var(--foreground-secondary); overflow-wrap: anywhere; }
        .ops-feature-evidence-more summary { width: fit-content; padding-block: 6px; cursor: pointer; color: var(--foreground); font-size: 12px; font-weight: 600; }
        .ops-feature-evidence-more summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
        @media (max-width: 380px) { .ops-feature-evidence-item dl > div { grid-template-columns: minmax(0, 1fr); gap: 1px; } }
      `}</style>
    </div>
  );
}
