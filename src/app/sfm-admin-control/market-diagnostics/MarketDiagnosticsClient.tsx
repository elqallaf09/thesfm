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
    <div className="market-diagnostics-table" role="table" aria-colcount={3} aria-rowcount={system.capabilityMatrix.length + 1}>
      <div className="market-diagnostics-row market-diagnostics-head" role="row" aria-rowindex={1}>
        <span role="columnheader" aria-colindex={1}>{t('market_state_capability_column')}</span>
        <span role="columnheader" aria-colindex={2}>{t('market_state_provider_column')}</span>
        <span role="columnheader" aria-colindex={3}>{t('market_state_status_column')}</span>
      </div>
      {system.capabilityMatrix.map((cell, index) => (
        <div className="market-diagnostics-row" role="row" aria-rowindex={index + 2} key={`${cell.provider}:${cell.capability}`}>
          <span role="cell" aria-colindex={1} data-label={t('market_state_capability_column')}>{cell.capability}</span>
          <span role="cell" aria-colindex={2} data-label={t('market_state_provider_column')}><span dir="ltr">{cell.provider}</span></span>
          <span role="cell" aria-colindex={3} data-label={t('market_state_status_column')}><span className={`market-status-badge ${PROVIDER_STATUS_TONE[cell.status]}`}>{t(`market_state_status_${cell.status}`)}</span></span>
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
        .market-diagnostics-admin { max-width: 1160px; margin: 0 auto; padding: clamp(18px,3vw,30px) 16px 48px; display: grid; gap: 20px; color: var(--sfm-foreground); }
        .market-diagnostics-hero { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .market-diagnostics-hero > div { min-width: 0; }
        .market-diagnostics-hero h1 { color: var(--sfm-heading); font-size: clamp(26px,3vw,38px); line-height: 1.15; font-weight: 900; margin: 0; }
        .market-diagnostics-hero p { margin: 6px 0 0; color: var(--sfm-muted); font-size: 13px; }
        .market-diagnostics-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .market-diagnostics-summary article { min-width: 0; border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card,18px); background: linear-gradient(180deg,var(--sfm-card-elevated),var(--sfm-card)); padding: 16px; box-shadow: var(--shadow-sm); }
        .market-diagnostics-summary strong { display: block; color: var(--sfm-heading); font-size: 24px; line-height: 1; font-weight: 900; font-variant-numeric: tabular-nums; }
        .market-diagnostics-summary span { display: block; margin-top: 7px; color: var(--sfm-muted); font-size: 13px; line-height: 1.45; font-weight: 750; overflow-wrap: anywhere; }
        .market-diagnostics-table { border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card,18px); overflow: hidden; background: var(--sfm-card); box-shadow: var(--shadow-sm); }
        .market-diagnostics-row { display: grid; grid-template-columns: minmax(180px,2fr) minmax(120px,1fr) minmax(120px,1fr); gap: 10px; min-height: 50px; padding: 10px 14px; border-top: 1px solid var(--sfm-border); align-items: center; color: var(--sfm-body); font-size: 13px; }
        .market-diagnostics-row:first-child { border-top: none; }
        .market-diagnostics-row > [role="cell"] { min-width: 0; overflow-wrap: anywhere; }
        .market-diagnostics-head { background: var(--sfm-light-card); color: var(--sfm-muted-readable); font-weight: 900; font-size: 12px; }
        @media (max-width: 700px) {
          .market-diagnostics-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .market-diagnostics-row { grid-template-columns: minmax(0,1fr); gap: 9px; padding-block: 13px; }
          .market-diagnostics-head { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }
          .market-diagnostics-row:not(.market-diagnostics-head) > [role="cell"] { display: grid; gap: 3px; }
          .market-diagnostics-row:not(.market-diagnostics-head) > [role="cell"]::before { content: attr(data-label); color: var(--sfm-muted); font-size: 11px; line-height: 1.25; font-weight: 850; }
        }
        @media (max-width: 420px) { .market-diagnostics-admin { padding-inline: 12px; } .market-diagnostics-summary { grid-template-columns: minmax(0,1fr); } }
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
