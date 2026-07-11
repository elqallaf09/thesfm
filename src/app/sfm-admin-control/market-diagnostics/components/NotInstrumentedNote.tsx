'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { NOT_INSTRUMENTED_ICON } from '@/lib/admin/opsCenter/severityPresentation';
import type { NotInstrumented } from '@/lib/admin/opsCenter/types';

const SCOPE_LABEL_KEY: Record<NotInstrumented['scope'], string> = {
  process: 'ops_center_scope_process',
  request: 'ops_center_scope_request',
  provider: 'ops_center_scope_provider',
  unavailable: 'ops_center_scope_unavailable',
};

/**
 * The single shared way every unmeasurable metric is presented — label, why it's unavailable,
 * what infrastructure would be needed, and its scope level. Used everywhere instead of a bare
 * 0/null so "not measured" can never be mistaken for "measured and zero."
 */
export function NotInstrumentedNote({ value, label }: { value: NotInstrumented; label?: string }) {
  const { t } = useLanguage();
  const Icon = NOT_INSTRUMENTED_ICON;

  return (
    <div className="ops-not-instrumented">
      <span className="ops-not-instrumented-icon" aria-hidden="true"><Icon size={14} /></span>
      <div className="ops-not-instrumented-body">
        {label ? <strong>{label}</strong> : null}
        <span className="ops-not-instrumented-badge">{t('ops_center_not_instrumented')}</span>
        <p>{t(value.reasonKey)}</p>
        <p>{t('ops_center_not_instrumented_would_need')}: {t(value.requiredInfraKey)}</p>
        <p>{t('ops_center_scope_label')}: {t(SCOPE_LABEL_KEY[value.scope])}</p>
      </div>
      <style jsx global>{`
        .ops-tab-section { display: grid; gap: 14px; min-width: 0; }
        .ops-section-title { margin: 0; color: var(--sfm-heading); font-size: 14px; font-weight: 900; }
        .ops-empty-note { margin: 0; padding: 16px; text-align: center; color: var(--sfm-muted); font-size: 13px; border: 1px dashed var(--sfm-border); border-radius: var(--r-md); }
        .ops-not-instrumented { display: flex; gap: 10px; border: 1px dashed var(--sfm-border); border-radius: var(--sfm-light-radius-card, 14px); background: var(--sfm-light-card); padding: 12px; }
        .ops-not-instrumented-icon { flex: 0 0 auto; color: var(--sfm-muted); margin-top: 2px; }
        .ops-not-instrumented-body { min-width: 0; display: grid; gap: 4px; }
        .ops-not-instrumented-body strong { color: var(--sfm-heading); font-size: 12.5px; font-weight: 850; }
        .ops-not-instrumented-badge { width: fit-content; border: 1px solid var(--sfm-border); border-radius: 999px; padding: 2px 9px; background: var(--sfm-card); color: var(--sfm-muted-readable); font-size: 10.5px; font-weight: 850; }
        .ops-not-instrumented-body p { margin: 0; color: var(--sfm-muted-readable); font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
      `}</style>
    </div>
  );
}
