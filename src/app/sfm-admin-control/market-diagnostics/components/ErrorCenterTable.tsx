'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { ErrorCenterCategory, ErrorCenterEntry, NotInstrumentedErrorCategory } from '@/lib/admin/opsCenter/types';
import { notInstrumented } from '@/lib/admin/opsCenter/types';
import { NotInstrumentedNote } from './NotInstrumentedNote';

const CATEGORY_LABEL_KEY: Record<ErrorCenterCategory, string> = {
  provider: 'ops_center_error_category_provider',
  api: 'ops_center_error_category_api',
  shariah: 'ops_center_error_category_shariah',
  email: 'ops_center_error_category_email',
  ai: 'ops_center_error_category_ai',
};

const NOT_INSTRUMENTED_CATEGORY_LABEL_KEY: Record<NotInstrumentedErrorCategory, string> = {
  database: 'ops_center_error_category_database',
  frontend: 'ops_center_error_category_frontend',
  notifications: 'ops_center_error_category_notifications',
};

const CATEGORY_ORDER: ErrorCenterCategory[] = ['provider', 'shariah', 'email', 'api', 'ai'];

export function ErrorCenterTable({ byCategory, notInstrumentedCategories }: {
  byCategory: Record<ErrorCenterCategory, ErrorCenterEntry[]>;
  notInstrumentedCategories: NotInstrumentedErrorCategory[];
}) {
  const { t } = useLanguage();

  return (
    <div className="ops-error-center">
      <div className="ops-error-center-grid">
        {CATEGORY_ORDER.map(category => {
          const entries = byCategory[category];
          const criticalCount = entries.filter(entry => entry.severity === 'critical').length;
          const warningCount = entries.filter(entry => entry.severity === 'warning').length;
          return (
            <article key={category} className="ops-error-center-card">
              <strong>{t(CATEGORY_LABEL_KEY[category])}</strong>
              <span>{entries.length} {t('ops_center_error_total')}</span>
              {entries.length > 0 && <span>{criticalCount} {t('ops_center_critical_issues')} · {warningCount} {t('ops_center_warnings')}</span>}
            </article>
          );
        })}
      </div>
      <div className="ops-error-center-not-instrumented">
        {notInstrumentedCategories.map(category => (
          <NotInstrumentedNote
            key={category}
            value={notInstrumented('ops_center_not_instrumented_reason_no_error_category_source', 'ops_center_not_instrumented_infra_structured_log_store', 'unavailable')}
            label={t(NOT_INSTRUMENTED_CATEGORY_LABEL_KEY[category])}
          />
        ))}
      </div>
      <style jsx global>{`
        .ops-error-center { display: grid; gap: 12px; }
        .ops-error-center-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .ops-error-center-card { border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); padding: 12px; display: grid; gap: 4px; }
        .ops-error-center-card strong { color: var(--foreground); font-size: 13px; font-weight: 600; }
        .ops-error-center-card span { color: var(--foreground-muted); font-size: 11.5px; font-weight: 700; }
        .ops-error-center-not-instrumented { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
      `}</style>
    </div>
  );
}
