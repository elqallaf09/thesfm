'use client';

import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { MarketSystemStateProvider, useMarketSystemContext } from '@/components/market/MarketSystemStateProvider';
import { MarketSystemStatusHeader } from '@/components/market/MarketSystemStatusHeader';
import { CapabilityMatrixSection } from '@/components/market/CapabilityMatrixSection';

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

function CapabilityMatrixWrapper() {
  const { system } = useMarketSystemContext();
  if (!system) return null;
  return <CapabilityMatrixSection system={system} />;
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
      <CapabilityMatrixWrapper />

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
        @media (max-width: 700px) {
          .market-diagnostics-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
