'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { SymbolCoverage } from '@/lib/admin/opsCenter/types';
import { NotInstrumentedNote } from './NotInstrumentedNote';

export function SymbolCoverageCard({ coverage }: { coverage: SymbolCoverage }) {
  const { t } = useLanguage();

  const realRows: Array<{ label: string; value: string }> = [
    { label: t('ops_center_coverage_discovered'), value: coverage.discovered.toLocaleString() },
    { label: t('ops_center_coverage_metadata_only'), value: coverage.metadataOnly.toLocaleString() },
    { label: t('ops_center_coverage_quotes_live'), value: coverage.quotesAvailable.live === null ? t('market_state_catalog_not_measured') : coverage.quotesAvailable.live.toLocaleString() },
    { label: t('ops_center_coverage_quotes_delayed'), value: coverage.quotesAvailable.delayed === null ? t('market_state_catalog_not_measured') : coverage.quotesAvailable.delayed.toLocaleString() },
    { label: t('ops_center_coverage_shariah_ready'), value: coverage.shariahReady.toLocaleString() },
    { label: t('ops_center_coverage_missing'), value: coverage.missing.toLocaleString() },
  ];

  return (
    <section className="ops-symbol-coverage" aria-label={t('ops_center_coverage_title')}>
      <h3>{t('ops_center_coverage_title')}</h3>
      <div className="ops-symbol-coverage-grid">
        {realRows.map(row => (
          <article key={row.label}>
            <strong>{row.value}</strong>
            <span>{row.label}</span>
          </article>
        ))}
      </div>
      <div className="ops-symbol-coverage-not-instrumented">
        <NotInstrumentedNote value={coverage.fullySupported} label={t('ops_center_coverage_fully_supported')} />
        <NotInstrumentedNote value={coverage.technicalAvailable} label={t('ops_center_coverage_technical_available')} />
        <NotInstrumentedNote value={coverage.newsAvailable} label={t('ops_center_coverage_news_available')} />
        <NotInstrumentedNote value={coverage.recommendationsAvailable} label={t('ops_center_coverage_recommendations_available')} />
        <NotInstrumentedNote value={coverage.unsupported} label={t('ops_center_coverage_unsupported')} />
      </div>
      <style jsx global>{`
        .ops-symbol-coverage { display: grid; gap: 12px; }
        .ops-symbol-coverage h3 { margin: 0; color: var(--foreground); font-size: 14px; font-weight: 600; }
        .ops-symbol-coverage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .ops-symbol-coverage-grid article { min-width: 0; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface-elevated); padding: 14px; box-shadow: var(--shadow-sm); }
        .ops-symbol-coverage-grid strong { display: block; color: var(--foreground); font: 600 20px/1 var(--font-data); font-variant-numeric: tabular-nums; }
        .ops-symbol-coverage-grid span { display: block; margin-top: 6px; color: var(--foreground-muted); font-size: 12px; line-height: 1.4; font-weight: 750; overflow-wrap: anywhere; }
        .ops-symbol-coverage-not-instrumented { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
      `}</style>
    </section>
  );
}
