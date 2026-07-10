'use client';

import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { MarketSystemStateProvider, useMarketSystemContext } from '@/components/market/MarketSystemStateProvider';
import { MarketSystemStatusHeader } from '@/components/market/MarketSystemStatusHeader';
import { PROVIDER_STATUS_TONE } from '@/components/market/statusPresentation';

function CatalogBreakdownCard() {
  const { t } = useLanguage();
  const { system } = useMarketSystemContext();
  if (!system) return null;
  const { catalog } = system;

  const rows: Array<{ label: string; value: string }> = [
    { label: t('market_state_catalog_discovered'), value: catalog.discovered.toLocaleString() },
    { label: t('market_state_catalog_live_quotes'), value: catalog.liveQuoteAvailable === null ? t('market_state_catalog_not_measured') : catalog.liveQuoteAvailable.toLocaleString() },
    { label: t('market_state_catalog_delayed_quotes'), value: catalog.delayedQuoteAvailable === null ? t('market_state_catalog_not_measured') : catalog.delayedQuoteAvailable.toLocaleString() },
    { label: t('market_state_catalog_metadata_only'), value: catalog.metadataAvailable.toLocaleString() },
  ];

  return (
    <section className="market-diagnostics-summary" aria-label={t('market_state_drawer_title')}>
      {rows.map(row => (
        <article key={row.label}>
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </article>
      ))}
    </section>
  );
}

function CapabilityMatrixTable() {
  const { t } = useLanguage();
  const { system } = useMarketSystemContext();
  if (!system) return null;

  return (
    <div className="market-diagnostics-table" role="table">
      <div className="market-diagnostics-row market-diagnostics-head" role="row">
        <span role="columnheader">{t('market_state_capability_column')}</span>
        <span role="columnheader">{t('market_state_provider_column')}</span>
        <span role="columnheader">{t('market_state_status_column')}</span>
      </div>
      {system.capabilityMatrix.map(cell => (
        <div className="market-diagnostics-row" role="row" key={`${cell.provider}:${cell.capability}`}>
          <span role="cell">{cell.capability}</span>
          <span role="cell" dir="ltr">{cell.provider}</span>
          <span role="cell" className={`market-status-badge ${PROVIDER_STATUS_TONE[cell.status]}`}>{t(`market_state_status_${cell.status}`)}</span>
        </div>
      ))}
    </div>
  );
}

function MarketDiagnosticsContent() {
  const { t, lang, dir } = useLanguage();
  const { system } = useMarketSystemContext();

  return (
    <main className="market-diagnostics-admin" dir={dir}>
      <header className="market-diagnostics-hero">
        <div>
          <h1>{t('market_state_drawer_title')}</h1>
          <p>{system?.lastSynchronizedAt ? `${t('market_state_last_sync')}: ${formatDateTime(system.lastSynchronizedAt, lang)}` : ''}</p>
        </div>
        <MarketSystemStatusHeader />
      </header>

      <CatalogBreakdownCard />
      <CapabilityMatrixTable />

      <style jsx global>{`
        .market-diagnostics-admin { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; display: grid; gap: 20px; }
        .market-diagnostics-hero { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .market-diagnostics-hero h1 { font-size: 22px; font-weight: 900; margin: 0; }
        .market-diagnostics-hero p { margin: 4px 0 0; color: var(--sfm-muted, #64748b); font-size: 13px; }
        .market-diagnostics-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .market-diagnostics-summary article { border: 1px solid rgba(148,163,184,.16); border-radius: 16px; background: var(--sfm-card-bg, #fff); padding: 14px; }
        .market-diagnostics-summary strong { display: block; font-size: 22px; font-weight: 900; }
        .market-diagnostics-summary span { color: var(--sfm-muted, #64748b); font-size: 12px; font-weight: 700; }
        .market-diagnostics-table { border: 1px solid rgba(148,163,184,.16); border-radius: 16px; overflow: hidden; }
        .market-diagnostics-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; padding: 10px 14px; border-top: 1px solid rgba(148,163,184,.12); align-items: center; font-size: 13px; }
        .market-diagnostics-row:first-child { border-top: none; }
        .market-diagnostics-head { font-weight: 800; color: var(--sfm-muted, #64748b); font-size: 12px; }
        @media (max-width: 700px) { .market-diagnostics-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </main>
  );
}

export default function MarketDiagnosticsClient() {
  return (
    <AdminDashboardShell ariaLabel="Market diagnostics" contentClassName="market-diagnostics-content" contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <MarketSystemStateProvider>
        <MarketDiagnosticsContent />
      </MarketSystemStateProvider>
    </AdminDashboardShell>
  );
}
